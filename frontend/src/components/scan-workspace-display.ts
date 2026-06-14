import { type NSECategory, nseCategories } from "../core/nse-scripts";
import type { ScanOptions } from "../core/scan-options";
import { scanScope } from "../core/scan-scope";
import { parseTargets } from "../core/scan-targets";
import type { TargetModeID } from "../core/target-modes";
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

export function messageForInvalidScanOptions(options: ScanOptions): string {
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
