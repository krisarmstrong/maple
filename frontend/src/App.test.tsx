import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { clearScanHistory, loadScanHistory } from "./services/history-service";
import {
  appVersion,
  chooseNmapPath,
  detectNmapPath,
  detectTools,
  loadNmapHelp,
  openNmapDownloads,
  openNmapNSEDocs,
  openNmapReferenceGuide,
} from "./services/tool-service";

vi.mock("./services/history-service", () => ({
  clearScanHistory: vi.fn(),
  loadScanHistory: vi.fn(),
}));

vi.mock("./services/tool-service", () => ({
  appVersion: vi.fn(),
  chooseNmapPath: vi.fn(),
  detectNmapPath: vi.fn(),
  detectTools: vi.fn(),
  loadNmapHelp: vi.fn(),
  openNmapDownloads: vi.fn(),
  openNmapNSEDocs: vi.fn(),
  openNmapReferenceGuide: vi.fn(),
}));

const appVersionMock = vi.mocked(appVersion);
const chooseNmapPathMock = vi.mocked(chooseNmapPath);
const detectNmapPathMock = vi.mocked(detectNmapPath);
const detectToolsMock = vi.mocked(detectTools);
const loadNmapHelpMock = vi.mocked(loadNmapHelp);
const openNmapDownloadsMock = vi.mocked(openNmapDownloads);
const openNmapNSEDocsMock = vi.mocked(openNmapNSEDocs);
const openNmapReferenceGuideMock = vi.mocked(openNmapReferenceGuide);
const clearScanHistoryMock = vi.mocked(clearScanHistory);
const loadScanHistoryMock = vi.mocked(loadScanHistory);

