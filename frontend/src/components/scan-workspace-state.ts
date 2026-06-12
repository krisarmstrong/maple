import type { Dispatch, SetStateAction } from "react";
import { scanEventIsFinished, scanEventLogLine, scanEventRunningState } from "../core/scan-events";
import { isScanProfileID, type ScanProfileID } from "../core/scan-profiles";
import { type TargetModeID, validateTargetsForMode } from "../core/target-modes";
import type { ScanEvent, ScanScript } from "../services/scan-service";

export interface LogEntry {
  id: number;
  text: string;
}

export type ScanStatus = "idle" | "running" | "complete" | "failed";

export interface ScanEventHandlers {
  setRunning: (running: boolean) => void;
  setLog: Dispatch<SetStateAction<LogEntry[]>>;
  setStatus: (status: ScanStatus) => void;
  onScanFinished?: () => void;
}

export function makeRequest(
  profileId: ScanProfileID,
  targetModeId: TargetModeID,
  targets: string,
  nmapPath?: string,
  scripts: readonly ScanScript[] = [],
) {
  if (nmapPath === undefined || !validateTargetsForMode(targetModeId, targets).ok) {
    return undefined;
  }
  return { profileId, targets, nmapPath, scripts: [...scripts] };
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
  appendLogLine(event, handlers.setLog);
  if (scanEventIsFinished(event)) {
    handlers.onScanFinished?.();
  }
}

export function scanStatusLabel(status: ScanStatus): string {
  if (status === "running") {
    return "Scan running";
  }
  return status === "failed" ? "Scan failed" : "Scan complete";
}

function updateStatus(event: ScanEvent, setStatus: (status: ScanStatus) => void): void {
  if (event.type === "started") {
    setStatus("running");
  }
  if (event.type === "finished") {
    setStatus(
      event.result.error === undefined || event.result.error === "" ? "complete" : "failed",
    );
  }
}

function appendLogLine(event: ScanEvent, setLog: Dispatch<SetStateAction<LogEntry[]>>): void {
  const line = scanEventLogLine(event);
  if (line !== undefined) {
    setLog((current) => [...current, { id: nextLogID(current), text: line }]);
  }
}

function nextLogID(current: LogEntry[]): number {
  const last = current.at(-1);
  return last === undefined ? 1 : last.id + 1;
}
