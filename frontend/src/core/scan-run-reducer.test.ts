import { describe, expect, it } from "vitest";
import { initialScanRunState, type ScanRunState, scanRunReducer } from "./scan-run-reducer";

function stateWith(overrides: Partial<ScanRunState>): ScanRunState {
  return { ...initialScanRunState, ...overrides };
}

describe("scanRunReducer", () => {
  describe("set-preview", () => {
    it("replaces the preview array", () => {
      const state = scanRunReducer(initialScanRunState, {
        type: "set-preview",
        preview: ["nmap", "-sT", "--", "10.0.0.1"],
      });
      expect(state.preview).toEqual(["nmap", "-sT", "--", "10.0.0.1"]);
    });

    it("does not mutate other fields", () => {
      const before = stateWith({ error: "some error", running: true });
      const after = scanRunReducer(before, {
        type: "set-preview",
        preview: ["nmap"],
      });
      expect(after.error).toBe("some error");
      expect(after.running).toBe(true);
    });
  });

  describe("clear-preview", () => {
    it("empties the preview array", () => {
      const before = stateWith({ preview: ["nmap", "-sT"] });
      const after = scanRunReducer(before, { type: "clear-preview" });
      expect(after.preview).toEqual([]);
    });
  });

  describe("append-log-line", () => {
    it("appends a log entry with id=1 when log is empty", () => {
      const state = scanRunReducer(initialScanRunState, {
        type: "append-log-line",
        text: "Starting Nmap",
      });
      expect(state.log).toEqual([{ id: 1, text: "Starting Nmap" }]);
    });

    it("increments id from the last entry", () => {
      const before = stateWith({ log: [{ id: 5, text: "first" }] });
      const after = scanRunReducer(before, {
        type: "append-log-line",
        text: "second",
      });
      expect(after.log).toEqual([
        { id: 5, text: "first" },
        { id: 6, text: "second" },
      ]);
    });

    it("preserves existing entries", () => {
      const before = stateWith({ log: [{ id: 1, text: "existing" }] });
      const after = scanRunReducer(before, {
        type: "append-log-line",
        text: "new line",
      });
      expect(after.log).toHaveLength(2);
      expect(after.log[0]).toEqual({ id: 1, text: "existing" });
      expect(after.log[1]).toEqual({ id: 2, text: "new line" });
    });
  });

  describe("clear-log", () => {
    it("empties the log", () => {
      const before = stateWith({ log: [{ id: 1, text: "line" }] });
      const after = scanRunReducer(before, { type: "clear-log" });
      expect(after.log).toEqual([]);
    });
  });

  describe("append-phase", () => {
    it("appends a phase entry with id=1 when phases are empty", () => {
      const state = scanRunReducer(initialScanRunState, {
        type: "append-phase",
        phase: "launching",
        message: "Launching Nmap",
      });
      expect(state.phases).toEqual([{ id: 1, phase: "launching", message: "Launching Nmap" }]);
    });

    it("increments id from the last phase", () => {
      const before = stateWith({ phases: [{ id: 3, phase: "validating", message: "ok" }] });
      const after = scanRunReducer(before, {
        type: "append-phase",
        phase: "running",
        message: "...",
      });
      expect(after.phases).toEqual([
        { id: 3, phase: "validating", message: "ok" },
        { id: 4, phase: "running", message: "..." },
      ]);
    });

    it("preserves existing phases", () => {
      const before = stateWith({ phases: [{ id: 1, phase: "validating", message: "ok" }] });
      const after = scanRunReducer(before, {
        type: "append-phase",
        phase: "running",
        message: "...",
      });
      expect(after.phases).toHaveLength(2);
    });
  });

  describe("set-diagnostics", () => {
    it("sets the diagnostics string", () => {
      const state = scanRunReducer(initialScanRunState, {
        type: "set-diagnostics",
        diagnostics: "parser note: skipped",
      });
      expect(state.diagnostics).toBe("parser note: skipped");
    });
  });

  describe("set-running", () => {
    it("sets running to true", () => {
      const state = scanRunReducer(initialScanRunState, { type: "set-running", running: true });
      expect(state.running).toBe(true);
    });

    it("sets running to false", () => {
      const before = stateWith({ running: true });
      const after = scanRunReducer(before, { type: "set-running", running: false });
      expect(after.running).toBe(false);
    });
  });

  describe("set-status", () => {
    it("updates the scan status", () => {
      const state = scanRunReducer(initialScanRunState, { type: "set-status", status: "running" });
      expect(state.status).toBe("running");
    });

    it("accepts all valid status values", () => {
      const statuses = [
        "idle",
        "previewed",
        "running",
        "complete",
        "failed",
        "cancelled",
        "privilege",
      ] as const;
      for (const status of statuses) {
        const result = scanRunReducer(initialScanRunState, { type: "set-status", status });
        expect(result.status).toBe(status);
      }
    });
  });

  describe("set-error", () => {
    it("sets the error message", () => {
      const state = scanRunReducer(initialScanRunState, {
        type: "set-error",
        error: "Something went wrong",
      });
      expect(state.error).toBe("Something went wrong");
    });
  });

  describe("clear-error", () => {
    it("clears the error message", () => {
      const before = stateWith({ error: "Something went wrong" });
      const after = scanRunReducer(before, { type: "clear-error" });
      expect(after.error).toBe("");
    });
  });

  describe("set-copy-message", () => {
    it("sets the copy message", () => {
      const state = scanRunReducer(initialScanRunState, {
        type: "set-copy-message",
        message: "Copied argv to clipboard.",
      });
      expect(state.copyMessage).toBe("Copied argv to clipboard.");
    });
  });

  describe("clear-copy-message", () => {
    it("clears the copy message", () => {
      const before = stateWith({ copyMessage: "Copied argv to clipboard." });
      const after = scanRunReducer(before, { type: "clear-copy-message" });
      expect(after.copyMessage).toBe("");
    });
  });

  describe("set-log-filter", () => {
    it("updates the log filter", () => {
      const state = scanRunReducer(initialScanRunState, {
        type: "set-log-filter",
        filter: "error",
      });
      expect(state.logFilter).toBe("error");
    });

    it("allows clearing the filter", () => {
      const before = stateWith({ logFilter: "error" });
      const after = scanRunReducer(before, { type: "set-log-filter", filter: "" });
      expect(after.logFilter).toBe("");
    });
  });

  describe("reset-run", () => {
    it("resets runtime fields while preserving preview", () => {
      const before = stateWith({
        preview: ["nmap", "-sT"],
        log: [{ id: 1, text: "line" }],
        phases: [{ id: 1, phase: "running", message: "..." }],
        diagnostics: "note",
        running: true,
        status: "running",
        error: "oops",
        copyMessage: "copied",
        logFilter: "err",
      });
      const after = scanRunReducer(before, { type: "reset-run" });

      expect(after.log).toEqual([]);
      expect(after.phases).toEqual([]);
      expect(after.diagnostics).toBe("");
      expect(after.running).toBe(false);
      expect(after.status).toBe("idle");
      expect(after.error).toBe("");
      expect(after.copyMessage).toBe("");
      expect(after.logFilter).toBe("");
      // preview is NOT reset by reset-run
      expect(after.preview).toEqual(["nmap", "-sT"]);
    });
  });

  describe("initialScanRunState", () => {
    it("has the expected default shape", () => {
      expect(initialScanRunState).toEqual({
        preview: [],
        log: [],
        phases: [],
        diagnostics: "",
        running: false,
        status: "idle",
        error: "",
        copyMessage: "",
        logFilter: "",
      });
    });
  });
});
