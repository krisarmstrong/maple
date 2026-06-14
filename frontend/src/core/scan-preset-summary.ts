import { defaultScanOptions, type ScanOptions } from "./scan-options";
import type { ScanPreset } from "./scan-presets";
import { findProfile } from "./scan-profiles";

export interface ScanPresetSummary {
  profileLabel: string;
  optionsLabel: string;
  scriptsLabel: string;
  targetPolicyLabel: string;
}

export function summarizePreset(preset: ScanPreset): ScanPresetSummary {
  return {
    profileLabel: findProfile(preset.profileId).name,
    optionsLabel: countLabel(
      changedOptionCount(preset.options),
      "option change",
      "Profile defaults",
    ),
    scriptsLabel: countLabel(scriptSelectionCount(preset), "script selection", "No scripts"),
    targetPolicyLabel: "No target saved",
  };
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
