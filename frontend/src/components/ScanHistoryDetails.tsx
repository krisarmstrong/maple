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

interface ScanHistoryDetailsProps {
  record: ScanHistoryRecord;
}

export function ScanHistoryDetails({ record }: ScanHistoryDetailsProps): React.JSX.Element {
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
      {hasError(record) ? <p className="error">{record.error}</p> : null}
      {hasDiagnostics(record) ? <Diagnostics text={record.diagnostics} /> : null}
      {record.hosts.map((host) => (
        <HostDetail host={host} key={hostKey(host)} />
      ))}
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
  return text === undefined || text === "" ? null : <pre>{text}</pre>;
}

function HostDetail({ host }: { host: ScanHistoryHost }): React.JSX.Element {
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
      {host.ports.length === 0 ? (
        <p className="muted">No ports reported for this host.</p>
      ) : (
        <div className="history-port-list">
          {host.ports.map((port) => (
            <PortDetail key={portKey(port)} port={port} />
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
