import type { LogEntry, PhaseEntry, ScanStatus } from "../components/scan-workspace-state";

export type { LogEntry, PhaseEntry, ScanStatus };

export interface ScanRunState {
  preview: string[];
  log: LogEntry[];
  phases: PhaseEntry[];
  diagnostics: string;
  running: boolean;
  status: ScanStatus;
  error: string;
  copyMessage: string;
  logFilter: string;
}

export const initialScanRunState: ScanRunState = {
  preview: [],
  log: [],
  phases: [],
  diagnostics: "",
  running: false,
  status: "idle",
  error: "",
  copyMessage: "",
  logFilter: "",
};

export type ScanRunAction =
  | { type: "set-preview"; preview: string[] }
  | { type: "clear-preview" }
  | { type: "append-log-line"; text: string }
  | { type: "clear-log" }
  | { type: "append-phase"; phase: string; message: string }
  | { type: "set-diagnostics"; diagnostics: string }
  | { type: "set-running"; running: boolean }
  | { type: "set-status"; status: ScanStatus }
  | { type: "set-error"; error: string }
  | { type: "clear-error" }
  | { type: "set-copy-message"; message: string }
  | { type: "clear-copy-message" }
  | { type: "set-log-filter"; filter: string }
  | { type: "reset-run" };

function nextLogID(log: LogEntry[]): number {
  const last = log.at(-1);
  return last === undefined ? 1 : last.id + 1;
}

function nextPhaseID(phases: PhaseEntry[]): number {
  const last = phases.at(-1);
  return last === undefined ? 1 : last.id + 1;
}

export function scanRunReducer(state: ScanRunState, action: ScanRunAction): ScanRunState {
  switch (action.type) {
    case "set-preview":
      return { ...state, preview: action.preview };

    case "clear-preview":
      return { ...state, preview: [] };

    case "append-log-line": {
      const entry: LogEntry = { id: nextLogID(state.log), text: action.text };
      return { ...state, log: [...state.log, entry] };
    }

    case "clear-log":
      return { ...state, log: [] };

    case "append-phase": {
      const entry: PhaseEntry = {
        id: nextPhaseID(state.phases),
        phase: action.phase,
        message: action.message,
      };
      return { ...state, phases: [...state.phases, entry] };
    }

    case "set-diagnostics":
      return { ...state, diagnostics: action.diagnostics };

    case "set-running":
      return { ...state, running: action.running };

    case "set-status":
      return { ...state, status: action.status };

    case "set-error":
      return { ...state, error: action.error };

    case "clear-error":
      return { ...state, error: "" };

    case "set-copy-message":
      return { ...state, copyMessage: action.message };

    case "clear-copy-message":
      return { ...state, copyMessage: "" };

    case "set-log-filter":
      return { ...state, logFilter: action.filter };

    case "reset-run":
      return {
        ...state,
        log: [],
        phases: [],
        diagnostics: "",
        running: false,
        status: "idle",
        error: "",
        copyMessage: "",
        logFilter: "",
      };
  }
}
