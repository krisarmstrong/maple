import { describe, expect, it } from "vitest";
import { scanEventLogLine, scanEventRunningState } from "./scan-events";

describe("scan events", () => {
  it("tracks running state from lifecycle events", () => {
    expect(scanEventRunningState({ type: "started", runId: "scan-1" })).toBe(true);
    expect(
      scanEventRunningState({
        type: "finished",
        result: { runId: "scan-1", exitCode: 0, xml: "<nmaprun />" },
      }),
    ).toBe(false);
  });

  it("keeps normal Nmap stdout in the live log", () => {
    expect(
      scanEventLogLine({
        type: "output",
        output: {
          runId: "scan-1",
          stream: "stdout",
          text: "Nmap scan report for localhost (127.0.0.1)\n",
        },
      }),
    ).toBe("Nmap scan report for localhost (127.0.0.1)\n");
  });

  it("hides XML-looking stdout from the live log", () => {
    expect(
      scanEventLogLine({
        type: "output",
        output: {
          runId: "scan-1",
          stream: "stdout",
          text: '<?xml version="1.0"?><nmaprun />',
        },
      }),
    ).toBeUndefined();
    expect(
      scanEventLogLine({
        type: "output",
        output: { runId: "scan-1", stream: "stdout", text: "  <nmaprun />" },
      }),
    ).toBeUndefined();
  });

  it("keeps stderr diagnostics in the live log", () => {
    expect(
      scanEventLogLine({
        type: "output",
        output: { runId: "scan-1", stream: "stderr", text: "Stats: 0:00:01 elapsed" },
      }),
    ).toBe("Stats: 0:00:01 elapsed");
  });
});
