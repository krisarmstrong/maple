import { useState } from "react";
import type { HostDiff, PortChange, ScanDiffResult, ServiceChange } from "../core/scan-compare";
import { computeScanDiff, isDiffEmpty } from "../core/scan-compare";
import type { ScanHistoryRecord } from "../services/history-service";

interface ScanCompareProps {
  records: ScanHistoryRecord[];
}

export function ScanCompare({ records }: ScanCompareProps): React.JSX.Element {
  const [runIdA, setRunIdA] = useState<string>(records.at(1)?.runId ?? records.at(0)?.runId ?? "");
  const [runIdB, setRunIdB] = useState<string>(records.at(0)?.runId ?? "");

  if (records.length < 2) {
    return (
      <div className="compare-prompt" data-testid="compare-prompt">
        <p className="muted">
          At least two completed scans are needed to compare. Run more scans and come back.
        </p>
      </div>
    );
  }

  const recordA = records.find((r) => r.runId === runIdA);
  const recordB = records.find((r) => r.runId === runIdB);

  const diff =
    recordA !== undefined && recordB !== undefined ? computeScanDiff(recordA, recordB) : undefined;

  return (
    <div className="compare-workspace" data-testid="compare-workspace">
      <div className="compare-selectors">
        <label>
          <span>Run A (baseline)</span>
          <select
            data-testid="compare-run-a"
            value={runIdA}
            onChange={(event) => setRunIdA(event.target.value)}
          >
            {records.map((record) => (
              <option key={record.runId} value={record.runId}>
                {recordLabel(record)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Run B (current)</span>
          <select
            data-testid="compare-run-b"
            value={runIdB}
            onChange={(event) => setRunIdB(event.target.value)}
          >
            {records.map((record) => (
              <option key={record.runId} value={record.runId}>
                {recordLabel(record)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="compare-results" data-testid="compare-results">
        {diff === null ? (
          <p className="muted">Choose two different scans to compare.</p>
        ) : diff === undefined ? (
          <p className="muted">Select both runs above to see the diff.</p>
        ) : isDiffEmpty(diff) ? (
          <p className="compare-no-diff muted">No differences — these two scans are identical.</p>
        ) : (
          <DiffSections diff={diff} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diff sections
// ---------------------------------------------------------------------------

function DiffSections({ diff }: { diff: ScanDiffResult }): React.JSX.Element {
  return (
    <div className="compare-diff-sections">
      <HostSection
        hosts={diff.hostsOnlyInA}
        label="Hosts only in run A (removed)"
        tone="removed"
        emptyLabel="No hosts removed"
      />
      <HostSection
        hosts={diff.hostsOnlyInB}
        label="Hosts only in run B (added)"
        tone="added"
        emptyLabel="No hosts added"
      />
      <PortSection
        ports={diff.portsNewlyOpen}
        label="Ports newly open in run B"
        tone="added"
        emptyLabel="No ports newly opened"
      />
      <PortSection
        ports={diff.portsNewlyClosed}
        label="Ports newly closed in run B"
        tone="removed"
        emptyLabel="No ports newly closed"
      />
      <ServiceSection changes={diff.serviceChanges} />
    </div>
  );
}

function HostSection({
  hosts,
  label,
  tone,
  emptyLabel,
}: {
  hosts: HostDiff[];
  label: string;
  tone: "added" | "removed";
  emptyLabel: string;
}): React.JSX.Element {
  return (
    <section className={`compare-section compare-section--${tone}`} aria-label={label}>
      <h3 className="compare-section-title">{label}</h3>
      {hosts.length === 0 ? (
        <p className="muted compare-section-empty">{emptyLabel}</p>
      ) : (
        <ul className="compare-list">
          {hosts.map((host) => (
            <li key={host.address} className="compare-item">
              <strong>{host.address}</strong>
              {host.hostname !== undefined && host.hostname !== "" ? (
                <span className="compare-hostname"> ({host.hostname})</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PortSection({
  ports,
  label,
  tone,
  emptyLabel,
}: {
  ports: PortChange[];
  label: string;
  tone: "added" | "removed";
  emptyLabel: string;
}): React.JSX.Element {
  return (
    <section className={`compare-section compare-section--${tone}`} aria-label={label}>
      <h3 className="compare-section-title">{label}</h3>
      {ports.length === 0 ? (
        <p className="muted compare-section-empty">{emptyLabel}</p>
      ) : (
        <ul className="compare-list">
          {ports.map((port) => (
            <li
              key={`${port.address}:${port.protocol ?? ""}:${port.portId}`}
              className="compare-item"
            >
              <strong>{port.address}</strong>
              <span className="compare-port-tag">
                {port.protocol !== undefined && port.protocol !== ""
                  ? `${port.portId}/${port.protocol}`
                  : port.portId}
              </span>
              {port.hostname !== undefined && port.hostname !== "" ? (
                <span className="compare-hostname"> ({port.hostname})</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ServiceSection({ changes }: { changes: ServiceChange[] }): React.JSX.Element {
  return (
    <section className="compare-section" aria-label="Service changes">
      <h3 className="compare-section-title">Service changes</h3>
      {changes.length === 0 ? (
        <p className="muted compare-section-empty">No service changes</p>
      ) : (
        <ul className="compare-list">
          {changes.map((change) => (
            <li
              key={`${change.address}:${change.protocol ?? ""}:${change.portId}`}
              className="compare-item compare-item--service"
            >
              <strong>{change.address}</strong>
              <span className="compare-port-tag">
                {change.protocol !== undefined && change.protocol !== ""
                  ? `${change.portId}/${change.protocol}`
                  : change.portId}
              </span>
              <span className="compare-service-before">
                {change.before !== "" ? change.before : "—"}
              </span>
              <span className="compare-service-arrow" aria-hidden="true">
                →
              </span>
              <span className="compare-service-after">
                {change.after !== "" ? change.after : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recordLabel(record: ScanHistoryRecord): string {
  const ts = formatTimestamp(record.finishedAt);
  const target = record.targets.at(0)?.value ?? record.profileName;
  return `${ts} — ${target}`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
