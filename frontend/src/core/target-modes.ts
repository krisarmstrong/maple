import { parseTargets, type TargetKind } from "./scan-targets";

export type TargetModeID = "single" | "range" | "subnet" | "list";

export interface TargetMode {
  id: TargetModeID;
  label: string;
  help: string;
  placeholder: string;
  acceptedSyntax: string;
}

export type TargetModeValidation = { ok: true } | { ok: false; message: string };

export const targetModes: TargetMode[] = [
  {
    id: "single",
    label: "Single target",
    help: "Scan one hostname or IP address.",
    placeholder: "scanme.nmap.org",
    acceptedSyntax: "One hostname, IPv4 address, or IPv6 address.",
  },
  {
    id: "range",
    label: "IPv4 range",
    help: "Scan an inclusive IPv4 last-octet range.",
    placeholder: "192.168.1.1-20",
    acceptedSyntax: "One IPv4 last-octet range like 192.168.1.1-20.",
  },
  {
    id: "subnet",
    label: "Subnet",
    help: "Scan one CIDR subnet.",
    placeholder: "192.168.1.0/24",
    acceptedSyntax: "One IPv4 or IPv6 CIDR subnet.",
  },
  {
    id: "list",
    label: "Target list",
    help: "Scan comma-separated or newline-separated targets.",
    placeholder: "scanme.nmap.org, 192.168.1.1, 10.0.0.0/24",
    acceptedSyntax:
      "Hostnames, IPs, CIDR subnets, or IPv4 ranges separated by commas or new lines.",
  },
];

export function targetModeHelp(modeID: TargetModeID): string {
  return findTargetMode(modeID).help;
}

export function targetModePlaceholder(modeID: TargetModeID): string {
  return findTargetMode(modeID).placeholder;
}

export function targetModeInputLabel(modeID: TargetModeID): string {
  if (modeID === "single") {
    return "Single hostname or IP";
  }
  if (modeID === "range") {
    return "IPv4 range";
  }
  if (modeID === "subnet") {
    return "CIDR subnet";
  }
  return "Target list";
}

export function targetModeAcceptedSyntax(modeID: TargetModeID): string {
  return findTargetMode(modeID).acceptedSyntax;
}

export function validateTargetsForMode(
  modeID: TargetModeID,
  targets: string,
): TargetModeValidation {
  const result = parseTargets(targets);
  if (!result.ok) {
    return result;
  }
  if (modeID === "list") {
    return { ok: true };
  }
  if (result.targets.length !== 1) {
    return { ok: false, message: modeCountMessage(modeID) };
  }
  const target = result.targets[0];
  return target !== undefined && modeAllowsKind(modeID, target.kind)
    ? { ok: true }
    : { ok: false, message: modeKindMessage(modeID) };
}

function findTargetMode(modeID: TargetModeID): TargetMode {
  const mode = targetModes.find((candidate) => candidate.id === modeID);
  if (mode === undefined) {
    throw new Error(`Unknown target mode: ${modeID}`);
  }
  return mode;
}

function modeAllowsKind(modeID: TargetModeID, kind: TargetKind): boolean {
  if (modeID === "single") {
    return kind === "hostname" || kind === "ip";
  }
  if (modeID === "range") {
    return kind === "range";
  }
  return modeID === "subnet" && kind === "cidr";
}

function modeCountMessage(modeID: TargetModeID): string {
  if (modeID === "single") {
    return "Single target mode accepts exactly one target.";
  }
  return modeKindMessage(modeID);
}

function modeKindMessage(modeID: TargetModeID): string {
  if (modeID === "single") {
    return "Single target mode accepts one hostname or IP address.";
  }
  if (modeID === "range") {
    return "IPv4 range mode expects one range like 192.168.1.1-20.";
  }
  return "Subnet mode expects one CIDR target like 192.168.1.0/24.";
}
