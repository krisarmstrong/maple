import { CancelScan, PreviewScan, StartScan } from "../../wailsjs/go/main/App";
import { scanner } from "../../wailsjs/go/models";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import type { ScanOptions } from "../core/scan-options";
import type { ScanProfileID } from "../core/scan-profiles";
import { hasWailsBackend, hasWailsRuntime, unavailableBridgeError } from "./wails-bridge";

export interface ScanRequest {
  profileId: ScanProfileID;
  targets: string;
  nmapPath?: string;
  options?: ScanOptions;
  scripts?: ScanScript[];
  scriptArgsFile?: string;
}

export interface ScanScript {
  kind: "category" | "name" | "path";
  value: string;
}

export interface ScanOutputEvent {
  runId: string;
  stream: "stdout" | "stderr";
  text: string;
}

export interface ScanFinishedEvent {
  runId: string;
  exitCode: number;
  xml: string;
  diagnostics?: string;
  error?: string;
}

export interface CommandPreview {
  executable: string;
  args: string[];
}

export type ScanEvent =
  | { type: "started"; runId: string }
  | { type: "output"; output: ScanOutputEvent }
  | { type: "finished"; result: ScanFinishedEvent };

export function previewScanCommand(request: ScanRequest): Promise<string[]> {
  if (!hasWailsBackend()) {
    return Promise.reject(unavailableBridgeError());
  }
  return PreviewScan(toBackendRequest(request)).then((preview) => [
    preview.executable,
    ...preview.args,
  ]);
}

export function startScan(request: ScanRequest): Promise<unknown> {
  if (!hasWailsBackend()) {
    return Promise.reject(unavailableBridgeError());
  }
  return StartScan(toBackendRequest(request));
}

export function cancelScan(): Promise<boolean> {
  if (!hasWailsBackend()) {
    return Promise.resolve(false);
  }
  return CancelScan();
}

export function onScanEvent(listener: (event: ScanEvent) => void): () => void {
  if (!hasWailsRuntime()) {
    return () => undefined;
  }
  const removeStarted = EventsOn("scan:started", (payload: unknown) => {
    if (isScanStarted(payload)) {
      listener({ type: "started", runId: payload.runId });
    }
  });
  const removeOutput = EventsOn("scan:output", (payload: unknown) => {
    if (isScanOutput(payload)) {
      listener({ type: "output", output: payload });
    }
  });
  const removeFinished = EventsOn("scan:finished", (payload: unknown) => {
    if (isScanFinished(payload)) {
      listener({ type: "finished", result: payload });
    }
  });
  return () => {
    removeStarted();
    removeOutput();
    removeFinished();
  };
}

function isScanStarted(value: unknown): value is { runId: string } {
  return isObject(value) && typeof value.runId === "string";
}

function isScanOutput(value: unknown): value is ScanOutputEvent {
  return (
    isObject(value) &&
    typeof value.runId === "string" &&
    (value.stream === "stdout" || value.stream === "stderr") &&
    typeof value.text === "string"
  );
}

function isScanFinished(value: unknown): value is ScanFinishedEvent {
  return (
    isObject(value) &&
    typeof value.runId === "string" &&
    typeof value.exitCode === "number" &&
    typeof value.xml === "string"
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toBackendRequest(request: ScanRequest): scanner.ScanRequest {
  return new scanner.ScanRequest({
    profileId: request.profileId,
    targets: request.targets,
    nmapPath: request.nmapPath ?? "",
    options: request.options,
    scripts: request.scripts ?? [],
    scriptArgsFile: request.scriptArgsFile ?? "",
  });
}
