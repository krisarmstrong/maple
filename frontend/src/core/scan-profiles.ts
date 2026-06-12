export type ScanProfileID = "connect" | "ping" | "quick" | "service";

export interface ScanProfile {
  id: ScanProfileID;
  name: string;
  description: string;
  args: readonly string[];
}

export const scanProfiles: readonly ScanProfile[] = [
  {
    id: "connect",
    name: "TCP Connect",
    description: "Unprivileged TCP scan for local desktop use.",
    args: ["-sT", "-Pn", "-T3", "--top-ports", "100"],
  },
  { id: "ping", name: "Ping Sweep", description: "Host discovery only.", args: ["-sn"] },
  {
    id: "quick",
    name: "Quick Scan",
    description: "Top ports with conservative timing.",
    args: ["-T3", "--top-ports", "100"],
  },
  {
    id: "service",
    name: "Service Scan",
    description: "Light service version detection.",
    args: ["-sV", "--version-light"],
  },
];

export const previewXMLOutputPath = "<managed-xml-file>";

export function buildPreviewArgv(profileID: ScanProfileID, targets: readonly string[]): string[] {
  const profile = findProfile(profileID);
  return ["nmap", "-oX", previewXMLOutputPath, ...profile.args, "--", ...targets];
}

export function findProfile(profileID: ScanProfileID): ScanProfile {
  const profile = scanProfiles.find((candidate) => candidate.id === profileID);
  if (profile === undefined) {
    throw new Error("Unknown scan profile.");
  }
  return profile;
}

export function isScanProfileID(value: string): value is ScanProfileID {
  return scanProfiles.some((profile) => profile.id === value);
}
