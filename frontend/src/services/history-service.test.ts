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
          args: ["-oX", "<managed-xml-file>", "-sT", "--", "127.0.0.1"],
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
              osMatches: [{ name: "Linux 5.x", accuracy: "98" }],
              extraPorts: [{ state: "filtered", count: 998, reason: "no-responses" }],
              trace: [{ ttl: "1", address: "192.0.2.254", hostname: "gateway", rtt: "1.23" }],
              scripts: [
                {
                  id: "nbstat",
                  output: "NetBIOS name: LOCALHOST",
                  details: [{ kind: "elem", key: "name", value: "LOCALHOST" }],
                },
              ],
              ports: [
                {
                  id: "22",
                  protocol: "tcp",
                  state: "open",
                  service: "ssh",
                  cpes: ["cpe:/a:openbsd:openssh:9.6"],
                  scripts: [
                    {
                      id: "ssh-hostkey",
                      output: "2048 SHA256:abc (RSA)",
                      details: [
                        {
                          kind: "table",
                          key: "rsa",
                          children: [{ kind: "elem", key: "bits", value: "2048" }],
                        },
                      ],
                    },
                  ],
                },
              ],
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
    expect(records[0]?.hosts[0]?.scripts).toEqual([
      {
        id: "nbstat",
        output: "NetBIOS name: LOCALHOST",
        details: [{ kind: "elem", key: "name", value: "LOCALHOST", children: [] }],
      },
    ]);
    expect(records[0]?.hosts[0]?.osMatches).toEqual([{ name: "Linux 5.x", accuracy: "98" }]);
    expect(records[0]?.hosts[0]?.extraPorts).toEqual([
      { state: "filtered", count: 998, reason: "no-responses" },
    ]);
    expect(records[0]?.hosts[0]?.trace).toEqual([
      { ttl: "1", address: "192.0.2.254", hostname: "gateway", rtt: "1.23" },
    ]);
    expect(records[0]?.hosts[0]?.ports[0]).toEqual({
      id: "22",
      protocol: "tcp",
      state: "open",
      service: "ssh",
      cpes: ["cpe:/a:openbsd:openssh:9.6"],
      scripts: [
        {
          id: "ssh-hostkey",
          output: "2048 SHA256:abc (RSA)",
          details: [
            {
              kind: "table",
              key: "rsa",
              children: [{ kind: "elem", key: "bits", value: "2048", children: [] }],
            },
          ],
        },
      ],
    });
  });
});
