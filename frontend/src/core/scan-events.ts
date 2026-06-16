import type { ScanEvent } from "../services/scan-service";

export type ScanFinishKind = "complete" | "failed" | "cancelled";

export function scanEventRunningState(event: ScanEvent): boolean | undefined {
  if (event.type === "started") {
    return true;
  }
  if (event.type === "finished") {
    return false;
  }
  return undefined;
}

export function scanEventFinishKind(event: ScanEvent): ScanFinishKind | undefined {
  if (event.type !== "finished") {
    return undefined;
  }
  if (event.result.error === undefined || event.result.error === "") {
    return "complete";
  }
  return isCancellationError(event.result.error) ? "cancelled" : "failed";
}

export function scanEventLogLine(event: ScanEvent): string | undefined {
  if (event.type === "output") {
    if (event.output.stream === "stderr") {
      return event.output.text;
    }
    return isXMLLike(event.output.text) ? undefined : event.output.text;
  }
  if (event.type === "finished") {
    return scanFinishedMessage(event.result);
  }
  return undefined;
}

export function scanEventIsFinished(event: ScanEvent): boolean {
  return event.type === "finished";
}

function scanFinishedMessage(result: Extract<ScanEvent, { type: "finished" }>["result"]): string {
  if (result.error !== undefined && result.error !== "") {
    if (isCancellationError(result.error)) {
      return "Scan cancelled before completion.";
    }
    return `Scan failed: ${result.error}`;
  }
  return `Scan finished: exit ${result.exitCode}. XML captured for history and reports.`;
}

function isXMLLike(value: string): boolean {
  const trimmed = value.trimStart();
  return (
    trimmed.startsWith("<?xml") || trimmed.startsWith("<nmaprun") || trimmed.startsWith("</nmaprun")
  );
}

function isCancellationError(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("context canceled") ||
    normalized.includes("context cancelled") ||
    normalized.includes("operation canceled") ||
    normalized.includes("operation cancelled") ||
    normalized.includes("scan canceled") ||
    normalized.includes("scan cancelled")
  );
}
