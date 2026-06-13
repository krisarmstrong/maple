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
  ScanHistoryHost,
  ScanHistoryPort,
  ScanHistoryRecord,
} from "../services/history-service";

type ResultFilter = "all" | "open" | "hosts-up" | "findings";

interface ScanHistoryDetailsProps {
  record: ScanHistoryRecord;
}

export function ScanHistoryDetails({ record }: ScanHistoryDetailsProps): React.JSX.Element {
  const [filter, setFilter] = useState<ResultFilter>("all");
  const visibleHosts = filterHosts(record.hosts, filter);
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
      <ResultFilters filter={filter} onChange={setFilter} />
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
        {host.state === undefined || host.state === "" ? null : (
          <span className={stateClassName(host.state)}>{hostStateLabel(host.state)}</span>
        )}
      </div>
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
      <span className={stateClassName(port.state)}>{portStateLabel(port.state)}</span>
      <strong>{portName(port)}</strong>
      {port.service === undefined || port.service === "" ? null : <span>{port.service}</span>}
      {productLabel(port) === "" ? null : <span>{productLabel(port)}</span>}
      {port.extraInfo === undefined || port.extraInfo === "" ? null : <span>{port.extraInfo}</span>}
      {port.reason === undefined || port.reason === "" ? null : <span>{port.reason}</span>}
    </div>
  );
}

function hasDiagnostics(record: ScanHistoryRecord): boolean {
  return record.diagnostics !== undefined && record.diagnostics !== "";
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
    return hosts.filter((host) => host.ports.some((port) => port.state === "open"));
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
