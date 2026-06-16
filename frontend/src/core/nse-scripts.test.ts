import { describe, expect, it } from "vitest";
import {
  buildScanScripts,
  nseCategoryDescription,
  nseCategoryRisk,
  nseScriptDetails,
  scriptsForCategories,
  searchNSEScripts,
  selectionRequiresConfirmation,
  suggestedScriptsForSelection,
} from "./nse-scripts";

describe("NSE script helpers", () => {
  it("builds structured script selections from categories, names, and custom paths", () => {
    expect(
      buildScanScripts(
        ["safe", "vuln"],
        "http-title\n\nssl-enum-ciphers",
        "/tmp/custom-one.nse\n\n/tmp/custom-two.nse",
        "/tmp/nse-pack",
      ),
    ).toEqual([
      { kind: "category", value: "safe" },
      { kind: "category", value: "vuln" },
      { kind: "name", value: "http-title" },
      { kind: "name", value: "ssl-enum-ciphers" },
      { kind: "path", value: "/tmp/custom-one.nse" },
      { kind: "path", value: "/tmp/custom-two.nse" },
      { kind: "path", value: "/tmp/nse-pack" },
    ]);
  });

  it("returns scripts that belong to selected categories", () => {
    expect(scriptsForCategories(["discovery", "safe"])).toEqual([
      "broadcast-dns-service-discovery",
      "dns-recursion",
      "dns-service-discovery",
      "http-title",
      "smb-os-discovery",
      "ssl-cert",
      "ssl-enum-ciphers",
    ]);
  });

  it("shows popular suggestions until categories narrow the browser", () => {
    expect(suggestedScriptsForSelection([]).slice(0, 3)).toEqual([
      "http-title",
      "http-headers",
      "http-server-header",
    ]);
    expect(suggestedScriptsForSelection(["vuln"])).toEqual([
      "http-vuln-cve2017-5638",
      "smb-vuln-ms17-010",
      "ssl-heartbleed",
      "vulners",
    ]);
  });

  it("searches across the known script catalog", () => {
    expect(searchNSEScripts("smb")).toEqual([
      "smb-brute",
      "smb-enum-shares",
      "smb-os-discovery",
      "smb-security-mode",
      "smb-vuln-ms10-054",
      "smb-vuln-ms17-010",
    ]);
    expect(searchNSEScripts("recursion")).toEqual(["dns-recursion"]);
  });

  it("describes categories and script risk", () => {
    expect(nseCategoryDescription("safe")).toBe("Low-risk informational checks.");
    expect(nseCategoryRisk("dos")).toBe("intrusive");
    expect(nseCategoryRisk("vuln")).toBe("noisy");

    expect(nseScriptDetails("ssl-enum-ciphers")).toEqual({
      categories: ["safe", "version"],
      description: "Enumerates TLS protocol and cipher support.",
      name: "ssl-enum-ciphers",
      risk: "normal",
    });
    expect(nseScriptDetails("smb-vuln-ms17-010").risk).toBe("intrusive");
  });

  describe("selectionRequiresConfirmation", () => {
    it("returns empty array for safe-only category selections", () => {
      expect(selectionRequiresConfirmation(["safe", "discovery", "default"], [])).toEqual([]);
    });

    it("returns empty array when no categories or scripts are selected", () => {
      expect(selectionRequiresConfirmation([], [])).toEqual([]);
    });

    it("flags intrusive category when selected directly", () => {
      expect(selectionRequiresConfirmation(["intrusive"], [])).toEqual(["intrusive"]);
    });

    it("flags exploit category when selected directly", () => {
      expect(selectionRequiresConfirmation(["exploit"], [])).toEqual(["exploit"]);
    });

    it("flags dos category when selected directly", () => {
      expect(selectionRequiresConfirmation(["dos"], [])).toEqual(["dos"]);
    });

    it("flags brute category when selected directly", () => {
      expect(selectionRequiresConfirmation(["brute"], [])).toEqual(["brute"]);
    });

    it("flags malware category when selected directly", () => {
      expect(selectionRequiresConfirmation(["malware"], [])).toEqual(["malware"]);
    });

    it("flags fuzzer category when selected directly", () => {
      expect(selectionRequiresConfirmation(["fuzzer"], [])).toEqual(["fuzzer"]);
    });

    it("returns sorted list when multiple disruptive categories are selected", () => {
      expect(selectionRequiresConfirmation(["exploit", "dos", "brute"], [])).toEqual([
        "brute",
        "dos",
        "exploit",
      ]);
    });

    it("ignores safe categories mixed with disruptive ones", () => {
      expect(selectionRequiresConfirmation(["safe", "dos", "discovery"], [])).toEqual(["dos"]);
    });

    it("flags disruptive categories implied by selected script names", () => {
      // smb-brute belongs to the brute category
      expect(selectionRequiresConfirmation([], ["smb-brute"])).toEqual(["brute"]);
      // http-shellshock belongs to the exploit category
      expect(selectionRequiresConfirmation([], ["http-shellshock"])).toEqual(["exploit"]);
      // http-slowloris belongs to the dos category
      expect(selectionRequiresConfirmation([], ["http-slowloris"])).toEqual(["dos"]);
    });

    it("combines disruptive categories from both selected categories and named scripts", () => {
      // dos via category + brute via named script
      expect(selectionRequiresConfirmation(["dos"], ["smb-brute"])).toEqual(["brute", "dos"]);
    });

    it("deduplicates when category and named script overlap on the same disruptive category", () => {
      // brute category selected + ftp-brute (also brute) → only one entry
      expect(selectionRequiresConfirmation(["brute"], ["ftp-brute"])).toEqual(["brute"]);
    });

    it("returns empty array for safe named script selections", () => {
      expect(selectionRequiresConfirmation([], ["http-title", "ssl-cert"])).toEqual([]);
    });
  });
});
