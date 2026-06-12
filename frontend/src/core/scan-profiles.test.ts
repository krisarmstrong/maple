import { describe, expect, it } from "vitest";
import { buildPreviewArgv, scanProfiles } from "./scan-profiles";

describe("scanProfiles", () => {
  it("exposes a small safe built-in profile set", () => {
    expect(scanProfiles.map((profile) => profile.id)).toEqual([
      "connect",
      "ping",
      "quick",
      "service",
    ]);
  });

  it("builds preview argv with XML output before targets", () => {
    expect(buildPreviewArgv("connect", ["scanme.nmap.org"])).toEqual([
      "nmap",
      "-oX",
      "-",
      "-sT",
      "-Pn",
      "-T3",
      "--top-ports",
      "100",
      "--",
      "scanme.nmap.org",
    ]);
  });
});
