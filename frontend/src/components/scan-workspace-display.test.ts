import { describe, expect, it } from "vitest";
import { defaultScanOptions } from "../core/scan-options";
import {
  commandTokens,
  isRiskyNSECategory,
  isSpecializedScanTechnique,
  messageForInvalidScanOptions,
  splitSelectedScriptID,
  targetBuilderSummary,
  targetModeContextLabel,
} from "./scan-workspace-display";

describe("scan workspace display helpers", () => {
  it("builds stable token ids for duplicate argv tokens", () => {
    expect(commandTokens(["nmap", "-p", "80", "-p", "443"])).toEqual([
      { id: "nmap:1", value: "nmap" },
      { id: "-p:1", value: "-p" },
      { id: "80:1", value: "80" },
      { id: "-p:2", value: "-p" },
      { id: "443:1", value: "443" },
    ]);
  });

  it("summarizes valid and invalid target builder input", () => {
    expect(targetBuilderSummary("scanme.nmap.org")).toEqual({
      parsedTargets: "1 hostname",
      estimatedAddresses: "1 target expression, up to 1 address",
    });
    expect(targetBuilderSummary("--script vuln")).toEqual({
      parsedTargets: "No target set",
      estimatedAddresses: "n/a",
    });
  });

  it("labels target modes and risky NSE categories", () => {
    expect(targetModeContextLabel("single")).toBe("Single host/IP");
    expect(targetModeContextLabel("range")).toBe("IPv4 range");
    expect(targetModeContextLabel("subnet")).toBe("Subnet");
    expect(targetModeContextLabel("list")).toBe("Target list");
    expect(isRiskyNSECategory("vuln")).toBe(true);
    expect(isRiskyNSECategory("safe")).toBe(false);
  });

  it("flags specialized scan techniques", () => {
    expect(isSpecializedScanTechnique("ack")).toBe(true);
    expect(isSpecializedScanTechnique("connect")).toBe(false);
  });

  it("returns plain-language validation messages for option conflicts", () => {
    expect(
      messageForInvalidScanOptions({
        ...defaultScanOptions,
        minRate: 2000,
        maxRate: 1000,
      }),
    ).toBe("Minimum packet rate cannot be greater than maximum packet rate.");
    expect(
      messageForInvalidScanOptions({
        ...defaultScanOptions,
        minHostGroup: 50,
        maxHostGroup: 10,
      }),
    ).toBe("Minimum host group cannot be greater than maximum host group.");
    expect(
      messageForInvalidScanOptions({
        ...defaultScanOptions,
        fragmentPackets: true,
        mtu: 24,
      }),
    ).toBe("Fragment packets and custom MTU cannot be used together.");
  });

  it("splits selected script chip ids on the first separator", () => {
    expect(splitSelectedScriptID("path:/Users/me/a:b.nse")).toEqual(["path", "/Users/me/a:b.nse"]);
    expect(splitSelectedScriptID("invalid")).toEqual(["", "invalid"]);
  });
});
