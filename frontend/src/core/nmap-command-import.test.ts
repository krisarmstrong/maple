import { describe, expect, it } from "vitest";
import { importNmapCommand } from "./nmap-command-import";

describe("importNmapCommand", () => {
  // ---------------------------------------------------------------------------
  // Happy-path: realistic command
  // ---------------------------------------------------------------------------
  it("parses a realistic nmap command into structured options", () => {
    const result = importNmapCommand("nmap -sS -p 80,443 -T4 -sV --script http-title 10.0.0.0/24");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.scanTechnique).toBe("syn");
    expect(result.options.ports).toBe("80,443");
    expect(result.options.timingTemplate).toBe("T4");
    expect(result.options.serviceDetection).toBe(true);
    expect(result.scripts).toEqual(["http-title"]);
    expect(result.targets).toEqual(["10.0.0.0/24"]);
  });

  it("maps -F to the fast-scan option", () => {
    const result = importNmapCommand("nmap -F 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.fastScan).toBe(true);
    expect(result.targets).toEqual(["10.0.0.1"]);
  });

  // ---------------------------------------------------------------------------
  // Leading "nmap" is stripped
  // ---------------------------------------------------------------------------
  it("strips a leading 'nmap' keyword (case-insensitive not required — lowercase matches)", () => {
    const withNmap = importNmapCommand("nmap -Pn 192.168.1.1");
    const withoutNmap = importNmapCommand("-Pn 192.168.1.1");
    expect(withNmap).toEqual(withoutNmap);
  });

  // ---------------------------------------------------------------------------
  // Unknown flag -> ok: false, token listed in errors
  // ---------------------------------------------------------------------------
  it("rejects an unknown flag and lists it in errors", () => {
    const result = importNmapCommand("nmap --bogus 192.168.1.1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("--bogus"))).toBe(true);
  });

  it("rejected import does NOT partially apply — result has ok:false", () => {
    const result = importNmapCommand("nmap -sS --bogus 192.168.1.1");
    expect(result.ok).toBe(false);
    // The discriminated union means there is no .options field on the false branch.
    expect("options" in result).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Shell metacharacters -> immediate rejection
  // ---------------------------------------------------------------------------
  it("rejects a semicolon shell injection attempt", () => {
    const result = importNmapCommand("nmap 192.168.1.1 ; rm -rf /");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/shell metacharacter/i);
  });

  it("rejects pipe character", () => {
    const result = importNmapCommand("nmap 192.168.1.1 | cat /etc/passwd");
    expect(result.ok).toBe(false);
  });

  it("rejects backtick command substitution", () => {
    const result = importNmapCommand("nmap `whoami`");
    expect(result.ok).toBe(false);
  });

  it("rejects dollar-sign variable expansion", () => {
    const result = importNmapCommand("nmap $HOME");
    expect(result.ok).toBe(false);
  });

  it("rejects ampersand", () => {
    const result = importNmapCommand("nmap 192.168.1.1 & sleep 10");
    expect(result.ok).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Invalid target -> rejected
  // ---------------------------------------------------------------------------
  it("rejects an invalid target value", () => {
    const result = importNmapCommand("nmap not_a_valid_target_!!");
    expect(result.ok).toBe(false);
  });

  it("rejects a target that is not a valid IP, hostname, CIDR, or range", () => {
    const result = importNmapCommand("nmap 999.999.999.999");
    expect(result.ok).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Value-validation failure
  // ---------------------------------------------------------------------------
  it("rejects --min-rate with a non-integer value", () => {
    const result = importNmapCommand("nmap --min-rate abc 192.168.1.1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("--min-rate"))).toBe(true);
  });

  it("rejects --top-ports with zero", () => {
    const result = importNmapCommand("nmap --top-ports 0 192.168.1.1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("--top-ports"))).toBe(true);
  });

  it("rejects --version-intensity outside 0-9", () => {
    const result = importNmapCommand("nmap --version-intensity 10 192.168.1.1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("--version-intensity"))).toBe(true);
  });

  it("rejects --source-port above 65535", () => {
    const result = importNmapCommand("nmap --source-port 99999 192.168.1.1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("--source-port"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Blocked Maple-managed flags
  // ---------------------------------------------------------------------------
  it("rejects -oX (Maple-managed output)", () => {
    const result = importNmapCommand("nmap -oX /tmp/out.xml 192.168.1.1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("-oX"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Script name import
  // ---------------------------------------------------------------------------
  it("imports multiple scripts from --script", () => {
    const result = importNmapCommand("nmap --script http-title,ssl-cert 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scripts).toContain("http-title");
    expect(result.scripts).toContain("ssl-cert");
  });

  it("rejects --script values that look like filesystem paths", () => {
    const result = importNmapCommand("nmap --script /etc/passwd 10.0.0.1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("--script"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Various structured flags
  // ---------------------------------------------------------------------------
  it("maps -Pn to discoveryMode=skip", () => {
    const result = importNmapCommand("-Pn 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.discoveryMode).toBe("skip");
  });

  it("maps -sn to discoveryMode=ping", () => {
    const result = importNmapCommand("-sn 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.discoveryMode).toBe("ping");
  });

  it("maps -n to dnsMode=skip", () => {
    const result = importNmapCommand("-n 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.dnsMode).toBe("skip");
  });

  it("maps --system-dns to dnsMode=system", () => {
    const result = importNmapCommand("--system-dns 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.dnsMode).toBe("system");
  });

  it("maps -O to osDetection=true", () => {
    const result = importNmapCommand("-O 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.osDetection).toBe(true);
  });

  it("maps --traceroute to traceroute=true", () => {
    const result = importNmapCommand("--traceroute 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.traceroute).toBe(true);
  });

  it("maps -6 to ipv6=true", () => {
    const result = importNmapCommand("-6 ::1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.ipv6).toBe(true);
  });

  it("maps -v to verbosityMode=verbose", () => {
    const result = importNmapCommand("-v 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.verbosityMode).toBe("verbose");
  });

  it("maps -vv to verbosityMode=debug", () => {
    const result = importNmapCommand("-vv 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.verbosityMode).toBe("debug");
  });

  it("maps --open to openOnly=true", () => {
    const result = importNmapCommand("--open 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.openOnly).toBe(true);
  });

  it("maps --reason to reason=true", () => {
    const result = importNmapCommand("--reason 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.reason).toBe(true);
  });

  it("maps -p- to allPorts=true", () => {
    const result = importNmapCommand("-p- 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.allPorts).toBe(true);
  });

  it("maps -f to fragmentPackets=true", () => {
    const result = importNmapCommand("-f 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.fragmentPackets).toBe(true);
  });

  it("maps --packet-trace to packetTrace=true", () => {
    const result = importNmapCommand("--packet-trace 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.packetTrace).toBe(true);
  });

  it("maps --min-rate 500 correctly", () => {
    const result = importNmapCommand("--min-rate 500 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.minRate).toBe(500);
  });

  it("maps --max-rate 1000 correctly", () => {
    const result = importNmapCommand("--max-rate 1000 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.maxRate).toBe(1000);
  });

  it("maps --max-retries 3 correctly", () => {
    const result = importNmapCommand("--max-retries 3 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.maxRetries).toBe("3");
  });

  it("maps -iL to targetInputFile", () => {
    const result = importNmapCommand("-iL /tmp/hosts.txt");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.targetInputFile).toBe("/tmp/hosts.txt");
  });

  it("maps --exclude to excludeTargets", () => {
    const result = importNmapCommand("--exclude 10.0.0.1 10.0.0.0/24");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.excludeTargets).toBe("10.0.0.1");
  });

  it("maps --spoof-mac to spoofMac", () => {
    const result = importNmapCommand("--spoof-mac 0 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.spoofMac).toBe("0");
  });

  it("maps -S (source address) to sourceAddress", () => {
    const result = importNmapCommand("-S 192.168.1.100 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.sourceAddress).toBe("192.168.1.100");
  });

  it("maps -e (interface) to networkInterface", () => {
    const result = importNmapCommand("-e eth0 10.0.0.1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.options.networkInterface).toBe("eth0");
  });

  // ---------------------------------------------------------------------------
  // Empty input
  // ---------------------------------------------------------------------------
  it("rejects empty input", () => {
    const result = importNmapCommand("");
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    const result = importNmapCommand("   ");
    expect(result.ok).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Valid CIDR target
  // ---------------------------------------------------------------------------
  it("accepts a CIDR target", () => {
    const result = importNmapCommand("nmap -sT 192.168.0.0/16");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.targets).toEqual(["192.168.0.0/16"]);
  });
});
