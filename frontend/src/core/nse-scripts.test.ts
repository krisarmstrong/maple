import { describe, expect, it } from "vitest";
import { buildScanScripts } from "./nse-scripts";

describe("NSE script helpers", () => {
  it("builds structured script selections from categories, names, and custom paths", () => {
    expect(
      buildScanScripts(
        ["safe", "vuln"],
        "http-title\n\nssl-enum-ciphers",
        "/tmp/custom-one.nse\n\n/tmp/custom-two.nse",
      ),
    ).toEqual([
      { kind: "category", value: "safe" },
      { kind: "category", value: "vuln" },
      { kind: "name", value: "http-title" },
      { kind: "name", value: "ssl-enum-ciphers" },
      { kind: "path", value: "/tmp/custom-one.nse" },
      { kind: "path", value: "/tmp/custom-two.nse" },
    ]);
  });
});
