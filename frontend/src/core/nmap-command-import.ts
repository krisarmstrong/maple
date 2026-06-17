/**
 * One-way nmap command importer.
 *
 * Takes a pasted `nmap ...` command line and returns a structured ImportResult.
 * This is STRICTLY parse-and-map only:
 *   - No command string is built or stored.
 *   - No unrecognized flag is passed through.
 *   - Shell metacharacters cause an immediate rejection.
 *   - After a successful import the normal preview + validation path applies unchanged.
 */

import type { ScanOptions } from "./scan-options";
import { parseTargets } from "./scan-targets";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ImportResult =
  | { ok: true; options: Partial<ScanOptions>; scripts: string[]; targets: string[] }
  | { ok: false; errors: string[] };

// ---------------------------------------------------------------------------
// Shell-safety guard
//
// Reject the raw input before any tokenisation if it contains shell
// metacharacters.  We check the full raw string so that even quoted
// metacharacters in untrusted input are caught early.
// ---------------------------------------------------------------------------

const SHELL_META_PATTERN = /[;|&$`\\<>(){}[\]!]/u;

function containsShellMeta(input: string): boolean {
  return SHELL_META_PATTERN.test(input);
}

// ---------------------------------------------------------------------------
// Tokeniser
//
// Handles single- and double-quoted spans; no shell interpretation.
// ---------------------------------------------------------------------------

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < input.length && input[i] !== quote) {
        current += input[i];
        i++;
      }
      // skip closing quote if present
      if (i < input.length) {
        i++;
      }
      continue;
    }

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (current !== "") {
        tokens.push(current);
        current = "";
      }
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current !== "") {
    tokens.push(current);
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Value validators
// ---------------------------------------------------------------------------

function isPositiveInteger(value: string): boolean {
  return /^\d+$/u.test(value) && Number(value) > 0;
}

function isNonNegativeInteger(value: string): boolean {
  return /^\d+$/u.test(value);
}

function isTimingString(value: string): boolean {
  // nmap accepts values like 100ms, 2s, 3m
  return /^\d+(\.\d+)?(ms|s|m|h)?$/u.test(value);
}

function isPortSpec(value: string): boolean {
  // Accepts: 80, 80-443, 80,443, 1-65535, T:80, U:53, etc.
  if (value === "") return false;
  return /^[TUSCAtusc]?:?[\d,-]+$/u.test(value) && !value.endsWith(",") && !value.endsWith("-");
}

function isMacAddress(value: string): boolean {
  // 0 (random), Vendor prefix (3 octets), or full address
  if (value === "0") return true;
  return /^[0-9A-Fa-f]{1,2}(:[0-9A-Fa-f]{1,2}){0,5}$/u.test(value);
}

function isIntensity(value: string): boolean {
  const n = Number(value);
  return /^\d+$/u.test(value) && n >= 0 && n <= 9;
}

function isValidDecoyList(value: string): boolean {
  if (value === "") return false;
  const parts = value.split(",");
  return parts.every(
    (part) =>
      part === "ME" ||
      part === "RND" ||
      /^RND:\d+$/u.test(part) ||
      /^[\d.]+$/u.test(part) ||
      /^[A-Za-z0-9.-]+$/u.test(part),
  );
}

function isValidIPOrHostname(value: string): boolean {
  if (value === "") return false;
  if (/[\s;|&$`'"<>]/u.test(value)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function importNmapCommand(input: string): ImportResult {
  const trimmed = input.trim();

  if (trimmed === "") {
    return { ok: false, errors: ["Input is empty."] };
  }

  // Hard gate: reject any shell metacharacter before touching tokens.
  if (containsShellMeta(trimmed)) {
    return {
      ok: false,
      errors: ["Shell metacharacters are not permitted (;|&$`\\<>(){}[])."],
    };
  }

  const rawTokens = tokenize(trimmed);
  if (rawTokens.length === 0) {
    return { ok: false, errors: ["Input is empty."] };
  }

  // Strip a leading "nmap" (case-insensitive) if present.
  const tokens = rawTokens[0].toLowerCase() === "nmap" ? rawTokens.slice(1) : rawTokens;

  if (tokens.length === 0) {
    return { ok: false, errors: ["No flags or targets after 'nmap'."] };
  }

  // Mutable partial result that we fill during the parse pass.
  const options: Partial<ScanOptions> = {};
  const scripts: string[] = [];
  const bareTargets: string[] = [];
  const errors: string[] = [];

  let i = 0;

  function nextValue(flag: string): string | undefined {
    if (i + 1 >= tokens.length) {
      errors.push(`${flag} requires a value but none was provided.`);
      return undefined;
    }
    i++;
    return tokens[i];
  }

  while (i < tokens.length) {
    const tok = tokens[i];

    // -----------------------------------------------------------------------
    // Blocked flags — output paths managed by Maple
    // -----------------------------------------------------------------------
    if (tok === "-oX" || tok === "-oA" || tok === "-oN" || tok === "-oG" || tok === "-oS") {
      errors.push(`${tok} is managed by Maple and cannot be imported.`);
      i++;
      if (i < tokens.length && !tokens[i].startsWith("-")) {
        i++;
      }
      continue;
    }

    // -----------------------------------------------------------------------
    // Scan technique flags
    // -----------------------------------------------------------------------
    if (tok === "-sT") {
      options.scanTechnique = "connect";
      i++;
      continue;
    }
    if (tok === "-sS") {
      options.scanTechnique = "syn";
      i++;
      continue;
    }
    if (tok === "-sU") {
      options.scanTechnique = "udp";
      i++;
      continue;
    }
    if (tok === "-sA") {
      options.scanTechnique = "ack";
      i++;
      continue;
    }
    if (tok === "-sW") {
      options.scanTechnique = "window";
      i++;
      continue;
    }
    if (tok === "-sM") {
      options.scanTechnique = "maimon";
      i++;
      continue;
    }
    if (tok === "-sN") {
      options.scanTechnique = "null";
      i++;
      continue;
    }
    if (tok === "-sF") {
      options.scanTechnique = "fin";
      i++;
      continue;
    }
    if (tok === "-sX") {
      options.scanTechnique = "xmas";
      i++;
      continue;
    }
    if (tok === "-sY") {
      options.scanTechnique = "sctp-init";
      i++;
      continue;
    }
    if (tok === "-sZ") {
      options.scanTechnique = "sctp-cookie";
      i++;
      continue;
    }
    if (tok === "-sO") {
      options.scanTechnique = "protocol";
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // Discovery mode
    // -----------------------------------------------------------------------
    if (tok === "-Pn") {
      options.discoveryMode = "skip";
      i++;
      continue;
    }
    if (tok === "-sn") {
      options.discoveryMode = "ping";
      i++;
      continue;
    }

    // Discovery probes
    if (tok.startsWith("-PS")) {
      options.tcpSynProbes = tok.slice(3);
      i++;
      continue;
    }
    if (tok.startsWith("-PA")) {
      options.tcpAckProbes = tok.slice(3);
      i++;
      continue;
    }
    if (tok.startsWith("-PU")) {
      options.udpProbes = tok.slice(3);
      i++;
      continue;
    }
    if (tok.startsWith("-PY")) {
      options.sctpInitProbes = tok.slice(3);
      i++;
      continue;
    }
    if (tok === "-PE") {
      options.icmpEchoProbe = true;
      i++;
      continue;
    }
    if (tok === "-PP") {
      options.icmpTimestamp = true;
      i++;
      continue;
    }
    if (tok === "-PM") {
      options.icmpNetmask = true;
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // Port selection
    // -----------------------------------------------------------------------
    if (tok === "-p-") {
      options.allPorts = true;
      i++;
      continue;
    }

    if (tok === "-F") {
      options.fastScan = true;
      i++;
      continue;
    }

    if (tok === "-p") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPortSpec(value)) {
        errors.push(`-p value '${value}' is not a valid port specification.`);
        i++;
        continue;
      }
      options.ports = value;
      i++;
      continue;
    }

    if (tok.startsWith("-p") && tok.length > 2) {
      const value = tok.slice(2);
      if (!isPortSpec(value)) {
        errors.push(`-p value '${value}' is not a valid port specification.`);
        i++;
        continue;
      }
      options.ports = value;
      i++;
      continue;
    }

    if (tok === "--top-ports") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPositiveInteger(value)) {
        errors.push(`--top-ports value '${value}' must be a positive integer.`);
        i++;
        continue;
      }
      options.topPorts = Number(value);
      i++;
      continue;
    }

    if (tok === "--open") {
      options.openOnly = true;
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // Timing template  -T0 … -T5
    // -----------------------------------------------------------------------
    if (/^-T[0-5]$/u.test(tok)) {
      const level = tok.slice(1) as "T0" | "T1" | "T2" | "T3" | "T4" | "T5";
      options.timingTemplate = level;
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // Service / OS / path detection
    // -----------------------------------------------------------------------
    if (tok === "-sV") {
      options.serviceDetection = true;
      i++;
      continue;
    }
    if (tok === "--version-light") {
      options.serviceDetection = true;
      options.versionMode = "light";
      i++;
      continue;
    }
    if (tok === "--version-all") {
      options.serviceDetection = true;
      options.versionMode = "all";
      i++;
      continue;
    }

    if (tok === "--version-intensity") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isIntensity(value)) {
        errors.push(`--version-intensity value '${value}' must be 0–9.`);
        i++;
        continue;
      }
      options.serviceDetection = true;
      options.versionIntensity = value;
      i++;
      continue;
    }

    if (tok === "-O") {
      options.osDetection = true;
      i++;
      continue;
    }
    if (tok === "--traceroute") {
      options.traceroute = true;
      i++;
      continue;
    }
    if (tok === "--reason") {
      options.reason = true;
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // IPv6
    // -----------------------------------------------------------------------
    if (tok === "-6") {
      options.ipv6 = true;
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // DNS
    // -----------------------------------------------------------------------
    if (tok === "-n") {
      options.dnsMode = "skip";
      i++;
      continue;
    }
    if (tok === "--system-dns") {
      options.dnsMode = "system";
      i++;
      continue;
    }

    if (tok === "--dns-servers") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      options.dnsServers = value;
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // Verbosity / output
    // -----------------------------------------------------------------------
    if (tok === "-v") {
      options.verbosityMode = "verbose";
      i++;
      continue;
    }
    if (tok === "-vv" || tok === "-v2") {
      options.verbosityMode = "debug";
      i++;
      continue;
    }
    if (tok === "--packet-trace") {
      options.packetTrace = true;
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // Timing knobs
    // -----------------------------------------------------------------------
    if (tok === "--min-rate") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPositiveInteger(value)) {
        errors.push(`--min-rate value '${value}' must be a positive integer.`);
        i++;
        continue;
      }
      options.minRate = Number(value);
      i++;
      continue;
    }

    if (tok === "--max-rate") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPositiveInteger(value)) {
        errors.push(`--max-rate value '${value}' must be a positive integer.`);
        i++;
        continue;
      }
      options.maxRate = Number(value);
      i++;
      continue;
    }

    if (tok === "--max-retries") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isNonNegativeInteger(value)) {
        errors.push(`--max-retries value '${value}' must be a non-negative integer.`);
        i++;
        continue;
      }
      options.maxRetries = value;
      i++;
      continue;
    }

    if (tok === "--host-timeout") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isTimingString(value)) {
        errors.push(`--host-timeout value '${value}' is not a valid time specification.`);
        i++;
        continue;
      }
      options.hostTimeout = value;
      i++;
      continue;
    }

    if (tok === "--max-rtt-timeout") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isTimingString(value)) {
        errors.push(`--max-rtt-timeout value '${value}' is not a valid time specification.`);
        i++;
        continue;
      }
      options.maxRttTimeout = value;
      i++;
      continue;
    }

    if (tok === "--min-rtt-timeout") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isTimingString(value)) {
        errors.push(`--min-rtt-timeout value '${value}' is not a valid time specification.`);
        i++;
        continue;
      }
      options.minRttTimeout = value;
      i++;
      continue;
    }

    if (tok === "--initial-rtt-timeout") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isTimingString(value)) {
        errors.push(`--initial-rtt-timeout value '${value}' is not a valid time specification.`);
        i++;
        continue;
      }
      options.initialRttTimeout = value;
      i++;
      continue;
    }

    if (tok === "--stats-every") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isTimingString(value)) {
        errors.push(`--stats-every value '${value}' is not a valid time specification.`);
        i++;
        continue;
      }
      options.statsEvery = value;
      i++;
      continue;
    }

    if (tok === "--scan-delay") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isTimingString(value)) {
        errors.push(`--scan-delay value '${value}' is not a valid time specification.`);
        i++;
        continue;
      }
      options.scanDelay = value;
      i++;
      continue;
    }

    if (tok === "--max-scan-delay") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isTimingString(value)) {
        errors.push(`--max-scan-delay value '${value}' is not a valid time specification.`);
        i++;
        continue;
      }
      options.maxScanDelay = value;
      i++;
      continue;
    }

    if (tok === "--min-hostgroup") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPositiveInteger(value)) {
        errors.push(`--min-hostgroup value '${value}' must be a positive integer.`);
        i++;
        continue;
      }
      options.minHostGroup = Number(value);
      i++;
      continue;
    }

    if (tok === "--max-hostgroup") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPositiveInteger(value)) {
        errors.push(`--max-hostgroup value '${value}' must be a positive integer.`);
        i++;
        continue;
      }
      options.maxHostGroup = Number(value);
      i++;
      continue;
    }

    if (tok === "--min-parallelism") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPositiveInteger(value)) {
        errors.push(`--min-parallelism value '${value}' must be a positive integer.`);
        i++;
        continue;
      }
      options.minParallelism = Number(value);
      i++;
      continue;
    }

    if (tok === "--max-parallelism") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPositiveInteger(value)) {
        errors.push(`--max-parallelism value '${value}' must be a positive integer.`);
        i++;
        continue;
      }
      options.maxParallelism = Number(value);
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // Evasion / packet shaping
    // -----------------------------------------------------------------------
    if (tok === "-f") {
      options.fragmentPackets = true;
      i++;
      continue;
    }

    if (tok === "--mtu") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPositiveInteger(value)) {
        errors.push(`--mtu value '${value}' must be a positive integer.`);
        i++;
        continue;
      }
      options.mtu = Number(value);
      i++;
      continue;
    }

    if (tok === "--data-length") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isNonNegativeInteger(value)) {
        errors.push(`--data-length value '${value}' must be a non-negative integer.`);
        i++;
        continue;
      }
      options.dataLength = Number(value);
      i++;
      continue;
    }

    if (tok === "--source-port") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      const n = Number(value);
      if (!isNonNegativeInteger(value) || n > 65535) {
        errors.push(`--source-port value '${value}' must be 0–65535.`);
        i++;
        continue;
      }
      options.sourcePort = value;
      i++;
      continue;
    }

    if (tok === "-D") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isValidDecoyList(value)) {
        errors.push(`-D value '${value}' is not a valid decoy list.`);
        i++;
        continue;
      }
      options.decoys = value;
      i++;
      continue;
    }

    if (tok === "-S") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isValidIPOrHostname(value)) {
        errors.push(`-S value '${value}' is not a valid source address.`);
        i++;
        continue;
      }
      options.sourceAddress = value;
      i++;
      continue;
    }

    if (tok === "-e") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (value === "" || /\s/u.test(value)) {
        errors.push(`-e value '${value}' is not a valid network interface.`);
        i++;
        continue;
      }
      options.networkInterface = value;
      i++;
      continue;
    }

    if (tok === "--spoof-mac") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isMacAddress(value)) {
        errors.push(`--spoof-mac value '${value}' is not a valid MAC address or vendor prefix.`);
        i++;
        continue;
      }
      options.spoofMac = value;
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // NSE scripts
    // -----------------------------------------------------------------------
    if (tok === "--script") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      const parts = value.split(",").map((s) => s.trim());
      for (const part of parts) {
        if (part === "") {
          errors.push("--script contained an empty script name.");
          continue;
        }
        if (/[/\\]/u.test(part)) {
          errors.push(
            `--script value '${part}' looks like a path; use custom-script-paths in the UI.`,
          );
          continue;
        }
        scripts.push(part);
      }
      i++;
      continue;
    }

    if (tok === "--script-args") {
      errors.push(
        "--script-args is not directly importable; set script arguments in the Scripts panel.",
      );
      i++;
      if (i < tokens.length && !tokens[i].startsWith("-")) {
        i++;
      }
      continue;
    }

    if (tok === "--script-args-file") {
      errors.push(
        "--script-args-file is not directly importable; set script arguments file in the Scripts panel.",
      );
      i++;
      if (i < tokens.length && !tokens[i].startsWith("-")) {
        i++;
      }
      continue;
    }

    // -----------------------------------------------------------------------
    // Target input / exclusion files
    // -----------------------------------------------------------------------
    if (tok === "-iL") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      options.targetInputFile = value;
      i++;
      continue;
    }

    if (tok === "--exclude") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      options.excludeTargets = value;
      i++;
      continue;
    }

    if (tok === "--excludefile") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      options.excludeFile = value;
      i++;
      continue;
    }

    if (tok === "--exclude-ports") {
      const value = nextValue(tok);
      if (value === undefined) {
        i++;
        continue;
      }
      if (!isPortSpec(value)) {
        errors.push(`--exclude-ports value '${value}' is not a valid port specification.`);
        i++;
        continue;
      }
      options.excludePorts = value;
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // Bare argument (potential target)
    // -----------------------------------------------------------------------
    if (!tok.startsWith("-")) {
      bareTargets.push(tok);
      i++;
      continue;
    }

    // -----------------------------------------------------------------------
    // Anything else is unrecognized — hard reject
    // -----------------------------------------------------------------------
    errors.push(`Unrecognized flag: ${tok}`);
    i++;
  }

  // Validate any bare arguments as targets using the existing parser.
  if (bareTargets.length > 0) {
    const joined = bareTargets.join("\n");
    const parsed = parseTargets(joined);
    if (!parsed.ok) {
      errors.push(`Invalid target(s): ${bareTargets.join(", ")} — ${parsed.message}`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, options, scripts, targets: bareTargets };
}
