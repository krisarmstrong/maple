import type { ScanHistoryRecord } from "../services/history-service";

export type HistoryFilterID = "all" | "errors" | "hosts-up" | "open-ports";

export function filterHistoryRecords(
  records: readonly ScanHistoryRecord[],
  query: string,
  filterID: HistoryFilterID,
): ScanHistoryRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  return records.filter(
    (record) => matchesFilter(record, filterID) && matchesQuery(record, normalizedQuery),
  );
}

function matchesFilter(record: ScanHistoryRecord, filterID: HistoryFilterID): boolean {
  if (filterID === "errors") {
    return record.error !== undefined && record.error !== "";
  }
  if (filterID === "hosts-up") {
    return record.hostsUp > 0;
  }
  if (filterID === "open-ports") {
    return record.openPortCount > 0;
  }
  return true;
}

function matchesQuery(record: ScanHistoryRecord, normalizedQuery: string): boolean {
  if (normalizedQuery === "") {
    return true;
  }
  return searchableText(record).includes(normalizedQuery);
}

function searchableText(record: ScanHistoryRecord): string {
  return [
    record.profileName,
    record.command.join(" "),
    record.targets.map((target) => target.value).join(" "),
    record.hosts.map((host) => [host.address, host.hostname].filter(Boolean).join(" ")).join(" "),
    record.error ?? "",
    record.diagnostics ?? "",
  ]
    .join(" ")
    .toLowerCase();
}
