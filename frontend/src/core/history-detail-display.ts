import type { ScanHistoryHost, ScanHistoryPort } from "../services/history-service";

export function hostKey(host: ScanHistoryHost): string {
  return [host.address, host.hostname, host.state].filter(isPresent).join("-");
}

export function portKey(port: ScanHistoryPort): string {
  return [port.protocol, port.id, port.state, port.service].filter(isPresent).join("-");
}

export function hostStateLabel(state: string): string {
  return `Host ${state}`;
}

export function portStateLabel(state: string | undefined): string {
  if (state === undefined || state === "") {
    return "Unknown";
  }
  return state.charAt(0).toUpperCase() + state.slice(1);
}

export function stateClassName(state: string | undefined): string {
  return state === "open" || state === "up" ? "state-badge state-badge--good" : "state-badge";
}

export function portName(port: ScanHistoryPort): string {
  if (port.id === undefined || port.protocol === undefined) {
    return port.id ?? "";
  }
  return `${port.id}/${port.protocol}`;
}

export function productLabel(port: ScanHistoryPort): string {
  return [port.product, port.version].filter(isPresent).join(" ");
}

function isPresent(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}
