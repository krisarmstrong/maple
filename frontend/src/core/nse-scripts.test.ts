import { describe, expect, it } from "vitest";
import {
  buildScanScripts,
  nseCategoryDescription,
  nseCategoryRisk,
  nseScriptDetails,
  scriptsForCategories,
  searchNSEScripts,
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
});
