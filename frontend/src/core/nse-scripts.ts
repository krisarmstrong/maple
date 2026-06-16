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

export type NSERiskLevel = "normal" | "noisy" | "intrusive";

export interface NSEScriptDetails {
  categories: NSECategory[];
  description: string;
  name: string;
  risk: NSERiskLevel;
}

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
  discovery: [
    "broadcast-dns-service-discovery",
    "dns-recursion",
    "dns-service-discovery",
    "smb-os-discovery",
  ],
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

const categoryDescriptions: Readonly<Record<NSECategory, string>> = {
  auth: "Authentication checks and supported login methods.",
  broadcast: "Local-network discovery using broadcast probes.",
  brute: "Credential guessing workflows; use only with explicit authorization.",
  default: "Common scripts Nmap considers safe enough for default scanning.",
  discovery: "Inventory and service discovery helpers.",
  dos: "Denial-of-service checks that may disrupt targets.",
  exploit: "Exploit-oriented checks for known vulnerabilities.",
  external: "Scripts that may contact third-party services.",
  fuzzer: "Fuzzing probes that can be noisy or disruptive.",
  intrusive: "More aggressive scripts that may change target behavior.",
  malware: "Malware and suspicious-service indicators.",
  safe: "Low-risk informational checks.",
  version: "Extra version and protocol detail.",
  vuln: "Vulnerability detection checks; review scope carefully.",
};

const scriptDescriptions: Readonly<Record<string, string>> = {
  "broadcast-dhcp-discover": "Discovers DHCP servers on the local broadcast domain.",
  "broadcast-dns-service-discovery": "Finds DNS-SD services advertised on the local network.",
  "broadcast-ping": "Discovers hosts using broadcast ping probes.",
  "broadcast-upnp-info": "Collects UPnP device information from local devices.",
  "dns-recursion": "Checks whether a DNS server allows recursive queries.",
  "dns-service-discovery": "Enumerates DNS service discovery records.",
  "ftp-anon": "Checks whether FTP anonymous login is enabled.",
  "ftp-brute": "Attempts FTP credential guessing.",
  "http-auth": "Reports HTTP authentication schemes.",
  "http-brute": "Attempts HTTP authentication credential guessing.",
  "http-enum": "Enumerates common web paths and applications.",
  "http-form-fuzzer": "Fuzzes HTTP forms for unusual responses.",
  "http-google-malware": "Checks web hosts against an external malware signal.",
  "http-headers": "Shows HTTP response headers.",
  "http-malware-host": "Looks for signs of malware hosting.",
  "http-server-header": "Extracts the HTTP Server header.",
  "http-shellshock": "Checks for Shellshock-style CGI exposure.",
  "http-slowloris": "Tests for Slowloris denial-of-service exposure.",
  "http-title": "Retrieves the page title from HTTP services.",
  "http-vuln-cve2017-5638": "Checks for Apache Struts CVE-2017-5638 exposure.",
  "smb-brute": "Attempts SMB credential guessing.",
  "smb-enum-shares": "Enumerates SMB shares.",
  "smb-os-discovery": "Collects SMB OS and host identity details.",
  "smb-security-mode": "Reports SMB signing and security mode.",
  "smb-vuln-ms10-054": "Checks for SMB MS10-054 denial-of-service exposure.",
  "smb-vuln-ms17-010": "Checks for SMB MS17-010 exposure.",
  "smtp-strangeport": "Finds SMTP services on unexpected ports.",
  "snmp-brute": "Attempts SNMP community guessing.",
  "ssh-auth-methods": "Reports SSH authentication methods.",
  "ssh-brute": "Attempts SSH credential guessing.",
  "ssh-hostkey": "Collects SSH host key fingerprints.",
  "ssh2-enum-algos": "Lists SSH algorithm support.",
  "ssl-cert": "Retrieves TLS certificate details.",
  "ssl-enum-ciphers": "Enumerates TLS protocol and cipher support.",
  "ssl-heartbleed": "Checks for Heartbleed exposure.",
  vulners: "Maps detected services to vulnerability data.",
  "whois-domain": "Looks up domain WHOIS data.",
  "whois-ip": "Looks up IP WHOIS data.",
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

export function nseCategoryDescription(category: NSECategory): string {
  return categoryDescriptions[category];
}

export function nseCategoryRisk(category: NSECategory): NSERiskLevel {
  if (category === "dos" || category === "exploit") {
    return "intrusive";
  }
  if (
    category === "brute" ||
    category === "fuzzer" ||
    category === "intrusive" ||
    category === "vuln"
  ) {
    return "noisy";
  }
  return "normal";
}

export function nseScriptDetails(script: string): NSEScriptDetails {
  const categories = categoriesForScript(script);
  return {
    categories,
    description:
      scriptDescriptions[script] ?? "Known NSE script available in the selected catalog.",
    name: script,
    risk: highestRisk(categories),
  };
}

/**
 * Categories that require an explicit confirmation before a scan may start.
 * Includes denial-of-service, exploit-oriented, intrusive, brute-force,
 * malware-detection, and fuzzing categories.
 */
export const disruptiveNSECategories = [
  "dos",
  "exploit",
  "intrusive",
  "brute",
  "malware",
  "fuzzer",
] as const satisfies readonly NSECategory[];

export type DisruptiveNSECategory = (typeof disruptiveNSECategories)[number];

/**
 * Returns the set of disruptive categories engaged by the current selection
 * — either because the category itself is selected, or because a selected
 * script by name is known to belong to a disruptive category.
 *
 * A non-empty result means the user must acknowledge the risk before
 * a scan can start.
 */
export function selectionRequiresConfirmation(
  selectedCategories: readonly NSECategory[],
  selectedScriptNames: readonly string[],
): readonly DisruptiveNSECategory[] {
  const engaged = new Set<DisruptiveNSECategory>();

  for (const category of selectedCategories) {
    if (isDisruptiveCategory(category)) {
      engaged.add(category);
    }
  }

  for (const scriptName of selectedScriptNames) {
    const scriptCats = categoriesForScript(scriptName);
    for (const category of scriptCats) {
      if (isDisruptiveCategory(category)) {
        engaged.add(category);
      }
    }
  }

  return [...engaged].sort((a, b) => a.localeCompare(b));
}

function isDisruptiveCategory(category: NSECategory): category is DisruptiveNSECategory {
  return (disruptiveNSECategories as readonly string[]).includes(category);
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

function categoriesForScript(script: string): NSECategory[] {
  return nseCategories.filter((category) => scriptsByCategory[category].includes(script));
}

function highestRisk(categories: readonly NSECategory[]): NSERiskLevel {
  if (categories.some((category) => nseCategoryRisk(category) === "intrusive")) {
    return "intrusive";
  }
  if (categories.some((category) => nseCategoryRisk(category) === "noisy")) {
    return "noisy";
  }
  return "normal";
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
