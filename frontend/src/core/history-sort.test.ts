import { describe, expect, it } from "vitest";
import type { ScanHistoryRecord } from "../services/history-service";
import { sortHistoryRecords } from "./history-sort";

describe("sortHistoryRecords", () => {
  it("sorts newest and oldest scans by finished time", () => {
    const records = [
      scanRecord("scan-1", { finishedAt: "2026-06-12T10:00:00Z" }),
      scanRecord("scan-2", { finishedAt: "2026-06-12T12:00:00Z" }),
      scanRecord("scan-3", { finishedAt: "2026-06-12T11:00:00Z" }),
    ];

    expect(sortHistoryRecords(records, "newest").map((record) => record.runId)).toEqual([
      "scan-2",
      "scan-3",
      "scan-1",
    ]);
    expect(sortHistoryRecords(records, "oldest").map((record) => record.runId)).toEqual([
      "scan-1",
      "scan-3",
      "scan-2",
    ]);
  });

  it("sorts by findings while preserving newest order for ties", () => {
    const records = [
      scanRecord("scan-1", { finishedAt: "2026-06-12T10:00:00Z", openPortCount: 2 }),
      scanRecord("scan-2", { finishedAt: "2026-06-12T12:00:00Z", openPortCount: 5 }),
      scanRecord("scan-3", { finishedAt: "2026-06-12T11:00:00Z", openPortCount: 5 }),
    ];

    expect(sortHistoryRecords(records, "open-ports").map((record) => record.runId)).toEqual([
      "scan-2",
      "scan-3",
      "scan-1",
    ]);
  });

  it("sorts by hosts up and review-needed scans", () => {
    const records = [
      scanRecord("scan-1", { hostsUp: 1 }),
      scanRecord("scan-2", { error: "Unable to parse Nmap XML" }),
      scanRecord("scan-3", { finishedAt: "2026-06-12T11:00:00Z", hostsUp: 4 }),
    ];

    expect(sortHistoryRecords(records, "hosts-up").map((record) => record.runId)).toEqual([
      "scan-3",
      "scan-1",
      "scan-2",
    ]);
    expect(sortHistoryRecords(records, "needs-review").map((record) => record.runId)).toEqual([
      "scan-2",
      "scan-3",
      "scan-1",
    ]);
  });
});

function scanRecord(runId: string, overrides: Partial<ScanHistoryRecord> = {}): ScanHistoryRecord {
  return {
    runId,
    startedAt: "2026-06-12T09:59:00Z",
    finishedAt: "2026-06-12T10:00:00Z",
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
