import { describe, expect, it } from "vitest";
import { defaultScanOptions } from "./scan-options";
import { summarizePreset } from "./scan-preset-summary";
import type { ScanPreset } from "./scan-presets";

describe("scan-preset-summary", () => {
  it("summarizes a saved scan shape without target values", () => {
    expect(
      summarizePreset({
        ...presetBase,
        profileId: "service",
        options: { ...defaultScanOptions, timingTemplate: "T4", ports: "80,443" },
        scriptCategories: ["safe"],
        scriptNames: "http-title\nssl-cert",
      }),
    ).toEqual({
      intentLabel: "Custom saved recipe",
      optionsLabel: "2 option changes",
      scriptsLabel: "3 script selections",
      targetPolicyLabel: "No target saved",
    });
  });

  it("uses quiet labels for presets with default options and no scripts", () => {
    expect(summarizePreset(presetBase)).toEqual({
      intentLabel: "Custom saved recipe",
      optionsLabel: "Recipe defaults",
      scriptsLabel: "No scripts",
      targetPolicyLabel: "No target saved",
    });
  });

  it("uses clear intent labels for built-in recipes", () => {
    expect(summarizePreset({ ...presetBase, id: "builtin-web-quick-look" }).intentLabel).toBe(
      "HTTP/HTTPS headers and titles",
    );
  });
});

const presetBase: ScanPreset = {
  id: "baseline",
  name: "Baseline",
  profileId: "connect",
  options: defaultScanOptions,
  scriptCategories: [],
  scriptNames: "",
  customScriptPaths: "",
  customScriptDirectories: "",
  scriptArgs: "",
  scriptArgsFile: "",
};
