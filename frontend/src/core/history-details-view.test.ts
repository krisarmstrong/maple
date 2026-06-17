import { describe, expect, it } from "vitest";
import type {
  ScanHistoryHost,
  ScanHistoryPort,
  ScanHistoryRecord,
  ScanHistoryScriptElement,
} from "../services/history-service";
import {
  elapsedLabel,
  emptyHostMessage,
  filterHosts,
  filterPorts,
  hasDiagnostics,
  hasError,
  hostEvidenceCount,
  hostFindingLabel,
  hostHasFindings,
  hostHasOpenPorts,
  hostScriptCount,
  portGroupLabel,
  portGroups,
  scriptDetailKey,
  scriptDetailLabel,
  searchHosts,
} from "./history-details-view";

// --- Fixtures ---

function makeHost(overrides: Partial<ScanHistoryHost> = {}): ScanHistoryHost {
  return { address: "192.0.2.1", state: "up", ports: [], ...overrides };
}

function makePort(overrides: Partial<ScanHistoryPort> = {}): ScanHistoryPort {
  return { id: "80", protocol: "tcp", state: "open", ...overrides };
}

function makeRecord(overrides: Partial<ScanHistoryRecord> = {}): ScanHistoryRecord {
  return {
    runId: "r1",
    startedAt: "2026-01-01T00:00:00Z",
    finishedAt: "2026-01-01T00:00:05Z",
    command: ["nmap", "-sn", "scanme.nmap.org"],
    profileName: "Default",
    targets: [],
    hosts: [],
    exitCode: 0,
    targetCount: 1,
    hostCount: 0,
    hostsUp: 0,
    hostsDown: 0,
    openPortCount: 0,
    ...overrides,
  };
}

// --- elapsedLabel ---

describe("elapsedLabel", () => {
  it("returns n/a for undefined", () => {
    expect(elapsedLabel(undefined)).toBe("n/a");
  });

  it("returns n/a for empty string", () => {
    expect(elapsedLabel("")).toBe("n/a");
  });

  it("appends s when value has no trailing s", () => {
    expect(elapsedLabel("5.42")).toBe("5.42s");
  });

  it("leaves value unchanged when it already ends in s", () => {
    expect(elapsedLabel("3.00s")).toBe("3.00s");
  });
});

// --- hasError / hasDiagnostics ---

describe("hasError", () => {
  it("returns false when error is undefined", () => {
    expect(hasError(makeRecord())).toBe(false);
  });

  it("returns false when error is empty string", () => {
    expect(hasError(makeRecord({ error: "" }))).toBe(false);
  });

  it("returns true when error is non-empty", () => {
    expect(hasError(makeRecord({ error: "parse failure" }))).toBe(true);
  });
});

describe("hasDiagnostics", () => {
  it("returns false when diagnostics is undefined", () => {
    expect(hasDiagnostics(makeRecord())).toBe(false);
  });

  it("returns false when diagnostics is empty string", () => {
    expect(hasDiagnostics(makeRecord({ diagnostics: "" }))).toBe(false);
  });

  it("returns true when diagnostics is non-empty", () => {
    expect(hasDiagnostics(makeRecord({ diagnostics: "debug info" }))).toBe(true);
  });
});

// --- emptyHostMessage ---

describe("emptyHostMessage", () => {
  it("returns generic message when hostCount is 0", () => {
    expect(emptyHostMessage(makeRecord({ hostCount: 0 }))).toBe("No parsed hosts for this scan.");
  });

  it("returns count-aware message when hostCount > 0", () => {
    expect(emptyHostMessage(makeRecord({ hostCount: 3, hostsUp: 1 }))).toBe(
      "Nmap reported 1/3 hosts up, but did not include host rows.",
    );
  });
});

// --- host predicates and counts ---

describe("hostHasOpenPorts", () => {
  it("returns false when no ports are open", () => {
    const host = makeHost({ ports: [makePort({ state: "closed" })] });
    expect(hostHasOpenPorts(host)).toBe(false);
  });

  it("returns true when at least one port is open", () => {
    const host = makeHost({ ports: [makePort({ state: "open" })] });
    expect(hostHasOpenPorts(host)).toBe(true);
  });
});

describe("hostScriptCount", () => {
  it("counts host-level scripts and port-level scripts", () => {
    const host = makeHost({
      scripts: [{ id: "nbstat", output: "x" }],
      ports: [
        makePort({ scripts: [{ id: "ssh-hostkey", output: "y" }] }),
        makePort({ id: "443", state: "closed" }),
      ],
    });
    expect(hostScriptCount(host)).toBe(2);
  });

  it("returns 0 when no scripts exist", () => {
    expect(hostScriptCount(makeHost())).toBe(0);
  });
});

