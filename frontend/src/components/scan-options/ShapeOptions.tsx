import {
  discoveryModes,
  dnsModes,
  isDiscoveryMode,
  isDNSMode,
  isScanTechnique,
  isTimingTemplate,
  type ScanOptions,
  scanTechniques,
  timingTemplates,
} from "../../core/scan-options";

interface ShapeOptionsProps {
  scanOptions: ScanOptions;
  onChange: (updater: (options: ScanOptions) => ScanOptions) => void;
}

function clearDiscoveryProbes(options: ScanOptions): ScanOptions {
  return {
    ...options,
    tcpSynProbes: "",
    tcpAckProbes: "",
    udpProbes: "",
    sctpInitProbes: "",
    icmpEchoProbe: false,
    icmpTimestamp: false,
    icmpNetmask: false,
  };
}

export function ShapeOptions({ scanOptions, onChange }: ShapeOptionsProps): React.JSX.Element {
  return (
    <>
      <h4 className="option-section-heading">Scan shape</h4>
      <label>
        <span>Scan technique</span>
        <select
          aria-label="Scan technique"
          value={scanOptions.scanTechnique}
          onChange={(event) => {
            const value = event.target.value;
            if (isScanTechnique(value)) {
              onChange((current) => ({ ...current, scanTechnique: value }));
            }
          }}
        >
          {scanTechniques.map((technique) => (
            <option key={technique.value || "default"} value={technique.value}>
              {technique.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Host discovery</span>
        <select
          aria-label="Host discovery"
          value={scanOptions.discoveryMode}
          onChange={(event) => {
            const value = event.target.value;
            if (isDiscoveryMode(value)) {
              onChange((current) => {
                const next = { ...current, discoveryMode: value };
                return value === "skip" ? clearDiscoveryProbes(next) : next;
              });
            }
          }}
        >
          {discoveryModes.map((mode) => (
            <option key={mode.value || "default"} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Timing</span>
        <select
          aria-label="Timing"
          value={scanOptions.timingTemplate}
          onChange={(event) => {
            const value = event.target.value;
            if (isTimingTemplate(value)) {
              onChange((current) => ({ ...current, timingTemplate: value }));
            }
          }}
        >
          {timingTemplates.map((template) => (
            <option key={template.value || "default"} value={template.value}>
              {template.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>DNS</span>
        <select
          aria-label="DNS"
          value={scanOptions.dnsMode}
          onChange={(event) => {
            const value = event.target.value;
            if (isDNSMode(value)) {
              onChange((current) => ({
                ...current,
                dnsMode: value,
                dnsServers: value === "skip" ? "" : current.dnsServers,
              }));
            }
          }}
        >
          {dnsModes.map((mode) => (
            <option key={mode.value || "default"} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>DNS servers</span>
        <input
          aria-label="DNS servers"
          disabled={scanOptions.dnsMode === "skip"}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              dnsServers: event.target.value,
            }))
          }
          placeholder="1.1.1.1,8.8.8.8"
          type="text"
          value={scanOptions.dnsServers}
        />
      </label>
      <h4 className="option-section-heading">Discovery probes</h4>
      <label>
        <span>TCP SYN probe ports</span>
        <input
          aria-label="TCP SYN probe ports"
          disabled={scanOptions.discoveryMode === "skip"}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              tcpSynProbes: event.target.value,
            }))
          }
          placeholder="22,80,443"
          type="text"
          value={scanOptions.tcpSynProbes}
        />
      </label>
      <label>
        <span>TCP ACK probe ports</span>
        <input
          aria-label="TCP ACK probe ports"
          disabled={scanOptions.discoveryMode === "skip"}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              tcpAckProbes: event.target.value,
            }))
          }
          placeholder="80,443"
          type="text"
          value={scanOptions.tcpAckProbes}
        />
      </label>
      <label>
        <span>UDP probe ports</span>
        <input
          aria-label="UDP probe ports"
          disabled={scanOptions.discoveryMode === "skip"}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              udpProbes: event.target.value,
            }))
          }
          placeholder="53,161"
          type="text"
          value={scanOptions.udpProbes}
        />
      </label>
      <label>
        <span>SCTP INIT probe ports</span>
        <input
          aria-label="SCTP INIT probe ports"
          disabled={scanOptions.discoveryMode === "skip"}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              sctpInitProbes: event.target.value,
            }))
          }
          placeholder="3868"
          type="text"
          value={scanOptions.sctpInitProbes}
        />
      </label>
      <h4 className="option-section-heading">Target scope</h4>
      <label>
        <span>Target input file</span>
        <input
          aria-label="Target input file"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              targetInputFile: event.target.value,
            }))
          }
          placeholder="/Users/krisarmstrong/targets.txt"
          type="text"
          value={scanOptions.targetInputFile}
        />
      </label>
      <label>
        <span>Exclude targets</span>
        <input
          aria-label="Exclude targets"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              excludeTargets: event.target.value,
            }))
          }
          placeholder="192.168.1.10, scanme.nmap.org"
          type="text"
          value={scanOptions.excludeTargets}
        />
      </label>
      <label>
        <span>Exclude file</span>
        <input
          aria-label="Exclude file"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              excludeFile: event.target.value,
            }))
          }
          placeholder="/Users/krisarmstrong/excludes.txt"
          type="text"
          value={scanOptions.excludeFile}
        />
      </label>
    </>
  );
}
