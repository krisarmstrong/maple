/**
 * Short descriptions for known nmap flags shown as token tooltips.
 * Keys are exact flag strings as they appear in argv.
 */
const FLAG_DESCRIPTIONS: Readonly<Record<string, string>> = {
  // Scan techniques
  "-sT": "TCP connect scan (unprivileged)",
  "-sS": "TCP SYN (stealth) scan — requires privileges",
  "-sU": "UDP scan",
  "-sA": "TCP ACK scan — maps firewall rules",
  "-sW": "TCP Window scan",
  "-sM": "TCP Maimon scan",
  "-sN": "TCP NULL scan — no flags set",
  "-sF": "TCP FIN scan",
  "-sX": "TCP Xmas scan — FIN, PSH, URG flags",
  "-sY": "SCTP INIT scan",
  "-sZ": "SCTP COOKIE-ECHO scan",
  "-sO": "IP protocol scan",
  "-sn": "Ping scan only — no port scan",
  "-sV": "Service version detection",
  // Discovery
  "-Pn": "Skip host discovery — treat all hosts as online",
  "-PE": "ICMP echo discovery probe",
  "-PP": "ICMP timestamp discovery probe",
  "-PM": "ICMP netmask discovery probe",
  "-n": "Skip DNS resolution",
  "-R": "Resolve DNS for all targets",
  "--system-dns": "Use OS DNS resolver",
  // Output flags
  "-oX": "XML output (Maple-managed path)",
  "-oN": "Normal text output",
  "-oG": "Grepable output",
  "-oA": "All output formats",
  "-v": "Verbose output",
  "-vv": "Very verbose output",
  "-d": "Debug output",
  // Ports
  "-p": "Port specification",
  "-p-": "Scan all 65535 ports",
  "--top-ports": "Scan N most common ports",
  "--open": "Only show open ports",
  // Timing
  "-T0": "Timing template: Paranoid (slowest)",
  "-T1": "Timing template: Sneaky",
  "-T2": "Timing template: Polite",
  "-T3": "Timing template: Normal (default)",
  "-T4": "Timing template: Aggressive",
  "-T5": "Timing template: Insane (fastest)",
  "--min-rate": "Minimum packet send rate",
  "--max-rate": "Maximum packet send rate",
  "--max-retries": "Maximum port scan probe retransmissions",
  "--host-timeout": "Skip hosts that take longer than this",
  "--max-rtt-timeout": "Maximum round-trip timeout",
  "--stats-every": "Print periodic timing stats",
  "--scan-delay": "Minimum delay between probes",
  "--max-scan-delay": "Maximum delay between probes",
  "--min-hostgroup": "Minimum parallel host scan group size",
  "--max-hostgroup": "Maximum parallel host scan group size",
  "--min-parallelism": "Minimum number of parallel probes",
  "--max-parallelism": "Maximum number of parallel probes",
  // Service and OS
  "-O": "Enable OS detection",
  "--traceroute": "Trace hop path to each host",
  "--reason": "Show reason for each port state",
  "--version-light": "Light service version detection (intensity 2)",
  "--version-all": "Maximum service version detection (intensity 9)",
  "--version-intensity": "Set version detection intensity (0-9)",
  // NSE
  "--script": "Run NSE script or category",
  "--script-args": "Script argument key=value pairs",
  "--script-args-file": "Load NSE script arguments from file",
  // Evasion
  "-f": "Fragment IP packets",
  "--mtu": "Custom MTU for packet fragmentation",
  "--data-length": "Append random data to packets",
  "--source-port": "Use specified source port number",
  "-D": "Decoy scan — add decoy addresses",
  "-S": "Spoof source IP address",
  "-e": "Specify network interface",
  "--spoof-mac": "Spoof MAC address",
  "--packet-trace": "Show all packets sent and received",
  // Targeting
  "-iL": "Read targets from file",
  "--exclude": "Exclude hosts or networks",
  "--excludefile": "Read exclusion list from file",
  // IPv6
  "-6": "Enable IPv6 scanning",
  // DNS
  "--dns-servers": "Specify custom DNS servers",
  // Separator
  "--": "End of options; remaining args are targets",
};

/**
 * Return a short description for a known nmap flag token, or undefined if the
 * token is not a recognized flag (e.g. it is a value argument or a target).
 */
export function argvTokenDescription(token: string): string | undefined {
  return FLAG_DESCRIPTIONS[token];
}
