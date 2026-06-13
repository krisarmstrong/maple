import type { NSECategory } from "./nse-scripts";
import type { ScanOptions } from "./scan-options";
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

export function loadSavedPresets(storage: Storage): ScanPreset[] {
  const value = storage.getItem(savedPresetStorageKey);
  if (value === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isScanPreset) : [];
  } catch {
    return [];
  }
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
