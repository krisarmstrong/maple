import {
  isVerbosityMode,
  isVersionMode,
  type ScanOptions,
  verbosityModes,
  versionModes,
} from "../../core/scan-options";
import { SectionHeading } from "./SectionHeading";

interface PortsOptionsProps {
  scanOptions: ScanOptions;
  onChange: (updater: (options: ScanOptions) => ScanOptions) => void;
}

export function PortsOptions({ scanOptions, onChange }: PortsOptionsProps): React.JSX.Element {
  return (
    <>
      <SectionHeading
        title="Ports and detail"
        hint="Port selection plus service-version and output detail."
      />
      <label>
        <span>Version detail</span>
        <select
          aria-label="Version detail"
          value={scanOptions.versionMode}
          onChange={(event) => {
            const value = event.target.value;
            if (isVersionMode(value)) {
              onChange((current) => ({
                ...current,
                serviceDetection: value === "" ? current.serviceDetection : true,
                versionMode: value,
                versionIntensity: value === "" ? current.versionIntensity : "",
              }));
            }
          }}
        >
          {versionModes.map((mode) => (
            <option key={mode.value || "default"} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Version intensity</span>
        <input
          aria-label="Version intensity"
          disabled={scanOptions.versionMode !== ""}
          max={9}
          min={0}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              serviceDetection: event.target.value === "" ? current.serviceDetection : true,
              versionIntensity: event.target.value,
            }))
          }
          placeholder="0-9"
          type="number"
          value={scanOptions.versionIntensity}
        />
      </label>
      <label>
        <span>Output detail</span>
        <select
          aria-label="Output detail"
          value={scanOptions.verbosityMode}
          onChange={(event) => {
            const value = event.target.value;
            if (isVerbosityMode(value)) {
              onChange((current) => ({ ...current, verbosityMode: value }));
            }
          }}
        >
          {verbosityModes.map((mode) => (
            <option key={mode.value || "default"} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Ports</span>
        <input
          disabled={scanOptions.allPorts || scanOptions.fastScan}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              ports: event.target.value,
              topPorts: 0,
            }))
          }
          placeholder="22,80,443 or T:80,U:53"
          type="text"
          value={scanOptions.ports}
        />
      </label>
      <label>
        <span>Top ports</span>
        <input
          disabled={scanOptions.allPorts || scanOptions.fastScan || scanOptions.ports.trim() !== ""}
          min={1}
          max={1000}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              topPorts: Number(event.target.value),
              ports: "",
            }))
          }
          placeholder="100"
          type="number"
          value={scanOptions.topPorts === 0 ? "" : scanOptions.topPorts}
        />
      </label>
      <label>
        <input
          checked={scanOptions.allPorts}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              allPorts: event.target.checked,
              fastScan: event.target.checked ? false : current.fastScan,
              ports: "",
              topPorts: 0,
            }))
          }
          type="checkbox"
        />
        <span>All ports</span>
      </label>
      <label>
        <input
          checked={scanOptions.fastScan}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              fastScan: event.target.checked,
              allPorts: event.target.checked ? false : current.allPorts,
              ports: "",
              topPorts: 0,
            }))
          }
          type="checkbox"
        />
        <span>Fast scan (-F, top 100 ports)</span>
      </label>
      <label>
        <span>Exclude ports</span>
        <input
          aria-label="Exclude ports"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              excludePorts: event.target.value,
            }))
          }
          placeholder="22,80,443"
          type="text"
          value={scanOptions.excludePorts}
        />
      </label>
    </>
  );
}
