import { useEffect, useState } from "react";
import { buildScanScripts, type NSECategory, nseCategories } from "../core/nse-scripts";
import {
  defaultScanOptions,
  discoveryModes,
  dnsModes,
  isDiscoveryMode,
  isDNSMode,
  isScanTechnique,
  isTimingTemplate,
  isVerbosityMode,
  isVersionMode,
  type ScanOptions,
  scanTechniques,
  timingTemplates,
  verbosityModes,
  versionModes,
} from "../core/scan-options";
import { findProfile, type ScanProfileID, scanProfiles } from "../core/scan-profiles";
import { scanScope } from "../core/scan-scope";
import {
  type TargetModeID,
  targetModeHelp,
  targetModeInputLabel,
  targetModePlaceholder,
  targetModes,
} from "../core/target-modes";
import { summarizeTargets } from "../core/target-summary";
import { cancelScan, onScanEvent, previewScanCommand, startScan } from "../services/scan-service";
import { ProfileSummary } from "./ProfileSummary";
import {
  handleScanEvent,
  type LogEntry,
  makeRequest,
  messageForInvalidTargets,
  type ScanStatus,
  scanStatusLabel,
  updateProfile,
  updateTargets,
} from "./scan-workspace-state";

interface ScanWorkspaceProps {
  nmapPath?: string;
  onScanFinished?: () => void;
}

type ScanPanel = "configure" | "options" | "scripts" | "output";

