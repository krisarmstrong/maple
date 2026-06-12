import { useState } from "react";
import { historyLabel } from "../core/history-display";
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
  const [exportPath, setExportPath] = useState("");
  const [error, setError] = useState("");

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
      {error === "" ? null : <p className="error">{error}</p>}
      {exportPath === "" ? null : <p className="success">Exported to {exportPath}</p>}
      {records.map((record) => (
        <article className="history-card" key={record.runId}>
          <div>
            <h3>{formatTimestamp(record.finishedAt)}</h3>
            <strong className="history-profile">{record.profileName}</strong>
            <p>{historyLabel(record)}</p>
          </div>
          <code>{record.command.join(" ")}</code>
          <button
            type="button"
            onClick={() => setDetailsRunId(toggleRunId(detailsRunId, record.runId))}
          >
            {detailsRunId === record.runId ? "Hide Details" : "Details"}
          </button>
          <button type="button" onClick={() => void showReport(record.runId)}>
            {report?.runId === record.runId ? "Hide Report" : "Report"}
          </button>
          <button type="button" onClick={() => void exportRecord(record.runId, "xml")}>
            Export XML
          </button>
          <button type="button" onClick={() => void exportRecord(record.runId, "json")}>
            Export JSON
          </button>
          <button type="button" onClick={() => void exportRecord(record.runId, "markdown")}>
            Export Report
          </button>
          <button type="button" onClick={() => void deleteRecord(record.runId)}>
            {pendingDeleteRunId === record.runId ? "Confirm Delete" : "Delete"}
          </button>
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
