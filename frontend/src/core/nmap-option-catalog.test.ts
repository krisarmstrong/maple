import { describe, expect, it } from "vitest";
import {
  catalogGroups,
  nmapOptionCatalog,
  optionCoverageCounts,
  optionStatusLabel,
} from "./nmap-option-catalog";

describe("nmap option catalog", () => {
  it("groups every catalog entry under a visible option group", () => {
    const groupIds = new Set(catalogGroups().map(({ group }) => group.id));

    expect(nmapOptionCatalog.every((entry) => groupIds.has(entry.groupId))).toBe(true);
    expect(catalogGroups().every(({ entries }) => entries.length > 0)).toBe(true);
  });

  it("tracks current structured controls and advanced escape hatches", () => {
    const supportedSwitches = new Set(
      nmapOptionCatalog
        .filter((entry) => entry.status === "structured" || entry.status === "escape-hatch")
        .flatMap((entry) => entry.switches),
    );

    expect(supportedSwitches).toContain("-sT");
    expect(supportedSwitches).toContain("-sA");
    expect(supportedSwitches).toContain("-iL");
    expect(supportedSwitches).toContain("-PS");
    expect(supportedSwitches).toContain("-sV");
    expect(supportedSwitches).toContain("--script-args-file");
    expect(supportedSwitches).toContain("--max-rtt-timeout");
  });

  it("keeps raw shell command input and unmanaged output paths blocked", () => {
    const blockedNames = nmapOptionCatalog
      .filter((entry) => entry.status === "blocked")
      .map((entry) => entry.name);

    expect(blockedNames).toContain("Raw shell command input");
    expect(blockedNames).toContain("Maple-managed XML");
    expect(blockedNames).toContain("Other output path flags");
  });

  it("summarizes coverage by implementation status", () => {
    expect(optionCoverageCounts()).toEqual({
      structured: 18,
      "escape-hatch": 2,
      planned: 3,
      blocked: 3,
    });
  });

  it("labels each catalog status for display", () => {
    expect(optionStatusLabel("structured")).toBe("Structured control");
    expect(optionStatusLabel("escape-hatch")).toBe("Advanced escape hatch");
    expect(optionStatusLabel("planned")).toBe("Planned");
    expect(optionStatusLabel("blocked")).toBe("Blocked by design");
  });
});
