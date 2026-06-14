import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByText("1 open port")).toBeInTheDocument();
    expect(screen.getByText("22/tcp")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("ssh")).toBeInTheDocument();
  });

  it("groups ports by state and filters result details", async () => {
    render(
      <ScanHistoryDetails
        record={scanRecord({
          hosts: [
            {
              address: "192.0.2.10",
              state: "up",
              ports: [
                { id: "22", protocol: "tcp", state: "open", service: "ssh" },
                { id: "80", protocol: "tcp", state: "closed", reason: "conn-refused" },
                { id: "443", protocol: "tcp", state: "filtered", reason: "no-response" },
              ],
            },
            {
              address: "192.0.2.11",
              state: "down",
              ports: [{ id: "25", protocol: "tcp", state: "closed" }],
            },
          ],
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "All ports" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getAllByText("Open ports").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Closed ports").length).toBeGreaterThan(0);
    expect(screen.getByText("Filtered ports")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open ports" }));

    expect(screen.getByText("22/tcp")).toBeInTheDocument();
    expect(screen.queryByText("80/tcp")).not.toBeInTheDocument();
    expect(screen.queryByText("25/tcp")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hosts up" }));

    expect(screen.getByText("192.0.2.10")).toBeInTheDocument();
    expect(screen.queryByText("192.0.2.11")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hosts with findings" }));

    expect(screen.getByText("192.0.2.10")).toBeInTheDocument();
    expect(screen.queryByText("192.0.2.11")).not.toBeInTheDocument();
  });

  it("searches expanded results by host, service, product, and reason", async () => {
    render(
      <ScanHistoryDetails
        record={scanRecord({
          hosts: [
            {
              address: "192.0.2.10",
              hostname: "web-1",
              state: "up",
              ports: [
                {
                  id: "443",
                  protocol: "tcp",
                  state: "open",
                  service: "https",
                  product: "nginx",
                  reason: "syn-ack",
                },
              ],
            },
            {
              address: "192.0.2.11",
              hostname: "mail-1",
              state: "up",
              ports: [{ id: "25", protocol: "tcp", state: "open", service: "smtp" }],
            },
          ],
        })}
      />,
    );

    await userEvent.type(screen.getByLabelText("Search expanded result"), "nginx");

    expect(screen.getByText("192.0.2.10")).toBeInTheDocument();
    expect(screen.queryByText("192.0.2.11")).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Search expanded result"));
    await userEvent.type(screen.getByLabelText("Search expanded result"), "mail");

    expect(screen.queryByText("192.0.2.10")).not.toBeInTheDocument();
    expect(screen.getByText("192.0.2.11")).toBeInTheDocument();
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
                  extraInfo: "TLS ALPN h2",
                  reason: "syn-ack",
                },
              ],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("https")).toBeInTheDocument();
    expect(screen.getByText("nginx 1.25")).toBeInTheDocument();
    expect(screen.getByText("TLS ALPN h2")).toBeInTheDocument();
    expect(screen.getByText("syn-ack")).toBeInTheDocument();
  });

  it("shows scan result summary metrics", () => {
    render(
      <ScanHistoryDetails
        record={scanRecord({
          hostCount: 4,
          hostsUp: 2,
          hostsDown: 2,
          openPortCount: 3,
          elapsedTime: "5.42",
        })}
      />,
    );

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Hosts total")).toBeInTheDocument();
    expect(screen.getAllByText("2")).toHaveLength(2);
    expect(screen.getByText("Hosts up")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Open ports")).toBeInTheDocument();
    expect(screen.getByText("5.42s")).toBeInTheDocument();
    expect(screen.getByText("Elapsed")).toBeInTheDocument();
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

    expect(screen.getByText("Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Strange read error from 127.0.0.1")).not.toBeVisible();
  });

  it("shows saved scan errors", () => {
    render(
      <ScanHistoryDetails
        record={scanRecord({ error: "Unable to parse Nmap XML: unexpected EOF" })}
      />,
    );

    expect(screen.getByText("Unable to parse Nmap XML: unexpected EOF")).toBeInTheDocument();
  });
});

function scanRecord(overrides: Partial<ScanHistoryRecord> = {}): ScanHistoryRecord {
  return {
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
    ...overrides,
  };
}
