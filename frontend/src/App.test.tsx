import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { clearScanHistory, loadScanHistory } from "./services/history-service";
import { detectTools } from "./services/tool-service";

vi.mock("./services/history-service", () => ({
  clearScanHistory: vi.fn(),
  loadScanHistory: vi.fn(),
}));

vi.mock("./services/tool-service", () => ({
  detectTools: vi.fn(),
}));

const detectToolsMock = vi.mocked(detectTools);
const clearScanHistoryMock = vi.mocked(clearScanHistory);
const loadScanHistoryMock = vi.mocked(loadScanHistory);

describe("App", () => {
  beforeEach(() => {
    clearScanHistoryMock.mockReset();
    clearScanHistoryMock.mockResolvedValue(undefined);
    detectToolsMock.mockReset();
    loadScanHistoryMock.mockReset();
    loadScanHistoryMock.mockResolvedValue([]);
    window.localStorage?.removeItem("maple.themeMode");
  });

  it("shows detected local tools", async () => {
    detectToolsMock.mockResolvedValue([
      {
        name: "nmap",
        displayName: "Nmap",
        required: true,
        installed: true,
        version: "Nmap version 7.95",
      },
    ]);

    render(<App />);

    expect(screen.getByRole("heading", { name: "Modern Nmap workbench" })).toBeInTheDocument();
    expect(await screen.findByText("Nmap version 7.95")).toBeInTheDocument();
    expect(screen.getByText("1 tools detected")).toBeInTheDocument();
  });

  it("defaults theme selection to system mode", () => {
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
  });

  it("refreshes tool detection on demand", async () => {
    detectToolsMock
      .mockResolvedValueOnce([
        {
          name: "nmap",
          displayName: "Nmap",
          required: true,
          installed: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          name: "nmap",
          displayName: "Nmap",
          required: true,
          installed: true,
          version: "Nmap version 7.95",
        },
      ]);

    render(<App />);

    expect(await screen.findByText("Required")).toBeInTheDocument();
    const refreshButtons = screen.getAllByRole("button", { name: "Refresh" });
    await userEvent.click(refreshButtons.at(-1) as HTMLButtonElement);

    expect(await screen.findByText("Nmap version 7.95")).toBeInTheDocument();
    expect(detectToolsMock).toHaveBeenCalledTimes(2);
  });

  it("confirms before clearing scan history", async () => {
    detectToolsMock.mockResolvedValue([]);
    loadScanHistoryMock
      .mockResolvedValueOnce([
        {
          runId: "scan-1",
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
        },
      ])
      .mockResolvedValueOnce([]);

    render(<App />);

    await screen.findByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Clear History" }));

    expect(clearScanHistoryMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirm Clear" }));

    expect(clearScanHistoryMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("No completed scans yet.")).toBeInTheDocument();
  });
});
