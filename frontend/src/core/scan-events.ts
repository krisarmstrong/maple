import type { ScanEvent, ScanFinishedEvent } from "../services/scan-service";

export type ScanFinishKind = "complete" | "failed" | "cancelled" | "privilege";

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
  if (isCancellationError(event.result.error)) {
    return "cancelled";
  }
  if (isPrivilegeError(event.result)) {
    return "privilege";
  }
  return "failed";
}

/**
 * Returns true when the finished event indicates that nmap exited due to
 * insufficient privileges (raw socket access, SYN scan, OS detection, etc.).
 *
 * The check is intentionally anchored to specific privilege-error phrases so
 * that ordinary failures (host down, name-resolution errors, generic exit
 * codes) are never misclassified.
 */
export function isPrivilegeError(result: ScanFinishedEvent): boolean {
  const corpus = buildPrivilegeCorpus(result);
  return PRIVILEGE_PATTERNS.some((pattern) => pattern.test(corpus));
}

/**
 * Ordered list of case-insensitive patterns that unambiguously identify a
 * privilege error in nmap output. Each pattern matches a distinct nmap
 * phrasing; none overlap with normal failure messages.
 */
const PRIVILEGE_PATTERNS: readonly RegExp[] = [
  /requires root privileges/iu,
  /you requested a scan type which requires root/iu,
  /requires r00t/iu,
  /operation not permitted/iu,
  /socket troubles/iu,
  /couldn't open a raw socket/iu,
  /quitting!.*(?:root|privilege|permission|socket)/isu,
  /(?:root|privilege|permission|socket).*quitting!/isu,
] as const;

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

function buildPrivilegeCorpus(result: ScanFinishedEvent): string {
  const parts: string[] = [];
  if (result.error !== undefined && result.error !== "") {
    parts.push(result.error);
  }
  if (result.diagnostics !== undefined && result.diagnostics !== "") {
    parts.push(result.diagnostics);
  }
  return parts.join("\n");
}
