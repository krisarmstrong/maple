import {
  ClearScanHistory,
  DeleteScanHistoryRecord,
  ExportScanHistoryRecord,
  ScanHistory,
  ScanReport,
} from "../../wailsjs/go/main/App";
import { hasWailsBackend, unavailableBridgeError } from "./wails-bridge";

export interface ScanHistoryRecord {
  runId: string;
  startedAt: string;
  finishedAt: string;
  command: string[];
  profileName: string;
  elapsedTime?: string;
  targets: ScanHistoryTarget[];
  hosts: ScanHistoryHost[];
  exitCode: number;
  targetCount: number;
  hostCount: number;
  hostsUp: number;
  hostsDown: number;
  openPortCount: number;
  diagnostics?: string;
  error?: string;
}

export interface ScanHistoryTarget {
  value: string;
  kind: string;
}

export interface ScanHistoryPort {
  id?: string;
  protocol?: string;
  state?: string;
  reason?: string;
  service?: string;
  product?: string;
  version?: string;
  extraInfo?: string;
  scripts?: ScanHistoryScriptOutput[];
}

export interface ScanHistoryHost {
  address?: string;
  hostname?: string;
  state?: string;
  scripts?: ScanHistoryScriptOutput[];
  ports: ScanHistoryPort[];
}

export interface ScanHistoryScriptOutput {
  id?: string;
  output?: string;
}

interface BackendSummary {
  elapsedTime?: string;
  hostCount: number;
  hostsUp: number;
  hostsDown: number;
  hosts?: ScanHistoryHost[];
}

interface BackendHistoryRecord {
  runId: string;
  startedAt: string;
  finishedAt: string;
  preview: {
    executable: string;
    args: string[];
    profile?: { name?: string };
    targets: ScanHistoryTarget[];
  };
  summary?: BackendSummary;
  exitCode: number;
  diagnostics?: string;
  error?: string;
}

export async function loadScanHistory(): Promise<ScanHistoryRecord[]> {
  if (!hasWailsBackend()) {
    return [];
  }
  const records = (await ScanHistory()) as BackendHistoryRecord[];
  return records.map((record) => ({
    runId: record.runId,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    command: [record.preview.executable, ...record.preview.args],
    profileName: record.preview.profile?.name ?? "Unknown Profile",
    elapsedTime: record.summary?.elapsedTime,
    targets: record.preview.targets,
    hosts: normalizeHosts(record.summary?.hosts ?? []),
    exitCode: record.exitCode,
    targetCount: record.preview.targets.length,
    hostCount: record.summary?.hostCount ?? 0,
    hostsUp: record.summary?.hostsUp ?? 0,
    hostsDown: record.summary?.hostsDown ?? 0,
    openPortCount: countOpenPorts(record.summary?.hosts ?? []),
    diagnostics: record.diagnostics,
    error: record.error,
  }));
}

export function loadScanReport(runId: string): Promise<string> {
  if (!hasWailsBackend()) {
    return Promise.reject(unavailableBridgeError());
  }
  return ScanReport(runId);
}

export function exportScanHistoryRecord(
  runId: string,
  format: "xml" | "json" | "markdown",
): Promise<string> {
  if (!hasWailsBackend()) {
    return Promise.reject(unavailableBridgeError());
  }
  return ExportScanHistoryRecord(runId, format);
}

export function deleteScanHistoryRecord(runId: string): Promise<void> {
  if (!hasWailsBackend()) {
    return Promise.reject(unavailableBridgeError());
  }
  return DeleteScanHistoryRecord(runId);
}

export function clearScanHistory(): Promise<void> {
  if (!hasWailsBackend()) {
    return Promise.resolve();
  }
  return ClearScanHistory();
}

function normalizeHosts(hosts: ScanHistoryHost[]): ScanHistoryHost[] {
  return hosts.map((host) => ({
    ...host,
    scripts: host.scripts ?? [],
    ports: (host.ports ?? []).map((port) => ({ ...port, scripts: port.scripts ?? [] })),
  }));
}

function countOpenPorts(hosts: ScanHistoryHost[]): number {
  return hosts.reduce(
    (total, host) => total + (host.ports ?? []).filter((port) => port.state === "open").length,
    0,
  );
}
