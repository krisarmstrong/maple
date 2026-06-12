import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ScanHistoryRecord } from "../services/history-service";
import { ScanHistoryDetails } from "./ScanHistoryDetails";

describe("ScanHistoryDetails", () => {
  it("shows parsed host and port details", () => {
    render(
      <ScanHistoryDetails
        record={scanRecord({
          hosts: [
            {
              address: "127.0.0.1",
              hostname: "localhost",
              state: "up",
              ports: [{ id: "22", protocol: "tcp", state: "open", service: "ssh" }],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("127.0.0.1")).toBeInTheDocument();
    expect(screen.getByText("localhost")).toBeInTheDocument();
    expect(screen.getByText("Host up")).toBeInTheDocument();
    expect(screen.getByText("22/tcp")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("ssh")).toBeInTheDocument();
  });

  it("shows service product and version when available", () => {
    render(
      <ScanHistoryDetails
        record={scanRecord({
          hosts: [
            {
              address: "192.0.2.10",
              state: "up",
              ports: [
                {
                  id: "443",
                  protocol: "tcp",
                  state: "open",
                  service: "https",
                  product: "nginx",
                  version: "1.25",
                },
              ],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("https")).toBeInTheDocument();
    expect(screen.getByText("nginx 1.25")).toBeInTheDocument();
  });

  it("explains when host counts exist without host rows", () => {
    render(<ScanHistoryDetails record={scanRecord({ hostCount: 1, hostsUp: 0 })} />);

    expect(
      screen.getByText("Nmap reported 0/1 hosts up, but did not include host rows."),
    ).toBeInTheDocument();
  });

  it("shows when a host has no reported ports", () => {
    render(
      <ScanHistoryDetails
        record={scanRecord({ hosts: [{ address: "192.0.2.10", state: "up", ports: [] }] })}
      />,
    );

    expect(screen.getByText("No ports reported for this host.")).toBeInTheDocument();
  });

  it("shows saved diagnostics", () => {
    render(
      <ScanHistoryDetails
        record={scanRecord({ diagnostics: "Strange read error from 127.0.0.1" })}
      />,
    );

    expect(screen.getByText("Strange read error from 127.0.0.1")).toBeInTheDocument();
  });
});

function scanRecord(overrides: Partial<ScanHistoryRecord> = {}): ScanHistoryRecord {
  return {
    runId: "scan-1",
    startedAt: "2026-06-12T10:00:00Z",
    finishedAt: "2026-06-12T10:00:05Z",
    command: ["nmap", "-oX", "-", "-sn", "--", "scanme.nmap.org"],
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
