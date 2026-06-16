import { describe, expect, it } from "vitest";
import type { ScanHistoryHost, ScanHistoryRecord } from "../services/history-service";
import { computeScanDiff, isDiffEmpty } from "./scan-compare";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(runId: string, hosts: ScanHistoryHost[]): ScanHistoryRecord {
  return {
    runId,
    startedAt: "2026-06-12T09:00:00Z",
    finishedAt: "2026-06-12T09:01:00Z",
    command: ["nmap", "--", "10.0.0.0/24"],
    profileName: "TCP Connect",
    targets: [{ value: "10.0.0.0/24", kind: "subnet" }],
    hosts,
    exitCode: 0,
    targetCount: 1,
    hostCount: hosts.length,
    hostsUp: hosts.filter((h) => h.state === "up").length,
    hostsDown: hosts.filter((h) => h.state !== "up").length,
    openPortCount: hosts.reduce(
      (total, h) => total + h.ports.filter((p) => p.state === "open").length,
      0,
    ),
  };
}

function makeHost(
  address: string,
  state: string,
  ports: ScanHistoryHost["ports"] = [],
  hostname?: string,
): ScanHistoryHost {
  return {
    address,
    hostname,
    state,
    ports,
    osMatches: [],
    extraPorts: [],
    trace: [],
    scripts: [],
  };
}

