import { useState } from "react";
import { historyLabel } from "../core/history-display";
import { filterHistoryRecords, type HistoryFilterID } from "../core/history-filter";
import { type HistorySortID, sortHistoryRecords } from "../core/history-sort";
import type { ScanHistoryRecord } from "../services/history-service";
import {
  deleteScanHistoryRecord,
  exportScanHistoryRecord,
  loadScanReport,
} from "../services/history-service";
import { ScanHistoryDetails } from "./ScanHistoryDetails";

interface ScanHistoryListProps {
  records: ScanHistoryRecord[];
  onChanged?: () => void;
}

export function ScanHistoryList({ records, onChanged }: ScanHistoryListProps): React.JSX.Element {
  const [report, setReport] = useState<{ runId: string; text: string } | undefined>();
  const [detailsRunId, setDetailsRunId] = useState<string | undefined>();
  const [pendingDeleteRunId, setPendingDeleteRunId] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [filterId, setFilterId] = useState<HistoryFilterID>("all");
  const [sortId, setSortId] = useState<HistorySortID>("newest");
  const [exportPath, setExportPath] = useState("");
  const [error, setError] = useState("");
  const visibleRecords = sortHistoryRecords(filterHistoryRecords(records, query, filterId), sortId);

  if (records.length === 0) {
    return <p className="muted">No completed scans yet.</p>;
  }

  async function showReport(runId: string): Promise<void> {
    setError("");
    setExportPath("");
    setPendingDeleteRunId(undefined);
    setDetailsRunId(undefined);
    if (report?.runId === runId) {
      setReport(undefined);
      return;
    }
    try {
      setReport({ runId, text: await loadScanReport(runId) });
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "Unable to load report";
      setError(message);
    }
  }

  async function deleteRecord(runId: string): Promise<void> {
    if (pendingDeleteRunId !== runId) {
      setError("");
      setExportPath("");
      setPendingDeleteRunId(runId);
      return;
    }
    setError("");
    try {
      await deleteScanHistoryRecord(runId);
      if (report?.runId === runId) {
        setReport(undefined);
      }
      if (detailsRunId === runId) {
        setDetailsRunId(undefined);
      }
      setPendingDeleteRunId(undefined);
      onChanged?.();
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "Unable to delete history record";
      setError(message);
    }
  }

  async function exportRecord(runId: string, format: "xml" | "json" | "markdown"): Promise<void> {
    setError("");
    setExportPath("");
    try {
      const path = await exportScanHistoryRecord(runId, format);
      if (path !== "") {
        setExportPath(path);
      }
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "Unable to export scan";
      setError(message);
    }
  }

  return (
    <div className="history-list">
      <div className="history-controls">
        <label>
          <span>Search history</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Target, profile, host, command"
            type="search"
            value={query}
          />
        </label>
        <label>
          <span>Show</span>
          <select
            onChange={(event) => setFilterId(toHistoryFilterID(event.target.value))}
            value={filterId}
          >
            <option value="all">All scans</option>
            <option value="hosts-up">Hosts up</option>
            <option value="open-ports">Open ports</option>
            <option value="errors">Errors</option>
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select
            onChange={(event) => setSortId(toHistorySortID(event.target.value))}
            value={sortId}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="open-ports">Most open ports</option>
            <option value="hosts-up">Most hosts up</option>
            <option value="needs-review">Needs review first</option>
          </select>
        </label>
      </div>
      <p className="history-count">
        Showing {visibleRecords.length} of {records.length} scans
      </p>
      {error === "" ? null : <p className="error">{error}</p>}
      {exportPath === "" ? null : (
        <p className="success">
          Saved {filenameFromPath(exportPath)} to {exportPath}
        </p>
      )}
      {visibleRecords.length === 0 ? (
        <p className="muted">No scans match the current filters.</p>
      ) : null}
      {visibleRecords.map((record) => (
        <article className="history-card" data-run-id={record.runId} key={record.runId}>
          <div className="history-card-header">
            <div>
              <h3>{formatTimestamp(record.finishedAt)}</h3>
              <strong className="history-profile">{record.profileName}</strong>
              <p>{historyLabel(record)}</p>
            </div>
            <span
              className={
                record.error === undefined || record.error === ""
                  ? "state-badge state-badge--good"
                  : "state-badge state-badge--warn"
              }
            >
              {record.error === undefined || record.error === "" ? "Completed" : "Needs review"}
            </span>
          </div>
          <code className="history-command">{record.command.join(" ")}</code>
          <div className="history-card-actions">
            <div>
              <button
                type="button"
                onClick={() => setDetailsRunId(toggleRunId(detailsRunId, record.runId))}
              >
                {detailsRunId === record.runId ? "Hide Details" : "Details"}
              </button>
              <button type="button" onClick={() => void showReport(record.runId)}>
                {report?.runId === record.runId ? "Hide Report" : "Report"}
              </button>
            </div>
            <div>
              <button type="button" onClick={() => void exportRecord(record.runId, "xml")}>
                Raw XML
              </button>
              <button type="button" onClick={() => void exportRecord(record.runId, "json")}>
                Full JSON
              </button>
              <button type="button" onClick={() => void exportRecord(record.runId, "markdown")}>
                Markdown Report
              </button>
            </div>
            <button type="button" onClick={() => void deleteRecord(record.runId)}>
              {pendingDeleteRunId === record.runId ? "Confirm Delete" : "Delete"}
            </button>
          </div>
          {report?.runId === record.runId ? (
            <pre className="report-preview">{report.text}</pre>
          ) : null}
          {detailsRunId === record.runId ? <ScanHistoryDetails record={record} /> : null}
          {record.error === undefined || record.error === "" ? null : (
            <p className="error">{record.error}</p>
          )}
        </article>
      ))}
    </div>
  );
}

function toggleRunId(current: string | undefined, next: string): string | undefined {
  return current === next ? undefined : next;
}

function toHistoryFilterID(value: string): HistoryFilterID {
  if (value === "errors" || value === "hosts-up" || value === "open-ports") {
    return value;
  }
  return "all";
}

function toHistorySortID(value: string): HistorySortID {
  if (
    value === "oldest" ||
    value === "open-ports" ||
    value === "hosts-up" ||
    value === "needs-review"
  ) {
    return value;
  }
  return "newest";
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

function filenameFromPath(path: string): string {
  return path.split(/[\\/]/u).at(-1) ?? path;
}
