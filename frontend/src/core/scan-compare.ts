import type {
  ScanHistoryHost,
  ScanHistoryPort,
  ScanHistoryRecord,
} from "../services/history-service";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface HostDiff {
  address: string;
  hostname?: string;
}

export interface PortChange {
  address: string;
  hostname?: string;
  portId: string;
  protocol?: string;
  state: string;
}

export interface ServiceChange {
  address: string;
  hostname?: string;
  portId: string;
  protocol?: string;
  before: string;
  after: string;
}

export interface ScanDiffResult {
  /** Hosts present in run A but not in run B (keyed by primary address). */
  hostsOnlyInA: HostDiff[];
  /** Hosts present in run B but not in run A. */
  hostsOnlyInB: HostDiff[];
  /** Ports that went from any state in A to "open" in B. */
  portsNewlyOpen: PortChange[];
  /** Ports that were "open" in A but are no longer open (or absent) in B. */
  portsNewlyClosed: PortChange[];
  /** Ports whose service/product label changed between A and B. */
  serviceChanges: ServiceChange[];
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Compare two completed scan records and return a structured diff.
 * Returns `null` when the same record is selected as both A and B.
 */
export function computeScanDiff(
  recordA: ScanHistoryRecord,
  recordB: ScanHistoryRecord,
): ScanDiffResult | null {
  if (recordA.runId === recordB.runId) {
    return null;
  }

  const hostsA = indexByAddress(recordA.hosts);
  const hostsB = indexByAddress(recordB.hosts);

  const allAddresses = new Set([...hostsA.keys(), ...hostsB.keys()]);

  const hostsOnlyInA: HostDiff[] = [];
  const hostsOnlyInB: HostDiff[] = [];
  const portsNewlyOpen: PortChange[] = [];
  const portsNewlyClosed: PortChange[] = [];
  const serviceChanges: ServiceChange[] = [];

  for (const address of allAddresses) {
    const hostA = hostsA.get(address);
    const hostB = hostsB.get(address);

    if (hostA !== undefined && hostB === undefined) {
      hostsOnlyInA.push(hostDiff(hostA));
      continue;
    }
    if (hostA === undefined && hostB !== undefined) {
      hostsOnlyInB.push(hostDiff(hostB));
      continue;
    }
    if (hostA === undefined || hostB === undefined) {
      continue;
    }

    // Both sides have this host — compare ports.
    const portsA = indexByPortKey(hostA.ports);
    const portsB = indexByPortKey(hostB.ports);
    const allPortKeys = new Set([...portsA.keys(), ...portsB.keys()]);

    for (const portKey of allPortKeys) {
      const portA = portsA.get(portKey);
      const portB = portsB.get(portKey);

      if (portA === undefined && portB !== undefined) {
        // New port in B
        if (portB.state === "open") {
          portsNewlyOpen.push(portChange(address, hostB, portB));
        }
        continue;
      }
      if (portA !== undefined && portB === undefined) {
        // Port gone from B
        if (portA.state === "open") {
          portsNewlyClosed.push(portChange(address, hostA, portA));
        }
        continue;
      }
      if (portA === undefined || portB === undefined) {
        continue;
      }

      // Port exists on both sides.
      if (portA.state !== "open" && portB.state === "open") {
        portsNewlyOpen.push(portChange(address, hostB, portB));
      } else if (portA.state === "open" && portB.state !== "open") {
        portsNewlyClosed.push(portChange(address, hostA, portA));
      }

      // Service label change.
      const labelA = serviceLabel(portA);
      const labelB = serviceLabel(portB);
      if (labelA !== labelB) {
        serviceChanges.push({
          address,
          hostname: hostB.hostname,
          portId: portB.id ?? "",
          protocol: portB.protocol,
          before: labelA,
          after: labelB,
        });
      }
    }
  }

  return { hostsOnlyInA, hostsOnlyInB, portsNewlyOpen, portsNewlyClosed, serviceChanges };
}

/** True when every diff section is empty. */
export function isDiffEmpty(result: ScanDiffResult): boolean {
  return (
    result.hostsOnlyInA.length === 0 &&
    result.hostsOnlyInB.length === 0 &&
    result.portsNewlyOpen.length === 0 &&
    result.portsNewlyClosed.length === 0 &&
    result.serviceChanges.length === 0
  );
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function indexByAddress(hosts: readonly ScanHistoryHost[]): Map<string, ScanHistoryHost> {
  const index = new Map<string, ScanHistoryHost>();
  for (const host of hosts) {
    const address = host.address !== undefined && host.address !== "" ? host.address : undefined;
    const key = address ?? host.hostname ?? "";
    if (key !== "") {
      index.set(key, host);
    }
  }
  return index;
}

function indexByPortKey(ports: readonly ScanHistoryPort[]): Map<string, ScanHistoryPort> {
  const index = new Map<string, ScanHistoryPort>();
  for (const port of ports) {
    const key = `${port.protocol ?? ""}:${port.id ?? ""}`;
    if (key !== ":") {
      index.set(key, port);
    }
  }
  return index;
}

function hostDiff(host: ScanHistoryHost): HostDiff {
  const address = host.address !== undefined && host.address !== "" ? host.address : undefined;
  return {
    address: address ?? host.hostname ?? "unknown",
    hostname: host.hostname,
  };
}

function portChange(address: string, host: ScanHistoryHost, port: ScanHistoryPort): PortChange {
  return {
    address,
    hostname: host.hostname,
    portId: port.id ?? "",
    protocol: port.protocol,
    state: port.state ?? "",
  };
}

function serviceLabel(port: ScanHistoryPort): string {
  const parts = [port.service, port.product, port.version].filter(
    (value): value is string => value !== undefined && value !== "",
  );
  return parts.join(" ");
}
