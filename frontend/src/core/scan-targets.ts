export type TargetKind = "hostname" | "ip" | "cidr" | "range";

export interface ScanTarget {
  value: string;
  kind: TargetKind;
}

export type TargetParseResult =
  | { ok: true; targets: ScanTarget[] }
  | { ok: false; message: string };

const hostnamePattern =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;

export function parseTargets(input: string): TargetParseResult {
  const values = splitTargets(input);
  if (values.length === 0) {
    return { ok: false, message: "Enter at least one target." };
  }

  const targets = values.map(parseTarget);
  if (targets.some((target) => target === undefined)) {
    return {
      ok: false,
      message:
        "Enter hostnames, IPs, CIDR subnets, or IPv4 ranges separated by commas or new lines.",
    };
  }
  return { ok: true, targets: targets.filter(isScanTarget) };
}

function splitTargets(input: string): string[] {
  return input
    .split(/[,\n]/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseTarget(value: string): ScanTarget | undefined {
  if (/[\s;|&$`'"<>]/u.test(value)) {
    return undefined;
  }
  if (value.startsWith("-")) {
    return undefined;
  }
  if (isCIDR(value)) {
    return { value, kind: "cidr" };
  }
  if (value.includes("/")) {
    return undefined;
  }
  if (isIPv4Range(value)) {
    return { value, kind: "range" };
  }
  if (value.includes(".") && value.includes("-")) {
    return undefined;
  }
  if (isIP(value)) {
    return { value, kind: "ip" };
  }
  if (looksLikeInvalidIPv4(value)) {
    return undefined;
  }
  return hostnamePattern.test(value) ? { value, kind: "hostname" } : undefined;
}

function isCIDR(value: string): boolean {
  const [address, prefix] = value.split("/");
  const prefixNumber = Number(prefix);
  if (prefix === undefined || !Number.isInteger(prefixNumber)) {
    return false;
  }
  if (isIPv4(address)) {
    return prefixNumber >= 0 && prefixNumber <= 32;
  }
  return isIPv6(address) && prefixNumber >= 0 && prefixNumber <= 128;
}

function isIP(value: string): boolean {
  return isIPv4(value) || isIPv6(value);
}

function isIPv4Range(value: string): boolean {
  const parts = value.split("-");
  if (parts.length !== 2) {
    return false;
  }
  const [start, end] = parts;
  if (!isIPv4(start) || !/^\d{1,3}$/u.test(end)) {
    return false;
  }
  const startOctet = Number(start.split(".").at(-1));
  const endOctet = Number(end);
  return endOctet >= startOctet && endOctet <= 255;
}

function isIPv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every(isIPv4Part);
}

function isIPv4Part(value: string): boolean {
  if (!/^\d{1,3}$/u.test(value)) {
    return false;
  }
  const number = Number(value);
  return number >= 0 && number <= 255;
}

function isIPv6(value: string): boolean {
  return value.includes(":") && /^[0-9A-Fa-f:]+$/u.test(value);
}

function looksLikeInvalidIPv4(value: string): boolean {
  return value.includes(".") && value.split(".").every((part) => /^\d+$/u.test(part));
}

function isScanTarget(value: ScanTarget | undefined): value is ScanTarget {
  return value !== undefined;
}
