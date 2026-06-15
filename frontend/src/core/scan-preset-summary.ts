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
  switch (preset.id) {
    case "builtin-fast-host-discovery":
      return "Find live hosts quickly";
    case "builtin-top-tcp-ports":
      return "Quick TCP port check";
    case "builtin-web-quick-look":
      return "HTTP/HTTPS headers and titles";
    case "builtin-tls-certificate-review":
      return "Certificates and TLS cipher posture";
    case "builtin-service-inventory":
      return "Service and version inventory";
    case "builtin-smb-discovery":
      return "Windows file sharing discovery";
    case "builtin-dns-discovery":
      return "DNS service review";
    case "builtin-udp-essentials":
      return "Common UDP services";
    case "builtin-authenticated-surface-check":
      return "Safe/default NSE coverage";
    case "builtin-careful-vulnerability-check":
      return "Light vulnerability script review";
    default:
      return "Custom saved recipe";
  }
}

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
