import { useState } from "react";
import {
  hostKey,
  hostStateLabel,
  portKey,
  portName,
  portStateLabel,
  productLabel,
  stateClassName,
} from "../core/history-detail-display";
import type {
  ScanHistoryExtraPorts,
  ScanHistoryHost,
  ScanHistoryOSMatch,
  ScanHistoryPort,
  ScanHistoryRecord,
  ScanHistoryScriptOutput,
  ScanHistoryTraceHop,
} from "../services/history-service";

type ResultFilter = "all" | "open" | "hosts-up" | "findings";

interface ScanHistoryDetailsProps {
  record: ScanHistoryRecord;
}

export function ScanHistoryDetails({ record }: ScanHistoryDetailsProps): React.JSX.Element {
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [query, setQuery] = useState("");
  const visibleHosts = searchHosts(filterHosts(record.hosts, filter), query);
  if (record.hosts.length === 0) {
    return (
      <div className="history-details">
        <ResultSummary record={record} />
        {hasError(record) ? <p className="error">{record.error}</p> : null}
        {hasDiagnostics(record) ? <Diagnostics text={record.diagnostics} /> : null}
        <p className="muted">{emptyHostMessage(record)}</p>
      </div>
    );
  }
  return (
    <div className="history-details">
      <ResultSummary record={record} />
      <div className="history-workbench-controls">
        <ResultSearch query={query} onChange={setQuery} />
        <ResultFilters filter={filter} onChange={setFilter} />
      </div>
      {hasError(record) ? <p className="error">{record.error}</p> : null}
      {hasDiagnostics(record) ? <Diagnostics text={record.diagnostics} /> : null}
      {visibleHosts.map((host) => (
        <HostDetail filter={filter} host={host} key={hostKey(host)} />
      ))}
      {visibleHosts.length === 0 ? (
        <p className="muted">No hosts match this result filter.</p>
      ) : null}
    </div>
  );
}

function ResultSearch({
  query,
  onChange,
}: {
  query: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <label className="history-result-search">
      <span>Search expanded result</span>
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder="Host, service, product, reason, OS, CPE, script"
        type="search"
        value={query}
      />
    </label>
  );
}

