import type { ScanOptions } from "../../core/scan-options";

interface EvasionOptionsProps {
  scanOptions: ScanOptions;
  onChange: (updater: (options: ScanOptions) => ScanOptions) => void;
}

export function EvasionOptions({ scanOptions, onChange }: EvasionOptionsProps): React.JSX.Element {
  return (
    <>
      <h4 className="option-section-heading">Packet shaping</h4>
      <label>
        <span>Custom MTU</span>
        <input
          disabled={scanOptions.fragmentPackets}
          max="1500"
          min="8"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              mtu: event.target.value === "" ? 0 : Number(event.target.value),
            }))
          }
          placeholder="24"
          step="8"
          type="number"
          value={scanOptions.mtu === 0 ? "" : scanOptions.mtu}
        />
      </label>
      <label>
        <input
          checked={scanOptions.fragmentPackets}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              fragmentPackets: event.target.checked,
              mtu: event.target.checked ? 0 : current.mtu,
            }))
          }
          type="checkbox"
        />
        <span>Fragment packets</span>
      </label>
      <label>
        <span>Data length</span>
        <input
          max="4096"
          min="1"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              dataLength: event.target.value === "" ? 0 : Number(event.target.value),
            }))
          }
          placeholder="24"
          type="number"
          value={scanOptions.dataLength === 0 ? "" : scanOptions.dataLength}
        />
      </label>
      <label>
        <span>Source port</span>
        <input
          max="65535"
          min="1"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              sourcePort: event.target.value,
            }))
          }
          placeholder="53"
          type="number"
          value={scanOptions.sourcePort}
        />
      </label>
      <h4 className="option-section-heading">Identity and evasion</h4>
      <label>
        <span>Decoys</span>
        <input
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              decoys: event.target.value,
            }))
          }
          placeholder="ME,198.51.100.10,RND:2"
          type="text"
          value={scanOptions.decoys}
        />
      </label>
      <label>
        <span>Source address</span>
        <input
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              sourceAddress: event.target.value,
            }))
          }
          placeholder="192.0.2.20"
          type="text"
          value={scanOptions.sourceAddress}
        />
      </label>
      <label>
        <span>Network interface</span>
        <input
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              networkInterface: event.target.value,
            }))
          }
          placeholder="en0"
          type="text"
          value={scanOptions.networkInterface}
        />
      </label>
      <label>
        <span>Spoof MAC</span>
        <input
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              spoofMac: event.target.value,
            }))
          }
          placeholder="0 or 02:11:22:33:44:55"
          type="text"
          value={scanOptions.spoofMac}
        />
      </label>
    </>
  );
}
