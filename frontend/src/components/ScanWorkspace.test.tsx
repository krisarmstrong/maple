import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultScanOptions } from "../core/scan-options";
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
    expect(screen.getByRole("heading", { name: "Target Builder" })).toBeInTheDocument();
    expect(screen.getByLabelText("Targets")).toBeInTheDocument();
    expect(screen.queryByLabelText("Custom .nse script files")).not.toBeInTheDocument();
  });

  it("shows compact command center context above the scan panels", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);
    const context = within(screen.getByLabelText("Scan context"));

    expect(context.getByText("Scan context")).toBeInTheDocument();
    expect(context.getByText(/TCP Connect/u)).toBeInTheDocument();
    expect(context.getByText(/Single host\/IP/u)).toBeInTheDocument();
    expect(context.getByText(/Ready to preview/u)).toBeInTheDocument();
    expect(context.getByText(/No target set/u)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });

    expect(context.getByText(/1 hostname/u)).toBeInTheDocument();
  });

  it("renders the scan subtitle once", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(
      screen.getAllByText(
        "Choose a safe profile, validate targets, preview argv, then run Nmap locally.",
      ),
    ).toHaveLength(1);
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

  it("saves the current scan configuration as a preset", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.selectOptions(screen.getByLabelText("Profile"), "service");
    await userEvent.type(screen.getByLabelText("Preset name"), "Web TLS check");
    await userEvent.click(screen.getByRole("button", { name: "Save Preset" }));

    expect(screen.getByRole("option", { name: "Web TLS check" })).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByRole("button", { name: "Output" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Preview argv" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Run status" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Live log" })).toBeInTheDocument();
    expect(screen.getByText("Preview ready")).toBeInTheDocument();
    expect(
      screen.getByText("Raw XML is captured for History exports, not shown here."),
    ).toBeInTheDocument();
    expect(screen.getByText("nmap")).toHaveClass("argv-token");
    expect(screen.getByText("--")).toHaveClass("argv-token");
    expect(
      await screen.findByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
    ).toBeInTheDocument();
  });

  it("shows preview validation errors from the backend", async () => {
    previewScanCommandMock.mockRejectedValue(new Error("enter valid structured Nmap options"));
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findByText("enter valid structured Nmap options")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configure" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows scan start errors from the backend", async () => {
    startScanMock.mockRejectedValue(new Error("enter known NSE categories"));
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });
    await userEvent.click(screen.getByRole("button", { name: "Run Scan" }));

    expect(await screen.findByText("enter known NSE categories")).toBeInTheDocument();
    expect(screen.queryByText("Scan running")).not.toBeInTheDocument();
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
      "ssl-cert",
      "--script",
      "/Users/krisarmstrong/Scripts/custom-check.nse",
      "--script",
      "/Users/krisarmstrong/Scripts/nse-pack",
      "--script-args",
      "http.useragent=Maple",
      "--script-args-file",
      "/Users/krisarmstrong/nse-args.txt",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.selectOptions(screen.getByLabelText("Profile"), "service");
    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "safe" }));
    fireEvent.change(screen.getByLabelText("Built-in script names"), {
      target: { value: "http-title" },
    });
    fireEvent.change(screen.getByLabelText("Find built-in scripts"), { target: { value: "ssl" } });
    await userEvent.click(screen.getByRole("checkbox", { name: "ssl-cert" }));
    fireEvent.change(screen.getByLabelText("Custom .nse script files"), {
      target: { value: "/Users/krisarmstrong/Scripts/custom-check.nse" },
    });
    fireEvent.change(screen.getByLabelText("Custom script directories"), {
      target: { value: "/Users/krisarmstrong/Scripts/nse-pack" },
    });
    fireEvent.change(screen.getByLabelText("Script arguments"), {
      target: { value: "http.useragent=Maple" },
    });
    fireEvent.change(screen.getByLabelText("Script arguments file"), {
      target: { value: "/Users/krisarmstrong/nse-args.txt" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(previewScanCommandMock).toHaveBeenCalledWith({
      profileId: "service",
      targets: "scanme.nmap.org",
      nmapPath: "/usr/local/bin/nmap",
      scriptArgs: "http.useragent=Maple",
      scriptArgsFile: "/Users/krisarmstrong/nse-args.txt",
      options: {
        ...defaultScanOptions,
      },
      scripts: [
        { kind: "category", value: "safe" },
        { kind: "name", value: "http-title" },
        { kind: "name", value: "ssl-cert" },
        { kind: "path", value: "/Users/krisarmstrong/Scripts/custom-check.nse" },
        { kind: "path", value: "/Users/krisarmstrong/Scripts/nse-pack" },
      ],
    });
    expect(
      await screen.findByText(
        "nmap -oX <managed-xml-file> -sV --version-light --script safe --script http-title --script ssl-cert --script /Users/krisarmstrong/Scripts/custom-check.nse --script /Users/krisarmstrong/Scripts/nse-pack --script-args http.useragent=Maple --script-args-file /Users/krisarmstrong/nse-args.txt -- scanme.nmap.org",
      ),
    ).toBeInTheDocument();
  });

  it("adds structured scan options to preview requests", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sU",
      "-PS22,80,443",
      "-PA80,443",
      "-PU53,161",
      "-PY3868",
      "-PE",
      "-PP",
      "-PM",
      "-T4",
      "-p",
      "22,80,443",
      "-sV",
      "--version-all",
      "-6",
      "-O",
      "--traceroute",
      "-n",
      "-vv",
      "--reason",
      "--open",
      "--min-rate",
      "500",
      "--max-retries",
      "2",
      "--host-timeout",
      "30m",
      "--max-rtt-timeout",
      "2s",
      "--stats-every",
      "10s",
      "--scan-delay",
      "50ms",
      "--max-scan-delay",
      "1s",
      "--min-parallelism",
      "4",
      "--max-parallelism",
      "64",
      "-f",
      "--data-length",
      "24",
      "--source-port",
      "53",
      "-D",
      "ME,198.51.100.10,RND:2",
      "-S",
      "192.0.2.20",
      "-e",
      "en0",
      "--spoof-mac",
      "02:11:22:33:44:55",
      "--packet-trace",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.change(screen.getByLabelText("Scan technique"), { target: { value: "udp" } });
    fireEvent.change(screen.getByLabelText("TCP SYN probe ports"), {
      target: { value: "22,80,443" },
    });
    fireEvent.change(screen.getByLabelText("TCP ACK probe ports"), {
      target: { value: "80,443" },
    });
    fireEvent.change(screen.getByLabelText("UDP probe ports"), {
      target: { value: "53,161" },
    });
    fireEvent.change(screen.getByLabelText("SCTP INIT probe ports"), {
      target: { value: "3868" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "ICMP echo probe" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "ICMP timestamp probe" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "ICMP netmask probe" }));
    fireEvent.change(screen.getByLabelText("Timing"), { target: { value: "T4" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Service detection" }));
    fireEvent.change(screen.getByLabelText("Version detail"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Ports"), { target: { value: "22,80,443" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "IPv6" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "OS detection" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Traceroute" }));
    fireEvent.change(screen.getByLabelText("DNS"), { target: { value: "skip" } });
    fireEvent.change(screen.getByLabelText("Output detail"), { target: { value: "debug" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Show reasons" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Only open ports" }));
    fireEvent.change(screen.getByLabelText("Minimum packet rate"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Maximum retries"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Host timeout"), { target: { value: "30m" } });
    fireEvent.change(screen.getByLabelText("Max RTT timeout"), { target: { value: "2s" } });
    fireEvent.change(screen.getByLabelText("Stats interval"), { target: { value: "10s" } });
    fireEvent.change(screen.getByLabelText("Scan delay"), { target: { value: "50ms" } });
    fireEvent.change(screen.getByLabelText("Max scan delay"), { target: { value: "1s" } });
    fireEvent.change(screen.getByLabelText("Minimum parallelism"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Maximum parallelism"), { target: { value: "64" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Fragment packets" }));
    fireEvent.change(screen.getByLabelText("Data length"), { target: { value: "24" } });
    fireEvent.change(screen.getByLabelText("Source port"), { target: { value: "53" } });
    fireEvent.change(screen.getByLabelText("Decoys"), {
      target: { value: "ME,198.51.100.10,RND:2" },
    });
    fireEvent.change(screen.getByLabelText("Source address"), { target: { value: "192.0.2.20" } });
    fireEvent.change(screen.getByLabelText("Network interface"), { target: { value: "en0" } });
    fireEvent.change(screen.getByLabelText("Spoof MAC"), {
      target: { value: "02:11:22:33:44:55" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Packet trace" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(previewScanCommandMock).toHaveBeenCalledWith({
      profileId: "connect",
      targets: "scanme.nmap.org",
      nmapPath: "/usr/local/bin/nmap",
      scripts: [],
      scriptArgs: "",
      scriptArgsFile: "",
      options: {
        ...defaultScanOptions,
        scanTechnique: "udp",
        tcpSynProbes: "22,80,443",
        tcpAckProbes: "80,443",
        udpProbes: "53,161",
        sctpInitProbes: "3868",
        icmpEchoProbe: true,
        icmpTimestamp: true,
        icmpNetmask: true,
        targetInputFile: "",
        excludeTargets: "",
        excludeFile: "",
        serviceDetection: true,
        versionMode: "all",
        timingTemplate: "T4",
        ports: "22,80,443",
        ipv6: true,
        osDetection: true,
        traceroute: true,
        dnsMode: "skip",
        verbosityMode: "debug",
        reason: true,
        openOnly: true,
        minRate: 500,
        maxRetries: "2",
        hostTimeout: "30m",
        maxRttTimeout: "2s",
        statsEvery: "10s",
        scanDelay: "50ms",
        maxScanDelay: "1s",
        minParallelism: 4,
        maxParallelism: 64,
        fragmentPackets: true,
        dataLength: 24,
        sourcePort: "53",
        decoys: "ME,198.51.100.10,RND:2",
        sourceAddress: "192.0.2.20",
        networkInterface: "en0",
        spoofMac: "02:11:22:33:44:55",
        packetTrace: true,
      },
    });
    expect(
      await screen.findByText(
        "nmap -oX <managed-xml-file> -sU -PS22,80,443 -PA80,443 -PU53,161 -PY3868 -PE -PP -PM -T4 -p 22,80,443 -sV --version-all -6 -O --traceroute -n -vv --reason --open --min-rate 500 --max-retries 2 --host-timeout 30m --max-rtt-timeout 2s --stats-every 10s --scan-delay 50ms --max-scan-delay 1s --min-parallelism 4 --max-parallelism 64 -f --data-length 24 --source-port 53 -D ME,198.51.100.10,RND:2 -S 192.0.2.20 -e en0 --spoof-mac 02:11:22:33:44:55 --packet-trace -- scanme.nmap.org",
      ),
    ).toBeInTheDocument();
  }, 30_000);

  it("validates custom MTU and clears it when packet fragmentation is selected", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "--mtu",
      "24",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });
    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    const mtuInput = screen.getByLabelText("Custom MTU");
    await userEvent.type(mtuInput, "9");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(
      screen.getByText("Custom MTU must be a multiple of 8 between 8 and 1500."),
    ).toBeInTheDocument();
    expect(previewScanCommandMock).not.toHaveBeenCalled();

    await userEvent.clear(mtuInput);
    await userEvent.type(mtuInput, "24");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(previewScanCommandMock).toHaveBeenCalledWith({
      profileId: "connect",
      targets: "scanme.nmap.org",
      nmapPath: "/usr/local/bin/nmap",
      scripts: [],
      scriptArgs: "",
      scriptArgsFile: "",
      options: {
        ...defaultScanOptions,
        mtu: 24,
      },
    });
    expect(
      await screen.findByText("nmap -oX <managed-xml-file> --mtu 24 -- scanme.nmap.org"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Fragment packets" }));
    const clearedMTUInput = screen.getByLabelText("Custom MTU");
    expect(clearedMTUInput).toBeDisabled();
    expect(clearedMTUInput).toHaveValue(null);
  });

  it("sends specialized scan techniques through preview requests", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sA",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });
    fireEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.change(screen.getByLabelText("Scan technique"), { target: { value: "ack" } });
    expect(
      screen.getByText(/ACK, Window, Maimon, NULL, FIN, Xmas, SCTP, and IP protocol scans/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(previewScanCommandMock).toHaveBeenCalledWith({
      profileId: "connect",
      targets: "scanme.nmap.org",
      nmapPath: "/usr/local/bin/nmap",
      scripts: [],
      scriptArgs: "",
      scriptArgsFile: "",
      options: {
        ...defaultScanOptions,
        scanTechnique: "ack",
      },
    });
    expect(
      await screen.findByText("nmap -oX <managed-xml-file> -sA -- scanme.nmap.org"),
    ).toBeInTheDocument();
  });

  it("adds target file and exclusion controls to preview requests", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sn",
      "-iL",
      "/Users/krisarmstrong/targets.txt",
      "--exclude",
      "192.168.1.10,scanme.nmap.org",
      "--excludefile",
      "/Users/krisarmstrong/excludes.txt",
      "--",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.selectOptions(screen.getByLabelText("Profile"), "ping");
    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.change(screen.getByLabelText("Target input file"), {
      target: { value: "/Users/krisarmstrong/targets.txt" },
    });
    fireEvent.change(screen.getByLabelText("Exclude targets"), {
      target: { value: "192.168.1.10,scanme.nmap.org" },
    });
    fireEvent.change(screen.getByLabelText("Exclude file"), {
      target: { value: "/Users/krisarmstrong/excludes.txt" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    expect(previewScanCommandMock).toHaveBeenCalledWith({
      profileId: "ping",
      targets: "",
      nmapPath: "/usr/local/bin/nmap",
      scripts: [],
      scriptArgs: "",
      scriptArgsFile: "",
      options: {
        ...defaultScanOptions,
        targetInputFile: "/Users/krisarmstrong/targets.txt",
        excludeTargets: "192.168.1.10,scanme.nmap.org",
        excludeFile: "/Users/krisarmstrong/excludes.txt",
      },
    });
    expect(
      await screen.findByText(
        "nmap -oX <managed-xml-file> -sn -iL /Users/krisarmstrong/targets.txt --exclude 192.168.1.10,scanme.nmap.org --excludefile /Users/krisarmstrong/excludes.txt --",
      ),
    ).toBeInTheDocument();
  });

  it("warns when host discovery changes scan semantics", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    await userEvent.selectOptions(screen.getByLabelText("Host discovery"), "skip");

    expect(
      screen.getByText(
        "Skip host discovery treats every target as online and can make large scans slower.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("TCP SYN probe ports")).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("Host discovery"), "ping");

    expect(
      screen.getByText("Ping discovery only finds live hosts; it does not enumerate ports."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("TCP SYN probe ports")).toBeEnabled();
  });

  it("warns when scan technique can require privileges or run slowly", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    await userEvent.selectOptions(screen.getByLabelText("Scan technique"), "syn");

    expect(
      screen.getByText(
        "TCP SYN scans usually require elevated privileges on macOS, Linux, and Windows.",
      ),
    ).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Scan technique"), "udp");

    expect(
      screen.getByText("UDP scans can be slow and may need elevated privileges for best results."),
    ).toBeInTheDocument();
  });

  it("warns that OS detection may need elevated privileges", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    expect(
      screen.queryByText(
        "OS detection often requires elevated privileges on macOS, Linux, and Windows.",
      ),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "OS detection" }));

    expect(
      screen.getByText(
        "OS detection often requires elevated privileges on macOS, Linux, and Windows.",
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
    expect(screen.getByText("Parsed targets")).toBeInTheDocument();
    expect(screen.getByText("Estimated addresses")).toBeInTheDocument();
    expect(screen.getByText("Accepted syntax")).toBeInTheDocument();
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

    expect(screen.getAllByText("IPv4 range")).toHaveLength(2);
    expect(screen.getByText("Scan an inclusive IPv4 last-octet range.")).toBeInTheDocument();
    expect(screen.getByLabelText("Targets")).toHaveAttribute("placeholder", "192.168.1.1-20");
    expect(screen.getByText("Example:")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.1-20")).toBeInTheDocument();
    expect(screen.getByLabelText("Targets")).toHaveValue("");
    expect(screen.queryByText("1 IPv4 range")).not.toBeInTheDocument();
  });

  it("labels the target field for the selected target intent", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getByText("Single hostname or IP")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Subnet" }));
    expect(screen.getByText("CIDR subnet")).toBeInTheDocument();
    expect(screen.getByLabelText("Targets")).toHaveAttribute("placeholder", "192.168.1.0/24");

    await userEvent.click(screen.getByRole("radio", { name: "Target list" }));
    expect(screen.getAllByText("Target list")).toHaveLength(2);
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

  it("shows selected script chips and removes one without editing textarea text", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    await userEvent.type(screen.getByLabelText("Built-in script names"), "http-title\nssl-cert");

    expect(screen.getByText("Selected scripts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove http-title" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove http-title" }));

    expect(screen.queryByRole("button", { name: "Remove http-title" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Built-in script names")).toHaveValue("ssl-cert");
  });

  it("labels risky NSE categories", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));

    expect(screen.getByText("vuln")).toBeInTheDocument();
    expect(screen.getAllByText("Use carefully")).not.toHaveLength(0);
    expect(
      screen.getByText("May be intrusive, exploit-oriented, or disruptive."),
    ).toBeInTheDocument();
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
