import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportScanHistoryRecord, type ScanHistoryRecord } from "../services/history-service";
import { ScanHistoryList } from "./ScanHistoryList";

vi.mock("../services/history-service", () => ({
  deleteScanHistoryRecord: vi.fn(),
  exportScanHistoryRecord: vi.fn(),
  loadScanReport: vi.fn(),
}));

const exportScanHistoryRecordMock = vi.mocked(exportScanHistoryRecord);

describe("ScanHistoryList exports", () => {
  beforeEach(() => {
    exportScanHistoryRecordMock.mockReset();
    exportScanHistoryRecordMock.mockResolvedValue("/Users/krisarmstrong/Desktop/maple-scan.xml");
  });

  it("exports raw scan XML from history", async () => {
    render(<ScanHistoryList records={[scanRecord("scan-1")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Export XML" }));

    expect(exportScanHistoryRecordMock).toHaveBeenCalledWith("scan-1", "xml");
  });

  it("exports raw scan JSON from history", async () => {
    render(<ScanHistoryList records={[scanRecord("scan-1")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Export JSON" }));

    expect(exportScanHistoryRecordMock).toHaveBeenCalledWith("scan-1", "json");
  });

  it("exports markdown reports from history", async () => {
    render(<ScanHistoryList records={[scanRecord("scan-1")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Export Report" }));

    expect(exportScanHistoryRecordMock).toHaveBeenCalledWith("scan-1", "markdown");
  });

  it("shows where an export was saved", async () => {
    exportScanHistoryRecordMock.mockResolvedValue("/Users/krisarmstrong/Desktop/maple-scan.md");
    render(<ScanHistoryList records={[scanRecord("scan-1")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Export Report" }));

    expect(
      await screen.findByText("Exported to /Users/krisarmstrong/Desktop/maple-scan.md"),
    ).toBeInTheDocument();
  });
});

function scanRecord(runId: string): ScanHistoryRecord {
  return {
    runId,
    startedAt: "2026-06-12T10:00:00Z",
    finishedAt: "2026-06-12T10:00:05Z",
    command: ["nmap", "-oX", "<managed-xml-file>", "-sn", "--", "scanme.nmap.org"],
    profileName: "TCP Connect",
    elapsedTime: "5.00",
    targets: [{ value: "scanme.nmap.org", kind: "hostname" }],
    hosts: [],
    exitCode: 0,
    targetCount: 1,
    hostCount: 0,
    hostsUp: 0,
    hostsDown: 0,
    openPortCount: 0,
  };
}
