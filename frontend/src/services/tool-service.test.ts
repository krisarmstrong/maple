import { beforeEach, describe, expect, it, vi } from "vitest";
import { DetectTools, OpenNmapDownloads } from "../../wailsjs/go/main/App";
import { detectTools, openNmapDownloads } from "./tool-service";

vi.mock("../../wailsjs/go/main/App", () => ({
  DetectTools: vi.fn(),
  OpenNmapDownloads: vi.fn(),
}));

const detectToolsMock = vi.mocked(DetectTools);
const openNmapDownloadsMock = vi.mocked(OpenNmapDownloads);

describe("tool-service", () => {
  beforeEach(() => {
    detectToolsMock.mockReset();
    openNmapDownloadsMock.mockReset();
    setBackendBridge({ main: { App: {} } });
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

  it("rejects download opens when the Wails backend is unavailable", async () => {
    setBackendBridge(undefined);

    await expect(openNmapDownloads()).rejects.toThrow("Maple desktop bridge is unavailable.");
    expect(openNmapDownloadsMock).not.toHaveBeenCalled();
  });
});

function setBackendBridge(go: unknown): void {
  (globalThis as { go?: unknown }).go = go;
}
