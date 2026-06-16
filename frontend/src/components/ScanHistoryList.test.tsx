import { render, screen, within } from "@testing-library/react";
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
    expect(
      screen.getByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
    ).toBeInTheDocument();
    expect(screen.getByText("1 target, scanme.nmap.org, 5.00s, exit 0")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 1 scans")).toBeInTheDocument();
  });

  it("previews an Ndiff argv for two saved XML records", async () => {
    render(
      <ScanHistoryList
        records={[
          scanRecord("scan-current", {
            finishedAt: "2026-06-12T11:00:00Z",
            xmlPath: "/Users/you/.config/Maple/records/scan-current.xml",
          }),
          scanRecord("scan-baseline", {
            finishedAt: "2026-06-12T10:00:00Z",
            xmlPath: "/Users/you/.config/Maple/records/scan-baseline.xml",
          }),
        ]}
      />,
    );

    const compare = screen.getByLabelText("Ndiff compare preview");
    expect(within(compare).getByText("Compare saved XML")).toBeInTheDocument();
    expect(within(compare).getByText("ndiff")).toBeInTheDocument();
    expect(
      within(compare).getByText("/Users/you/.config/Maple/records/scan-baseline.xml"),
    ).toBeInTheDocument();
    expect(
      within(compare).getByText("/Users/you/.config/Maple/records/scan-current.xml"),
    ).toBeInTheDocument();

    await userEvent.selectOptions(within(compare).getByLabelText("Current"), "scan-baseline");

    expect(
      within(compare).getByText("Choose two different scans to preview an Ndiff comparison."),
    ).toBeInTheDocument();
  });

  it("filters history by search text", async () => {
    render(
      <ScanHistoryList
        records={[
          scanRecord("scan-1", { targets: [{ value: "scanme.nmap.org", kind: "hostname" }] }),
          scanRecord("scan-2", {
            profileName: "Service Scan",
            targets: [{ value: "router.local", kind: "hostname" }],
          }),
        ]}
      />,
    );

    await userEvent.type(screen.getByLabelText("Search history"), "router");

    expect(screen.queryByText("TCP Connect")).not.toBeInTheDocument();
    expect(screen.getByText("Service Scan")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2 scans")).toBeInTheDocument();
  });

  it("filters history by scan outcome", async () => {
    render(
      <ScanHistoryList
        records={[
          scanRecord("scan-1", { openPortCount: 2, hostCount: 1, hostsUp: 1 }),
          scanRecord("scan-2", { error: "Unable to parse Nmap XML: unexpected EOF" }),
        ]}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Show"), "errors");

    expect(screen.queryByText("2 open ports")).not.toBeInTheDocument();
    expect(screen.getByText("Unable to parse Nmap XML: unexpected EOF")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2 scans")).toBeInTheDocument();
  });

  it("sorts visible scans by findings and review state", async () => {
    render(
      <ScanHistoryList
        records={[
          scanRecord("scan-1", {
            finishedAt: "2026-06-12T10:00:00Z",
            openPortCount: 1,
          }),
          scanRecord("scan-2", {
            error: "Unable to parse Nmap XML: unexpected EOF",
            finishedAt: "2026-06-12T11:00:00Z",
          }),
          scanRecord("scan-3", {
            finishedAt: "2026-06-12T09:00:00Z",
            openPortCount: 9,
          }),
        ]}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Sort"), "open-ports");

    expect(visibleRunOrder()).toEqual(["scan-3", "scan-1", "scan-2"]);

    await userEvent.selectOptions(screen.getByLabelText("Sort"), "needs-review");

    expect(visibleRunOrder()).toEqual(["scan-2", "scan-1", "scan-3"]);
  });

  it("shows an empty filtered history state", async () => {
    render(<ScanHistoryList records={[scanRecord("scan-1")]} />);

    await userEvent.type(screen.getByLabelText("Search history"), "missing.example");

    expect(screen.getByText("No scans match the current filters.")).toBeInTheDocument();
    expect(screen.getByText("Showing 0 of 1 scans")).toBeInTheDocument();
  });

  it("renders parsed host counts when XML summary is available", () => {
    render(
      <ScanHistoryList
        records={[
          scanRecord("scan-2", {
            command: ["nmap", "-oX", "<managed-xml-file>", "-sn", "--", "192.0.2.0/30"],
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
            command: [
              "nmap",
              "-oX",
              "<managed-xml-file>",
              "-sV",
              "--version-light",
              "--",
              "192.0.2.1",
            ],
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
    diagnostics: "",
    ...overrides,
  };
}

function visibleRunOrder(): string[] {
  return screen.getAllByRole("article").map((article) => article.getAttribute("data-run-id") ?? "");
}
