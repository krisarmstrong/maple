import { describe, expect, it } from "vitest";
import { getToolStatus, summarizeTools, type ToolDetection } from "./tool-detection";

describe("tool detection helpers", () => {
  it("marks installed tools as installed", () => {
    const tool: ToolDetection = {
      name: "nmap",
      displayName: "Nmap",
      required: true,
      installed: true,
    };

    expect(getToolStatus(tool)).toBe("installed");
  });

  it("distinguishes missing required and optional tools", () => {
    expect(
      getToolStatus({
        name: "nmap",
        displayName: "Nmap",
        required: true,
        installed: false,
      }),
    ).toBe("missing-required");

    expect(
      getToolStatus({
        name: "ndiff",
        displayName: "Ndiff",
        required: false,
        installed: false,
      }),
    ).toBe("missing-optional");
  });

  it("summarizes required missing tools before installed count", () => {
    expect(
      summarizeTools([
        { name: "nmap", displayName: "Nmap", required: true, installed: false },
        { name: "ncat", displayName: "Ncat", required: false, installed: true },
      ]),
    ).toBe("1 required tool missing");
  });

  it("pluralizes multiple missing required tools", () => {
    expect(
      summarizeTools([
        { name: "nmap", displayName: "Nmap", required: true, installed: false },
        { name: "nmap2", displayName: "Nmap 2", required: true, installed: false },
      ]),
    ).toBe("2 required tools missing");
  });
});
