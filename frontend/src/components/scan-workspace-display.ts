import {
  type NSECategory,
  nseCategories,
  nseCategoryRisk,
  nseScriptDetails,
} from "../core/nse-scripts";
import type { ScanOptions } from "../core/scan-options";
import { scanScope } from "../core/scan-scope";
import { parseTargets } from "../core/scan-targets";
import { type TargetModeID, validateTargetsForMode } from "../core/target-modes";
import { summarizeTargets } from "../core/target-summary";

export function targetBuilderSummary(targets: string): {
  parsedTargets: string;
  estimatedAddresses: string;
} {
  const result = parseTargets(targets);
  if (!result.ok) {
    return { parsedTargets: "No target set", estimatedAddresses: "n/a" };
  }
  const scope = scanScope("connect", targets);
  return {
    parsedTargets: summarizeTargets(targets),
    estimatedAddresses: scope?.label ?? "n/a",
  };
}

export function targetModeValidationSummary(
  modeID: TargetModeID,
  targets: string,
): { message: string; valid: boolean } {
  if (targets.trim() === "") {
    return { message: "Waiting for target input.", valid: false };
  }
  const result = validateTargetsForMode(modeID, targets);
  return result.ok
    ? { message: "Matches selected target type.", valid: true }
    : { message: result.message, valid: false };
}

export function targetModeContextLabel(modeID: TargetModeID): string {
  if (modeID === "single") {
    return "Single host/IP";
  }
  if (modeID === "range") {
    return "IPv4 range";
  }
  if (modeID === "subnet") {
    return "Subnet";
  }
  return "Target list";
}

export function commandTokens(argv: readonly string[]): Array<{ id: string; value: string }> {
  const seen = new Map<string, number>();
  return argv.map((value) => {
    const count = (seen.get(value) ?? 0) + 1;
    seen.set(value, count);
    return { id: `${value}:${count}`, value };
  });
}

