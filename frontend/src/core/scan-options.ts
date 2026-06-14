export type TimingTemplate = "" | "T0" | "T1" | "T2" | "T3" | "T4" | "T5";
export type DNSMode = "" | "skip" | "system";
export type DiscoveryMode = "" | "skip" | "ping";
export type ScanTechnique =
  | ""
  | "connect"
  | "syn"
  | "udp"
  | "ack"
  | "window"
  | "maimon"
  | "null"
  | "fin"
  | "xmas"
  | "sctp-init"
  | "sctp-cookie"
  | "protocol";
export type VerbosityMode = "" | "verbose" | "debug";
export type VersionMode = "" | "light" | "all";

export interface ScanOptions {
  scanTechnique: ScanTechnique;
  discoveryMode: DiscoveryMode;
  tcpSynProbes: string;
  tcpAckProbes: string;
  udpProbes: string;
  sctpInitProbes: string;
  icmpEchoProbe: boolean;
  icmpTimestamp: boolean;
  icmpNetmask: boolean;
  targetInputFile: string;
  excludeTargets: string;
  excludeFile: string;
  timingTemplate: TimingTemplate;
  ports: string;
  topPorts: number;
  allPorts: boolean;
  serviceDetection: boolean;
  versionMode: VersionMode;
  ipv6: boolean;
  osDetection: boolean;
  traceroute: boolean;
  dnsMode: DNSMode;
  verbosityMode: VerbosityMode;
  reason: boolean;
  openOnly: boolean;
  minRate: number;
  maxRetries: string;
  hostTimeout: string;
  maxRttTimeout: string;
  statsEvery: string;
  packetTrace: boolean;
}

export const defaultScanOptions: ScanOptions = {
  scanTechnique: "",
  discoveryMode: "",
  tcpSynProbes: "",
  tcpAckProbes: "",
  udpProbes: "",
  sctpInitProbes: "",
  icmpEchoProbe: false,
  icmpTimestamp: false,
  icmpNetmask: false,
  targetInputFile: "",
  excludeTargets: "",
  excludeFile: "",
  timingTemplate: "",
  ports: "",
  topPorts: 0,
  allPorts: false,
  serviceDetection: false,
  versionMode: "",
  ipv6: false,
  osDetection: false,
  traceroute: false,
  dnsMode: "",
  verbosityMode: "",
  reason: false,
  openOnly: false,
  minRate: 0,
  maxRetries: "",
  hostTimeout: "",
  maxRttTimeout: "",
  statsEvery: "",
  packetTrace: false,
};

export const timingTemplates: readonly { value: TimingTemplate; label: string }[] = [
  { value: "", label: "Profile default" },
  { value: "T0", label: "T0 paranoid" },
  { value: "T1", label: "T1 sneaky" },
  { value: "T2", label: "T2 polite" },
  { value: "T3", label: "T3 normal" },
  { value: "T4", label: "T4 faster" },
  { value: "T5", label: "T5 fastest" },
];

export const scanTechniques: readonly { value: ScanTechnique; label: string }[] = [
  { value: "", label: "Profile default" },
  { value: "connect", label: "TCP connect" },
  { value: "syn", label: "TCP SYN" },
  { value: "udp", label: "UDP" },
  { value: "ack", label: "TCP ACK" },
  { value: "window", label: "TCP Window" },
  { value: "maimon", label: "TCP Maimon" },
  { value: "null", label: "TCP NULL" },
  { value: "fin", label: "TCP FIN" },
  { value: "xmas", label: "TCP Xmas" },
  { value: "sctp-init", label: "SCTP INIT" },
  { value: "sctp-cookie", label: "SCTP COOKIE-ECHO" },
  { value: "protocol", label: "IP protocol" },
];

export const discoveryModes: readonly { value: DiscoveryMode; label: string }[] = [
  { value: "", label: "Profile default" },
  { value: "skip", label: "Skip host discovery" },
  { value: "ping", label: "Ping discovery only" },
];

export const dnsModes: readonly { value: DNSMode; label: string }[] = [
  { value: "", label: "Default DNS" },
  { value: "skip", label: "Skip DNS lookup" },
  { value: "system", label: "Use system DNS resolver" },
];

export const versionModes: readonly { value: VersionMode; label: string }[] = [
  { value: "", label: "Default version detail" },
  { value: "light", label: "Light probes" },
  { value: "all", label: "All probes" },
];

export const verbosityModes: readonly { value: VerbosityMode; label: string }[] = [
  { value: "", label: "Normal output" },
  { value: "verbose", label: "Verbose" },
  { value: "debug", label: "Very verbose" },
];

export function isTimingTemplate(value: string): value is TimingTemplate {
  return timingTemplates.some((template) => template.value === value);
}

export function isScanTechnique(value: string): value is ScanTechnique {
  return scanTechniques.some((technique) => technique.value === value);
}

export function isDiscoveryMode(value: string): value is DiscoveryMode {
  return discoveryModes.some((mode) => mode.value === value);
}

export function isDNSMode(value: string): value is DNSMode {
  return dnsModes.some((mode) => mode.value === value);
}

export function isVersionMode(value: string): value is VersionMode {
  return versionModes.some((mode) => mode.value === value);
}

export function isVerbosityMode(value: string): value is VerbosityMode {
  return verbosityModes.some((mode) => mode.value === value);
}
