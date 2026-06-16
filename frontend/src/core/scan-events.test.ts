import { describe, expect, it } from "vitest";
import {
  isPrivilegeError,
  scanEventFinishKind,
  scanEventLogLine,
  scanEventRunningState,
} from "./scan-events";

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
    expect(
      scanEventLogLine({
        type: "output",
        output: { runId: "scan-1", stream: "stdout", text: "</nmaprun>" },
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

  it("classifies completed, failed, and cancelled finish events", () => {
    expect(
      scanEventFinishKind({
        type: "finished",
        result: { runId: "scan-1", exitCode: 0, xml: "<nmaprun />" },
      }),
    ).toBe("complete");
    expect(
      scanEventFinishKind({
        type: "finished",
        result: { runId: "scan-1", exitCode: 1, xml: "", error: "nmap failed" },
      }),
    ).toBe("failed");
    expect(
      scanEventFinishKind({
        type: "finished",
        result: { runId: "scan-1", exitCode: 1, xml: "", error: "context canceled" },
      }),
    ).toBe("cancelled");
  });

  it("classifies privilege errors from finish events", () => {
    expect(
      scanEventFinishKind({
        type: "finished",
        result: {
          runId: "scan-1",
          exitCode: 1,
          xml: "",
          error: "You requested a scan type which requires root privileges.",
        },
      }),
    ).toBe("privilege");

    expect(
      scanEventFinishKind({
        type: "finished",
        result: {
          runId: "scan-1",
          exitCode: 1,
          xml: "",
          error: "nmap: Couldn't open a raw socket",
        },
      }),
    ).toBe("privilege");
  });
});

describe("isPrivilegeError", () => {
  // --- phrases that MUST match ---

  it("matches 'requires root privileges' (case-insensitive)", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "This requires root privileges",
      }),
    ).toBe(true);
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "REQUIRES ROOT PRIVILEGES",
      }),
    ).toBe(true);
  });

  it("matches 'you requested a scan type which requires root'", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "You requested a scan type which requires root privileges.",
      }),
    ).toBe(true);
  });

  it("matches older nmap 'requires r00t' phrasing", () => {
    expect(isPrivilegeError({ runId: "r", exitCode: 1, xml: "", error: "requires r00t" })).toBe(
      true,
    );
  });

  it("matches 'Operation not permitted'", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "socket(): Operation not permitted",
      }),
    ).toBe(true);
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "OPERATION NOT PERMITTED",
      }),
    ).toBe(true);
  });

  it("matches 'socket troubles'", () => {
    expect(
      isPrivilegeError({ runId: "r", exitCode: 1, xml: "", error: "Socket troubles: EPERM" }),
    ).toBe(true);
  });

  it("matches 'Couldn't open a raw socket'", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "nmap: Couldn't open a raw socket.",
      }),
    ).toBe(true);
  });

  it("matches QUITTING! combined with privilege-related text", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "QUITTING! Raw socket access denied.",
      }),
    ).toBe(true);
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "Permission denied. QUITTING!",
      }),
    ).toBe(true);
  });

  it("matches privilege phrases in diagnostics even when error is generic", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "nmap exited with code 1",
        diagnostics: "Couldn't open a raw socket. Root privileges are needed.",
      }),
    ).toBe(true);
  });

  // --- phrases that MUST NOT match ---

  it("does NOT match a generic exit-code failure", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "nmap exited with code 1",
      }),
    ).toBe(false);
  });

  it("does NOT match a host-down error", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "Note: Host seems down. If it is really up, but blocking our pings, try -Pn",
      }),
    ).toBe(false);
  });

  it("does NOT match a name-resolution error", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "Failed to resolve 'notahost.invalid'.",
      }),
    ).toBe(false);
  });

  it("does NOT match a cancellation error", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "context canceled",
      }),
    ).toBe(false);
  });

  it("does NOT match when error and diagnostics are both empty", () => {
    expect(isPrivilegeError({ runId: "r", exitCode: 0, xml: "<nmaprun />" })).toBe(false);
  });

  it("does NOT match QUITTING! without privilege-related context", () => {
    expect(
      isPrivilegeError({
        runId: "r",
        exitCode: 1,
        xml: "",
        error: "QUITTING! Timed out waiting for response.",
      }),
    ).toBe(false);
  });
});
