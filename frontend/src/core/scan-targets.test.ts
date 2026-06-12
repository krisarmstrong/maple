import { describe, expect, it } from "vitest";
import { parseTargets } from "./scan-targets";

describe("parseTargets", () => {
  it("accepts hostnames, IP addresses, CIDR blocks, IPv4 ranges, and comma/newline lists", () => {
    const result = parseTargets("scanme.nmap.org, 192.168.1.1\n10.0.0.0/24,192.168.1.1-20");

    expect(result).toEqual({
      ok: true,
      targets: [
        { value: "scanme.nmap.org", kind: "hostname" },
        { value: "192.168.1.1", kind: "ip" },
        { value: "10.0.0.0/24", kind: "cidr" },
        { value: "192.168.1.1-20", kind: "range" },
      ],
    });
  });

  it("rejects shell-like or whitespace-separated input", () => {
    expect(parseTargets("scanme.nmap.org; rm -rf /")).toEqual({
      ok: false,
      message:
        "Enter hostnames, IPs, CIDR subnets, or IPv4 ranges separated by commas or new lines.",
    });
  });

  it("rejects option-like targets and invalid IP-shaped values", () => {
    expect(parseTargets("-sV")).toEqual({
      ok: false,
      message:
        "Enter hostnames, IPs, CIDR subnets, or IPv4 ranges separated by commas or new lines.",
    });
    expect(parseTargets("192.168.1.400")).toEqual({
      ok: false,
      message:
        "Enter hostnames, IPs, CIDR subnets, or IPv4 ranges separated by commas or new lines.",
    });
    expect(parseTargets("192.168.1.20-1")).toEqual({
      ok: false,
      message:
        "Enter hostnames, IPs, CIDR subnets, or IPv4 ranges separated by commas or new lines.",
    });
  });

  it("rejects an empty list", () => {
    expect(parseTargets(" , \n ")).toEqual({
      ok: false,
      message: "Enter at least one target.",
    });
  });
});
