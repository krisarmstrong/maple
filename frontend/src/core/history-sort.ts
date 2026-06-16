import type { ScanHistoryRecord } from "../services/history-service";

export type HistorySortID = "newest" | "oldest" | "open-ports" | "hosts-up" | "needs-review";

export function sortHistoryRecords(
  records: readonly ScanHistoryRecord[],
  sortId: HistorySortID,
): ScanHistoryRecord[] {
  const sorted = [...records];
  sorted.sort((left, right) => compareHistoryRecords(left, right, sortId));
  return sorted;
}

function compareHistoryRecords(
  left: ScanHistoryRecord,
  right: ScanHistoryRecord,
  sortId: HistorySortID,
): number {
  if (sortId === "oldest") {
    return timestamp(left.finishedAt) - timestamp(right.finishedAt);
  }
  if (sortId === "open-ports") {
    return numericDesc(left.openPortCount, right.openPortCount, left, right);
  }
  if (sortId === "hosts-up") {
    return numericDesc(left.hostsUp, right.hostsUp, left, right);
  }
  if (sortId === "needs-review") {
    return booleanDesc(hasError(left), hasError(right), left, right);
  }
  return timestamp(right.finishedAt) - timestamp(left.finishedAt);
}

function numericDesc(
  leftValue: number,
  rightValue: number,
  left: ScanHistoryRecord,
  right: ScanHistoryRecord,
): number {
  const value = rightValue - leftValue;
  return value === 0 ? timestamp(right.finishedAt) - timestamp(left.finishedAt) : value;
}

function booleanDesc(
  leftValue: boolean,
  rightValue: boolean,
  left: ScanHistoryRecord,
  right: ScanHistoryRecord,
): number {
  const value = Number(rightValue) - Number(leftValue);
  return value === 0 ? timestamp(right.finishedAt) - timestamp(left.finishedAt) : value;
}

function hasError(record: ScanHistoryRecord): boolean {
  return record.error !== undefined && record.error !== "";
}

function timestamp(value: string): number {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}
