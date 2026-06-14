import {
  ClearScanHistory,
  DeleteScanHistoryRecord,
  ExportScanHistoryRecord,
  ScanHistory,
  ScanReport,
} from "../../wailsjs/go/main/App";
import type { reports } from "../../wailsjs/go/models";
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
  cpes?: string[];
  scripts?: ScanHistoryScriptOutput[];
}

export interface ScanHistoryHost {
  address?: string;
  hostname?: string;
  state?: string;
  osMatches?: ScanHistoryOSMatch[];
  extraPorts?: ScanHistoryExtraPorts[];
  trace?: ScanHistoryTraceHop[];
  scripts?: ScanHistoryScriptOutput[];
  ports: ScanHistoryPort[];
}

export interface ScanHistoryScriptOutput {
  id?: string;
  output?: string;
  details?: ScanHistoryScriptElement[];
}

export interface ScanHistoryScriptElement {
  kind?: string;
  key?: string;
  value?: string;
  children?: ScanHistoryScriptElement[];
}

export interface ScanHistoryOSMatch {
  name?: string;
  accuracy?: string;
}

export interface ScanHistoryExtraPorts {
  state?: string;
  count?: number;
  reason?: string;
}

export interface ScanHistoryTraceHop {
  ttl?: string;
  address?: string;
  hostname?: string;
  rtt?: string;
}

export async function loadScanHistory(): Promise<ScanHistoryRecord[]> {
  if (!hasWailsBackend()) {
    return [];
  }
  // No cast: ScanHistory() is typed Promise<store.ScanRecord[]> from the
  // generated Wails bindings, so this mapping reads the Go structs through the
  // generated types directly and fails to compile if a field it depends on is
  // renamed or retyped, surfacing drift instead of hiding it behind a cast.
  const records = await ScanHistory();
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

function normalizeHosts(hosts: reports.Host[]): ScanHistoryHost[] {
  return hosts.map((host) => ({
    ...host,
    osMatches: host.osMatches ?? [],
    extraPorts: host.extraPorts ?? [],
    trace: host.trace ?? [],
    scripts: normalizeScripts(host.scripts ?? []),
    ports: (host.ports ?? []).map((port) => ({
      ...port,
      cpes: port.cpes ?? [],
      scripts: normalizeScripts(port.scripts ?? []),
    })),
  }));
}

function normalizeScripts(scripts: reports.ScriptOutput[]): ScanHistoryScriptOutput[] {
  return scripts.map((script) => ({
    ...script,
    details: normalizeScriptElements(script.details ?? []),
  }));
}

function normalizeScriptElements(details: reports.ScriptElement[]): ScanHistoryScriptElement[] {
  return details.map((detail) => ({
    ...detail,
    children: normalizeScriptElements(detail.children ?? []),
  }));
}

function countOpenPorts(hosts: reports.Host[]): number {
  return hosts.reduce(
    (total, host) => total + (host.ports ?? []).filter((port) => port.state === "open").length,
    0,
  );
}
