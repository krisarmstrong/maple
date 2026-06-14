export type NmapOptionStatus = "structured" | "escape-hatch" | "planned" | "blocked";

export interface NmapOptionGroup {
  id: string;
  name: string;
  description: string;
}

export interface NmapOptionCatalogEntry {
  groupId: string;
  name: string;
  switches: readonly string[];
  status: NmapOptionStatus;
  note: string;
}

export const nmapOptionGroups: readonly NmapOptionGroup[] = [
  {
    id: "targeting",
    name: "Targets and scope",
    description: "Target shapes, target files, exclusions, and scan boundaries.",
  },
  {
    id: "discovery",
    name: "Discovery",
    description: "Host discovery probes and DNS behavior before deeper scanning.",
  },
  {
    id: "scan",
    name: "Scan techniques",
    description: "TCP, UDP, and protocol scan modes.",
  },
  {
    id: "ports",
    name: "Ports",
    description: "Port selection and port-state display behavior.",
  },
  {
    id: "service",
    name: "Service, OS, and path",
    description: "Version detection, OS detection, traceroute, and reasons.",
  },
  {
    id: "timing",
    name: "Timing and performance",
    description: "Timing templates, retries, rates, timeouts, and progress cadence.",
  },
  {
    id: "nse",
    name: "NSE scripts",
    description: "Built-in categories, named scripts, custom scripts, and script arguments.",
  },
  {
    id: "output",
    name: "Output and diagnostics",
    description: "Maple-managed output, verbosity, debug, and packet tracing.",
  },
  {
    id: "evasion",
    name: "Firewall and evasion",
    description: "Spoofing, decoys, fragmentation, packet shaping, and proxy-like behavior.",
  },
] as const;

