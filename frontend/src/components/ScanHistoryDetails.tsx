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
import {
  elapsedLabel,
  emptyHostMessage,
  filterHosts,
  filterPorts,
  hasDiagnostics,
  hasError,
  hostFindingLabel,
  hostHasOpenPorts,
  portGroupLabel,
  portGroups,
  type ResultFilter,
  scriptDetailKey,
  scriptDetailLabel,
  searchHosts,
} from "../core/history-details-view";
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
          <ScriptDetailList details={script.details ?? []} />
        </div>
      ))}
    </div>
  );
}

function ScriptDetailList({
  details,
}: {
  details: readonly ScanHistoryScriptElement[];
}): React.JSX.Element | null {
  if (details.length === 0) {
    return null;
  }
  return (
    <ul className="history-script-details">
      {details.map((detail) => (
        <li key={scriptDetailKey(detail)}>
          <span>{scriptDetailLabel(detail)}</span>
          <ScriptDetailList details={detail.children ?? []} />
        </li>
      ))}
    </ul>
  );
}