describe("hostEvidenceCount", () => {
  it("sums scripts, OS matches, extra ports, and trace hops", () => {
    const host = makeHost({
      scripts: [{ id: "s1", output: "x" }],
      osMatches: [{ name: "Linux", accuracy: "95" }],
      extraPorts: [{ state: "filtered", count: 100 }],
      trace: [{ ttl: "1", address: "10.0.0.1" }],
      ports: [],
    });
    // hostScriptCount = 1 (host script) + 0 (port scripts)
    // osMatches = 1, extraPorts = 1, trace = 1
    expect(hostEvidenceCount(host)).toBe(4);
  });
});

describe("hostHasFindings", () => {
  it("returns true when host has open ports", () => {
    expect(hostHasFindings(makeHost({ ports: [makePort({ state: "open" })] }))).toBe(true);
  });

  it("returns true when host has OS matches but no open ports", () => {
    const host = makeHost({
      ports: [],
      osMatches: [{ name: "Linux", accuracy: "98" }],
    });
    expect(hostHasFindings(host)).toBe(true);
  });

  it("returns false when host has neither open ports nor evidence", () => {
    expect(hostHasFindings(makeHost())).toBe(false);
  });
});

// --- hostFindingLabel ---

describe("hostFindingLabel", () => {
  it("returns singular open port label", () => {
    const host = makeHost({ ports: [makePort({ state: "open" })] });
    expect(hostFindingLabel(host)).toBe("1 open port");
  });

  it("returns plural open ports label", () => {
    const host = makeHost({
      ports: [makePort({ state: "open" }), makePort({ id: "443", state: "open" })],
    });
    expect(hostFindingLabel(host)).toBe("2 open ports");
  });

  it("returns script results label when no open ports but scripts exist", () => {
    const host = makeHost({
      ports: [],
      scripts: [{ id: "s1", output: "x" }],
    });
    expect(hostFindingLabel(host)).toBe("1 script result");
  });

  it("returns plural script results label", () => {
    const host = makeHost({
      ports: [],
      scripts: [
        { id: "s1", output: "x" },
        { id: "s2", output: "y" },
      ],
    });
    expect(hostFindingLabel(host)).toBe("2 script results");
  });

  it("returns host details label when no scripts but has OS match", () => {
    const host = makeHost({
      ports: [],
      osMatches: [{ name: "Linux", accuracy: "98" }],
    });
    expect(hostFindingLabel(host)).toBe("1 host detail");
  });

  it("returns plural host details label", () => {
    const host = makeHost({
      ports: [],
      osMatches: [{ name: "Linux", accuracy: "98" }],
      trace: [{ ttl: "1", address: "10.0.0.1" }],
    });
    expect(hostFindingLabel(host)).toBe("2 host details");
  });

  it("returns No open ports when host has no evidence", () => {
    expect(hostFindingLabel(makeHost())).toBe("No open ports");
  });
});

// --- portGroups / portGroupLabel ---

describe("portGroups", () => {
  it("groups ports by state in canonical order", () => {
    const ports = [
      makePort({ id: "22", state: "closed" }),
      makePort({ id: "80", state: "open" }),
      makePort({ id: "443", state: "filtered" }),
    ];
    const groups = portGroups(ports);
    expect(groups.map((g) => g.state)).toEqual(["open", "filtered", "closed"]);
  });

  it("maps undefined state to unknown group", () => {
    const ports = [makePort({ id: "1234", state: undefined })];
    const groups = portGroups(ports);
    expect(groups).toHaveLength(1);
    expect(groups[0].state).toBe("unknown");
  });

  it("omits empty groups", () => {
    const ports = [makePort({ state: "open" })];
    const groups = portGroups(ports);
    expect(groups).toHaveLength(1);
    expect(groups[0].state).toBe("open");
  });
});

describe("portGroupLabel", () => {
  it("labels open", () => expect(portGroupLabel("open")).toBe("Open ports"));
  it("labels closed", () => expect(portGroupLabel("closed")).toBe("Closed ports"));
  it("labels filtered", () => expect(portGroupLabel("filtered")).toBe("Filtered ports"));
  it("labels unknown as Other ports", () => expect(portGroupLabel("unknown")).toBe("Other ports"));
  it("labels arbitrary state as Other ports", () =>
    expect(portGroupLabel("weird")).toBe("Other ports"));
});

// --- scriptDetailLabel / scriptDetailKey ---

