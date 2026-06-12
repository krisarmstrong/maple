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
      "<managed-xml-file>",
      "-sT",
      "-Pn",
      "-T3",
      "--top-ports",
      "100",
      "--",
      "scanme.nmap.org",
    ]);
  });

  it("builds preview argv with NSE scripts before targets", () => {
    expect(buildPreviewArgv("service", ["scanme.nmap.org"], ["safe", "/tmp/custom.nse"])).toEqual([
      "nmap",
      "-oX",
      "<managed-xml-file>",
      "-sV",
      "--version-light",
      "--script",
      "safe",
      "--script",
      "/tmp/custom.nse",
      "--",
      "scanme.nmap.org",
    ]);
  });
});
