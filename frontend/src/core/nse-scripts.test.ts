import { describe, expect, it } from "vitest";
import { buildScanScripts } from "./nse-scripts";

describe("NSE script helpers", () => {
  it("builds structured script selections from categories and custom paths", () => {
    expect(
      buildScanScripts(["safe", "vuln"], "/tmp/custom-one.nse\n\n/tmp/custom-two.nse"),
    ).toEqual([
      { kind: "category", value: "safe" },
      { kind: "category", value: "vuln" },
      { kind: "path", value: "/tmp/custom-one.nse" },
      { kind: "path", value: "/tmp/custom-two.nse" },
    ]);
  });
});
