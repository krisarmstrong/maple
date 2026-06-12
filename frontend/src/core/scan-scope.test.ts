import { describe, expect, it } from "vitest";
import { scanScope } from "./scan-scope";

describe("scanScope", () => {
  it("describes single-target scans", () => {
    expect(scanScope("connect", "scanme.nmap.org")).toEqual({
      label: "1 target expression, up to 1 address",
      warning: undefined,
    });
  });

  it("estimates IPv4 ranges and CIDR subnets", () => {
    expect(scanScope("ping", "192.168.1.1-20")).toEqual({
      label: "1 target expression, up to 20 addresses",
      warning: undefined,
    });
    expect(scanScope("ping", "192.168.1.0/24")).toEqual({
      label: "1 target expression, up to 256 addresses",
      warning: undefined,
    });
  });

  it("describes lists with mixed target expressions", () => {
    expect(scanScope("ping", "scanme.nmap.org, 192.168.1.1-20, 10.0.0.0/30")).toEqual({
      label: "3 target expressions, up to 25 addresses",
      warning: undefined,
    });
  });

  it("keeps IPv6 CIDR estimates intentionally vague", () => {
    expect(scanScope("ping", "2001:db8::/64")).toEqual({
      label: "1 target expression",
      warning: undefined,
    });
  });

  it("warns before larger port and service scans", () => {
    expect(scanScope("connect", "192.168.1.0/24")?.warning).toBe(
      "Port scans across many addresses can take a while. Run a Ping Sweep first if you only need host discovery.",
    );
    expect(scanScope("service", "192.168.1.0/24")?.warning).toBe(
      "Service scans across many addresses can take a while. Run a Ping Sweep first if you only need host discovery.",
    );
    expect(scanScope("ping", "192.168.1.0/24")?.warning).toBeUndefined();
  });

  it("does not describe invalid targets", () => {
    expect(scanScope("connect", "scanme.nmap.org; rm -rf /")).toBeUndefined();
  });
});
