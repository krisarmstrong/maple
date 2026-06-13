import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styleFiles = ["app.css", "index.css"] as const;
const themeFile = "theme.css";

describe("style token guard", () => {
  it("keeps raw color values inside theme.css", () => {
    const violations = collectViolations(styleFiles, /#[0-9a-fA-F]{3,8}\b/u);

    expect(violations).toEqual([]);
  });

  it("keeps visual scale values tokenized outside theme.css", () => {
    const violations = collectViolations(
      styleFiles,
      /^\s*(?:font-size|font-weight|line-height|border-radius|padding|margin|gap|min-height|max-height|width):\s*(?:\d|\.\d)/u,
    );

    expect(violations).toEqual([]);
  });

  it("keeps theme.css as the only source of raw palette values", () => {
    const theme = readStyleFile(themeFile);

    expect(theme).toMatch(/--color-canvas:\s*#[0-9a-fA-F]{6};/u);
    expect(theme).toMatch(/:root\[data-theme="dark"\]/u);
  });
});

function collectViolations(files: readonly string[], pattern: RegExp): string[] {
  return files.flatMap((file) => {
    const css = readStyleFile(file);
    return css
      .split("\n")
      .flatMap((line, index) =>
        pattern.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [],
      );
  });
}

function readStyleFile(file: string): string {
  return readFileSync(new URL(file, import.meta.url), "utf8");
}
