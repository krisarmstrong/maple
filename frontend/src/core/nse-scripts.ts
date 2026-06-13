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
  scriptNames: string,
  customScriptPaths: string,
): ScanScript[] {
  return [
    ...categories.map((category) => ({ kind: "category" as const, value: category })),
    ...splitLines(scriptNames).map((name) => ({
      kind: "name" as const,
      value: name,
    })),
    ...splitLines(customScriptPaths).map((path) => ({
      kind: "path" as const,
      value: path,
    })),
  ];
}

function splitLines(value: string): string[] {
  return value
    .split(/\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