export function lineValues(value: string): string[] {
  return value
    .split(/\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function splitSelectedScriptID(id: string): [string, string] {
  const separator = id.indexOf(":");
  if (separator === -1) {
    return ["", id];
  }
  return [id.slice(0, separator), id.slice(separator + 1)];
}

export function isNSECategory(value: string): value is NSECategory {
  return nseCategories.includes(value as NSECategory);
}

export function isRiskyNSECategory(category: NSECategory): boolean {
  return (
    category === "dos" || category === "exploit" || category === "intrusive" || category === "vuln"
  );
}

export function isSpecializedScanTechnique(technique: ScanOptions["scanTechnique"]): boolean {
  return (
    technique === "ack" ||
    technique === "window" ||
    technique === "maimon" ||
    technique === "null" ||
    technique === "fin" ||
    technique === "xmas" ||
    technique === "sctp-init" ||
    technique === "sctp-cookie" ||
    technique === "protocol"
  );
}

export function hasDiscoveryProbeOptions(options: ScanOptions): boolean {
  return (
    options.tcpSynProbes.trim() !== "" ||
    options.tcpAckProbes.trim() !== "" ||
    options.udpProbes.trim() !== "" ||
    options.sctpInitProbes.trim() !== "" ||
    options.icmpEchoProbe ||
    options.icmpTimestamp ||
    options.icmpNetmask
  );
}

export function hasPacketShapingOptions(options: ScanOptions): boolean {
  return (
    options.fragmentPackets ||
    options.mtu > 0 ||
    options.dataLength > 0 ||
    options.sourcePort.trim() !== ""
  );
}

export function hasIdentityOptions(options: ScanOptions): boolean {
  return (
    options.decoys.trim() !== "" ||
    options.sourceAddress.trim() !== "" ||
    options.networkInterface.trim() !== "" ||
    options.spoofMac.trim() !== ""
  );
}

export function scanSafetyWarnings(input: {
  options: ScanOptions;
  scopeWarning?: string;
  scriptCategories: readonly NSECategory[];
  scriptNames: string;
}): string[] {
  const warnings: string[] = [];
  addWarning(warnings, input.scopeWarning);
  if (input.options.osDetection) {
    addWarning(warnings, "OS detection often requires elevated privileges.");
  }
  if (input.options.scanTechnique === "syn") {
    addWarning(warnings, "TCP SYN scans usually require elevated privileges.");
  }
  if (input.options.scanTechnique === "udp") {
    addWarning(warnings, "UDP scans can be slow and may need elevated privileges.");
  }
  if (isSpecializedScanTechnique(input.options.scanTechnique)) {
    addWarning(warnings, "Advanced scan techniques need careful authorization.");
  }
  if (input.options.discoveryMode === "skip") {
    addWarning(warnings, "Skipping host discovery treats every target as online.");
  }
  if (input.options.minRate > 0) {
    addWarning(warnings, "Minimum packet rate can reduce accuracy when set aggressively.");
  }
  if (hasPacketShapingOptions(input.options)) {
    addWarning(warnings, "Packet shaping can violate network policy without authorization.");
  }
  if (hasIdentityOptions(input.options)) {
    addWarning(warnings, "Decoys and spoofing can impersonate traffic.");
  }
  if (input.options.packetTrace) {
    addWarning(warnings, "Packet trace can produce noisy diagnostic output.");
  }
  if (hasRiskyNSESelection(input.scriptCategories, input.scriptNames)) {
    addWarning(warnings, "Selected NSE scripts include noisy or intrusive checks.");
  }
  return warnings;
}

export function messageForInvalidScanOptions(options: ScanOptions): string {
  if (options.dnsMode === "skip" && options.dnsServers.trim() !== "") {
    return "DNS servers cannot be used when DNS lookup is skipped.";
  }
  if (!isValidDNSResolverList(options.dnsServers)) {
    return "DNS servers must be comma-separated IP addresses.";
  }
  if (options.versionMode !== "" && options.versionIntensity.trim() !== "") {
    return "Version intensity cannot be combined with version detail presets.";
  }
  if (!isValidVersionIntensity(options.versionIntensity)) {
    return "Version intensity must be a number from 0 to 9.";
  }
  if (options.minRate !== 0 && options.maxRate !== 0 && options.minRate > options.maxRate) {
    return "Minimum packet rate cannot be greater than maximum packet rate.";
  }
  if (
    options.minHostGroup !== 0 &&
    options.maxHostGroup !== 0 &&
    options.minHostGroup > options.maxHostGroup
  ) {
    return "Minimum host group cannot be greater than maximum host group.";
  }
  if (options.fragmentPackets && options.mtu !== 0) {
    return "Fragment packets and custom MTU cannot be used together.";
  }
  if (options.mtu !== 0 && (options.mtu < 8 || options.mtu > 1500 || options.mtu % 8 !== 0)) {
    return "Custom MTU must be a multiple of 8 between 8 and 1500.";
  }
  return "";
}

function addWarning(warnings: string[], warning: string | undefined): void {
  if (warning !== undefined && warning !== "" && !warnings.includes(warning)) {
    warnings.push(warning);
  }
}

function hasRiskyNSESelection(
  scriptCategories: readonly NSECategory[],
  scriptNames: string,
): boolean {
  if (scriptCategories.some((category) => nseCategoryRisk(category) !== "normal")) {
    return true;
  }
  return lineValues(scriptNames).some(
    (scriptName) => nseScriptDetails(scriptName).risk !== "normal",
  );
}

function isValidVersionIntensity(value: string): boolean {
  const intensity = value.trim();
  if (intensity === "") {
    return true;
  }
  return /^[0-9]$/u.test(intensity);
}

function isValidDNSResolverList(value: string): boolean {
  const servers = value.trim();
  if (servers === "") {
    return true;
  }
  if (hasForbiddenDNSCharacter(servers) || servers.startsWith("-")) {
    return false;
  }
  return servers.split(",").every(isIPLiteral);
}

function hasForbiddenDNSCharacter(value: string): boolean {
  return [...value].some((char) => char.charCodeAt(0) === 0 || /\s|;/u.test(char));
}

function isIPLiteral(value: string): boolean {
  return isIPv4Literal(value) || isIPv6Literal(value);
}

function isIPv4Literal(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (part === "" || !/^[0-9]+$/u.test(part)) {
        return false;
      }
      const octet = Number(part);
      return octet >= 0 && octet <= 255;
    })
  );
}

function isIPv6Literal(value: string): boolean {
  if (!value.includes(":") || value.includes(":::") || !/^[0-9A-Fa-f:]+$/u.test(value)) {
    return false;
  }
  const compressionCount = value.split("::").length - 1;
  if (compressionCount > 1) {
    return false;
  }
  const groups = value.split(":");
  if (compressionCount === 0 && groups.length !== 8) {
    return false;
  }
  if (groups.length > 8) {
    return false;
  }
  return groups.every((group) => {
    if (group === "") {
      return compressionCount === 1;
    }
    return group.length <= 4;
  });
}
