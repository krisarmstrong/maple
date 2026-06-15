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

const scriptsByCategory: Readonly<Record<NSECategory, readonly string[]>> = {
  auth: ["ftp-anon", "http-auth", "smb-security-mode", "ssh-auth-methods"],
  broadcast: [
    "broadcast-dhcp-discover",
    "broadcast-dns-service-discovery",
    "broadcast-ping",
    "broadcast-upnp-info",
  ],
  brute: ["ftp-brute", "http-brute", "smb-brute", "ssh-brute"],
  default: ["http-title", "ssh-hostkey", "ssl-cert", "smb-os-discovery"],
  discovery: ["broadcast-dns-service-discovery", "dns-service-discovery", "smb-os-discovery"],
  dos: ["http-slowloris", "smb-vuln-ms10-054"],
  exploit: ["http-shellshock", "smb-vuln-ms17-010"],
  external: ["http-google-malware", "whois-domain", "whois-ip"],
  fuzzer: ["dns-fuzz", "http-form-fuzzer"],
  intrusive: ["http-enum", "smb-enum-shares", "snmp-brute"],
  malware: ["http-malware-host", "smtp-strangeport"],
  safe: ["http-title", "ssl-cert", "ssl-enum-ciphers"],
  version: ["http-server-header", "ssh2-enum-algos", "ssl-enum-ciphers"],
  vuln: ["http-vuln-cve2017-5638", "smb-vuln-ms17-010", "ssl-heartbleed", "vulners"],
};

export function scriptsForCategories(categories: readonly NSECategory[]): string[] {
  return uniqueSorted(categories.flatMap((category) => scriptsByCategory[category]));
}

export function suggestedScriptsForSelection(categories: readonly NSECategory[]): string[] {
  if (categories.length === 0) {
    return [...popularNSEScripts];
  }
  return scriptsForCategories(categories);
}

export function searchNSEScripts(query: string): string[] {
  const normalized = query.trim().toLowerCase();
  if (normalized === "") {
    return [];
  }
  return knownNSEScripts().filter((script) => script.includes(normalized));
}

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

function knownNSEScripts(): string[] {
  return uniqueSorted([...popularNSEScripts, ...Object.values(scriptsByCategory).flat()]);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
