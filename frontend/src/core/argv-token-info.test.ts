import { describe, expect, it } from "vitest";
import { argvTokenDescription } from "./argv-token-info";

describe("argvTokenDescription", () => {
  it("returns a description for known nmap flags", () => {
    expect(argvTokenDescription("-sT")).toBe("TCP connect scan (unprivileged)");
    expect(argvTokenDescription("-sS")).toBe("TCP SYN (stealth) scan — requires privileges");
    expect(argvTokenDescription("-O")).toBe("Enable OS detection");
    expect(argvTokenDescription("-T4")).toBe("Timing template: Aggressive");
    expect(argvTokenDescription("--script")).toBe("Run NSE script or category");
    expect(argvTokenDescription("--open")).toBe("Only show open ports");
    expect(argvTokenDescription("--")).toBe("End of options; remaining args are targets");
  });

  it("returns undefined for value tokens that are not flags", () => {
    expect(argvTokenDescription("scanme.nmap.org")).toBeUndefined();
    expect(argvTokenDescription("22,80,443")).toBeUndefined();
    expect(argvTokenDescription("500")).toBeUndefined();
    expect(argvTokenDescription("/usr/local/bin/nmap")).toBeUndefined();
    expect(argvTokenDescription("<managed-xml-file>")).toBeUndefined();
  });

  it("returns undefined for unknown or unsupported flags", () => {
    expect(argvTokenDescription("--imaginary-flag")).toBeUndefined();
    expect(argvTokenDescription("")).toBeUndefined();
  });

  it("returns a description for output and verbosity flags", () => {
    expect(argvTokenDescription("-oX")).toBe("XML output (Maple-managed path)");
    expect(argvTokenDescription("-v")).toBe("Verbose output");
    expect(argvTokenDescription("-vv")).toBe("Very verbose output");
  });

  it("returns a description for evasion flags", () => {
    expect(argvTokenDescription("-f")).toBe("Fragment IP packets");
    expect(argvTokenDescription("-D")).toBe("Decoy scan — add decoy addresses");
    expect(argvTokenDescription("--spoof-mac")).toBe("Spoof MAC address");
  });

  it("returns a description for timing template flags", () => {
    expect(argvTokenDescription("-T0")).toBe("Timing template: Paranoid (slowest)");
    expect(argvTokenDescription("-T3")).toBe("Timing template: Normal (default)");
    expect(argvTokenDescription("-T5")).toBe("Timing template: Insane (fastest)");
  });
});
