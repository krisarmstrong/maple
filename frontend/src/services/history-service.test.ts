import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScanHistory } from "../../wailsjs/go/main/App";
import { loadScanHistory } from "./history-service";

vi.mock("../../wailsjs/go/main/App", () => ({
  ClearScanHistory: vi.fn(),
  DeleteScanHistoryRecord: vi.fn(),
  ExportScanHistoryRecord: vi.fn(),
  ScanHistory: vi.fn(),
  ScanReport: vi.fn(),
}));

const scanHistoryMock = vi.mocked(ScanHistory);

describe("history-service", () => {
  beforeEach(() => {
    scanHistoryMock.mockReset();
  });

  it("maps profile, targets, hosts, and ports from backend history", async () => {
    const backendRecords = [
      {
        runId: "scan-1",
        startedAt: "2026-06-12T10:00:00Z",
        finishedAt: "2026-06-12T10:00:05Z",
        preview: {
          executable: "nmap",
          args: ["-oX", "-", "-sT", "--", "127.0.0.1"],
          profile: { id: "connect", name: "TCP Connect", description: "", args: [] },
          targets: [{ value: "127.0.0.1", kind: "ip" }],
        },
        summary: {
          hostCount: 1,
          hostsUp: 1,
          hostsDown: 0,
          elapsedTime: "0.05",
          hosts: [
            {
              address: "127.0.0.1",
              hostname: "localhost",
              state: "up",
              ports: [{ id: "22", protocol: "tcp", state: "open", service: "ssh" }],
            },
          ],
        },
        exitCode: 0,
        diagnostics: "Strange read error from 127.0.0.1",
      },
    ] as unknown as Awaited<ReturnType<typeof ScanHistory>>;
    scanHistoryMock.mockResolvedValue(backendRecords);

    const records = await loadScanHistory();

    expect(records[0]?.profileName).toBe("TCP Connect");
    expect(records[0]?.elapsedTime).toBe("0.05");
    expect(records[0]?.diagnostics).toBe("Strange read error from 127.0.0.1");
    expect(records[0]?.targets).toEqual([{ value: "127.0.0.1", kind: "ip" }]);
    expect(records[0]?.hosts[0]?.ports[0]).toEqual({
      id: "22",
      protocol: "tcp",
      state: "open",
      service: "ssh",
    });
  });
});
