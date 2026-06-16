import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultScanOptions } from "../core/scan-options";
import { copyText } from "../services/clipboard-service";
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
vi.mock("../services/clipboard-service", () => ({
  copyText: vi.fn(),
}));

const cancelScanMock = vi.mocked(cancelScan);
const copyTextMock = vi.mocked(copyText);
const onScanEventMock = vi.mocked(onScanEvent);
const previewScanCommandMock = vi.mocked(previewScanCommand);
const startScanMock = vi.mocked(startScan);
let scanEventListener: ((event: ScanEvent) => void) | undefined;

async function selectRecipe(value: string): Promise<void> {
  await userEvent.selectOptions(screen.getByLabelText("Scan recipe"), value);
}

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
    copyTextMock.mockReset();
    copyTextMock.mockResolvedValue(undefined);
    scanEventListener = undefined;
  });

  it("defaults to the Top TCP ports scan recipe", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getByText("Selected recipe")).toBeInTheDocument();
    expect(screen.getByLabelText("Scan recipe")).toHaveValue("builtin-top-tcp-ports");
    expect(screen.getAllByText("Top TCP ports").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Quick TCP port check").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Choose a recipe" })).not.toBeInTheDocument();
    expect(screen.queryByText("Base profile")).not.toBeInTheDocument();
    expect(screen.queryByText("TCP Connect")).not.toBeInTheDocument();
  });

  it("starts on the Configure tab with script controls out of the primary path", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getByRole("button", { name: "Configure" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { name: "Targets" })).toBeInTheDocument();
    expect(screen.getByLabelText("Target shape")).toHaveValue("single");
    expect(screen.getByLabelText("Targets")).toBeInTheDocument();
    expect(screen.queryByLabelText("Custom .nse script files")).not.toBeInTheDocument();
  });

  it("explains missing Nmap before enabling scan actions", async () => {
    const onOpenEnvironment = vi.fn();
    render(<ScanWorkspace onOpenEnvironment={onOpenEnvironment} />);

    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Run Scan" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Nmap is missing" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Maple needs a locally installed Nmap binary before it can preview or run scans.",
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Configure Nmap" }));

    expect(onOpenEnvironment).toHaveBeenCalledOnce();
  });

  it("explains target blockers and links back to Configure", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Options" }));

    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Target needs attention" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Fix Target" }));

    expect(screen.getByRole("button", { name: "Configure" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows compact command center context above the scan panels", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);
    const context = within(screen.getByLabelText("Scan context"));

    expect(context.getByText("Scan context")).toBeInTheDocument();
    expect(context.getByText(/Top TCP ports/u)).toBeInTheDocument();
    expect(context.getByText(/Single host\/IP/u)).toBeInTheDocument();
    expect(context.getByText(/Target needs attention/u)).toBeInTheDocument();
    expect(context.getByText(/No target set/u)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });

    expect(context.getByText(/1 hostname/u)).toBeInTheDocument();
    expect(context.getByText(/Ready to preview/u)).toBeInTheDocument();
  });

  it("renders the scan subtitle once", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(
      screen.getAllByText(
        "Choose a target, pick a scan recipe, refine options or scripts, then preview argv before Nmap runs.",
      ),
    ).toHaveLength(1);
  });

  it("opens NSE controls from the Scripts tab", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));

    expect(screen.getByRole("button", { name: "Scripts" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("NSE scripts")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Selected scripts" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Browse scripts" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Custom scripts and arguments" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Custom .nse script files")).toBeInTheDocument();
    expect(screen.queryByLabelText("Targets")).not.toBeInTheDocument();
  });

  it("shows the selected recipe description and default argv", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getAllByText("Recipe defaults").length).toBeGreaterThan(0);
    expect(screen.getByText("Unprivileged TCP scan for local desktop use.")).toBeInTheDocument();
    expect(screen.getByText("-sT -Pn -T3 --top-ports 100")).toBeInTheDocument();
  });

  it("shows built-in scan recipes in the compact picker", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getByRole("heading", { name: "Scan Recipe" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fast host discovery" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "TLS certificate review" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply TLS certificate review" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Service Scan")).not.toBeInTheDocument();
    expect(screen.queryByText("Ping Sweep")).not.toBeInTheDocument();
    expect(screen.queryByText("Quick Scan")).not.toBeInTheDocument();
  });

  it("updates selected recipe details from the compact picker", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await selectRecipe("builtin-web-quick-look");

    expect(screen.getByLabelText("Scan recipe")).toHaveValue("builtin-web-quick-look");
    expect(screen.getAllByText("Web quick look").length).toBeGreaterThan(0);
    expect(screen.getByText("HTTP/HTTPS headers and titles")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Choose a recipe" })).not.toBeInTheDocument();
  });

  it("puts target setup before scan recipe controls", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    const configure = screen.getByTestId("configure-panel");
    const targetBuilder = within(configure).getByRole("heading", { name: "Targets" });
    const recipe = within(configure).getByRole("heading", { name: "Scan Recipe" });

    expect(
      targetBuilder.compareDocumentPosition(recipe) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses compact target fields except for target lists", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getByLabelText("Targets")).toHaveAttribute("rows", "2");
    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "range");
    expect(screen.getByLabelText("Targets")).toHaveAttribute("rows", "2");
    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "subnet");
    expect(screen.getByLabelText("Targets")).toHaveAttribute("rows", "2");
    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "list");
    expect(screen.getByLabelText("Targets")).toHaveAttribute("rows", "7");
  });

  it("saves the current scan configuration as a custom recipe", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await selectRecipe("builtin-service-inventory");
    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "safe" }));
    await userEvent.click(screen.getByRole("button", { name: "Configure" }));
    await userEvent.type(screen.getByLabelText("Recipe name"), "Web TLS check");
    await userEvent.click(screen.getByRole("button", { name: "Save Recipe" }));

    expect(screen.getByRole("option", { name: "Web TLS check" })).toBeInTheDocument();
    expect(screen.getByLabelText("Scan recipe")).toHaveValue("web-tls-check");
    expect(screen.getByText("Custom saved recipe")).toBeInTheDocument();
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
    expect(screen.getAllByText("Preview ready").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Raw XML is captured for History exports, not shown here."),
    ).toBeInTheDocument();
    expect(screen.getByText("nmap")).toHaveClass("argv-token");
    expect(screen.getByText("--")).toHaveClass("argv-token");
    expect(
      await screen.findByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
    ).toBeInTheDocument();
  });

  it("copies the preview argv command from Output", async () => {
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
    await userEvent.click(await screen.findByRole("button", { name: "Copy argv" }));

    expect(copyTextMock).toHaveBeenCalledWith("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org");
    expect(await screen.findByText("Copied argv to clipboard.")).toBeInTheDocument();
  });

  it("shows copy failures without clearing the preview", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sn",
      "--",
      "scanme.nmap.org",
    ]);
    copyTextMock.mockRejectedValue(new Error("Unable to copy argv to clipboard."));
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    await userEvent.click(await screen.findByRole("button", { name: "Copy argv" }));

    expect(await screen.findByText("Unable to copy argv to clipboard.")).toBeInTheDocument();
    expect(
      screen.getByText("nmap -oX <managed-xml-file> -sn -- scanme.nmap.org"),
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

    await selectRecipe("builtin-service-inventory");
    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "safe" }));
    fireEvent.change(screen.getByLabelText("Manual script names"), {
      target: { value: "http-title" },
    });
    fireEvent.change(screen.getByLabelText("Search built-in scripts"), {
      target: { value: "ssl" },
    });
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
        serviceDetection: true,
        versionMode: "light",
        reason: true,
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

  it("browses scripts for selected categories without a search query", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "discovery" }));

    expect(screen.getByRole("group", { name: "Script browser" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "dns-service-discovery" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "smb-os-discovery" })).toBeInTheDocument();
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
      "--max-rate",
      "2000",
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
      "--min-hostgroup",
      "8",
      "--max-hostgroup",
      "256",
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
    fireEvent.change(screen.getByLabelText("Timing"), { target: { value: "T4" } });
    fireEvent.change(screen.getByLabelText("DNS"), { target: { value: "skip" } });

    fireEvent.click(screen.getByRole("button", { name: "Ports" }));
    fireEvent.change(screen.getByLabelText("Version detail"), { target: { value: "all" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Ports" }), {
      target: { value: "22,80,443" },
    });
    fireEvent.change(screen.getByLabelText("Output detail"), { target: { value: "debug" } });

    fireEvent.click(screen.getByRole("button", { name: "Timing" }));
    fireEvent.change(screen.getByLabelText("Minimum packet rate"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Maximum packet rate"), { target: { value: "2000" } });
    fireEvent.change(screen.getByLabelText("Maximum retries"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Host timeout"), { target: { value: "30m" } });
    fireEvent.change(screen.getByLabelText("Max RTT timeout"), { target: { value: "2s" } });
    fireEvent.change(screen.getByLabelText("Stats interval"), { target: { value: "10s" } });
    fireEvent.change(screen.getByLabelText("Scan delay"), { target: { value: "50ms" } });
    fireEvent.change(screen.getByLabelText("Max scan delay"), { target: { value: "1s" } });
    fireEvent.change(screen.getByLabelText("Minimum host group"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Maximum host group"), { target: { value: "256" } });
    fireEvent.change(screen.getByLabelText("Minimum parallelism"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Maximum parallelism"), { target: { value: "64" } });

    fireEvent.click(screen.getByRole("button", { name: "Evasion" }));
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

    fireEvent.click(screen.getByRole("checkbox", { name: "Fragment packets" }));

    fireEvent.click(screen.getByRole("button", { name: "Behavior" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "ICMP echo probe" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "ICMP timestamp probe" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "ICMP netmask probe" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "IPv6" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "OS detection" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Traceroute" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Show reasons" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Only open ports" }));
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
        maxRate: 2000,
        maxRetries: "2",
        hostTimeout: "30m",
        maxRttTimeout: "2s",
        statsEvery: "10s",
        scanDelay: "50ms",
        maxScanDelay: "1s",
        minHostGroup: 8,
        maxHostGroup: 256,
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
        "nmap -oX <managed-xml-file> -sU -PS22,80,443 -PA80,443 -PU53,161 -PY3868 -PE -PP -PM -T4 -p 22,80,443 -sV --version-all -6 -O --traceroute -n -vv --reason --open --min-rate 500 --max-rate 2000 --max-retries 2 --host-timeout 30m --max-rtt-timeout 2s --stats-every 10s --scan-delay 50ms --max-scan-delay 1s --min-hostgroup 8 --max-hostgroup 256 --min-parallelism 4 --max-parallelism 64 -f --data-length 24 --source-port 53 -D ME,198.51.100.10,RND:2 -S 192.0.2.20 -e en0 --spoof-mac 02:11:22:33:44:55 --packet-trace -- scanme.nmap.org",
      ),
    ).toBeInTheDocument();
  }, 30_000);

  it("preserves option values when switching option groups", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    await userEvent.selectOptions(screen.getByLabelText("Scan technique"), "udp");

    await userEvent.click(screen.getByRole("button", { name: "Ports" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ports" }), {
      target: { value: "22,443" },
    });

    await userEvent.click(screen.getByRole("button", { name: "Timing" }));
    fireEvent.change(screen.getByLabelText("Minimum packet rate"), { target: { value: "250" } });

    await userEvent.click(screen.getByRole("button", { name: "Scan shape" }));
    expect(screen.getByLabelText("Scan technique")).toHaveValue("udp");

    await userEvent.click(screen.getByRole("button", { name: "Ports" }));
    expect(screen.getByRole("textbox", { name: "Ports" })).toHaveValue("22,443");

    await userEvent.click(screen.getByRole("button", { name: "Timing" }));
    expect(screen.getByLabelText("Minimum packet rate")).toHaveValue(250);
  });

  it("adds custom version intensity and DNS servers as structured options", async () => {
    previewScanCommandMock.mockResolvedValue([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sV",
      "--version-intensity",
      "7",
      "--dns-servers",
      "1.1.1.1,2606:4700:4700::1111",
      "--",
      "scanme.nmap.org",
    ]);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });
    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.change(screen.getByLabelText("DNS servers"), {
      target: { value: "1.1.1.1,2606:4700:4700::1111" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Ports" }));
    fireEvent.change(screen.getByLabelText("Version intensity"), { target: { value: "7" } });

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
        serviceDetection: true,
        versionIntensity: "7",
        dnsServers: "1.1.1.1,2606:4700:4700::1111",
      },
    });
    expect(
      await screen.findByText(
        "nmap -oX <managed-xml-file> -sV --version-intensity 7 --dns-servers 1.1.1.1,2606:4700:4700::1111 -- scanme.nmap.org",
      ),
    ).toBeInTheDocument();
  });

  it("validates timing range relationships before preview", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    fireEvent.change(screen.getByLabelText("Targets"), { target: { value: "scanme.nmap.org" } });
    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    await userEvent.click(screen.getByRole("button", { name: "Timing" }));
    fireEvent.change(screen.getByLabelText("Minimum packet rate"), { target: { value: "2000" } });
    fireEvent.change(screen.getByLabelText("Maximum packet rate"), { target: { value: "1000" } });

    expect(screen.getByRole("button", { name: "Preview" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Options need attention" })).toBeInTheDocument();
    expect(
      screen.getByText("Minimum packet rate cannot be greater than maximum packet rate."),
    ).toBeInTheDocument();
    expect(previewScanCommandMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Minimum packet rate"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Minimum host group"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Maximum host group"), { target: { value: "10" } });

    expect(
      screen.getByText("Minimum host group cannot be greater than maximum host group."),
    ).toBeInTheDocument();
    expect(previewScanCommandMock).not.toHaveBeenCalled();
  });

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
    await userEvent.click(screen.getByRole("button", { name: "Evasion" }));
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

    await selectRecipe("builtin-fast-host-discovery");
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
        timingTemplate: "T4",
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

  it("summarizes safety notes near scan readiness", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "subnet");
    await userEvent.type(screen.getByLabelText("Targets"), "192.168.1.0/24");
    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    fireEvent.change(screen.getByLabelText("Scan technique"), { target: { value: "udp" } });
    await userEvent.click(screen.getByRole("button", { name: "Behavior" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "OS detection" }));
    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "vuln" }));

    expect(screen.getByRole("region", { name: "Scan safety notes" })).toBeInTheDocument();
    expect(
      screen.getByText("OS detection often requires elevated privileges."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("UDP scans can be slow and may need elevated privileges."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Selected NSE scripts include noisy or intrusive checks."),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Port scans across many addresses can take a while. Use the Fast host discovery recipe first if you only need host discovery.",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("warns that OS detection may need elevated privileges", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    await userEvent.click(screen.getByRole("button", { name: "Behavior" }));
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

  it("clears stale command previews when scan recipe changes", async () => {
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
    await selectRecipe("builtin-fast-host-discovery");

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
    expect(screen.getAllByText("Scan running").length).toBeGreaterThan(0);

    act(() => {
      scanEventListener?.({
        type: "finished",
        result: { runId: "scan-1", exitCode: 0, xml: "<nmaprun />" },
      });
    });
    expect(screen.getAllByText("Scan complete").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "The run completed. Results are parsed into History and raw XML remains export-only.",
      ),
    ).toBeInTheDocument();
  });

  it("shows backend scan phase progress without mixing it into the live log", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    act(() => {
      scanEventListener?.({ type: "started", runId: "scan-1" });
      scanEventListener?.({
        type: "phase",
        phase: {
          runId: "scan-1",
          phase: "launching",
          message: "Starting local Nmap process.",
        },
      });
      scanEventListener?.({
        type: "phase",
        phase: {
          runId: "scan-1",
          phase: "parsing",
          message: "Reading Nmap XML output.",
        },
      });
    });

    const phases = screen.getByLabelText("Scan phases");
    expect(within(phases).getByText("Launching Nmap")).toBeInTheDocument();
    expect(within(phases).getByText("Starting local Nmap process.")).toBeInTheDocument();
    expect(within(phases).getByText("Parsing XML")).toBeInTheDocument();
    expect(screen.getByTestId("scan-log")).not.toHaveTextContent("Starting local Nmap process.");
  });

  it("shows cancellation immediately when cancel is accepted", async () => {
    cancelScanMock.mockResolvedValue(true);
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    act(() => {
      scanEventListener?.({ type: "started", runId: "scan-1" });
    });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(cancelScanMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Scan cancelled").length).toBeGreaterThan(0);
    expect(screen.getByTestId("scan-log")).toHaveTextContent("Cancel requested.");
  });

  it("shows final diagnostics without mixing them into the XML-free live log", () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    act(() => {
      scanEventListener?.({ type: "started", runId: "scan-1" });
      scanEventListener?.({
        type: "finished",
        result: {
          diagnostics: "Parser recovered incomplete host metadata.",
          exitCode: 0,
          runId: "scan-1",
          xml: "<nmaprun />",
        },
      });
    });

    expect(screen.getByText("Parser notes and stderr diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Parser recovered incomplete host metadata.")).toBeInTheDocument();
    expect(screen.getByTestId("scan-log")).not.toHaveTextContent(
      "Parser recovered incomplete host metadata.",
    );
  });

  it("summarizes target kinds before running", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "list");
    await userEvent.clear(screen.getByLabelText("Targets"));
    await userEvent.type(
      screen.getByLabelText("Targets"),
      "scanme.nmap.org, 192.168.1.1, 10.0.0.0/24, 192.168.1.1-20",
    );

    expect(
      screen.getAllByText("1 hostname, 1 IP address, 1 subnet, 1 IPv4 range").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Parsed targets")).toBeInTheDocument();
    expect(screen.getByText("Estimated addresses")).toBeInTheDocument();
    expect(screen.getByText("Accepted syntax")).toBeInTheDocument();
    expect(screen.getByText("4 target expressions, up to 278 addresses")).toBeInTheDocument();
  });

  it("warns when a larger subnet uses a port scan profile", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "subnet");
    await userEvent.type(screen.getByLabelText("Targets"), "192.168.1.0/24");

    expect(screen.getByText("1 target expression, up to 256 addresses")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Port scans across many addresses can take a while. Use the Fast host discovery recipe first if you only need host discovery.",
      ).length,
    ).toBeGreaterThan(0);

    await selectRecipe("builtin-fast-host-discovery");

    expect(
      screen.queryAllByText(
        "Port scans across many addresses can take a while. Use the Fast host discovery recipe first if you only need host discovery.",
      ),
    ).toHaveLength(0);
  });

  it("switches target intent without writing an example into the scan field", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "range");

    expect(screen.getAllByText("IPv4 range").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Scan an inclusive IPv4 last-octet range.")).toBeInTheDocument();
    expect(screen.getByLabelText("Targets")).toHaveAttribute("placeholder", "192.168.1.1-20");
    expect(screen.getByText("Example:")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.1-20")).toBeInTheDocument();
    expect(screen.getByLabelText("Targets")).toHaveValue("");
    expect(screen.queryByText("1 IPv4 range")).not.toBeInTheDocument();
  });

  it("labels the target field for the selected target intent", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    expect(screen.getByText("Target shape")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "subnet");
    expect(screen.getByLabelText("Target shape")).toHaveValue("subnet");
    expect(screen.getByLabelText("Targets")).toHaveAttribute("placeholder", "192.168.1.0/24");

    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "list");
    expect(screen.getAllByText("Target list").length).toBeGreaterThanOrEqual(2);
  });

  it("validates targets against the selected target intent", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "subnet");
    await userEvent.clear(screen.getByLabelText("Targets"));
    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");

    expect(screen.getByText("Target validation")).toBeInTheDocument();
    expect(
      screen.getByText("Subnet mode expects one CIDR target like 192.168.1.0/24."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Run Scan" }));

    expect(startScanMock).not.toHaveBeenCalled();
    expect(
      screen.getAllByText("Subnet mode expects one CIDR target like 192.168.1.0/24.").length,
    ).toBeGreaterThan(0);
  });

  it("preserves typed targets when changing target intent", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org");
    await userEvent.selectOptions(screen.getByLabelText("Target shape"), "range");

    expect(screen.getByLabelText("Targets")).toHaveValue("scanme.nmap.org");
    expect(screen.getAllByText("1 hostname").length).toBeGreaterThan(0);
  });

  it("shows selected script chips and removes one without editing textarea text", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    await userEvent.type(screen.getByLabelText("Manual script names"), "http-title\nssl-cert");

    expect(screen.getByRole("heading", { name: "Selected scripts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove http-title" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove http-title" }));

    expect(screen.queryByRole("button", { name: "Remove http-title" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Manual script names")).toHaveValue("ssl-cert");
  });

  it("labels risky NSE categories", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));

    expect(screen.getByText("vuln")).toBeInTheDocument();
    expect(
      screen.getByText("Vulnerability detection checks; review scope carefully."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Noisy")).not.toHaveLength(0);
    expect(screen.getAllByText("Intrusive")).not.toHaveLength(0);
    expect(
      screen.getByText("Risky categories can be intrusive, exploit-oriented, or disruptive."),
    ).toBeInTheDocument();
  });

  it("shows NSE script descriptions and category badges", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.click(screen.getByRole("button", { name: "Scripts" }));
    fireEvent.change(screen.getByLabelText("Search built-in scripts"), {
      target: { value: "ssl" },
    });

    expect(screen.getByText("ssl-enum-ciphers")).toBeInTheDocument();
    expect(screen.getByText("Enumerates TLS protocol and cipher support.")).toBeInTheDocument();
    expect(screen.getByText("Categories: safe, version")).toBeInTheDocument();
  });

  it("blocks scan start for invalid targets", async () => {
    render(<ScanWorkspace nmapPath="/usr/local/bin/nmap" />);

    await userEvent.type(screen.getByLabelText("Targets"), "scanme.nmap.org; rm -rf /");
    await userEvent.click(screen.getByRole("button", { name: "Run Scan" }));

    expect(startScanMock).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(
        "Enter hostnames, IPs, CIDR subnets, or IPv4 ranges separated by commas or new lines.",
      ).length,
    ).toBeGreaterThan(0);
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
