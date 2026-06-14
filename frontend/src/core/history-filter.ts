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
    record.hosts.map(hostSearchText).join(" "),
    record.error ?? "",
    record.diagnostics ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function hostSearchText(recordHost: ScanHistoryRecord["hosts"][number]): string {
  return [
    recordHost.address,
    recordHost.hostname,
    recordHost.state,
    recordHost.osMatches?.map((match) => [match.name, match.accuracy].join(" ")).join(" "),
    recordHost.extraPorts
      ?.map((extraPort) => [extraPort.state, extraPort.count, extraPort.reason].join(" "))
      .join(" "),
    recordHost.trace
      ?.map((hop) => [hop.ttl, hop.address, hop.hostname, hop.rtt].join(" "))
      .join(" "),
    recordHost.scripts?.map(scriptSearchText).join(" "),
    recordHost.ports.map(portSearchText).join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function portSearchText(port: ScanHistoryRecord["hosts"][number]["ports"][number]): string {
  return [
    port.id,
    port.protocol,
    port.state,
    port.service,
    port.product,
    port.version,
    port.extraInfo,
    port.reason,
    port.cpes?.join(" "),
    port.scripts?.map(scriptSearchText).join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function scriptSearchText(
  script: NonNullable<ScanHistoryRecord["hosts"][number]["scripts"]>[number],
): string {
  return [script.id, script.output, script.details?.map(scriptElementSearchText).join(" ")]
    .filter(Boolean)
    .join(" ");
}

function scriptElementSearchText(
  element: NonNullable<
    NonNullable<ScanHistoryRecord["hosts"][number]["scripts"]>[number]["details"]
  >[number],
): string {
  return [
    element.kind,
    element.key,
    element.value,
    element.children?.map(scriptElementSearchText).join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}