function makePort(
  id: string,
  protocol: string,
  state: string,
  service?: string,
  product?: string,
  version?: string,
): ScanHistoryHost["ports"][number] {
  return { id, protocol, state, service, product, version, cpes: [], scripts: [] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeScanDiff", () => {
  it("returns null when both inputs are the same record", () => {
    const rec = makeRecord("scan-1", []);
    expect(computeScanDiff(rec, rec)).toBeNull();
  });

  it("returns an empty diff for identical scans with different run IDs", () => {
    const host = makeHost("10.0.0.1", "up", [makePort("80", "tcp", "open", "http")]);
    const a = makeRecord("scan-1", [host]);
    const b = makeRecord("scan-2", [{ ...host }]);
    const result = computeScanDiff(a, b);
    if (result === null) {
      throw new Error("expected a diff result for distinct run IDs");
    }
    expect(isDiffEmpty(result)).toBe(true);
  });

  it("reports hosts only in A", () => {
    const a = makeRecord("scan-1", [makeHost("10.0.0.1", "up"), makeHost("10.0.0.2", "up")]);
    const b = makeRecord("scan-2", [makeHost("10.0.0.1", "up")]);
    const result = computeScanDiff(a, b);
    expect(result?.hostsOnlyInA).toHaveLength(1);
    expect(result?.hostsOnlyInA[0]?.address).toBe("10.0.0.2");
    expect(result?.hostsOnlyInB).toHaveLength(0);
  });

  it("reports hosts only in B", () => {
    const a = makeRecord("scan-1", [makeHost("10.0.0.1", "up")]);
    const b = makeRecord("scan-2", [makeHost("10.0.0.1", "up"), makeHost("10.0.0.3", "up")]);
    const result = computeScanDiff(a, b);
    expect(result?.hostsOnlyInB).toHaveLength(1);
    expect(result?.hostsOnlyInB[0]?.address).toBe("10.0.0.3");
    expect(result?.hostsOnlyInA).toHaveLength(0);
  });

  it("reports ports newly open in B", () => {
    const a = makeRecord("scan-1", [makeHost("10.0.0.1", "up", [makePort("22", "tcp", "closed")])]);
    const b = makeRecord("scan-2", [makeHost("10.0.0.1", "up", [makePort("22", "tcp", "open")])]);
    const result = computeScanDiff(a, b);
    expect(result?.portsNewlyOpen).toHaveLength(1);
    expect(result?.portsNewlyOpen[0]?.portId).toBe("22");
    expect(result?.portsNewlyClosed).toHaveLength(0);
  });

  it("reports ports newly open when port was absent in A", () => {
    const a = makeRecord("scan-1", [makeHost("10.0.0.1", "up", [])]);
    const b = makeRecord("scan-2", [makeHost("10.0.0.1", "up", [makePort("443", "tcp", "open")])]);
    const result = computeScanDiff(a, b);
    expect(result?.portsNewlyOpen).toHaveLength(1);
    expect(result?.portsNewlyOpen[0]?.portId).toBe("443");
  });

  it("reports ports newly closed (open in A, not open in B)", () => {
    const a = makeRecord("scan-1", [makeHost("10.0.0.1", "up", [makePort("22", "tcp", "open")])]);
    const b = makeRecord("scan-2", [
      makeHost("10.0.0.1", "up", [makePort("22", "tcp", "filtered")]),
    ]);
    const result = computeScanDiff(a, b);
    expect(result?.portsNewlyClosed).toHaveLength(1);
    expect(result?.portsNewlyClosed[0]?.portId).toBe("22");
    expect(result?.portsNewlyOpen).toHaveLength(0);
  });

  it("reports ports newly closed when port is absent in B", () => {
    const a = makeRecord("scan-1", [makeHost("10.0.0.1", "up", [makePort("22", "tcp", "open")])]);
    const b = makeRecord("scan-2", [makeHost("10.0.0.1", "up", [])]);
    const result = computeScanDiff(a, b);
    expect(result?.portsNewlyClosed).toHaveLength(1);
  });

  it("reports service changes on a port whose state did not change", () => {
    const portA = makePort("80", "tcp", "open", "http", "Apache httpd", "2.4.41");
    const portB = makePort("80", "tcp", "open", "http", "nginx", "1.25.0");
    const a = makeRecord("scan-1", [makeHost("10.0.0.1", "up", [portA])]);
    const b = makeRecord("scan-2", [makeHost("10.0.0.1", "up", [portB])]);
    const result = computeScanDiff(a, b);
    expect(result?.serviceChanges).toHaveLength(1);
    expect(result?.serviceChanges[0]?.before).toBe("http Apache httpd 2.4.41");
    expect(result?.serviceChanges[0]?.after).toBe("http nginx 1.25.0");
  });

  it("does not report a service change when labels are identical", () => {
    const port = makePort("80", "tcp", "open", "http", "nginx", "1.25.0");
    const a = makeRecord("scan-1", [makeHost("10.0.0.1", "up", [port])]);
    const b = makeRecord("scan-2", [makeHost("10.0.0.1", "up", [{ ...port }])]);
    const result = computeScanDiff(a, b);
    expect(result?.serviceChanges).toHaveLength(0);
  });

  it("handles hosts with only hostname and no IP address", () => {
    const a = makeRecord("scan-1", [makeHost("", "up", [], "host.example.com")]);
    const b = makeRecord("scan-2", []);
    const result = computeScanDiff(a, b);
    expect(result?.hostsOnlyInA).toHaveLength(1);
    expect(result?.hostsOnlyInA[0]?.hostname).toBe("host.example.com");
  });

  it("produces an empty diff when both records have no hosts", () => {
    const a = makeRecord("scan-1", []);
    const b = makeRecord("scan-2", []);
    const result = computeScanDiff(a, b);
    if (result === null) {
      throw new Error("expected a diff result for distinct run IDs");
    }
    expect(isDiffEmpty(result)).toBe(true);
  });
});

describe("isDiffEmpty", () => {
  it("returns true for a result with no changes", () => {
    expect(
      isDiffEmpty({
        hostsOnlyInA: [],
        hostsOnlyInB: [],
        portsNewlyOpen: [],
        portsNewlyClosed: [],
        serviceChanges: [],
      }),
    ).toBe(true);
  });

  it("returns false when any section is non-empty", () => {
    expect(
      isDiffEmpty({
        hostsOnlyInA: [{ address: "10.0.0.1" }],
        hostsOnlyInB: [],
        portsNewlyOpen: [],
        portsNewlyClosed: [],
        serviceChanges: [],
      }),
    ).toBe(false);
  });
});
