import { describe, expect, it } from "vitest";
import type { ScanHistoryRecord } from "../services/history-service";
import { filterHistoryRecords } from "./history-filter";

describe("history filters", () => {
  it("searches targets, profiles, commands, hosts, errors, and diagnostics", () => {
    const records = [
      scanRecord("scan-1", {
        profileName: "Ping Sweep",
        targets: [{ value: "scanme.nmap.org", kind: "hostname" }],
      }),
      scanRecord("scan-2", {
        profileName: "Service Scan",
        command: ["nmap", "-sV", "--", "192.0.2.10"],
        hosts: [
          {
            address: "192.0.2.10",
            hostname: "router.example",
            state: "up",
            osMatches: [{ name: "Linux 5.x", accuracy: "98" }],
            extraPorts: [{ state: "filtered", count: 998, reason: "no-responses" }],
            trace: [{ ttl: "1", address: "192.0.2.254", hostname: "gateway.example", rtt: "1.23" }],
            ports: [
              {
                id: "443",
                protocol: "tcp",
                state: "open",
                service: "https",
                product: "nginx",
                version: "1.25",
                extraInfo: "ALPN h2",
                reason: "syn-ack",
                cpes: ["cpe:/a:nginx:nginx:1.25"],
                scripts: [
                  {
                    id: "ssl-cert",
                    output: "Subject: commonName=router.example",
                    details: [
                      {
                        kind: "table",
                        key: "subject",
                        children: [{ kind: "elem", key: "commonName", value: "router.example" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
      scanRecord("scan-3", {
        error: "Unable to parse Nmap XML: unexpected EOF",
        diagnostics: "Strange read error",
      }),
    ];

    expect(filterHistoryRecords(records, "service", "all").map((record) => record.runId)).toEqual([
      "scan-2",
    ]);
    expect(filterHistoryRecords(records, "router", "all").map((record) => record.runId)).toEqual([
      "scan-2",
    ]);
    expect(filterHistoryRecords(records, "nginx", "all").map((record) => record.runId)).toEqual([
      "scan-2",
    ]);
    expect(filterHistoryRecords(records, "443", "all").map((record) => record.runId)).toEqual([
      "scan-2",
    ]);
    expect(filterHistoryRecords(records, "syn-ack", "all").map((record) => record.runId)).toEqual([
      "scan-2",
    ]);
    expect(filterHistoryRecords(records, "linux", "all").map((record) => record.runId)).toEqual([
      "scan-2",
    ]);
    expect(
      filterHistoryRecords(records, "no-responses", "all").map((record) => record.runId),
    ).toEqual(["scan-2"]);
    expect(filterHistoryRecords(records, "gateway", "all").map((record) => record.runId)).toEqual([
      "scan-2",
    ]);
    expect(
      filterHistoryRecords(records, "cpe:/a:nginx", "all").map((record) => record.runId),
    ).toEqual(["scan-2"]);
    expect(
      filterHistoryRecords(records, "commonName", "all").map((record) => record.runId),
    ).toEqual(["scan-2"]);
    expect(
      filterHistoryRecords(records, "unexpected", "all").map((record) => record.runId),
    ).toEqual(["scan-3"]);
  });

  it("filters by scan outcomes", () => {
    const records = [
      scanRecord("scan-1", { hostsUp: 1 }),
      scanRecord("scan-2", { openPortCount: 2 }),
      scanRecord("scan-3", { error: "Unable to parse Nmap XML" }),
    ];

    expect(filterHistoryRecords(records, "", "hosts-up").map((record) => record.runId)).toEqual([
      "scan-1",
    ]);
    expect(filterHistoryRecords(records, "", "open-ports").map((record) => record.runId)).toEqual([
      "scan-2",
    ]);
    expect(filterHistoryRecords(records, "", "errors").map((record) => record.runId)).toEqual([
      "scan-3",
    ]);
  });

  it("combines search and outcome filters", () => {
    const records = [
      scanRecord("scan-1", { targets: [{ value: "scanme.nmap.org", kind: "hostname" }] }),
      scanRecord("scan-2", {
        command: ["nmap", "-oX", "<managed-xml-file>", "-sn", "--", "router.local"],
        targets: [{ value: "router.local", kind: "hostname" }],
        openPortCount: 2,
      }),
    ];

    expect(
      filterHistoryRecords(records, "router", "open-ports").map((record) => record.runId),
    ).toEqual(["scan-2"]);
    expect(filterHistoryRecords(records, "scanme", "open-ports")).toEqual([]);
  });
});

function scanRecord(runId: string, overrides: Partial<ScanHistoryRecord> = {}): ScanHistoryRecord {
  return {
    runId,
    startedAt: "2026-06-12T10:00:00Z",
    finishedAt: "2026-06-12T10:00:05Z",
    command: ["nmap", "-oX", "<managed-xml-file>", "-sn", "--", "scanme.nmap.org"],
    profileName: "TCP Connect",
    targets: [{ value: "scanme.nmap.org", kind: "hostname" }],
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
