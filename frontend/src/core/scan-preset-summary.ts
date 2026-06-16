import { defaultScanOptions, type ScanOptions } from "./scan-options";
import type { ScanPreset } from "./scan-presets";

export interface ScanPresetSummary {
  intentLabel: string;
  optionsLabel: string;
  scriptsLabel: string;
  targetPolicyLabel: string;
}

export function summarizePreset(preset: ScanPreset): ScanPresetSummary {
  return {
    intentLabel: recipeIntentLabel(preset),
    optionsLabel: countLabel(
      changedOptionCount(preset.options),
      "option change",
      "Recipe defaults",
    ),
    scriptsLabel: countLabel(scriptSelectionCount(preset), "script selection", "No scripts"),
    targetPolicyLabel: "No target saved",
  };
}

function recipeIntentLabel(preset: ScanPreset): string {
  return recipeIntentLabels[preset.id] ?? "Custom saved recipe";
}

const recipeIntentLabels: Readonly<Record<string, string>> = {
  "builtin-ack-firewall-check": "Firewall rule mapping with ACK probes",
  "builtin-authenticated-surface-check": "Safe/default NSE coverage",
  "builtin-broadcast-local-discovery": "Local broadcast discovery helpers",
  "builtin-careful-vulnerability-check": "Light vulnerability script review",
  "builtin-database-surface": "Common database exposure review",
  "builtin-directory-services": "Directory and domain service review",
  "builtin-dns-discovery": "DNS service review",
  "builtin-dns-no-recursion-check": "DNS recursion and service review",
  "builtin-fast-host-discovery": "Find live hosts quickly",
  "builtin-full-tcp-inventory": "All TCP ports without service scripts",
  "builtin-ip-protocol-discovery": "IP protocol exposure review",
  "builtin-mail-service-review": "Mail ports and TLS checks",
  "builtin-ms17-010-check": "Focused SMB MS17-010 check",
  "builtin-no-ping-top-ports": "Top ports when ping is blocked",
  "builtin-printer-iot-discovery": "Printer and IoT service review",
  "builtin-rdp-remote-access": "Remote access service review",
  "builtin-safe-default-scripts": "Default and safe NSE coverage",
  "builtin-service-inventory": "Service and version inventory",
  "builtin-slow-safe-subnet-sweep": "Polite subnet host discovery",
  "builtin-smb-discovery": "Windows file sharing discovery",
  "builtin-snmp-review": "SNMP service review",
  "builtin-ssh-review": "SSH algorithms and auth methods",
  "builtin-ssl-heartbleed-check": "Focused Heartbleed check",
  "builtin-tls-certificate-review": "Certificates and TLS cipher posture",
  "builtin-top-1000-service-review": "Broader top-port service review",
  "builtin-top-tcp-ports": "Quick TCP port check",
  "builtin-udp-essentials": "Common UDP services",
  "builtin-verbose-troubleshooting": "Verbose evidence for troubleshooting",
  "builtin-web-deep-review": "Broader HTTP/HTTPS review",
  "builtin-web-quick-look": "HTTP/HTTPS headers and titles",
};

function changedOptionCount(options: ScanOptions): number {
  return typedKeys(defaultScanOptions).filter((key) => options[key] !== defaultScanOptions[key])
    .length;
}

function scriptSelectionCount(preset: ScanPreset): number {
  return (
    preset.scriptCategories.length +
    lineCount(preset.scriptNames) +
    lineCount(preset.customScriptPaths) +
    lineCount(preset.customScriptDirectories)
  );
}

function lineCount(value: string): number {
  return value
    .split(/\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== "").length;
}

function countLabel(count: number, singular: string, empty: string): string {
  if (count === 0) {
    return empty;
  }
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function typedKeys<T extends object>(value: T): Array<keyof T> {
  return Object.keys(value) as Array<keyof T>;
}