describe("scriptDetailLabel", () => {
  it("returns key: value when both present", () => {
    const detail: ScanHistoryScriptElement = { kind: "elem", key: "bits", value: "2048" };
    expect(scriptDetailLabel(detail)).toBe("bits: 2048");
  });

  it("returns key alone when value is empty", () => {
    const detail: ScanHistoryScriptElement = { kind: "elem", key: "rsa", value: "" };
    expect(scriptDetailLabel(detail)).toBe("rsa");
  });

  it("returns value alone when key is empty", () => {
    const detail: ScanHistoryScriptElement = { kind: "elem", key: "", value: "ROUTER" };
    expect(scriptDetailLabel(detail)).toBe("ROUTER");
  });

  it("falls back to kind when both key and value are absent", () => {
    const detail: ScanHistoryScriptElement = { kind: "table" };
    expect(scriptDetailLabel(detail)).toBe("table");
  });

  it("falls back to 'detail' when kind is also absent", () => {
    const detail: ScanHistoryScriptElement = {};
    expect(scriptDetailLabel(detail)).toBe("detail");
  });
});

describe("scriptDetailKey", () => {
  it("joins non-empty parts with colon", () => {
    const detail: ScanHistoryScriptElement = { kind: "elem", key: "bits", value: "2048" };
    expect(scriptDetailKey(detail)).toBe("elem:bits:2048");
  });

  it("omits empty parts", () => {
    const detail: ScanHistoryScriptElement = { kind: "table", key: "rsa" };
    expect(scriptDetailKey(detail)).toBe("table:rsa");
  });

  it("recurses into children", () => {
    const detail: ScanHistoryScriptElement = {
      kind: "table",
      key: "rsa",
      children: [{ kind: "elem", key: "bits", value: "2048" }],
    };
    expect(scriptDetailKey(detail)).toBe("table:rsa:elem:bits:2048");
  });
});

// --- filterHosts ---

describe("filterHosts", () => {
  const up = makeHost({ address: "192.0.2.1", state: "up", ports: [makePort({ state: "open" })] });
  const down = makeHost({ address: "192.0.2.2", state: "down", ports: [] });
  const upClosed = makeHost({
    address: "192.0.2.3",
    state: "up",
    ports: [makePort({ state: "closed" })],
  });

  it("returns all hosts for 'all' filter", () => {
    expect(filterHosts([up, down], "all")).toHaveLength(2);
  });

  it("returns only up hosts for 'hosts-up'", () => {
    const result = filterHosts([up, down, upClosed], "hosts-up");
    expect(result.map((h) => h.address)).toEqual(["192.0.2.1", "192.0.2.3"]);
  });

  it("returns only hosts with open ports for 'open'", () => {
    const result = filterHosts([up, down, upClosed], "open");
    expect(result.map((h) => h.address)).toEqual(["192.0.2.1"]);
  });

  it("returns only hosts with findings for 'findings'", () => {
    const result = filterHosts([up, down], "findings");
    expect(result.map((h) => h.address)).toEqual(["192.0.2.1"]);
  });
});

// --- filterPorts ---

describe("filterPorts", () => {
  const openPort = makePort({ id: "80", state: "open" });
  const closedPort = makePort({ id: "22", state: "closed" });

  it("returns all ports for non-open filter", () => {
    expect(filterPorts([openPort, closedPort], "all")).toHaveLength(2);
  });

  it("returns only open ports for 'open'", () => {
    const result = filterPorts([openPort, closedPort], "open");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("80");
  });
});

// --- searchHosts ---

describe("searchHosts", () => {
  const webHost = makeHost({
    address: "192.0.2.10",
    hostname: "web-1",
    ports: [makePort({ id: "443", state: "open", service: "https", product: "nginx" })],
  });
  const mailHost = makeHost({
    address: "192.0.2.11",
    hostname: "mail-1",
    ports: [makePort({ id: "25", state: "open", service: "smtp" })],
  });

  it("returns all hosts when query is empty", () => {
    expect(searchHosts([webHost, mailHost], "")).toHaveLength(2);
  });

  it("returns all hosts when query is whitespace", () => {
    expect(searchHosts([webHost, mailHost], "   ")).toHaveLength(2);
  });

  it("matches by hostname", () => {
    const result = searchHosts([webHost, mailHost], "mail");
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe("192.0.2.11");
  });

  it("matches by service product", () => {
    const result = searchHosts([webHost, mailHost], "nginx");
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe("192.0.2.10");
  });

  it("returns host with only matching ports when host-level fields do not match", () => {
    const result = searchHosts([webHost, mailHost], "smtp");
    expect(result).toHaveLength(1);
    expect(result[0].ports).toHaveLength(1);
    expect(result[0].ports[0].service).toBe("smtp");
  });

  it("is case-insensitive", () => {
    const result = searchHosts([webHost], "NGINX");
    expect(result).toHaveLength(1);
  });
});
