import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AppVersion,
  DetectTools,
  LoadNmapHelp,
  OpenNmapDownloads,
  OpenNmapNSEDocs,
  OpenNmapReferenceGuide,
} from "../../wailsjs/go/main/App";
import {
  appVersion,
  detectTools,
  loadNmapHelp,
  openNmapDownloads,
  openNmapNSEDocs,
  openNmapReferenceGuide,
} from "./tool-service";

vi.mock("../../wailsjs/go/main/App", () => ({
  AppVersion: vi.fn(),
  DetectTools: vi.fn(),
  LoadNmapHelp: vi.fn(),
  OpenNmapDownloads: vi.fn(),
  OpenNmapNSEDocs: vi.fn(),
  OpenNmapReferenceGuide: vi.fn(),
}));

const appVersionMock = vi.mocked(AppVersion);
const detectToolsMock = vi.mocked(DetectTools);
const loadNmapHelpMock = vi.mocked(LoadNmapHelp);
const openNmapDownloadsMock = vi.mocked(OpenNmapDownloads);
const openNmapNSEDocsMock = vi.mocked(OpenNmapNSEDocs);
const openNmapReferenceGuideMock = vi.mocked(OpenNmapReferenceGuide);

describe("tool-service", () => {
  beforeEach(() => {
    appVersionMock.mockReset();
    detectToolsMock.mockReset();
    loadNmapHelpMock.mockReset();
    openNmapDownloadsMock.mockReset();
    openNmapNSEDocsMock.mockReset();
    openNmapReferenceGuideMock.mockReset();
    setBackendBridge({ main: { App: {} } });
  });

  it("loads app version metadata from the Wails backend", async () => {
    appVersionMock.mockResolvedValue({
      version: "v0.2.0",
      commit: "abc1234",
      buildTime: "2026-06-15T14:00:00Z",
      uiBuildHash: "uihash",
    });

    await expect(appVersion()).resolves.toEqual({
      version: "v0.2.0",
      commit: "abc1234",
      buildTime: "2026-06-15T14:00:00Z",
      uiBuildHash: "uihash",
    });
  });

  it("returns development version metadata without the Wails backend", async () => {
    setBackendBridge(undefined);

    await expect(appVersion()).resolves.toEqual({
      version: "dev",
      commit: "unknown",
      buildTime: "unknown",
      uiBuildHash: "unknown",
    });
    expect(appVersionMock).not.toHaveBeenCalled();
  });

  it("loads tool detections from the Wails backend", async () => {
    detectToolsMock.mockResolvedValue([
      {
        name: "nmap",
        displayName: "Nmap",
        required: true,
        installed: true,
      },
    ]);

    await expect(detectTools()).resolves.toEqual([
      {
        name: "nmap",
        displayName: "Nmap",
        required: true,
        installed: true,
      },
    ]);
  });

  it("opens official Nmap downloads through the Wails backend", async () => {
    openNmapDownloadsMock.mockResolvedValue(undefined);

    await openNmapDownloads();

    expect(openNmapDownloadsMock).toHaveBeenCalledTimes(1);
  });

  it("loads local Nmap help through the Wails backend", async () => {
    loadNmapHelpMock.mockResolvedValue({
      path: "/usr/local/bin/nmap",
      output: "Nmap usage text",
    });

    await expect(loadNmapHelp()).resolves.toEqual({
      path: "/usr/local/bin/nmap",
      output: "Nmap usage text",
    });
  });

  it("opens official Nmap reference links through the Wails backend", async () => {
    openNmapReferenceGuideMock.mockResolvedValue(undefined);
    openNmapNSEDocsMock.mockResolvedValue(undefined);

    await openNmapReferenceGuide();
    await openNmapNSEDocs();

    expect(openNmapReferenceGuideMock).toHaveBeenCalledTimes(1);
    expect(openNmapNSEDocsMock).toHaveBeenCalledTimes(1);
  });

  it("rejects download opens when the Wails backend is unavailable", async () => {
    setBackendBridge(undefined);

    await expect(openNmapDownloads()).rejects.toThrow("Maple desktop bridge is unavailable.");
    expect(openNmapDownloadsMock).not.toHaveBeenCalled();
  });

  it("rejects help actions when the Wails backend is unavailable", async () => {
    setBackendBridge(undefined);

    await expect(loadNmapHelp()).rejects.toThrow("Maple desktop bridge is unavailable.");
    await expect(openNmapReferenceGuide()).rejects.toThrow("Maple desktop bridge is unavailable.");
    await expect(openNmapNSEDocs()).rejects.toThrow("Maple desktop bridge is unavailable.");
  });
});

function setBackendBridge(go: unknown): void {
  (globalThis as { go?: unknown }).go = go;
}