export const nmapOptionCatalog: readonly NmapOptionCatalogEntry[] = [
  entry(
    "targeting",
    "Target builder",
    ["--"],
    "structured",
    "Single, range, subnet, and pasted lists are validated before execution.",
  ),
  entry(
    "targeting",
    "Target input file",
    ["-iL"],
    "structured",
    "Absolute target files are supported for saved host lists.",
  ),
  entry(
    "targeting",
    "Target exclusions",
    ["--exclude", "--excludefile"],
    "structured",
    "Inline exclusions and absolute exclusion files are supported.",
  ),
  entry(
    "discovery",
    "Host discovery mode",
    ["-sn", "-Pn"],
    "structured",
    "Covered by profile and discovery controls.",
  ),
  entry(
    "discovery",
    "DNS behavior",
    ["-n", "--system-dns"],
    "structured",
    "Common DNS modes are exposed as structured choices.",
  ),
  entry(
    "discovery",
    "Specific discovery probes",
    ["-PS", "-PA", "-PU", "-PY", "-PE", "-PP", "-PM"],
    "structured",
    "TCP, UDP, SCTP, and ICMP discovery probes are exposed as structured controls.",
  ),
  entry(
    "scan",
    "Scan technique",
    ["-sT", "-sS", "-sU", "-sA", "-sW", "-sM", "-sN", "-sF", "-sX", "-sY", "-sZ", "-sO"],
    "structured",
    "Common and specialized scan techniques are exposed with privilege guidance.",
  ),
  entry(
    "ports",
    "Port selection",
    ["-p", "--top-ports", "-p-"],
    "structured",
    "Explicit ports, top ports, and all ports are supported.",
  ),
  entry(
    "ports",
    "Port state display",
    ["--open"],
    "structured",
    "Open-only result filtering is available.",
  ),
  entry(
    "service",
    "Service version detection",
    ["-sV", "--version-light", "--version-all"],
    "structured",
    "Version intensity presets are exposed.",
  ),
  entry(
    "service",
    "OS detection",
    ["-O"],
    "structured",
    "Available with elevated-privilege guidance.",
  ),
  entry(
    "service",
    "Traceroute and reasons",
    ["--traceroute", "--reason"],
    "structured",
    "Both are exposed as structured toggles.",
  ),
  entry(
    "timing",
    "Timing template",
    ["-T0", "-T1", "-T2", "-T3", "-T4", "-T5"],
    "structured",
    "Timing templates are exposed as a bounded choice.",
  ),
  entry(
    "timing",
    "Rates and retries",
    ["--min-rate", "--max-retries"],
    "structured",
    "Common performance controls are available.",
  ),
  entry(
    "timing",
    "Timeouts and progress",
    ["--host-timeout", "--max-rtt-timeout", "--stats-every"],
    "structured",
    "Long-running scan controls are available.",
  ),
  entry(
    "timing",
    "Detailed timing knobs",
    ["--scan-delay", "--max-scan-delay", "--min-parallelism", "--max-parallelism"],
    "structured",
    "Advanced delay and parallelism controls are bounded and validated.",
  ),
  entry(
    "nse",
    "Script categories",
    ["--script"],
    "structured",
    "Known categories and risk labels are supported.",
  ),
  entry(
    "nse",
    "Named and custom scripts",
    ["--script"],
    "escape-hatch",
    "Built-in names plus absolute .nse files and directories are supported.",
  ),
  entry(
    "nse",
    "Script arguments",
    ["--script-args", "--script-args-file"],
    "escape-hatch",
    "Validated args and absolute args files are supported.",
  ),
  entry(
    "output",
    "Maple-managed XML",
    ["-oX"],
    "blocked",
    "Maple owns raw XML output paths so history and exports stay consistent.",
  ),
  entry(
    "output",
    "Other output path flags",
    ["-oA", "-oN", "-oG", "-oS"],
    "blocked",
    "Use Maple XML, JSON, and Markdown exports instead of arbitrary output paths.",
  ),
  entry(
    "output",
    "Verbosity and debug",
    ["-v", "-vv"],
    "structured",
    "Output detail is exposed without showing raw XML in the live log.",
  ),
  entry(
    "output",
    "Packet trace",
    ["--packet-trace"],
    "structured",
    "Available with noisy-output guidance.",
  ),
  entry(
    "evasion",
    "Decoys and spoofing",
    ["-D", "-S", "--spoof-mac", "-e"],
    "planned",
    "Needs explicit risk language and interface validation.",
  ),
  entry(
    "evasion",
    "Packet shaping",
    ["-f", "--mtu", "--data-length", "--source-port"],
    "structured",
    "Fragmentation, MTU, data padding, and numeric source port controls are bounded and validated.",
  ),
  entry(
    "evasion",
    "Raw shell command input",
    [],
    "blocked",
    "Maple will keep argv-only execution and will not accept shell strings.",
  ),
] as const;

export function catalogGroups(): Array<{
  group: NmapOptionGroup;
  entries: NmapOptionCatalogEntry[];
}> {
  return nmapOptionGroups.map((group) => ({
    group,
    entries: nmapOptionCatalog.filter((entry) => entry.groupId === group.id),
  }));
}

export function optionStatusLabel(status: NmapOptionStatus): string {
  if (status === "structured") {
    return "Structured control";
  }
  if (status === "escape-hatch") {
    return "Advanced escape hatch";
  }
  if (status === "blocked") {
    return "Blocked by design";
  }
  return "Planned";
}

export function optionCoverageCounts(): Record<NmapOptionStatus, number> {
  const counts: Record<NmapOptionStatus, number> = {
    structured: 0,
    "escape-hatch": 0,
    planned: 0,
    blocked: 0,
  };
  for (const entry of nmapOptionCatalog) {
    counts[entry.status] += 1;
  }
  return counts;
}

function entry(
  groupId: string,
  name: string,
  switches: readonly string[],
  status: NmapOptionStatus,
  note: string,
): NmapOptionCatalogEntry {
  return { groupId, name, switches, status, note };
}
