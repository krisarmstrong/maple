import { describe, expect, it } from "vitest";
import { resolveThemeMode } from "./theme";

describe("resolveThemeMode", () => {
  it("resolves explicit modes directly", () => {
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(resolveThemeMode("dark", false)).toBe("dark");
  });

  it("uses system preference for system mode", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("system", false)).toBe("light");
  });
});
