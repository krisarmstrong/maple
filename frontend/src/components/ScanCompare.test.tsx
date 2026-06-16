import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ScanHistoryHost, ScanHistoryRecord } from "../services/history-service";
import { ScanCompare } from "./ScanCompare";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(runId: string, hosts: ScanHistoryHost[] = []): ScanHistoryRecord {
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
    openPortCount: 0,
  };
}

function makeHost(address: string, ports: ScanHistoryHost["ports"] = []): ScanHistoryHost {
  return {
    address,
    state: "up",
    ports,
    osMatches: [],
    extraPorts: [],
    trace: [],
    scripts: [],
  };
}

function makePort(id: string, state: string): ScanHistoryHost["ports"][number] {
  return { id, protocol: "tcp", state, cpes: [], scripts: [] };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScanCompare", () => {
  it("shows a prompt when fewer than two records are provided", () => {
    render(<ScanCompare records={[makeRecord("scan-1")]} />);
    expect(screen.getByTestId("compare-prompt")).toBeInTheDocument();
    expect(screen.getByText(/at least two completed scans/i)).toBeInTheDocument();
  });

  it("shows a prompt when no records are provided", () => {
    render(<ScanCompare records={[]} />);
    expect(screen.getByTestId("compare-prompt")).toBeInTheDocument();
  });

  it("renders run selectors when two or more records exist", () => {
    render(<ScanCompare records={[makeRecord("scan-1"), makeRecord("scan-2")]} />);
    expect(screen.getByTestId("compare-run-a")).toBeInTheDocument();
    expect(screen.getByTestId("compare-run-b")).toBeInTheDocument();
    expect(screen.getByTestId("compare-results")).toBeInTheDocument();
  });

  it("shows no-differences message when both selected scans are identical", () => {
    const records = [makeRecord("scan-1"), makeRecord("scan-2")];
    render(<ScanCompare records={records} />);
    // Default selects scan-2 as A (index 1) and scan-1 as B (index 0) — both empty, so no diff.
    expect(screen.getByTestId("compare-results")).toBeInTheDocument();
    expect(screen.getByText(/no differences/i)).toBeInTheDocument();
  });

  it("shows 'choose two different scans' when same run is selected for both", async () => {
    const records = [makeRecord("scan-1"), makeRecord("scan-2")];
    render(<ScanCompare records={records} />);

    await userEvent.selectOptions(screen.getByTestId("compare-run-b"), "scan-2");

    expect(screen.getByText(/choose two different scans/i)).toBeInTheDocument();
  });

  it("renders diff sections when two different scans have changes", () => {
    const hostWithPort = makeHost("10.0.0.1", [makePort("80", "open")]);
    const recordA = makeRecord("scan-1", []);
    const recordB = makeRecord("scan-2", [hostWithPort]);

    render(<ScanCompare records={[recordA, recordB]} />);

    // Default: A=scan-1 (index 1 = scan-2?), B=scan-1 (index 0 = scan-1?)
    // Actually: at(1) = scan-2 as A, at(0) = scan-1 as B
    // A=scan-2 has 10.0.0.1 with port 80 open; B=scan-1 has no hosts
    // So port 80 newly closed in B, and host only in A
    expect(screen.getByLabelText("Hosts only in run A (removed)")).toBeInTheDocument();
    expect(screen.getByLabelText("Ports newly closed in run B")).toBeInTheDocument();
  });

  it("renders newly open ports when host gained a port", async () => {
    const recordA = makeRecord("scan-1", [makeHost("10.0.0.1", [])]);
    const recordB = makeRecord("scan-2", [makeHost("10.0.0.1", [makePort("443", "open")])]);

    // render with A=scan-1, B=scan-2
    render(<ScanCompare records={[recordB, recordA]} />);

    // Default: A = index 1 = scan-1, B = index 0 = scan-2
    // scan-2 (B) has 443 open, scan-1 (A) does not => newly open
    expect(screen.getByLabelText("Ports newly open in run B")).toBeInTheDocument();
    expect(screen.getByText("443/tcp")).toBeInTheDocument();
  });

  it("renders the service-changes section heading when diff is non-empty", () => {
    // A has a host, B does not — produces a non-empty diff that renders DiffSections.
    const recordA = makeRecord("scan-1", [makeHost("10.0.0.1", [])]);
    const recordB = makeRecord("scan-2", []);
    // Default: at(1)=scan-2 as A, at(0)=scan-1 as B.
    // A=scan-2 has no hosts; B=scan-1 has 10.0.0.1 => hostsOnlyInB => non-empty diff.
    render(<ScanCompare records={[recordA, recordB]} />);
    expect(screen.getByLabelText("Service changes")).toBeInTheDocument();
  });
});
