import type { ScanHistoryRecord } from "../services/history-service";

export interface NdiffHistoryOption {
  runId: string;
  label: string;
  xmlPath: string;
}

export function historyNdiffOptions(records: readonly ScanHistoryRecord[]): NdiffHistoryOption[] {
  return records
    .filter((record) => record.xmlPath !== undefined && record.xmlPath !== "")
    .map((record) => ({
      runId: record.runId,
      label: `${shortTimestamp(record.finishedAt)} - ${targetLabel(record)}`,
      xmlPath: record.xmlPath ?? "",
    }));
}

export function buildHistoryNdiffArgv(input: {
  baselineRunId: string;
  currentRunId: string;
  options: readonly NdiffHistoryOption[];
}): string[] {
  const baseline = input.options.find((option) => option.runId === input.baselineRunId);
  const current = input.options.find((option) => option.runId === input.currentRunId);
  if (baseline === undefined || current === undefined || baseline.runId === current.runId) {
    return [];
  }
  return ["ndiff", baseline.xmlPath, current.xmlPath];
}

function targetLabel(record: ScanHistoryRecord): string {
  const firstTarget = record.targets.at(0)?.value;
  if (firstTarget === undefined || firstTarget === "") {
    return record.profileName;
  }
  if (record.targets.length <= 1) {
    return firstTarget;
  }
  return `${firstTarget} +${record.targets.length - 1}`;
}

function shortTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