function ResultSummary({ record }: { record: ScanHistoryRecord }): React.JSX.Element {
  return (
    <div className="history-result-summary">
      <ResultMetric label="Hosts total" value={String(record.hostCount)} />
      <ResultMetric label="Hosts up" value={String(record.hostsUp)} />
      <ResultMetric label="Hosts down" value={String(record.hostsDown)} />
      <ResultMetric label="Open ports" value={String(record.openPortCount)} />
      <ResultMetric label="Elapsed" value={elapsedLabel(record.elapsedTime)} />
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="history-result-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Diagnostics({ text }: { text?: string }): React.JSX.Element | null {
  return text === undefined || text === "" ? null : (
    <details className="history-diagnostics">
      <summary>Diagnostics</summary>
      <pre>{text}</pre>
    </details>
  );
}

function ResultFilters({
  filter,
  onChange,
}: {
  filter: ResultFilter;
  onChange: (filter: ResultFilter) => void;
}): React.JSX.Element {
  return (
    <fieldset className="history-result-filters">
      <legend>Result filters</legend>
      <FilterButton filter={filter} id="all" label="All ports" onChange={onChange} />
      <FilterButton filter={filter} id="open" label="Open ports" onChange={onChange} />
      <FilterButton filter={filter} id="hosts-up" label="Hosts up" onChange={onChange} />
      <FilterButton filter={filter} id="findings" label="Hosts with findings" onChange={onChange} />
    </fieldset>
  );
}

function FilterButton({
  filter,
  id,
  label,
  onChange,
}: {
  filter: ResultFilter;
  id: ResultFilter;
  label: string;
  onChange: (filter: ResultFilter) => void;
}): React.JSX.Element {
  return (
    <button aria-current={filter === id} onClick={() => onChange(id)} type="button">
      {label}
    </button>
  );
}

function HostDetail({
  filter,
  host,
}: {
  filter: ResultFilter;
  host: ScanHistoryHost;
}): React.JSX.Element {
  const visiblePorts = filterPorts(host.ports, filter);
  const groupedPorts = portGroups(visiblePorts);
  return (
    <section className="history-host">
      <div className="history-host-header">
        <div>
          <strong>{host.address ?? "Unknown address"}</strong>
          {host.hostname === undefined || host.hostname === "" ? null : (
            <span>{host.hostname}</span>
          )}
        </div>
        <div className="history-host-badges">
          <span className={stateClassName(hostHasOpenPorts(host) ? "open" : undefined)}>
            {hostFindingLabel(host)}
          </span>
          {host.state === undefined || host.state === "" ? null : (
            <span className={stateClassName(host.state)}>{hostStateLabel(host.state)}</span>
          )}
        </div>
      </div>
      <HostMetadata host={host} />
      <ScriptOutputList scripts={host.scripts ?? []} title="Host scripts" />
      {visiblePorts.length === 0 ? (
        <p className="muted">No ports reported for this host.</p>
      ) : (
        <div className="history-port-list">
          {groupedPorts.map((group) => (
            <section className="history-port-group" key={group.state}>
              <h4>{portGroupLabel(group.state)}</h4>
              {group.ports.map((port) => (
                <PortDetail key={portKey(port)} port={port} />
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function PortDetail({ port }: { port: ScanHistoryPort }): React.JSX.Element {
  return (
    <div className="history-port">
      <div className="history-port-main">
        <span className={stateClassName(port.state)}>{portStateLabel(port.state)}</span>
        <strong>{portName(port)}</strong>
        {port.service === undefined || port.service === "" ? null : <span>{port.service}</span>}
        {productLabel(port) === "" ? null : <span>{productLabel(port)}</span>}
        {port.extraInfo === undefined || port.extraInfo === "" ? null : (
          <span>{port.extraInfo}</span>
        )}
        {port.reason === undefined || port.reason === "" ? null : <span>{port.reason}</span>}
      </div>
      <StringList items={port.cpes ?? []} title="CPEs" />
      <ScriptOutputList scripts={port.scripts ?? []} title="Port scripts" />
    </div>
  );
}

function HostMetadata({ host }: { host: ScanHistoryHost }): React.JSX.Element | null {
  const hasMetadata =
    (host.osMatches ?? []).length > 0 ||
    (host.extraPorts ?? []).length > 0 ||
    (host.trace ?? []).length > 0;
  if (!hasMetadata) {
    return null;
  }
  return (
    <div className="history-host-metadata">
      <OSMatchList matches={host.osMatches ?? []} />
      <ExtraPortsList extraPorts={host.extraPorts ?? []} />
      <TraceList hops={host.trace ?? []} />
    </div>
  );
}

function OSMatchList({
  matches,
}: {
  matches: readonly ScanHistoryOSMatch[];
}): React.JSX.Element | null {
  if (matches.length === 0) {
    return null;
  }
  return (
    <div>
      <strong>OS matches</strong>
      <ul>
        {matches.map((match) => (
          <li key={`${match.name ?? "os"}:${match.accuracy ?? ""}`}>
            {match.name ?? "Unknown OS"}
            {match.accuracy === undefined || match.accuracy === "" ? null : (
              <span>{match.accuracy}%</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExtraPortsList({
  extraPorts,
}: {
  extraPorts: readonly ScanHistoryExtraPorts[];
}): React.JSX.Element | null {
  if (extraPorts.length === 0) {
    return null;
  }
  return (
    <div>
      <strong>Other ports</strong>
      <ul>
        {extraPorts.map((extraPort) => (
          <li key={`${extraPort.state ?? "unknown"}:${extraPort.count ?? 0}`}>
            {extraPort.count ?? 0} {extraPort.state ?? "unknown"}
            {extraPort.reason === undefined || extraPort.reason === "" ? null : (
              <span>{extraPort.reason}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TraceList({ hops }: { hops: readonly ScanHistoryTraceHop[] }): React.JSX.Element | null {
  if (hops.length === 0) {
    return null;
  }
  return (
    <div>
      <strong>Trace</strong>
      <ol>
        {hops.map((hop) => (
          <li key={`${hop.ttl ?? "hop"}:${hop.address ?? ""}:${hop.rtt ?? ""}`}>
            <span>{hop.ttl ?? "?"}</span>
            <span>{hop.address ?? "Unknown hop"}</span>
            {hop.hostname === undefined || hop.hostname === "" ? null : <span>{hop.hostname}</span>}
            {hop.rtt === undefined || hop.rtt === "" ? null : <span>{hop.rtt} ms</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StringList({
  items,
  title,
}: {
  items: readonly string[];
  title: string;
}): React.JSX.Element | null {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="history-string-list">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ScriptOutputList({
  scripts,
  title,
}: {
  scripts: readonly ScanHistoryScriptOutput[];
  title: string;
}): React.JSX.Element | null {
  if (scripts.length === 0) {
    return null;
  }
  return (
    <div className="history-script-output">
      <strong>{title}</strong>
      {scripts.map((script) => (
        <div key={`${script.id ?? "script"}:${script.output ?? ""}`}>
          <span>{script.id ?? "script"}</span>
          {script.output === undefined || script.output === "" ? null : <pre>{script.output}</pre>}
        </div>
      ))}
    </div>
  );
}

function hasDiagnostics(record: ScanHistoryRecord): boolean {
  return record.diagnostics !== undefined && record.diagnostics !== "";
}

function hostFindingLabel(host: ScanHistoryHost): string {
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

function hostHasOpenPorts(host: ScanHistoryHost): boolean {
  return host.ports.some((port) => port.state === "open");
}

function hostHasFindings(host: ScanHistoryHost): boolean {
  return hostHasOpenPorts(host) || hostEvidenceCount(host) > 0;
}

function hostScriptCount(host: ScanHistoryHost): number {
  return (
    (host.scripts ?? []).length +
    host.ports.reduce((total, port) => total + (port.scripts ?? []).length, 0)
  );
}

function hostEvidenceCount(host: ScanHistoryHost): number {
  return (
    hostScriptCount(host) +
    (host.osMatches ?? []).length +
    (host.extraPorts ?? []).length +
    (host.trace ?? []).length
  );
}

function hasError(record: ScanHistoryRecord): boolean {
  return record.error !== undefined && record.error !== "";
}

function emptyHostMessage(record: ScanHistoryRecord): string {
  if (record.hostCount > 0) {
    return `Nmap reported ${record.hostsUp}/${record.hostCount} hosts up, but did not include host rows.`;
  }
  return "No parsed hosts for this scan.";
}

function elapsedLabel(value: string | undefined): string {
  if (value === undefined || value === "") {
    return "n/a";
  }
  return value.endsWith("s") ? value : `${value}s`;
}

function filterHosts(hosts: readonly ScanHistoryHost[], filter: ResultFilter): ScanHistoryHost[] {
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

function filterPorts(ports: readonly ScanHistoryPort[], filter: ResultFilter): ScanHistoryPort[] {
  if (filter === "open") {
    return ports.filter((port) => port.state === "open");
  }
  return [...ports];
}

function searchHosts(hosts: readonly ScanHistoryHost[], query: string): ScanHistoryHost[] {
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
      (script) => includesQuery(script.id, query) || includesQuery(script.output, query),
    ) ?? false
  );
}

function includesQuery(value: string | undefined, query: string): boolean {
  return value?.toLowerCase().includes(query) ?? false;
}

function portGroups(
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

function portGroupLabel(state: string): string {
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
