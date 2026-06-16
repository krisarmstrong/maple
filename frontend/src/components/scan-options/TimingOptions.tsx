import type { ScanOptions } from "../../core/scan-options";

interface TimingOptionsProps {
  scanOptions: ScanOptions;
  onChange: (updater: (options: ScanOptions) => ScanOptions) => void;
}

export function TimingOptions({ scanOptions, onChange }: TimingOptionsProps): React.JSX.Element {
  return (
    <>
      <h4 className="option-section-heading">Timing and performance</h4>
      <label>
        <span>Minimum packet rate</span>
        <input
          min={1}
          max={1000000}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              minRate: event.target.value === "" ? 0 : Number(event.target.value),
            }))
          }
          placeholder="500"
          type="number"
          value={scanOptions.minRate === 0 ? "" : scanOptions.minRate}
        />
      </label>
      <label>
        <span>Maximum packet rate</span>
        <input
          min={1}
          max={1000000}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              maxRate: event.target.value === "" ? 0 : Number(event.target.value),
            }))
          }
          placeholder="2000"
          type="number"
          value={scanOptions.maxRate === 0 ? "" : scanOptions.maxRate}
        />
      </label>
      <label>
        <span>Maximum retries</span>
        <input
          min={0}
          max={10}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              maxRetries: event.target.value,
            }))
          }
          placeholder="2"
          type="number"
          value={scanOptions.maxRetries}
        />
      </label>
      <label>
        <span>Host timeout</span>
        <input
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              hostTimeout: event.target.value,
            }))
          }
          placeholder="30m"
          type="text"
          value={scanOptions.hostTimeout}
        />
      </label>
      <label>
        <span>Max RTT timeout</span>
        <input
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              maxRttTimeout: event.target.value,
            }))
          }
          placeholder="2s"
          type="text"
          value={scanOptions.maxRttTimeout}
        />
      </label>
      <label>
        <span>Stats interval</span>
        <input
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              statsEvery: event.target.value,
            }))
          }
          placeholder="10s"
          type="text"
          value={scanOptions.statsEvery}
        />
      </label>
      <label>
        <span>Scan delay</span>
        <input
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              scanDelay: event.target.value,
            }))
          }
          placeholder="50ms"
          type="text"
          value={scanOptions.scanDelay}
        />
      </label>
      <label>
        <span>Max scan delay</span>
        <input
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              maxScanDelay: event.target.value,
            }))
          }
          placeholder="1s"
          type="text"
          value={scanOptions.maxScanDelay}
        />
      </label>
      <label>
        <span>Minimum parallelism</span>
        <input
          max="1000"
          min="1"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              minParallelism: event.target.value === "" ? 0 : Number(event.target.value),
            }))
          }
          placeholder="4"
          type="number"
          value={scanOptions.minParallelism === 0 ? "" : scanOptions.minParallelism}
        />
      </label>
      <label>
        <span>Minimum host group</span>
        <input
          max="100000"
          min="1"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              minHostGroup: event.target.value === "" ? 0 : Number(event.target.value),
            }))
          }
          placeholder="8"
          type="number"
          value={scanOptions.minHostGroup === 0 ? "" : scanOptions.minHostGroup}
        />
      </label>
      <label>
        <span>Maximum host group</span>
        <input
          max="100000"
          min="1"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              maxHostGroup: event.target.value === "" ? 0 : Number(event.target.value),
            }))
          }
          placeholder="256"
          type="number"
          value={scanOptions.maxHostGroup === 0 ? "" : scanOptions.maxHostGroup}
        />
      </label>
      <label>
        <span>Maximum parallelism</span>
        <input
          max="1000"
          min="1"
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              maxParallelism: event.target.value === "" ? 0 : Number(event.target.value),
            }))
          }
          placeholder="64"
          type="number"
          value={scanOptions.maxParallelism === 0 ? "" : scanOptions.maxParallelism}
        />
      </label>
    </>
  );
}
