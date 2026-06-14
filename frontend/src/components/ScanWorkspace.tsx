import { useEffect, useState } from "react";
import {
  buildScanScripts,
  type NSECategory,
  nseCategories,
  popularNSEScripts,
} from "../core/nse-scripts";
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
import { loadSavedPresets, makePresetID, type ScanPreset, savePreset } from "../core/scan-presets";
import { findProfile, type ScanProfileID, scanProfiles } from "../core/scan-profiles";
import { scanScope } from "../core/scan-scope";
import { parseTargets } from "../core/scan-targets";
import {
  type TargetModeID,
  targetModeAcceptedSyntax,
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
type OptionGroup = "shape" | "ports" | "timing" | "evasion" | "behavior";

export function ScanWorkspace({ nmapPath, onScanFinished }: ScanWorkspaceProps): React.JSX.Element {
  const [targets, setTargets] = useState("");
  const [targetModeId, setTargetModeId] = useState<TargetModeID>("single");
  const [profileId, setProfileId] = useState<ScanProfileID>("connect");
  const [scanOptions, setScanOptions] = useState<ScanOptions>(defaultScanOptions);
  const [scriptCategories, setScriptCategories] = useState<NSECategory[]>([]);
  const [scriptNames, setScriptNames] = useState("");
  const [customScriptPaths, setCustomScriptPaths] = useState("");
  const [customScriptDirectories, setCustomScriptDirectories] = useState("");
  const [scriptSearch, setScriptSearch] = useState("");
  const [scriptArgs, setScriptArgs] = useState("");
  const [scriptArgsFile, setScriptArgsFile] = useState("");
  const [savedPresets, setSavedPresets] = useState<ScanPreset[]>(() => loadPresetsFromStorage());
  const [presetName, setPresetName] = useState("");
  const [activePanel, setActivePanel] = useState<ScanPanel>("configure");
  const [activeOptionGroup, setActiveOptionGroup] = useState<OptionGroup>("shape");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const selectedProfile = findProfile(profileId);
  const scope = scanScope(profileId, targets);
  const parsedTargetSummary = targetBuilderSummary(targets);
  const scripts = buildScanScripts(
    scriptCategories,
    scriptNames,
    customScriptPaths,
    customScriptDirectories,
  );
  const visiblePopularScripts = popularNSEScripts.filter((script) =>
    script.toLowerCase().includes(scriptSearch.trim().toLowerCase()),
  );
  const selectedScriptNames = scriptNameLines(scriptNames);
  const selectedScriptValues = [
    ...scriptCategories.map((category) => ({ id: `category:${category}`, label: category })),
    ...selectedScriptNames.map((script) => ({ id: `name:${script}`, label: script })),
    ...lineValues(customScriptPaths).map((script) => ({ id: `path:${script}`, label: script })),
    ...lineValues(customScriptDirectories).map((script) => ({
      id: `directory:${script}`,
      label: script,
    })),
  ];
  const previewTokens = commandTokens(preview);

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
    const optionsMessage = messageForInvalidScanOptions(scanOptions);
    if (optionsMessage !== "") {
      setActivePanel("options");
      setError(optionsMessage);
      return;
    }
    setError("");
    try {
      setPreview(await previewScanCommand(request));
      setStatus("previewed");
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
    const optionsMessage = messageForInvalidScanOptions(scanOptions);
    if (optionsMessage !== "") {
      setActivePanel("options");
      setError(optionsMessage);
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

  function saveCurrentPreset(): void {
    const name = presetName.trim();
    if (name === "") {
      return;
    }
    const preset: ScanPreset = {
      id: makePresetID(name),
      name,
      profileId,
      options: scanOptions,
      scriptCategories,
      scriptNames,
      customScriptPaths,
      customScriptDirectories,
      scriptArgs,
      scriptArgsFile,
    };
    setSavedPresets((current) => {
      const storage = browserStorage();
      if (storage === undefined) {
        return [preset, ...current.filter((candidate) => candidate.id !== preset.id)];
      }
      return savePreset(storage, current, preset);
    });
    setPresetName("");
  }

  function applyPreset(presetID: string): void {
    const preset = savedPresets.find((candidate) => candidate.id === presetID);
    if (preset === undefined) {
      return;
    }
    setProfileId(preset.profileId);
    setScanOptions(preset.options);
    setScriptCategories(preset.scriptCategories);
    setScriptNames(preset.scriptNames);
    setCustomScriptPaths(preset.customScriptPaths);
    setCustomScriptDirectories(preset.customScriptDirectories);
    setScriptArgs(preset.scriptArgs);
    setScriptArgsFile(preset.scriptArgsFile);
    setPreview([]);
    setError("");
  }

  function updateNamedScript(name: string, checked: boolean): void {
    const current = new Set(scriptNameLines(scriptNames));
    if (checked) {
      current.add(name);
    } else {
      current.delete(name);
    }
    setScriptNames([...current].sort().join("\n"));
    setPreview([]);
  }

  function removeSelectedScript(id: string): void {
    const [kind, value] = splitSelectedScriptID(id);
    if (kind === "category" && isNSECategory(value)) {
      setScriptCategories((current) => current.filter((category) => category !== value));
    }
    if (kind === "name") {
      setScriptNames(
        scriptNameLines(scriptNames)
          .filter((script) => script !== value)
          .join("\n"),
      );
    }
    if (kind === "path") {
      setCustomScriptPaths(
        lineValues(customScriptPaths)
          .filter((script) => script !== value)
          .join("\n"),
      );
    }
    if (kind === "directory") {
      setCustomScriptDirectories(
        lineValues(customScriptDirectories)
          .filter((script) => script !== value)
          .join("\n"),
      );
    }
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

      <section aria-label="Scan context" className="scan-context-strip">
        <h3>Scan context</h3>
        <ContextMetric label="Profile" value={selectedProfile.name} />
        <ContextMetric label="Target type" value={targetModeContextLabel(targetModeId)} />
        <ContextMetric label="Targets" value={parsedTargetSummary.parsedTargets} />
        <ContextMetric label="Status" value={scanStatusLabel(status)} />
      </section>

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
          <div className="preset-bar">
            <label>
              <span>Saved preset</span>
              <select
                aria-label="Saved preset"
                onChange={(event) => applyPreset(event.target.value)}
                value=""
              >
                <option value="">Choose preset</option>
                {savedPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Preset name</span>
              <input
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Web TLS check"
                type="text"
                value={presetName}
              />
            </label>
            <button disabled={presetName.trim() === ""} onClick={saveCurrentPreset} type="button">
              Save Preset
            </button>
          </div>
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
              <div>
                <h3>Target Builder</h3>
                <p className="target-mode-help">
                  Choose the target shape first so Maple can validate the syntax before Nmap runs.
                </p>
              </div>
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
              <div className="target-builder-summary">
                <div>
                  <strong>Accepted syntax</strong>
                  <span>{targetModeAcceptedSyntax(targetModeId)}</span>
                </div>
                <div>
                  <strong>Parsed targets</strong>
                  <span>{parsedTargetSummary.parsedTargets}</span>
                </div>
                <div>
                  <strong>Estimated addresses</strong>
                  <span>{parsedTargetSummary.estimatedAddresses}</span>
                </div>
              </div>
            </div>
          </div>
          <ProfileSummary profile={selectedProfile} />
          {scope?.warning === undefined ? null : <p className="scan-scope">{scope.warning}</p>}
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
          <fieldset className="option-group-tabs">
            <legend>Option groups</legend>
            <OptionGroupTab
              activeGroup={activeOptionGroup}
              group="shape"
              label="Scan shape"
              onSelect={setActiveOptionGroup}
            />
            <OptionGroupTab
              activeGroup={activeOptionGroup}
              group="ports"
              label="Ports"
              onSelect={setActiveOptionGroup}
            />
            <OptionGroupTab
              activeGroup={activeOptionGroup}
              group="timing"
              label="Timing"
              onSelect={setActiveOptionGroup}
            />
            <OptionGroupTab
              activeGroup={activeOptionGroup}
              group="evasion"
              label="Evasion"
              onSelect={setActiveOptionGroup}
            />
            <OptionGroupTab
              activeGroup={activeOptionGroup}
              group="behavior"
              label="Behavior"
              onSelect={setActiveOptionGroup}
            />
          </fieldset>
          <div className="options-grid">
            {activeOptionGroup === "shape" ? (
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
                        updateScanOptions((current) => {
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
                <h4 className="option-section-heading">Discovery probes</h4>
                <label>
                  <span>TCP SYN probe ports</span>
                  <input
                    aria-label="TCP SYN probe ports"
                    disabled={scanOptions.discoveryMode === "skip"}
                    onChange={(event) =>
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
            ) : null}
            {activeOptionGroup === "ports" ? (
              <>
                <h4 className="option-section-heading">Ports and detail</h4>
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
              </>
            ) : null}
            {activeOptionGroup === "timing" ? (
              <>
                <h4 className="option-section-heading">Timing and performance</h4>
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
                  <span>Maximum packet rate</span>
                  <input
                    min={1}
                    max={1000000}
                    onChange={(event) =>
                      updateScanOptions((current) => ({
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
                  <span>Max RTT timeout</span>
                  <input
                    onChange={(event) =>
                      updateScanOptions((current) => ({
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
                <label>
                  <span>Scan delay</span>
                  <input
                    onChange={(event) =>
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
            ) : null}
            {activeOptionGroup === "evasion" ? (
              <>
                <h4 className="option-section-heading">Packet shaping</h4>
                <label>
                  <span>Custom MTU</span>
                  <input
                    disabled={scanOptions.fragmentPackets}
                    max="1500"
                    min="8"
                    onChange={(event) =>
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
            ) : null}
          </div>
          {activeOptionGroup === "behavior" ? (
            <fieldset className="option-toggle-grid">
              <legend>Scan behavior</legend>
              <label>
                <input
                  checked={scanOptions.icmpEchoProbe}
                  disabled={scanOptions.discoveryMode === "skip"}
                  onChange={(event) =>
                    updateScanOptions((current) => ({
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
                    updateScanOptions((current) => ({
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
                    updateScanOptions((current) => ({
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
          ) : null}
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
          {isSpecializedScanTechnique(scanOptions.scanTechnique) ? (
            <p className="option-warning">
              ACK, Window, Maimon, NULL, FIN, Xmas, SCTP, and IP protocol scans are advanced
              techniques that often require elevated privileges and careful authorization.
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
          {hasDiscoveryProbeOptions(scanOptions) ? (
            <p className="option-warning">
              Discovery probes tune host reachability checks before the scan starts.
            </p>
          ) : null}
          {scanOptions.minRate > 0 ? (
            <p className="option-warning">
              Minimum packet rate can speed scans up, but aggressive values may reduce accuracy.
            </p>
          ) : null}
          {scanOptions.scanDelay.trim() !== "" || scanOptions.maxScanDelay.trim() !== "" ? (
            <p className="option-warning">
              Scan delay settings slow probe cadence and can substantially extend scan time.
            </p>
          ) : null}
          {scanOptions.minParallelism > 0 || scanOptions.maxParallelism > 0 ? (
            <p className="option-warning">
              Parallelism bounds can change scan speed and accuracy on lossy networks.
            </p>
          ) : null}
          {hasPacketShapingOptions(scanOptions) ? (
            <p className="option-warning">
              Packet shaping can change scan accuracy and may violate network policy without
              authorization.
            </p>
          ) : null}
          {hasIdentityOptions(scanOptions) ? (
            <p className="option-warning">
              Decoys, source address, interface, and MAC spoofing can impersonate traffic and
              require explicit authorization.
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
                {isRiskyNSECategory(category) ? (
                  <small className="script-risk-label">Use carefully</small>
                ) : null}
              </label>
            ))}
          </fieldset>
          <p className="target-mode-help">May be intrusive, exploit-oriented, or disruptive.</p>
          <label className="custom-script-paths">
            <span>Find built-in scripts</span>
            <input
              onChange={(event) => setScriptSearch(event.target.value)}
              placeholder="http, ssl, smb"
              type="search"
              value={scriptSearch}
            />
          </label>
          <fieldset className="script-category-picker">
            <legend>Popular scripts</legend>
            {visiblePopularScripts.map((script) => (
              <label key={script}>
                <input
                  checked={selectedScriptNames.includes(script)}
                  onChange={(event) => updateNamedScript(script, event.target.checked)}
                  type="checkbox"
                />
                <span>{script}</span>
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
          {selectedScriptValues.length === 0 ? null : (
            <div className="selected-script-list">
              <strong>Selected scripts</strong>
              <div>
                {selectedScriptValues.map((script) => (
                  <button
                    aria-label={`Remove ${script.label}`}
                    className="script-chip"
                    key={script.id}
                    onClick={() => removeSelectedScript(script.id)}
                    type="button"
                  >
                    {script.label}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            <span>Custom script directories</span>
            <textarea
              onChange={(event) => {
                setCustomScriptDirectories(event.target.value);
                setPreview([]);
              }}
              placeholder="/Users/you/nmap-scripts"
              rows={3}
              value={customScriptDirectories}
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
          <section className="output-section">
            <h3>Run status</h3>
            <p className="scan-status">{scanStatusLabel(status)}</p>
            <p className="muted">Raw XML is captured for History exports, not shown here.</p>
          </section>
          <section className="output-section">
            <h3>Preview argv</h3>
            {preview.length === 0 ? (
              <p className="muted">Preview a scan to inspect the exact argv before execution.</p>
            ) : (
              <>
                <ul className="argv-token-list" aria-label="Preview argv tokens">
                  {previewTokens.map((token) => (
                    <li className="argv-token" key={token.id}>
                      {token.value}
                    </li>
                  ))}
                </ul>
                <code className="command-preview">{preview.join(" ")}</code>
              </>
            )}
          </section>
          <section className="output-section">
            <h3>Live log</h3>
            <output className="scan-log" data-testid="scan-log">
              {log.length === 0 ? <span>No live log lines yet.</span> : null}
              {log.map((entry) => (
                <span key={entry.id}>{entry.text}</span>
              ))}
            </output>
          </section>
          <section className="output-section">
            <h3>Diagnostics</h3>
            <p className="muted">Warnings and stderr lines appear in the live log.</p>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function loadPresetsFromStorage(): ScanPreset[] {
  const storage = browserStorage();
  if (storage === undefined) {
    return [];
  }
  try {
    return loadSavedPresets(storage);
  } catch {
    return [];
  }
}

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function targetBuilderSummary(targets: string): {
  parsedTargets: string;
  estimatedAddresses: string;
} {
  const result = parseTargets(targets);
  if (!result.ok) {
    return { parsedTargets: "No target set", estimatedAddresses: "n/a" };
  }
  const scope = scanScope("connect", targets);
  return {
    parsedTargets: summarizeTargets(targets),
    estimatedAddresses: scope?.label ?? "n/a",
  };
}

function targetModeContextLabel(modeID: TargetModeID): string {
  if (modeID === "single") {
    return "Single host/IP";
  }
  if (modeID === "range") {
    return "IPv4 range";
  }
  if (modeID === "subnet") {
    return "Subnet";
  }
  return "Target list";
}

function ContextMetric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <strong>{`${label}: ${value}`}</strong>
    </div>
  );
}

function commandTokens(argv: readonly string[]): Array<{ id: string; value: string }> {
  const seen = new Map<string, number>();
  return argv.map((value) => {
    const count = (seen.get(value) ?? 0) + 1;
    seen.set(value, count);
    return { id: `${value}:${count}`, value };
  });
}

function lineValues(value: string): string[] {
  return value
    .split(/\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function scriptNameLines(value: string): string[] {
  return lineValues(value);
}

function splitSelectedScriptID(id: string): [string, string] {
  const separator = id.indexOf(":");
  if (separator === -1) {
    return ["", id];
  }
  return [id.slice(0, separator), id.slice(separator + 1)];
}

function isNSECategory(value: string): value is NSECategory {
  return nseCategories.includes(value as NSECategory);
}

function isRiskyNSECategory(category: NSECategory): boolean {
  return (
    category === "dos" || category === "exploit" || category === "intrusive" || category === "vuln"
  );
}

function isSpecializedScanTechnique(technique: ScanOptions["scanTechnique"]): boolean {
  return (
    technique === "ack" ||
    technique === "window" ||
    technique === "maimon" ||
    technique === "null" ||
    technique === "fin" ||
    technique === "xmas" ||
    technique === "sctp-init" ||
    technique === "sctp-cookie" ||
    technique === "protocol"
  );
}

function hasDiscoveryProbeOptions(options: ScanOptions): boolean {
  return (
    options.tcpSynProbes.trim() !== "" ||
    options.tcpAckProbes.trim() !== "" ||
    options.udpProbes.trim() !== "" ||
    options.sctpInitProbes.trim() !== "" ||
    options.icmpEchoProbe ||
    options.icmpTimestamp ||
    options.icmpNetmask
  );
}

function hasPacketShapingOptions(options: ScanOptions): boolean {
  return (
    options.fragmentPackets ||
    options.mtu > 0 ||
    options.dataLength > 0 ||
    options.sourcePort.trim() !== ""
  );
}

function hasIdentityOptions(options: ScanOptions): boolean {
  return (
    options.decoys.trim() !== "" ||
    options.sourceAddress.trim() !== "" ||
    options.networkInterface.trim() !== "" ||
    options.spoofMac.trim() !== ""
  );
}

function messageForInvalidScanOptions(options: ScanOptions): string {
  if (options.minRate !== 0 && options.maxRate !== 0 && options.minRate > options.maxRate) {
    return "Minimum packet rate cannot be greater than maximum packet rate.";
  }
  if (
    options.minHostGroup !== 0 &&
    options.maxHostGroup !== 0 &&
    options.minHostGroup > options.maxHostGroup
  ) {
    return "Minimum host group cannot be greater than maximum host group.";
  }
  if (options.fragmentPackets && options.mtu !== 0) {
    return "Fragment packets and custom MTU cannot be used together.";
  }
  if (options.mtu !== 0 && (options.mtu < 8 || options.mtu > 1500 || options.mtu % 8 !== 0)) {
    return "Custom MTU must be a multiple of 8 between 8 and 1500.";
  }
  return "";
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

interface OptionGroupTabProps {
  activeGroup: OptionGroup;
  group: OptionGroup;
  label: string;
  onSelect: (group: OptionGroup) => void;
}

function OptionGroupTab({
  activeGroup,
  group,
  label,
  onSelect,
}: OptionGroupTabProps): React.JSX.Element {
  return (
    <button
      aria-pressed={activeGroup === group}
      className="option-group-tab"
      type="button"
      onClick={() => onSelect(group)}
    >
      {label}
    </button>
  );
}
