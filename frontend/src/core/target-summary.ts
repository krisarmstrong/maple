import { parseTargets, type ScanTarget, type TargetKind } from "./scan-targets";

export function summarizeTargets(input: string): string {
  const result = parseTargets(input);
  if (!result.ok) {
    return "";
  }
  const counts = countTargetKinds(result.targets);
  return [
    targetCountLabel(counts.hostname, "hostname", "hostnames"),
    targetCountLabel(counts.ip, "IP address", "IP addresses"),
    targetCountLabel(counts.cidr, "subnet", "subnets"),
    targetCountLabel(counts.range, "IPv4 range", "IPv4 ranges"),
  ]
    .filter((value) => value !== "")
    .join(", ");
}

function countTargetKinds(targets: ScanTarget[]): Record<TargetKind, number> {
  const counts: Record<TargetKind, number> = { hostname: 0, ip: 0, cidr: 0, range: 0 };
  for (const target of targets) {
    counts[target.kind] += 1;
  }
  return counts;
}

function targetCountLabel(count: number, singular: string, plural: string): string {
  if (count === 0) {
    return "";
  }
  return `${count} ${count === 1 ? singular : plural}`;
}
