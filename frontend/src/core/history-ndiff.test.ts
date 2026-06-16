import { describe, expect, it } from "vitest";
import type { ScanHistoryRecord } from "../services/history-service";
import { buildHistoryNdiffArgv, historyNdiffOptions } from "./history-ndiff";

describe("history Ndiff helpers", () => {
  it("builds compare options only for records with raw XML sidecars", () => {
    const options = historyNdiffOptions([
      scanRecord("scan-1", { xmlPath: "/Users/you/.config/Maple/records/scan-1.xml" }),
      scanRecord("scan-2"),
    ]);

    expect(options).toEqual([
      {
        runId: "scan-1",
        label: expect.stringContaining("scanme.nmap.org"),
        xmlPath: "/Users/you/.config/Maple/records/scan-1.xml",
      },
    ]);
  });

  it("builds an argv-only Ndiff preview for two saved XML records", () => {
    const options = historyNdiffOptions([
      scanRecord("scan-1", { xmlPath: "/Users/you/.config/Maple/records/scan-1.xml" }),
      scanRecord("scan-2", { xmlPath: "/Users/you/.config/Maple/records/scan-2.xml" }),
    ]);

    expect(
      buildHistoryNdiffArgv({
        baselineRunId: "scan-1",
        currentRunId: "scan-2",
        options,
      }),
    ).toEqual([
      "ndiff",
      "/Users/you/.config/Maple/records/scan-1.xml",
      "/Users/you/.config/Maple/records/scan-2.xml",
    ]);
  });

  it("does not build a compare command for the same scan", () => {
    const options = historyNdiffOptions([
      scanRecord("scan-1", { xmlPath: "/Users/you/.config/Maple/records/scan-1.xml" }),
    ]);

    expect(
      buildHistoryNdiffArgv({
        baselineRunId: "scan-1",
        currentRunId: "scan-1",
        options,
      }),
    ).toEqual([]);
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
