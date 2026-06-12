import type { ScanEvent } from "../services/scan-service";

export function scanEventRunningState(event: ScanEvent): boolean | undefined {
  if (event.type === "started") {
    return true;
  }
  if (event.type === "finished") {
    return false;
  }
  return undefined;
}

export function scanEventLogLine(event: ScanEvent): string | undefined {
  if (event.type === "output") {
    return event.output.stream === "stderr" ? event.output.text : undefined;
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
    return `Scan failed: ${result.error}`;
  }
  return `Scan finished: exit ${result.exitCode}. XML captured for history and reports.`;
}
