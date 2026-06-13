import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelScan,
  onScanEvent,
  previewScanCommand,
  type ScanEvent,
  startScan,
} from "../services/scan-service";
import { ScanWorkspace } from "./ScanWorkspace";

vi.mock("../services/scan-service", () => ({
  cancelScan: vi.fn(),
  onScanEvent: vi.fn(() => vi.fn()),
  previewScanCommand: vi.fn(),
  startScan: vi.fn(),
}));

const cancelScanMock = vi.mocked(cancelScan);
const onScanEventMock = vi.mocked(onScanEvent);
const previewScanCommandMock = vi.mocked(previewScanCommand);
const startScanMock = vi.mocked(startScan);
let scanEventListener: ((event: ScanEvent) => void) | undefined;

describe("ScanWorkspace", () => {
  beforeEach(() => {
    cancelScanMock.mockReset();
    onScanEventMock.mockReset();
    onScanEventMock.mockImplementation((listener) => {
      scanEventListener = listener;
      return vi.fn();
    });
    previewScanCommandMock.mockReset();
    startScanMock.mockReset();
    scanEventListener = undefined;
  });

  it("defaults to the TCP connect profile", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getByLabelText("Profile")).toHaveValue("connect");
  });

  it("starts on the Configure tab with script controls out of the primary path", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getByRole("button", { name: "Configure" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByLabelText("Targets")).toBeInTheDocument();
    expect(screen.queryByLabelText("Custom .nse script files")).not.toBeInTheDocument();
  });

  it("opens NSE controls from the Scripts tab", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));

    expect(screen.getByRole("button", { name: "Scripts" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("NSE scripts")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom .nse script files")).toBeInTheDocument();
    expect(screen.queryByLabelText("Targets")).not.toBeInTheDocument();
  });

  it("shows the selected profile description and profile argv", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getByText("Unprivileged TCP scan for local desktop use.")).toBeInTheDocument();
    expect(screen.getByText("-sT -Pn -T3 --top-ports 100")).toBeInTheDocument();
  });

  it("previews a safe argv command for valid targets", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sn",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("button", { name: "Output" })).toHaveAttribute("aria-current", "page");
    expect(
      await screen.findByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
    ).toBeInTheDocument();
  });

  it("adds NSE categories, built-in script names, and custom scripts to preview requests", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sV",
      "--version-light",
      "--script",
      "safe",
      "--script",
      "http-title",
      "--script",
      "/Users/krisarmstrong/Scripts/custom-check.nse",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.selectOptions(screen.getByLabelText("Profile"), "service");
    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "safe" }));
    await userEvent.type(screen.getByLabelText("Built-in script names"), "http-title");
    await userEvent.type(
      screen.getByLabelText("Custom .nse script files"),
      "/Users/krisarmstrong/Scripts/custom-check.nse",
    );
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(previewScanCommandMock).toHaveBeenCalledWith({
      profileId: "service",
      targets: "scanme.nmap.org",
      nmapPath: "/usr/local/bin/nmap",
      options: {
        timingTemplate: "",
        ports: "",
        topPorts: 0,
        allPorts: false,
        ipv6: false,
        osDetection: false,
        traceroute: false,
        dnsMode: "",
      },
      scripts: [
        { kind: "category", value: "safe" },
        { kind: "name", value: "http-title" },
        { kind: "path", value: "/Users/krisarmstrong/Scripts/custom-check.nse" },
      ],
    });
    expect(
      await screen.findByText(
        "nmap -oX <managed-xml-file> -sV --version-light --script safe --script http-title --script /Users/krisarmstrong/Scripts/custom-check.nse -- scanme.nmap.org",
      ),
    ).toBeInTheDocument();
  });

  it("adds structured scan options to preview requests", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-T4",
      "-p",
      "22,80,443",
      "-6",
      "-O",
      "--traceroute",
      "-n",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    await userEvent.selectOptions(screen.getByLabelText("Timing"), "T4");
    await userEvent.type(screen.getByLabelText("Ports"), "22,80,443");
    await userEvent.click(screen.getByRole("checkbox", { name: "IPv6" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "OS detection" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Traceroute" }));
    await userEvent.selectOptions(screen.getByLabelText("DNS"), "skip");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(previewScanCommandMock).toHaveBeenCalledWith({
      profileId: "connect",
      targets: "scanme.nmap.org",
      nmapPath: "/usr/local/bin/nmap",
      scripts: [],
      options: {
        timingTemplate: "T4",
        ports: "22,80,443",
        topPorts: 0,
        allPorts: false,
        ipv6: true,
        osDetection: true,
        traceroute: true,
        dnsMode: "skip",
      },
    });
    expect(
      await screen.findByText(
        "nmap -oX <managed-xml-file> -T4 -p 22,80,443 -6 -O --traceroute -n -- scanme.nmap.org",
      ),
    ).toBeInTheDocument();
  });

  it("clears stale command previews when targets change", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sn",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      await screen.findByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Configure" }));
    await userEvent.type(screen.getByLabelText("Targets"), ", 127.0.0.1");

    expect(
      screen.queryByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
    ).not.toBeInTheDocument();
  });

  it("clears stale command previews when profile changes", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sn",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    await userEvent.click(screen.getByRole("button", { name: "Configure" }));
    await userEvent.selectOptions(screen.getByLabelText("Profile"), "ping");

    expect(
      screen.queryByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
    ).not.toBeInTheDocument();
  });

  it("clears stale command previews when NSE scripts change", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sn",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(
      await screen.findByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "safe" }));

    expect(
      screen.queryByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
    ).not.toBeInTheDocument();
  });

  it("shows live run status transitions", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    act(() => {
      scanEventListener?.({ type: "started", runId: "scan-1" });
    });
    expect(screen.getByText("Scan running")).toBeInTheDocument();

    act(() => {
      scanEventListener?.({
        type: "finished",
        result: { runId: "scan-1", exitCode: 0, xml: "<nmaprun />" },
      });
    });
    expect(screen.getByText("Scan complete")).toBeInTheDocument();
  });

  it("summarizes target kinds before running", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("radio", { name: "Target list" }));
    await userEvent.clear(screen.getByLabelText("Targets"));
    await userEvent.type(
      screen.getByLabelText("Targets"),
      "scanme.nmap.org, 192.168.1.1, 10.0.0.0/24, 192.168.1.1-20",
    );

    expect(
      screen.getByText("1 hostname, 1 IP address, 1 subnet, 1 IPv4 range"),
    ).toBeInTheDocument();
    expect(screen.getByText("4 target expressions, up to 278 addresses")).toBeInTheDocument();
  });

  it("warns when a larger subnet uses a port scan profile", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("radio", { name: "Subnet" }));
    await userEvent.type(screen.getByLabelText("Targets"), "192.168.1.0/24");

    expect(screen.getByText("1 target expression, up to 256 addresses")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Port scans across many addresses can take a while. Run a Ping Sweep first if you only need host discovery.",
      ),
    ).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Profile"), "ping");

    expect(
      screen.queryByText(
        "Port scans across many addresses can take a while. Run a Ping Sweep first if you only need host discovery.",
      ),
    ).not.toBeInTheDocument();
  });

  it("switches target intent without writing an example into the scan field", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("radio", { name: "IPv4 range" }));

    expect(screen.getByText("Scan an inclusive IPv4 last-octet range.")).toBeInTheDocument();
    expect(screen.getByLabelText("Targets")).toHaveAttribute("placeholder", "192.168.1.1-20");
    expect(screen.getByText("Example:")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.1-20")).toBeInTheDocument();
    expect(screen.getByLabelText("Targets")).toHaveValue("");
    expect(screen.queryByText("1 IPv4 range")).not.toBeInTheDocument();
  });

  it("validates targets against the selected target intent", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("radio", { name: "Subnet" }));
    await userEvent.clear(screen.getByLabelText("Targets"));
    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Run Scan" }));

    expect(startScanMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Subnet mode expects one CIDR target like 192.168.1.0/24."),
    ).toBeInTheDocument();
  });

  it("preserves typed targets when changing target intent", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("radio", { name: "IPv4 range" }));

    expect(screen.getByLabelText("Targets")).toHaveValue("scanme.nmap.org");
    expect(screen.getByText("1 hostname")).toBeInTheDocument();
  });

  it("blocks scan start for invalid targets", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org; rm -rf /");
    await userEvent.click(screen.getByRole("button", { name: "Run Scan" }));

    expect(startScanMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Enter hostnames, IPs, CIDR subnets, or IPv4 ranges separated by commas or new lines.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps XML stdout out of the live scan log", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    act(() => {
      scanEventListener?.({ type: "started", runId: "scan-1" });
      scanEventListener?.({
        type: "output",
        output: { runId: "scan-1", stream: "stdout", text: "<nmaprun><host /></nmaprun>" },
      });
      scanEventListener?.({
        type: "output",
        output: { runId: "scan-1", stream: "stderr", text: "Stats: 0:00:01 elapsed" },
      });
      scanEventListener?.({
        type: "finished",
        result: { runId: "scan-1", exitCode: 0, xml: "<nmaprun />" },
      });
    });

    const log = screen.getByTestId("scan-log");
    expect(log).not.toHaveTextContent("<nmaprun");
    expect(log).toHaveTextContent("Stats: 0:00:01 elapsed");
    expect(log).toHaveTextContent("Scan finished: exit 0. XML captured for history and reports.");
  });
});
