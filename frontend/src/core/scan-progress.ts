export interface ScanProgress {
  /** Percentage complete, 0-100. */
  percent: number;
  /** Human-readable remaining time string, e.g. "2m30s". May be empty. */
  remaining: string;
}

/**
 * Parse an nmap stdout line for progress information.
 *
 * Nmap emits lines like:
 *   "About 15.23% done; ETC: 14:05 (0:02:30 remaining)"
 *   "SYN Stealth Scan Timing: About 27.50% done; ETC: 14:20 (0:04:10 remaining)"
 *
 * Returns undefined when the line contains no progress information.
 */
export function parseScanProgressLine(line: string): ScanProgress | undefined {
  // Quick pre-check: line must contain "% done" or "remaining" to be relevant.
  if (!line.includes("% done") && !line.includes("remaining")) {
    return undefined;
  }

  // Extract percent: look for a pattern like "15.23% done"
  const percentMatch = /(\d+(?:\.\d+)?)%\s+done/i.exec(line);
  if (percentMatch === null) {
    return undefined;
  }
  const percent = Math.min(100, Math.max(0, parseFloat(percentMatch[1])));

  // Extract remaining: look for "(0:02:30 remaining)" or similar
  const remainingMatch = /\((\d+:\d{2}(?::\d{2})?)\s+remaining\)/i.exec(line);
  const remaining = remainingMatch !== null ? formatRemainingTime(remainingMatch[1]) : "";

  return { percent, remaining };
}

/**
 * Format a colon-separated time string (H:MM or H:MM:SS) into a compact
 * human-readable form such as "2m30s" or "1h04m".
 */
function formatRemainingTime(raw: string): string {
  const parts = raw.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) {
    return raw;
  }

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    [hours, minutes, seconds] = parts;
  } else if (parts.length === 2) {
    [hours, minutes] = parts;
  } else {
    return raw;
  }

  const pieces: string[] = [];
  if (hours > 0) {
    pieces.push(`${hours}h`);
  }
  if (minutes > 0) {
    pieces.push(`${minutes}m`);
  }
  if (seconds > 0 || pieces.length === 0) {
    pieces.push(`${seconds}s`);
  }

  return pieces.join("");
}
