import { describe, expect, it } from "vitest";
import { parseScanProgressLine } from "./scan-progress";

describe("parseScanProgressLine", () => {
  it("returns undefined for plain output lines without progress info", () => {
    expect(parseScanProgressLine("Starting Nmap 7.95 ( https://nmap.org )")).toBeUndefined();
    expect(parseScanProgressLine("Nmap scan report for scanme.nmap.org")).toBeUndefined();
    expect(parseScanProgressLine("")).toBeUndefined();
  });

  it("parses a basic percent-done line", () => {
    const result = parseScanProgressLine("About 15.23% done; ETC: 14:05 (0:02:30 remaining)");
    expect(result).not.toBeUndefined();
    expect(result?.percent).toBeCloseTo(15.23);
    expect(result?.remaining).toBe("2m30s");
  });

  it("parses a timing-prefixed progress line", () => {
    const result = parseScanProgressLine(
      "SYN Stealth Scan Timing: About 27.50% done; ETC: 14:20 (0:04:10 remaining)",
    );
    expect(result?.percent).toBeCloseTo(27.5);
    expect(result?.remaining).toBe("4m10s");
  });

  it("parses a whole-number percent", () => {
    const result = parseScanProgressLine("About 50% done; ETC: 15:00 (0:01:00 remaining)");
    expect(result?.percent).toBe(50);
    expect(result?.remaining).toBe("1m");
  });

  it("formats hours and minutes when remaining exceeds one hour", () => {
    const result = parseScanProgressLine("About 5% done; ETC: 16:00 (1:30:00 remaining)");
    expect(result?.remaining).toBe("1h30m");
  });

  it("returns empty remaining string when no remaining time is present", () => {
    const result = parseScanProgressLine("About 80% done");
    expect(result?.percent).toBeCloseTo(80);
    expect(result?.remaining).toBe("");
  });

  it("clamps percent to 100", () => {
    const result = parseScanProgressLine("About 100.50% done; ETC: 14:00 (0:00:01 remaining)");
    expect(result?.percent).toBe(100);
  });

  it("clamps percent to 0 for negative values (defensive)", () => {
    // Edge case: should never happen in practice but guard anyway.
    const result = parseScanProgressLine("About 0% done; ETC: 14:00 (0:00:01 remaining)");
    expect(result?.percent).toBe(0);
  });

  it("returns remaining seconds only when minutes are zero", () => {
    const result = parseScanProgressLine("About 99% done; ETC: 14:00 (0:00:45 remaining)");
    expect(result?.remaining).toBe("45s");
  });
});
