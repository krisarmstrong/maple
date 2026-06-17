import type {
  ScanHistoryExtraPorts,
  ScanHistoryHost,
  ScanHistoryOSMatch,
  ScanHistoryPort,
  ScanHistoryRecord,
  ScanHistoryScriptElement,
  ScanHistoryScriptOutput,
  ScanHistoryTraceHop,
} from "../services/history-service";

export type ResultFilter = "all" | "open" | "hosts-up" | "findings";

// --- Elapsed label ---

export function elapsedLabel(value: string | undefined): string {
  if (value === undefined || value === "") {
    return "n/a";
  }
  return value.endsWith("s") ? value : `${value}s`;
}

// --- Record predicates ---

export function hasError(record: ScanHistoryRecord): boolean {
  return record.error !== undefined && record.error !== "";
}

export function hasDiagnostics(record: ScanHistoryRecord): boolean {
  return record.diagnostics !== undefined && record.diagnostics !== "";
}

export function emptyHostMessage(record: ScanHistoryRecord): string {
  if (record.hostCount > 0) {
    return `Nmap reported ${record.hostsUp}/${record.hostCount} hosts up, but did not include host rows.`;
  }
  return "No parsed hosts for this scan.";
}

// --- Host predicates and counts ---

export function hostHasOpenPorts(host: ScanHistoryHost): boolean {
  return host.ports.some((port) => port.state === "open");
}

export function hostScriptCount(host: ScanHistoryHost): number {
  return (
    (host.scripts ?? []).length +
    host.ports.reduce((total, port) => total + (port.scripts ?? []).length, 0)
  );
}

export function hostEvidenceCount(host: ScanHistoryHost): number {
  return (
    hostScriptCount(host) +
    (host.osMatches ?? []).length +
    (host.extraPorts ?? []).length +
    (host.trace ?? []).length
  );
}

export function hostHasFindings(host: ScanHistoryHost): boolean {
  return hostHasOpenPorts(host) || hostEvidenceCount(host) > 0;
}

export function hostFindingLabel(host: ScanHistoryHost): string {
  const openPorts = host.ports.filter((port) => port.state === "open").length;
  const scriptCount = hostScriptCount(host);
  const evidenceCount = hostEvidenceCount(host);
  if (openPorts === 0) {
    if (scriptCount > 0) {
      return `${scriptCount} script ${scriptCount === 1 ? "result" : "results"}`;
    }
    if (evidenceCount > 0) {
      return `${evidenceCount} host ${evidenceCount === 1 ? "detail" : "details"}`;
    }
    return "No open ports";
  }
  return `${openPorts} open ${openPorts === 1 ? "port" : "ports"}`;
}

// --- Port group derivation ---

export function portGroups(
  ports: readonly ScanHistoryPort[],
): Array<{ state: string; ports: ScanHistoryPort[] }> {
  const order = ["open", "filtered", "closed", "unknown"];
  return order
    .map((state) => ({
      state,
      ports: ports.filter(
        (port) =>
          (port.state === undefined || port.state === "" ? "unknown" : port.state) === state,
      ),
    }))
    .filter((group) => group.ports.length > 0);
}

export function portGroupLabel(state: string): string {
  if (state === "open") {
    return "Open ports";
  }
  if (state === "closed") {
    return "Closed ports";
  }
  if (state === "filtered") {
    return "Filtered ports";
  }
  return "Other ports";
}

// --- Script detail helpers ---

export function scriptDetailLabel(detail: ScanHistoryScriptElement): string {
  const key = detail.key ?? "";
  const value = detail.value ?? "";
  if (key !== "" && value !== "") {
    return `${key}: ${value}`;
  }
  if (key !== "") {
    return key;
  }
  if (value !== "") {
    return value;
  }
  return detail.kind ?? "detail";
}

export function scriptDetailKey(detail: ScanHistoryScriptElement): string {
  return [detail.kind, detail.key, detail.value, detail.children?.map(scriptDetailKey).join("|")]
    .filter((value) => value !== undefined && value !== "")
    .join(":");
}

// --- Filter functions ---

