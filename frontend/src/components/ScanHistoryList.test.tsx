import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteScanHistoryRecord,
  loadScanReport,
  type ScanHistoryRecord,
} from "../services/history-service";
import { ScanHistoryList } from "./ScanHistoryList";

vi.mock("../services/history-service", () => ({
  deleteScanHistoryRecord: vi.fn(),
  loadScanReport: vi.fn(),
}));

const deleteScanHistoryRecordMock = vi.mocked(deleteScanHistoryRecord);
const loadScanReportMock = vi.mocked(loadScanReport);

describe("ScanHistoryList", () => {
  beforeEach(() => {
    deleteScanHistoryRecordMock.mockReset();
    deleteScanHistoryRecordMock.mockResolvedValue(undefined);
    loadScanReportMock.mockReset();
  });

  it("shows an empty history message", () => {
    render(<ScanHistoryList records={[]} />);

    expect(screen.getByText("No completed scans yet.")).toBeInTheDocument();
  });

  it("renders completed scan commands", () => {
    render(<ScanHistoryList records={[scanRecord("scan-1")]} />);

    expect(screen.getByText("TCP Connect")).toBeInTheDocument();
    expect(screen.getByText("nmap -oX - -sn -- scanme.nmap.org")).toBeInTheDocument();
    expect(screen.getByText("1 target, scanme.nmap.org, 5.00s, exit 0")).toBeInTheDocument();
  });

  it("renders parsed host counts when XML summary is available", () => {
    render(
      <ScanHistoryList
        records={[
          scanRecord("scan-2", {
            command: ["nmap", "-oX", "-", "-sn", "--", "192.0.2.0/30"],
            hostCount: 2,
            hostsUp: 1,
            hostsDown: 1,
          }),
        ]}
      />,
    );

    expect(
      screen.getByText("1 target, scanme.nmap.org, 5.00s, 1/2 hosts up, exit 0"),
    ).toBeInTheDocument();
  });

  it("renders runstats-only host counts when host rows are omitted", () => {
    render(
      <ScanHistoryList
        records={[
          scanRecord("scan-4", {
            hostCount: 1,
            hostsUp: 0,
            hostsDown: 1,
          }),
        ]}
      />,
    );

    expect(
      screen.getByText("1 target, scanme.nmap.org, 5.00s, 0/1 hosts up, exit 0"),
    ).toBeInTheDocument();
  });

  it("renders open port counts when available", () => {
    render(
      <ScanHistoryList
        records={[
          scanRecord("scan-3", {
            command: ["nmap", "-oX", "-", "-sV", "--version-light", "--", "192.0.2.1"],
            hostCount: 1,
            hostsUp: 1,
            openPortCount: 2,
          }),
        ]}
      />,
    );

    expect(
      screen.getByText("1 target, scanme.nmap.org, 5.00s, 1/1 hosts up, 2 open ports, exit 0"),
    ).toBeInTheDocument();
  });

  it("loads a report for a completed scan", async () => {
    loadScanReportMock.mockResolvedValue("# Maple Scan Report\n\n- Run ID: scan-1\n");
    render(<ScanHistoryList records={[scanRecord("scan-1")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Report" }));

    expect(loadScanReportMock).toHaveBeenCalledWith("scan-1");
    expect(await screen.findByText(/Maple Scan Report/)).toBeInTheDocument();
  });

  it("hides an open report without loading it again", async () => {
    loadScanReportMock.mockResolvedValue("# Maple Scan Report\n");
    render(<ScanHistoryList records={[scanRecord("scan-1")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Report" }));
    expect(await screen.findByText(/Maple Scan Report/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide Report" }));

    expect(screen.queryByText(/Maple Scan Report/)).not.toBeInTheDocument();
    expect(loadScanReportMock).toHaveBeenCalledTimes(1);
  });

  it("confirms before deleting a completed scan", async () => {
    const onChanged = vi.fn();
    render(<ScanHistoryList onChanged={onChanged} records={[scanRecord("scan-1")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteScanHistoryRecordMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirm Delete" }));

    expect(deleteScanHistoryRecordMock).toHaveBeenCalledWith("scan-1");
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("cancels pending delete when loading a report", async () => {
    loadScanReportMock.mockResolvedValue("# Maple Scan Report\n");
    render(<ScanHistoryList records={[scanRecord("scan-1")]} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Report" }));

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});

function scanRecord(runId: string, overrides: Partial<ScanHistoryRecord> = {}): ScanHistoryRecord {
  return {
    runId,
    startedAt: "2026-06-12T10:00:00Z",
    finishedAt: "2026-06-12T10:00:05Z",
    command: ["nmap", "-oX", "-", "-sn", "--", "scanme.nmap.org"],
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
    diagnostics: "",
    ...overrides,
  };
}
