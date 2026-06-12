import type { ScanScript } from "../services/scan-service";

export const nseCategories = [
  "auth",
  "broadcast",
  "brute",
  "default",
  "discovery",
  "dos",
  "exploit",
  "external",
  "fuzzer",
  "intrusive",
  "malware",
  "safe",
  "version",
  "vuln",
] as const;

export type NSECategory = (typeof nseCategories)[number];

export function buildScanScripts(
  categories: readonly NSECategory[],
  customScriptPaths: string,
): ScanScript[] {
  return [
    ...categories.map((category) => ({ kind: "category" as const, value: category })),
    ...splitCustomScriptPaths(customScriptPaths).map((path) => ({
      kind: "path" as const,
      value: path,
    })),
  ];
}

function splitCustomScriptPaths(value: string): string[] {
  return value
    .split(/\n/u)
    .map((path) => path.trim())
    .filter((path) => path.length > 0);
}
