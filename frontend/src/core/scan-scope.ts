import type { ScanProfileID } from "./scan-profiles";
import { parseTargets, type ScanTarget } from "./scan-targets";

export interface ScanScope {
  label: string;
  warning?: string;
}

export function scanScope(profileId: ScanProfileID, input: string): ScanScope | undefined {
  const result = parseTargets(input);
  if (!result.ok) {
    return undefined;
  }
  const estimate = estimateTargetCount(result.targets);
  const label = scopeLabel(result.targets.length, estimate);
  return { label, warning: scopeWarning(profileId, estimate) };
}

function estimateTargetCount(targets: readonly ScanTarget[]): number | undefined {
  let total = 0;
  for (const target of targets) {
    const estimate = estimateOneTarget(target);
    if (estimate === undefined) {
      return undefined;
    }
    total += estimate;
  }
  return total;
}

function estimateOneTarget(target: ScanTarget): number | undefined {
  if (target.kind === "hostname" || target.kind === "ip") {
    return 1;
  }
  if (target.kind === "range") {
    return estimateIPv4Range(target.value);
  }
  return estimateCIDR(target.value);
}

function estimateIPv4Range(value: string): number | undefined {
  const [start, end] = value.split("-");
  const startOctet = Number(start?.split(".").at(-1));
  const endOctet = Number(end);
  if (!Number.isInteger(startOctet) || !Number.isInteger(endOctet)) {
    return undefined;
  }
  return endOctet - startOctet + 1;
}

function estimateCIDR(value: string): number | undefined {
  const [address, prefix] = value.split("/");
  if (address === undefined || prefix === undefined || address.includes(":")) {
    return undefined;
  }
  const prefixNumber = Number(prefix);
  if (!Number.isInteger(prefixNumber) || prefixNumber < 0 || prefixNumber > 32) {
    return undefined;
  }
  return 2 ** (32 - prefixNumber);
}

function scopeLabel(targetCount: number, estimate: number | undefined): string {
  const targetLabel = `${targetCount} ${targetCount === 1 ? "target expression" : "target expressions"}`;
  if (estimate === undefined) {
    return targetLabel;
  }
  return `${targetLabel}, up to ${estimate} ${estimate === 1 ? "address" : "addresses"}`;
}

function scopeWarning(profileId: ScanProfileID, estimate: number | undefined): string | undefined {
  if (estimate === undefined || estimate <= 32 || profileId === "ping") {
    return undefined;
  }
  if (profileId === "service") {
    return "Service scans across many addresses can take a while. Use the Fast host discovery recipe first if you only need host discovery.";
  }
  return "Port scans across many addresses can take a while. Use the Fast host discovery recipe first if you only need host discovery.";
}
