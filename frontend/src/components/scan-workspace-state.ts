import type { Dispatch, SetStateAction } from "react";
import {
  scanEventFinishKind,
  scanEventIsFinished,
  scanEventLogLine,
  scanEventRunningState,
} from "../core/scan-events";
import type { ScanOptions } from "../core/scan-options";
import { isScanProfileID, type ScanProfileID } from "../core/scan-profiles";
import { type TargetModeID, validateTargetsForMode } from "../core/target-modes";
import type { ScanEvent, ScanScript } from "../services/scan-service";

export interface LogEntry {
  id: number;
  text: string;
}

export interface PhaseEntry {
  id: number;
  phase: string;
  message: string;
}

export type ScanStatus =
  | "idle"
  | "previewed"
  | "running"
  | "complete"
  | "failed"
  | "cancelled"
  | "privilege";

export interface ScanEventHandlers {
  setRunning: (running: boolean) => void;
  setLog: Dispatch<SetStateAction<LogEntry[]>>;
  setPhases: Dispatch<SetStateAction<PhaseEntry[]>>;
  setDiagnostics: (diagnostics: string) => void;
  setStatus: (status: ScanStatus) => void;
  onScanFinished?: () => void;
}

export function makeRequest(
  profileId: ScanProfileID,
  targetModeId: TargetModeID,
  targets: string,
  nmapPath?: string,
  scripts: readonly ScanScript[] = [],
  options?: ScanOptions,
  scriptArgs = "",
  scriptArgsFile = "",
) {
  if (nmapPath === undefined || !hasRunnableTargets(targetModeId, targets, options)) {
    return undefined;
  }
  return {
    profileId,
    targets,
    nmapPath,
    scripts: [...scripts],
    options,
    scriptArgs,
    scriptArgsFile,
  };
}

function hasRunnableTargets(
  targetModeId: TargetModeID,
  targets: string,
  options?: ScanOptions,
): boolean {
  if ((options?.targetInputFile ?? "").trim() !== "" && targets.trim() === "") {
    return true;
  }
  return validateTargetsForMode(targetModeId, targets).ok;
}

export function updateProfile(
  value: string,
  setProfileId: (profileID: ScanProfileID) => void,
  setPreview: (preview: string[]) => void,
): void {
  if (isScanProfileID(value)) {
    setProfileId(value);
    setPreview([]);
  }
}

export function updateTargets(
  value: string,
  setTargets: (targets: string) => void,
  setPreview: (preview: string[]) => void,
): void {
  setTargets(value);
  setPreview([]);
}

export function messageForInvalidTargets(targetModeId: TargetModeID, targets: string): string {
  const result = validateTargetsForMode(targetModeId, targets);
  return result.ok ? "Nmap is not available." : result.message;
}

export function handleScanEvent(event: ScanEvent, handlers: ScanEventHandlers): void {
  const runningState = scanEventRunningState(event);
  if (runningState !== undefined) {
    handlers.setRunning(runningState);
  }
  updateStatus(event, handlers.setStatus);
  appendPhase(event, handlers.setPhases);
  appendLogLine(event, handlers.setLog);
  updateDiagnostics(event, handlers.setDiagnostics);
  if (scanEventIsFinished(event)) {
    handlers.onScanFinished?.();
  }
}

export function scanStatusLabel(status: ScanStatus): string {
  if (status === "idle") {
    return "Ready to preview";
  }
  if (status === "previewed") {
    return "Preview ready";
  }
  if (status === "running") {
    return "Scan running";
  }
  if (status === "cancelled") {
    return "Scan cancelled";
  }
  if (status === "privilege") {
    return "Scan failed: privileges required";
  }
  return status === "failed" ? "Scan failed" : "Scan complete";
}

export function scanStatusDetail(status: ScanStatus): string {
  if (status === "idle") {
    return "Preview argv before running so the exact command is visible.";
  }
  if (status === "previewed") {
    return "Review the argv tokens, then run the scan when the target and options look right.";
  }
  if (status === "running") {
    return "Nmap is running locally. Live stdout and stderr appear below without raw XML.";
  }
  if (status === "cancelled") {
    return "Cancellation was requested. Any partial XML stays available only if Nmap produced it.";
  }
  if (status === "privilege") {
    return "Nmap requires elevated privileges for this scan type. Run as root or switch to TCP connect scan.";
  }
  if (status === "failed") {
    return "The run did not finish cleanly. Check diagnostics and stderr for the exact cause.";
  }
  return "The run completed. Results are parsed into History and raw XML remains export-only.";
}

export function scanPhaseLabel(phase: string): string {
  if (phase === "validating") {
    return "Validating";
  }
  if (phase === "launching") {
    return "Launching Nmap";
  }
  if (phase === "running") {
    return "Running";
  }
  if (phase === "parsing") {
    return "Parsing XML";
  }
  if (phase === "saving-history") {
    return "Saving history";
  }
  if (phase === "history-saved") {
    return "History saved";
  }
  return phase;
}

function updateStatus(event: ScanEvent, setStatus: (status: ScanStatus) => void): void {
  if (event.type === "started") {
    setStatus("running");
  }
  if (event.type === "finished") {
    setStatus(scanEventFinishKind(event) ?? "failed");
  }
}

function appendPhase(event: ScanEvent, setPhases: Dispatch<SetStateAction<PhaseEntry[]>>): void {
  if (event.type !== "phase") {
    return;
  }
  setPhases((current) => [
    ...current,
    {
      id: nextPhaseID(current),
      phase: event.phase.phase,
      message: event.phase.message,
    },
  ]);
}

function appendLogLine(event: ScanEvent, setLog: Dispatch<SetStateAction<LogEntry[]>>): void {
  const line = scanEventLogLine(event);
  if (line !== undefined) {
    setLog((current) => [...current, { id: nextLogID(current), text: line }]);
  }
}

export function updateDiagnostics(
  event: ScanEvent,
  setDiagnostics: (diagnostics: string) => void,
): void {
  if (event.type !== "finished") {
    return;
  }
  setDiagnostics(event.result.diagnostics ?? "");
}

function nextLogID(current: LogEntry[]): number {
  const last = current.at(-1);
  return last === undefined ? 1 : last.id + 1;
}

function nextPhaseID(current: PhaseEntry[]): number {
  const last = current.at(-1);
  return last === undefined ? 1 : last.id + 1;
}
