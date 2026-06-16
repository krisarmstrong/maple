import type { ScanOptions } from "../../core/scan-options";

interface BehaviorOptionsProps {
  scanOptions: ScanOptions;
  onChange: (updater: (options: ScanOptions) => ScanOptions) => void;
}

export function BehaviorOptions({
  scanOptions,
  onChange,
}: BehaviorOptionsProps): React.JSX.Element {
  return (
    <fieldset className="option-toggle-grid">
      <legend>Scan behavior</legend>
      <label>
        <input
          checked={scanOptions.icmpEchoProbe}
          disabled={scanOptions.discoveryMode === "skip"}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              icmpEchoProbe: event.target.checked,
            }))
          }
          type="checkbox"
        />
        <span>ICMP echo probe</span>
      </label>
      <label>
        <input
          checked={scanOptions.icmpTimestamp}
          disabled={scanOptions.discoveryMode === "skip"}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              icmpTimestamp: event.target.checked,
            }))
          }
          type="checkbox"
        />
        <span>ICMP timestamp probe</span>
      </label>
      <label>
        <input
          checked={scanOptions.icmpNetmask}
          disabled={scanOptions.discoveryMode === "skip"}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              icmpNetmask: event.target.checked,
            }))
          }
          type="checkbox"
        />
        <span>ICMP netmask probe</span>
      </label>
      <label>
        <input
          checked={scanOptions.serviceDetection}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              serviceDetection: event.target.checked,
              versionMode: event.target.checked ? current.versionMode : "",
              versionIntensity: event.target.checked ? current.versionIntensity : "",
            }))
          }
          type="checkbox"
        />
        <span>Service detection</span>
      </label>
      <label>
        <input
          checked={scanOptions.ipv6}
          onChange={(event) => onChange((current) => ({ ...current, ipv6: event.target.checked }))}
          type="checkbox"
        />
        <span>IPv6</span>
      </label>
      <label>
        <input
          checked={scanOptions.osDetection}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              osDetection: event.target.checked,
            }))
          }
          type="checkbox"
        />
        <span>OS detection</span>
      </label>
      <label>
        <input
          checked={scanOptions.traceroute}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              traceroute: event.target.checked,
            }))
          }
          type="checkbox"
        />
        <span>Traceroute</span>
      </label>
      <label>
        <input
          checked={scanOptions.reason}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              reason: event.target.checked,
            }))
          }
          type="checkbox"
        />
        <span>Show reasons</span>
      </label>
      <label>
        <input
          checked={scanOptions.openOnly}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              openOnly: event.target.checked,
            }))
          }
          type="checkbox"
        />
        <span>Only open ports</span>
      </label>
      <label>
        <input
          checked={scanOptions.packetTrace}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              packetTrace: event.target.checked,
            }))
          }
          type="checkbox"
        />
        <span>Packet trace</span>
      </label>
    </fieldset>
  );
}
