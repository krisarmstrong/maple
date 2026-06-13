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

export const popularNSEScripts = [
  "http-title",
  "http-headers",
  "http-server-header",
  "ssl-cert",
  "ssl-enum-ciphers",
  "ssh2-enum-algos",
  "smb-os-discovery",
  "dns-service-discovery",
  "vulners",
] as const;

export function buildScanScripts(
  categories: readonly NSECategory[],
  scriptNames: string,
  customScriptPaths: string,
  customScriptDirectories = "",
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
    ...splitLines(customScriptDirectories).map((path) => ({
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