describe("App", () => {
  beforeEach(() => {
    appVersionMock.mockReset();
    appVersionMock.mockResolvedValue({
      version: "dev",
      commit: "unknown",
      buildTime: "unknown",
      uiBuildHash: "unknown",
    });
    clearScanHistoryMock.mockReset();
    clearScanHistoryMock.mockResolvedValue(undefined);
    chooseNmapPathMock.mockReset();
    chooseNmapPathMock.mockResolvedValue("/opt/nmap/bin/nmap");
    detectNmapPathMock.mockReset();
    detectNmapPathMock.mockResolvedValue({
      name: "nmap",
      displayName: "Nmap",
      required: true,
      installed: true,
      path: "/opt/nmap/bin/nmap",
      version: "Nmap version 7.96",
    });
    detectToolsMock.mockReset();
    loadNmapHelpMock.mockReset();
    loadNmapHelpMock.mockResolvedValue({
      path: "/usr/local/bin/nmap",
      output: "Nmap usage: nmap [Scan Type] [Options] {target}",
    });
    openNmapDownloadsMock.mockReset();
    openNmapDownloadsMock.mockResolvedValue(undefined);
    openNmapNSEDocsMock.mockReset();
    openNmapNSEDocsMock.mockResolvedValue(undefined);
    openNmapReferenceGuideMock.mockReset();
    openNmapReferenceGuideMock.mockResolvedValue(undefined);
    loadScanHistoryMock.mockReset();
    loadScanHistoryMock.mockResolvedValue([]);
    window.localStorage?.removeItem("maple.nmapPath");
    window.localStorage?.removeItem("maple.themeMode");
  });

  it("shows the build version in the sidebar footer", async () => {
    appVersionMock.mockResolvedValue({
      version: "v0.2.0",
      commit: "abc1234",
      buildTime: "2026-06-15T14:00:00Z",
      uiBuildHash: "uihash",
    });
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    expect(await screen.findByText("Maple v0.2.0")).toBeInTheDocument();
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
    expect((await screen.findAllByText("1 tools detected")).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /Environment/u }));

    expect(await screen.findByText("Nmap version 7.95")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Environment/u })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens Environment from the missing Nmap scan readiness action", async () => {
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Nmap is missing" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Configure Nmap" }));

    expect(screen.getByRole("button", { name: "Environment, 0 tools detected" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { name: "Tool Detection" })).toBeInTheDocument();
  });

  it("surfaces Ncat, Ndiff, and Nping as separate utility workspaces", async () => {
    detectToolsMock.mockResolvedValue([
      {
        name: "nmap",
        displayName: "Nmap",
        required: true,
        installed: true,
        version: "Nmap version 7.96",
      },
      {
        name: "ncat",
        displayName: "Ncat",
        required: false,
        installed: true,
        version: "Ncat: Version 7.96",
      },
      {
        name: "ndiff",
        displayName: "Ndiff",
        required: false,
        installed: false,
      },
      {
        name: "nping",
        displayName: "Nping",
        required: false,
        installed: true,
        version: "Nping version 7.96",
      },
    ]);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Tools/u }));

    expect(screen.getByRole("heading", { name: "Utility Tools" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ncat" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ndiff" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nping" })).toBeInTheDocument();
    expect(screen.getByText("Ncat: Version 7.96")).toBeInTheDocument();
    expect(screen.getAllByText("Command builder planned")).toHaveLength(3);
    expect(screen.getAllByText("Detected").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Not detected")).toBeInTheDocument();
    expect(
      screen.getByText(
        "These tools stay separate from Nmap scan recipes and keep argv-only execution.",
      ),
    ).toBeInTheDocument();
  });

  it("renders a desktop workbench shell with live status metadata", async () => {
    detectToolsMock.mockResolvedValue([
      {
        name: "nmap",
        displayName: "Nmap",
        required: true,
        installed: true,
        version: "Nmap version 7.99",
      },
    ]);

    render(<App />);

    expect(screen.getByText("Local desktop")).toBeInTheDocument();
    expect(screen.getByText("Release candidate")).toBeInTheDocument();
    expect(screen.getByText("argv-only execution")).toBeInTheDocument();
    expect((await screen.findAllByText("1 tools detected")).length).toBeGreaterThan(0);
  });

  it("gives navigation badges readable accessible names", async () => {
    detectToolsMock.mockResolvedValue([]);
    loadScanHistoryMock.mockResolvedValue([]);

    render(<App />);

    expect(await screen.findByRole("button", { name: "History, 0 scans" })).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Environment, 0 tools detected" }),
    ).toBeInTheDocument();
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

    expect((await screen.findAllByText("1 required tool missing")).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /Environment/u }));
    expect(await screen.findByText("Required")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByText("Nmap version 7.95")).toBeInTheDocument();
    expect(detectToolsMock).toHaveBeenCalledTimes(2);
  });

  it("shows download open failures in the tool detection panel", async () => {
    detectToolsMock.mockResolvedValue([
      {
        name: "nmap",
        displayName: "Nmap",
        required: true,
        installed: false,
      },
    ]);
    openNmapDownloadsMock.mockRejectedValue(new Error("Maple desktop bridge is unavailable."));

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Environment/u }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Open official Nmap downloads" }),
    );

    expect(await screen.findByText("Maple desktop bridge is unavailable.")).toBeInTheDocument();
  });

  it("persists a validated custom Nmap binary from the environment panel", async () => {
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Environment/u }));
    await userEvent.clear(screen.getByLabelText("Custom Nmap binary"));
    await userEvent.type(screen.getByLabelText("Custom Nmap binary"), "/opt/nmap/bin/nmap");
    await userEvent.click(screen.getByRole("button", { name: "Validate and use" }));

    expect(detectNmapPathMock).toHaveBeenCalledWith("/opt/nmap/bin/nmap");
    expect(window.localStorage?.getItem("maple.nmapPath")).toBe("/opt/nmap/bin/nmap");
    expect(await screen.findByText("Nmap version 7.96")).toBeInTheDocument();
  });

  it("clears a custom Nmap binary and returns to PATH detection", async () => {
    window.localStorage?.setItem("maple.nmapPath", "/opt/nmap/bin/nmap");
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Environment/u }));
    await userEvent.click(screen.getByRole("button", { name: "Use PATH detection" }));

    expect(window.localStorage?.getItem("maple.nmapPath")).toBeNull();
    expect(screen.getByLabelText("Custom Nmap binary")).toHaveValue("");
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

    await userEvent.click(await screen.findByRole("button", { name: /History/u }));
    await screen.findByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Clear History" }));

    expect(clearScanHistoryMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Confirm Clear" }));

    expect(clearScanHistoryMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("No completed scans yet.")).toBeInTheDocument();
  });

  it("loads local Nmap help from the Help workspace", async () => {
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Help/u }));
    await userEvent.click(screen.getByRole("button", { name: "Load local Nmap help" }));

    expect(loadNmapHelpMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Loaded from /usr/local/bin/nmap")).toBeInTheDocument();
    expect(screen.getByText("Nmap usage: nmap [Scan Type] [Options] {target}")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Help/u })).toHaveAttribute("aria-current", "page");
  });

  it("filters loaded local Nmap help by line text", async () => {
    detectToolsMock.mockResolvedValue([]);
    loadNmapHelpMock.mockResolvedValue({
      path: "/usr/local/bin/nmap",
      output: [
        "Nmap usage: nmap [Scan Type] [Options] {target}",
        "  -sS: TCP SYN scan",
        "  --script: run selected NSE scripts",
        "  --script-args: pass NSE script arguments",
      ].join("\n"),
    });

    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Help/u }));
    await userEvent.click(screen.getByRole("button", { name: "Load local Nmap help" }));
    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Search local Nmap help" }),
      "script",
    );

    expect(screen.getByText("2 matching lines")).toBeInTheDocument();
    expect(screen.getByText(/--script: run selected NSE scripts/u)).toBeInTheDocument();
    expect(screen.getByText(/--script-args: pass NSE script arguments/u)).toBeInTheDocument();
    expect(screen.queryByText(/-sS: TCP SYN scan/u)).not.toBeInTheDocument();
  });

  it("opens official Nmap reference links from the Help workspace", async () => {
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Help/u }));
    await userEvent.click(screen.getByRole("button", { name: "Open Nmap Reference Guide" }));
    await userEvent.click(screen.getByRole("button", { name: "Open NSE documentation" }));

    expect(openNmapReferenceGuideMock).toHaveBeenCalledTimes(1);
    expect(openNmapNSEDocsMock).toHaveBeenCalledTimes(1);
  });

  it("shows Maple-owned workflow and platform help", async () => {
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Help/u }));

    expect(screen.getByText("Workflow Tips")).toBeInTheDocument();
    expect(screen.getByText("Results Guide")).toBeInTheDocument();
    expect(screen.getByText("Platform Notes")).toBeInTheDocument();
    expect(
      screen.getByText("Maple does not bundle or redistribute Nmap, Npcap, Ncat, Ndiff, or Nping."),
    ).toBeInTheDocument();
  });

  it("shows Nmap option coverage in the Help workspace", async () => {
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Help/u }));

    expect(screen.getByText("Nmap Option Coverage")).toBeInTheDocument();
    expect(screen.getByTestId("option-coverage-readiness")).toHaveClass(
      "coverage-readiness--ready",
    );
    expect(screen.getByText("RC option surface ready")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tracked RC option groups are covered through controls, escape hatches, or intentional blocks.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Structured controls").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Advanced escape hatches").length).toBeGreaterThan(0);
    expect(screen.getByText("Tracked option gaps")).toBeInTheDocument();
    expect(screen.getByText("Raw shell command input")).toBeInTheDocument();
    expect(screen.getAllByText("Blocked by design").length).toBeGreaterThan(0);
    expect(screen.getByText("-sT -sS -sU -sA -sW -sM -sN -sF -sX -sY -sZ -sO")).toBeInTheDocument();
    expect(screen.getByText("--script-args --script-args-file")).toBeInTheDocument();
  });

  it("filters Nmap option coverage by switch text and status", async () => {
    detectToolsMock.mockResolvedValue([]);

    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Help/u }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find option or switch" }), "spoof");

    expect(screen.getByText("Decoys and spoofing")).toBeInTheDocument();
    expect(screen.getByText("-D -S --spoof-mac -e")).toBeInTheDocument();
    expect(screen.queryByText("Raw shell command input")).not.toBeInTheDocument();

    await userEvent.clear(screen.getByRole("searchbox", { name: "Find option or switch" }));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Coverage status" }),
      "blocked",
    );

    expect(screen.getByText("Raw shell command input")).toBeInTheDocument();
    expect(screen.queryByText("Scan technique")).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole("searchbox", { name: "Find option or switch" }), "xyz");

    expect(
      screen.getByText("No Nmap option coverage entries match those filters."),
    ).toBeInTheDocument();
  });

  it("shows local Nmap help failures in the Help workspace", async () => {
    detectToolsMock.mockResolvedValue([]);
    loadNmapHelpMock.mockRejectedValue(new Error("nmap is not installed or not available on PATH"));

    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Help/u }));
    await userEvent.click(screen.getByRole("button", { name: "Load local Nmap help" }));

    expect(
      await screen.findByText("nmap is not installed or not available on PATH"),
    ).toBeInTheDocument();
  });
});