export function ScanWorkspace({ nmapPath, onScanFinished }: ScanWorkspaceProps): React.JSX.Element {
  const [targets, setTargets] = useState("");
  const [targetModeId, setTargetModeId] = useState<TargetModeID>("single");
  const [profileId, setProfileId] = useState<ScanProfileID>("connect");
  const [scanOptions, setScanOptions] = useState<ScanOptions>(defaultScanOptions);
  const [scriptCategories, setScriptCategories] = useState<NSECategory[]>([]);
  const [scriptNames, setScriptNames] = useState("");
  const [customScriptPaths, setCustomScriptPaths] = useState("");
  const [scriptArgs, setScriptArgs] = useState("");
  const [scriptArgsFile, setScriptArgsFile] = useState("");
  const [activePanel, setActivePanel] = useState<ScanPanel>("configure");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const targetSummary = summarizeTargets(targets);
  const selectedProfile = findProfile(profileId);
  const scope = scanScope(profileId, targets);
  const scripts = buildScanScripts(scriptCategories, scriptNames, customScriptPaths);

  useEffect(
    () =>
      onScanEvent((event) => {
        if (event.type === "started") {
          setActivePanel("output");
        }
        handleScanEvent(event, { setRunning, setLog, setStatus, onScanFinished });
      }),
    [onScanFinished],
  );

  async function previewCommand(): Promise<void> {
    const request = makeRequest(
      profileId,
      targetModeId,
      targets,
      nmapPath,
      scripts,
      scanOptions,
      scriptArgs,
      scriptArgsFile,
    );
    if (request === undefined) {
      setActivePanel("configure");
      setError(messageForInvalidTargets(targetModeId, targets));
      return;
    }
    setError("");
    try {
      setPreview(await previewScanCommand(request));
      setActivePanel("output");
    } catch (caught) {
      setActivePanel("configure");
      setError(errorMessage(caught));
    }
  }

  async function runScan(): Promise<void> {
    const request = makeRequest(
      profileId,
      targetModeId,
      targets,
      nmapPath,
      scripts,
      scanOptions,
      scriptArgs,
      scriptArgsFile,
    );
    if (request === undefined) {
      setActivePanel("configure");
      setError(messageForInvalidTargets(targetModeId, targets));
      return;
    }
    setError("");
    setLog([]);
    setStatus("running");
    setActivePanel("output");
    try {
      await startScan(request);
    } catch (caught) {
      setRunning(false);
      setStatus("failed");
      setActivePanel("configure");
      setError(errorMessage(caught));
    }
  }

  function updateTargetMode(modeId: TargetModeID): void {
    setTargetModeId(modeId);
    setPreview([]);
    setError("");
  }

  function updateScriptCategory(category: NSECategory, checked: boolean): void {
    setScriptCategories((current) =>
      checked
        ? [...current, category].sort()
        : current.filter((candidate) => candidate !== category),
    );
    setPreview([]);
  }

  function updateScanOptions(updater: (options: ScanOptions) => ScanOptions): void {
    setScanOptions((current) => updater(current));
    setPreview([]);
  }

  return (
    <section className="workspace scan-workspace">
      <div className="workspace-header">
        <div>
          <h2>New Scan</h2>
          <p>Choose a safe profile, validate targets, preview argv, then run Nmap locally.</p>
        </div>
        <div className="scan-actions">
          <button
            disabled={nmapPath === undefined}
            onClick={() => void previewCommand()}
            type="button"
          >
            Preview
          </button>
          <button
            disabled={nmapPath === undefined || running}
            onClick={() => void runScan()}
            type="button"
          >
            Run Scan
          </button>
          <button disabled={!running} onClick={() => void cancelScan()} type="button">
            Cancel
          </button>
        </div>
      </div>

      <nav className="scan-panel-tabs" aria-label="Scan setup sections">
        <ScanPanelButton
          activePanel={activePanel}
          id="configure"
          label="Configure"
          onSelect={setActivePanel}
        />
        <ScanPanelButton
          activePanel={activePanel}
          id="options"
          label="Options"
          onSelect={setActivePanel}
        />
        <ScanPanelButton
          activePanel={activePanel}
          id="scripts"
          label="Scripts"
          onSelect={setActivePanel}
        />
        <ScanPanelButton
          activePanel={activePanel}
          id="output"
          label="Output"
          onSelect={setActivePanel}
        />
      </nav>

      {error === "" ? null : <p className="error">{error}</p>}

      {activePanel === "configure" ? (
        <div className="scan-panel">
          <div className="scan-grid">
            <label>
              <span>Profile</span>
              <select
                value={profileId}
                onChange={(event) => updateProfile(event.target.value, setProfileId, setPreview)}
              >
                {scanProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="target-input">
              <fieldset className="target-mode-picker">
                <legend>Target type</legend>
                {targetModes.map((mode) => (
                  <label key={mode.id}>
                    <input
                      checked={targetModeId === mode.id}
                      name="target-mode"
                      onChange={() => updateTargetMode(mode.id)}
                      type="radio"
                    />
                    <span>{mode.label}</span>
                  </label>
                ))}
              </fieldset>
              <label>
                <span>{targetModeInputLabel(targetModeId)}</span>
                <textarea
                  aria-label="Targets"
                  onChange={(event) => updateTargets(event.target.value, setTargets, setPreview)}
                  placeholder={targetModePlaceholder(targetModeId)}
                  rows={5}
                  value={targets}
                />
              </label>
              <p className="target-mode-help">{targetModeHelp(targetModeId)}</p>
              <p className="target-mode-example">
                Example: <code>{targetModePlaceholder(targetModeId)}</code>
              </p>
            </div>
          </div>
          <ProfileSummary profile={selectedProfile} />
          {targetSummary === "" ? null : <p className="target-summary">{targetSummary}</p>}
          {scope === undefined ? null : (
            <div className="scan-scope">
              <span>{scope.label}</span>
              {scope.warning === undefined ? null : <strong>{scope.warning}</strong>}
            </div>
          )}
        </div>
      ) : null}

      {activePanel === "options" ? (
        <div className="scan-panel options-panel">
          <div>
            <h3>Nmap options</h3>
            <p className="target-mode-help">
              Add common Nmap switches as structured choices. Maple still builds argv directly.
            </p>
          </div>
          <div className="options-grid">
            <label>
              <span>Scan technique</span>
              <select
                aria-label="Scan technique"
                value={scanOptions.scanTechnique}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isScanTechnique(value)) {
                    updateScanOptions((current) => ({ ...current, scanTechnique: value }));
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
                    updateScanOptions((current) => ({ ...current, discoveryMode: value }));
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
                    updateScanOptions((current) => ({ ...current, timingTemplate: value }));
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
                    updateScanOptions((current) => ({ ...current, dnsMode: value }));
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
              <span>Version detail</span>
              <select
                aria-label="Version detail"
                value={scanOptions.versionMode}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isVersionMode(value)) {
                    updateScanOptions((current) => ({
                      ...current,
                      serviceDetection: value === "" ? current.serviceDetection : true,
                      versionMode: value,
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
              <span>Output detail</span>
              <select
                aria-label="Output detail"
                value={scanOptions.verbosityMode}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isVerbosityMode(value)) {
                    updateScanOptions((current) => ({ ...current, verbosityMode: value }));
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
                disabled={scanOptions.allPorts}
                onChange={(event) =>
                  updateScanOptions((current) => ({
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
                disabled={scanOptions.allPorts || scanOptions.ports.trim() !== ""}
                min={1}
                max={1000}
                onChange={(event) =>
                  updateScanOptions((current) => ({
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
              <span>Minimum packet rate</span>
              <input
                min={1}
                max={1000000}
                onChange={(event) =>
                  updateScanOptions((current) => ({
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
              <span>Maximum retries</span>
              <input
                min={0}
                max={10}
                onChange={(event) =>
                  updateScanOptions((current) => ({
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
                  updateScanOptions((current) => ({
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
              <span>Stats interval</span>
              <input
                onChange={(event) =>
                  updateScanOptions((current) => ({
                    ...current,
                    statsEvery: event.target.value,
                  }))
                }
                placeholder="10s"
                type="text"
                value={scanOptions.statsEvery}
              />
            </label>
          </div>
          <fieldset className="option-toggle-grid">
            <legend>Scan behavior</legend>
            <label>
              <input
                checked={scanOptions.allPorts}
                onChange={(event) =>
                  updateScanOptions((current) => ({
                    ...current,
                    allPorts: event.target.checked,
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
                checked={scanOptions.serviceDetection}
                onChange={(event) =>
                  updateScanOptions((current) => ({
                    ...current,
                    serviceDetection: event.target.checked,
                    versionMode: event.target.checked ? current.versionMode : "",
                  }))
                }
                type="checkbox"
              />
              <span>Service detection</span>
            </label>
            <label>
              <input
                checked={scanOptions.ipv6}
                onChange={(event) =>
                  updateScanOptions((current) => ({ ...current, ipv6: event.target.checked }))
                }
                type="checkbox"
              />
              <span>IPv6</span>
            </label>
            <label>
              <input
                checked={scanOptions.osDetection}
                onChange={(event) =>
                  updateScanOptions((current) => ({
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
                  updateScanOptions((current) => ({
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
                  updateScanOptions((current) => ({
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
                  updateScanOptions((current) => ({
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
                  updateScanOptions((current) => ({
                    ...current,
                    packetTrace: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              <span>Packet trace</span>
            </label>
          </fieldset>
          {scanOptions.osDetection ? (
            <p className="option-warning">
              OS detection often requires elevated privileges on macOS, Linux, and Windows.
            </p>
          ) : null}
          {scanOptions.scanTechnique === "syn" ? (
            <p className="option-warning">
              TCP SYN scans usually require elevated privileges on macOS, Linux, and Windows.
            </p>
          ) : null}
          {scanOptions.scanTechnique === "udp" ? (
            <p className="option-warning">
              UDP scans can be slow and may need elevated privileges for best results.
            </p>
          ) : null}
          {scanOptions.discoveryMode === "skip" ? (
            <p className="option-warning">
              Skip host discovery treats every target as online and can make large scans slower.
            </p>
          ) : null}
          {scanOptions.discoveryMode === "ping" ? (
            <p className="option-warning">
              Ping discovery only finds live hosts; it does not enumerate ports.
            </p>
          ) : null}
          {scanOptions.minRate > 0 ? (
            <p className="option-warning">
              Minimum packet rate can speed scans up, but aggressive values may reduce accuracy.
            </p>
          ) : null}
          {scanOptions.packetTrace ? (
            <p className="option-warning">
              Packet trace emits detailed packet logs and can make output noisy.
            </p>
          ) : null}
        </div>
      ) : null}

      {activePanel === "scripts" ? (
        <div className="scan-panel scripts-panel">
          <div>
            <h3>NSE scripts</h3>
            <p className="target-mode-help">
              Add known categories or absolute custom script files without typing raw shell
              commands.
            </p>
          </div>
          <fieldset className="script-category-picker">
            <legend>Categories</legend>
            {nseCategories.map((category) => (
              <label key={category}>
                <input
                  checked={scriptCategories.includes(category)}
                  onChange={(event) => updateScriptCategory(category, event.target.checked)}
                  type="checkbox"
                />
                <span>{category}</span>
              </label>
            ))}
          </fieldset>
          <label className="custom-script-paths">
            <span>Built-in script names</span>
            <textarea
              onChange={(event) => {
                setScriptNames(event.target.value);
                setPreview([]);
              }}
              placeholder="http-title&#10;ssl-enum-ciphers"
              rows={3}
              value={scriptNames}
            />
          </label>
          <label className="custom-script-paths">
            <span>Custom .nse script files</span>
            <textarea
              onChange={(event) => {
                setCustomScriptPaths(event.target.value);
                setPreview([]);
              }}
              placeholder="/Users/you/nmap-scripts/custom-check.nse"
              rows={3}
              value={customScriptPaths}
            />
          </label>
          <label className="custom-script-paths">
            <span>Script arguments</span>
            <input
              onChange={(event) => {
                setScriptArgs(event.target.value);
                setPreview([]);
              }}
              placeholder="http.useragent=Maple,creds.global=/Users/you/creds.txt"
              type="text"
              value={scriptArgs}
            />
          </label>
          <label className="custom-script-paths">
            <span>Script arguments file</span>
            <input
              onChange={(event) => {
                setScriptArgsFile(event.target.value);
                setPreview([]);
              }}
              placeholder="/Users/you/nmap-scripts/script-args.txt"
              type="text"
              value={scriptArgsFile}
            />
          </label>
          <p className="target-mode-help">
            Add one absolute custom script path per line. Maple passes scripts as argv values and
            Nmap runs them locally.
          </p>
        </div>
      ) : null}

      {activePanel === "output" ? (
        <div className="scan-panel output-panel">
          {status === "idle" ? null : <p className="scan-status">{scanStatusLabel(status)}</p>}
          {preview.length === 0 ? (
            <p className="muted">Preview a scan to inspect the exact argv before execution.</p>
          ) : (
            <code className="command-preview">{preview.join(" ")}</code>
          )}
          <output className="scan-log" data-testid="scan-log">
            {log.map((entry) => (
              <span key={entry.id}>{entry.text}</span>
            ))}
          </output>
        </div>
      ) : null}
    </section>
  );
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : "Unable to start scan.";
}

interface ScanPanelButtonProps {
  activePanel: ScanPanel;
  id: ScanPanel;
  label: string;
  onSelect: (panel: ScanPanel) => void;
}

function ScanPanelButton({
  activePanel,
  id,
  label,
  onSelect,
}: ScanPanelButtonProps): React.JSX.Element {
  return (
    <button
      aria-current={activePanel === id ? "page" : undefined}
      className="scan-panel-tab"
      type="button"
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}
