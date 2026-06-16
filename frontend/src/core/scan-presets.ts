import type { NSECategory } from "./nse-scripts";
import { defaultScanOptions, type ScanOptions } from "./scan-options";
import type { ScanProfileID } from "./scan-profiles";

export const savedPresetStorageKey = "maple.scanPresets.v1";

export interface ScanPreset {
  id: string;
  name: string;
  profileId: ScanProfileID;
  options: ScanOptions;
  scriptCategories: NSECategory[];
  scriptNames: string;
  customScriptPaths: string;
  customScriptDirectories: string;
  scriptArgs: string;
  scriptArgsFile: string;
}

export const builtInScanPresets: readonly ScanPreset[] = [
  {
    id: "builtin-fast-host-discovery",
    name: "Fast host discovery",
    profileId: "ping",
    options: { ...defaultScanOptions, timingTemplate: "T4" },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-top-tcp-ports",
    name: "Top TCP ports",
    profileId: "connect",
    options: defaultScanOptions,
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-web-quick-look",
    name: "Web quick look",
    profileId: "service",
    options: { ...defaultScanOptions, ports: "80,443,8080,8443", serviceDetection: true },
    scriptCategories: [],
    scriptNames: "http-title\nhttp-headers\nhttp-server-header",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-tls-certificate-review",
    name: "TLS certificate review",
    profileId: "service",
    options: { ...defaultScanOptions, ports: "443,8443", serviceDetection: true },
    scriptCategories: [],
    scriptNames: "ssl-cert\nssl-enum-ciphers",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-service-inventory",
    name: "Service inventory",
    profileId: "service",
    options: { ...defaultScanOptions, serviceDetection: true, versionMode: "light", reason: true },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-smb-discovery",
    name: "SMB discovery",
    profileId: "service",
    options: { ...defaultScanOptions, ports: "139,445", serviceDetection: true },
    scriptCategories: [],
    scriptNames: "smb-os-discovery\nsmb-security-mode\nnbstat",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-dns-discovery",
    name: "DNS discovery",
    profileId: "service",
    options: { ...defaultScanOptions, ports: "53", serviceDetection: true },
    scriptCategories: [],
    scriptNames: "dns-service-discovery\nbroadcast-dns-service-discovery",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-udp-essentials",
    name: "UDP essentials",
    profileId: "quick",
    options: { ...defaultScanOptions, scanTechnique: "udp", ports: "53,67,123,161,500" },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-authenticated-surface-check",
    name: "Authenticated surface check",
    profileId: "service",
    options: { ...defaultScanOptions, serviceDetection: true, reason: true },
    scriptCategories: ["default", "safe"],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-careful-vulnerability-check",
    name: "Careful vulnerability check",
    profileId: "service",
    options: { ...defaultScanOptions, serviceDetection: true, versionMode: "light", reason: true },
    scriptCategories: ["vuln"],
    scriptNames: "vulners",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-safe-default-scripts",
    name: "Safe default scripts",
    profileId: "service",
    options: { ...defaultScanOptions, serviceDetection: true, reason: true },
    scriptCategories: ["default", "safe"],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-full-tcp-inventory",
    name: "Full TCP inventory",
    profileId: "connect",
    options: { ...defaultScanOptions, allPorts: true, timingTemplate: "T3", reason: true },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-top-1000-service-review",
    name: "Top 1000 service review",
    profileId: "service",
    options: {
      ...defaultScanOptions,
      topPorts: 1000,
      serviceDetection: true,
      versionMode: "light",
      reason: true,
    },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-web-deep-review",
    name: "Web deep review",
    profileId: "service",
    options: {
      ...defaultScanOptions,
      ports: "80,443,8000,8080,8081,8443,8888,9000,9443",
      serviceDetection: true,
      versionMode: "light",
      reason: true,
    },
    scriptCategories: [],
    scriptNames: "http-title\nhttp-headers\nhttp-server-header\nhttp-enum",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-ssh-review",
    name: "SSH review",
    profileId: "service",
    options: { ...defaultScanOptions, ports: "22", serviceDetection: true, reason: true },
    scriptCategories: [],
    scriptNames: "ssh-hostkey\nssh-auth-methods\nssh2-enum-algos",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-mail-service-review",
    name: "Mail service review",
    profileId: "service",
    options: {
      ...defaultScanOptions,
      ports: "25,110,143,465,587,993,995",
      serviceDetection: true,
      reason: true,
    },
    scriptCategories: [],
    scriptNames: "smtp-strangeport\nssl-cert",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-database-surface",
    name: "Database surface",
    profileId: "service",
    options: {
      ...defaultScanOptions,
      ports: "1433,1521,3306,5432,6379,9200,9300,11211,27017",
      serviceDetection: true,
      reason: true,
    },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-printer-iot-discovery",
    name: "Printer and IoT discovery",
    profileId: "service",
    options: {
      ...defaultScanOptions,
      ports: "80,443,515,631,9100,1900,5353,8080",
      serviceDetection: true,
      reason: true,
    },
    scriptCategories: ["broadcast"],
    scriptNames: "broadcast-upnp-info",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-snmp-review",
    name: "SNMP review",
    profileId: "service",
    options: { ...defaultScanOptions, scanTechnique: "udp", ports: "161", reason: true },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-directory-services",
    name: "Directory services",
    profileId: "service",
    options: {
      ...defaultScanOptions,
      ports: "88,135,139,389,445,464,636,3268,3269",
      serviceDetection: true,
      reason: true,
    },
    scriptCategories: [],
    scriptNames: "smb-os-discovery\nsmb-security-mode",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-rdp-remote-access",
    name: "RDP and remote access",
    profileId: "service",
    options: {
      ...defaultScanOptions,
      ports: "22,3389,5900,5901,5985,5986",
      serviceDetection: true,
    },
    scriptCategories: [],
    scriptNames: "ssh-hostkey\nssl-cert",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-ip-protocol-discovery",
    name: "IP protocol discovery",
    profileId: "quick",
    options: { ...defaultScanOptions, scanTechnique: "protocol", reason: true },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-ack-firewall-check",
    name: "ACK firewall check",
    profileId: "quick",
    options: { ...defaultScanOptions, scanTechnique: "ack", topPorts: 100, reason: true },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-no-ping-top-ports",
    name: "No-ping top ports",
    profileId: "connect",
    options: { ...defaultScanOptions, discoveryMode: "skip", topPorts: 100, reason: true },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-dns-no-recursion-check",
    name: "DNS no-recursion check",
    profileId: "service",
    options: { ...defaultScanOptions, ports: "53", serviceDetection: true, reason: true },
    scriptCategories: [],
    scriptNames: "dns-recursion\ndns-service-discovery",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-broadcast-local-discovery",
    name: "Broadcast local discovery",
    profileId: "ping",
    options: { ...defaultScanOptions, timingTemplate: "T3" },
    scriptCategories: ["broadcast"],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-ssl-heartbleed-check",
    name: "TLS Heartbleed check",
    profileId: "service",
    options: { ...defaultScanOptions, ports: "443,8443", serviceDetection: true, reason: true },
    scriptCategories: [],
    scriptNames: "ssl-heartbleed",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-ms17-010-check",
    name: "MS17-010 check",
    profileId: "service",
    options: { ...defaultScanOptions, ports: "445", serviceDetection: true, reason: true },
    scriptCategories: [],
    scriptNames: "smb-vuln-ms17-010",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-slow-safe-subnet-sweep",
    name: "Slow safe subnet sweep",
    profileId: "ping",
    options: { ...defaultScanOptions, timingTemplate: "T2", dnsMode: "skip" },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
  {
    id: "builtin-verbose-troubleshooting",
    name: "Verbose troubleshooting",
    profileId: "connect",
    options: {
      ...defaultScanOptions,
      topPorts: 50,
      reason: true,
      verbosityMode: "verbose",
      statsEvery: "10s",
    },
    scriptCategories: [],
    scriptNames: "",
    customScriptPaths: "",
    customScriptDirectories: "",
    scriptArgs: "",
    scriptArgsFile: "",
  },
];

export function loadSavedPresets(storage: Storage): ScanPreset[] {
  const value = storage.getItem(savedPresetStorageKey);
  if (value === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isScanPreset).map(normalizePreset) : [];
  } catch {
    return [];
  }
}

function normalizePreset(preset: ScanPreset): ScanPreset {
  return {
    ...preset,
    options: normalizePresetOptions({ ...defaultScanOptions, ...preset.options }),
  };
}

function normalizePresetOptions(options: ScanOptions): ScanOptions {
  if (options.fragmentPackets) {
    return { ...options, mtu: 0 };
  }
  return options;
}

export function savePreset(
  storage: Storage,
  presets: readonly ScanPreset[],
  preset: ScanPreset,
): ScanPreset[] {
  const next = [
    preset,
    ...presets.filter((candidate) => candidate.id !== preset.id && candidate.name !== preset.name),
  ];
  storage.setItem(savedPresetStorageKey, JSON.stringify(next));
  return next;
}

export function makePresetID(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isScanPreset(value: unknown): value is ScanPreset {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.profileId === "string" &&
    isRecord(value.options) &&
    Array.isArray(value.scriptCategories) &&
    value.scriptCategories.every((category) => typeof category === "string") &&
    typeof value.scriptNames === "string" &&
    typeof value.customScriptPaths === "string" &&
    typeof value.customScriptDirectories === "string" &&
    typeof value.scriptArgs === "string" &&
    typeof value.scriptArgsFile === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