export function filterHosts(
  hosts: readonly ScanHistoryHost[],
  filter: ResultFilter,
): ScanHistoryHost[] {
  if (filter === "hosts-up") {
    return hosts.filter((host) => host.state === "up");
  }
  if (filter === "findings") {
    return hosts.filter(hostHasFindings);
  }
  if (filter === "open") {
    return hosts.filter((host) => host.ports.some((port) => port.state === "open"));
  }
  return [...hosts];
}

export function filterPorts(
  ports: readonly ScanHistoryPort[],
  filter: ResultFilter,
): ScanHistoryPort[] {
  if (filter === "open") {
    return ports.filter((port) => port.state === "open");
  }
  return [...ports];
}

// --- Search functions ---

export function searchHosts(hosts: readonly ScanHistoryHost[], query: string): ScanHistoryHost[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery === "") {
    return [...hosts];
  }
  return hosts.flatMap((host) => searchHost(host, normalizedQuery));
}

function searchHost(host: ScanHistoryHost, query: string): ScanHistoryHost[] {
  if (hostMatches(host, query)) {
    return [host];
  }
  const ports = host.ports.filter((port) => portMatches(port, query));
  return ports.length === 0 ? [] : [{ ...host, ports }];
}

function hostMatches(host: ScanHistoryHost, query: string): boolean {
  return (
    includesQuery(host.address, query) ||
    includesQuery(host.hostname, query) ||
    osMatchesMatch(host.osMatches, query) ||
    extraPortsMatch(host.extraPorts, query) ||
    traceMatches(host.trace, query) ||
    scriptsMatch(host.scripts, query)
  );
}

function portMatches(port: ScanHistoryPort, query: string): boolean {
  return (
    includesQuery(port.id, query) ||
    includesQuery(port.protocol, query) ||
    includesQuery(port.state, query) ||
    includesQuery(port.service, query) ||
    includesQuery(port.product, query) ||
    includesQuery(port.version, query) ||
    includesQuery(port.extraInfo, query) ||
    includesQuery(port.reason, query) ||
    stringListMatches(port.cpes, query) ||
    scriptsMatch(port.scripts, query)
  );
}

function osMatchesMatch(
  matches: readonly ScanHistoryOSMatch[] | undefined,
  query: string,
): boolean {
  return (
    matches?.some(
      (match) => includesQuery(match.name, query) || includesQuery(match.accuracy, query),
    ) ?? false
  );
}

function extraPortsMatch(
  extraPorts: readonly ScanHistoryExtraPorts[] | undefined,
  query: string,
): boolean {
  return (
    extraPorts?.some(
      (extraPort) =>
        includesQuery(extraPort.state, query) ||
        includesQuery(extraPort.reason, query) ||
        String(extraPort.count ?? "").includes(query),
    ) ?? false
  );
}

function traceMatches(hops: readonly ScanHistoryTraceHop[] | undefined, query: string): boolean {
  return (
    hops?.some(
      (hop) =>
        includesQuery(hop.ttl, query) ||
        includesQuery(hop.address, query) ||
        includesQuery(hop.hostname, query) ||
        includesQuery(hop.rtt, query),
    ) ?? false
  );
}

function stringListMatches(values: readonly string[] | undefined, query: string): boolean {
  return values?.some((value) => includesQuery(value, query)) ?? false;
}

function scriptsMatch(
  scripts: readonly ScanHistoryScriptOutput[] | undefined,
  query: string,
): boolean {
  return (
    scripts?.some(
      (script) =>
        includesQuery(script.id, query) ||
        includesQuery(script.output, query) ||
        scriptDetailsMatch(script.details, query),
    ) ?? false
  );
}

function scriptDetailsMatch(
  details: readonly ScanHistoryScriptElement[] | undefined,
  query: string,
): boolean {
  return (
    details?.some(
      (detail) =>
        includesQuery(detail.kind, query) ||
        includesQuery(detail.key, query) ||
        includesQuery(detail.value, query) ||
        scriptDetailsMatch(detail.children, query),
    ) ?? false
  );
}

function includesQuery(value: string | undefined, query: string): boolean {
  return value?.toLowerCase().includes(query) ?? false;
}
