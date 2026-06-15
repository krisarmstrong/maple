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
