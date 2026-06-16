import { useEffect, useState } from "react";
import {
  buildScanScripts,
  type NSECategory,
  type NSERiskLevel,
  nseCategories,
  nseCategoryDescription,
  nseCategoryRisk,
  nseScriptDetails,
  searchNSEScripts,
  suggestedScriptsForSelection,
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
import { changedOptionCount, summarizePreset } from "../core/scan-preset-summary";
import {
  builtInScanPresets,
  loadSavedPresets,
  makePresetID,
  type ScanPreset,
  savePreset,
} from "../core/scan-presets";
import { findProfile, type ScanProfileID } from "../core/scan-profiles";
import { scanScope } from "../core/scan-scope";
import {
  type TargetModeID,
  targetModeAcceptedSyntax,
  targetModeHelp,
  targetModePlaceholder,
  targetModes,
} from "../core/target-modes";
import { copyText } from "../services/clipboard-service";
import { cancelScan, onScanEvent, previewScanCommand, startScan } from "../services/scan-service";
import { ProfileSummary } from "./ProfileSummary";
import {
  commandTokens,
  hasDiscoveryProbeOptions,
  hasIdentityOptions,
  hasPacketShapingOptions,
  isNSECategory,
  isSpecializedScanTechnique,
  lineValues,
  messageForInvalidScanOptions,
  scanSafetyWarnings,
  splitSelectedScriptID,
  targetBuilderSummary,
  targetModeContextLabel,
  targetModeValidationSummary,
} from "./scan-workspace-display";
import {
  handleScanEvent,
  type LogEntry,
  makeRequest,
  messageForInvalidTargets,
  type PhaseEntry,
  type ScanStatus,
  scanPhaseLabel,
  scanStatusDetail,
  scanStatusLabel,
  updateTargets,
} from "./scan-workspace-state";

interface ScanWorkspaceProps {
  nmapPath?: string;
  onOpenEnvironment?: () => void;
  onScanFinished?: () => void;
}

type ScanPanel = "configure" | "options" | "scripts" | "output";
type OptionGroup = "shape" | "ports" | "timing" | "evasion" | "behavior";

export function ScanWorkspace({
  nmapPath,
  onOpenEnvironment,
  onScanFinished,
}: ScanWorkspaceProps): React.JSX.Element {
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
  const [selectedPresetID, setSelectedPresetID] = useState("builtin-top-tcp-ports");
  const [activePanel, setActivePanel] = useState<ScanPanel>("configure");
  const [activeOptionGroup, setActiveOptionGroup] = useState<OptionGroup>("shape");
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [phases, setPhases] = useState<PhaseEntry[]>([]);
  const [diagnostics, setDiagnostics] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const selectedProfile = findProfile(profileId);
  const scope = scanScope(profileId, targets);
  const parsedTargetSummary = targetBuilderSummary(targets);
  const targetValidation = targetModeValidationSummary(targetModeId, targets);
  const optionsMessage = messageForInvalidScanOptions(scanOptions);
  const targetsReady =
    targetValidation.valid || (scanOptions.targetInputFile.trim() !== "" && targets.trim() === "");
  const readiness = scanReadiness(nmapPath, targetsReady, optionsMessage);
  const scanReady = readiness.level === "ready";
  const scripts = buildScanScripts(
    scriptCategories,
    scriptNames,
    customScriptPaths,
    customScriptDirectories,
  );
  const visibleScripts =
    scriptSearch.trim() === ""
      ? suggestedScriptsForSelection(scriptCategories)
      : searchNSEScripts(scriptSearch);
  const selectedScriptNames = scriptNameLines(scriptNames);
  const availablePresets = [...savedPresets, ...builtInScanPresets];
  const selectedPreset = availablePresets.find((preset) => preset.id === selectedPresetID);
  const selectedPresetSummary =
    selectedPreset === undefined ? undefined : summarizePreset(selectedPreset);
  const selectedScriptValues = [
    ...scriptCategories.map((category) => ({ id: `category:${category}`, label: category })),
    ...selectedScriptNames.map((script) => ({ id: `name:${script}`, label: script })),
    ...lineValues(customScriptPaths).map((script) => ({ id: `path:${script}`, label: script })),
    ...lineValues(customScriptDirectories).map((script) => ({
      id: `directory:${script}`,
      label: script,
    })),
  ];
  const optionsBadgeCount = changedOptionCount(scanOptions);
  const scriptsBadgeCount = selectedScriptValues.length;
  const previewTokens = commandTokens(preview);
  const safetyWarnings = scanSafetyWarnings({
    options: scanOptions,
    scopeWarning: scope?.warning,
    scriptCategories,
    scriptNames,
  });

  useEffect(
    () =>
      onScanEvent((event) => {
        if (event.type === "started") {
          setActivePanel("output");
        }
        handleScanEvent(event, {
          setRunning,
          setLog,
          setPhases,
          setDiagnostics,
          setStatus,
          onScanFinished,
        });
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
    if (optionsMessage !== "") {
      setActivePanel("options");
      setError(optionsMessage);
      return;
    }
    setError("");
    setCopyMessage("");
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
    if (optionsMessage !== "") {
      setActivePanel("options");
      setError(optionsMessage);
      return;
    }
    setError("");
    setCopyMessage("");
    setLog([]);
    setPhases([]);
    setDiagnostics("");
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

  async function requestCancelScan(): Promise<void> {
    const cancelled = await cancelScan();
    if (cancelled) {
      setStatus("cancelled");
      setRunning(false);
      setLog((current) => {
        const last = current.at(-1);
        return [
          ...current,
          { id: last === undefined ? 1 : last.id + 1, text: "Cancel requested." },
        ];
      });
    }
  }

  async function copyPreviewCommand(): Promise<void> {
    setCopyMessage("");
    try {
      await copyText(preview.join(" "));
      setCopyMessage("Copied argv to clipboard.");
    } catch (caught) {
      setCopyMessage(clipboardErrorMessage(caught));
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
    setSelectedPresetID("");
    setPreview([]);
  }

  function updateScanOptions(updater: (options: ScanOptions) => ScanOptions): void {
    setScanOptions((current) => updater(current));
    setSelectedPresetID("");
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
    setSelectedPresetID(preset.id);
    setPresetName("");
  }

  function applyPreset(presetID: string): void {
    const preset = availablePresets.find((candidate) => candidate.id === presetID);
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
    setSelectedPresetID(preset.id);
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
    setSelectedPresetID("");
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
    setSelectedPresetID("");
    setPreview([]);
  }

  return (
    <section className="workspace scan-workspace">
      <div className="workspace-header">
        <div>
          <h2>New Scan</h2>
          <p>
            Choose a target, pick a scan recipe, refine options or scripts, then preview argv before
            Nmap runs.
          </p>
        </div>
        <div className="scan-actions">
          <button
            disabled={!scanReady || running}
            onClick={() => void previewCommand()}
            type="button"
          >
            Preview
          </button>
          <button disabled={!scanReady || running} onClick={() => void runScan()} type="button">
            Run Scan
          </button>
          <button disabled={!running} onClick={() => void requestCancelScan()} type="button">
            Cancel
          </button>
        </div>
      </div>

      <section className={`scan-readiness scan-readiness--${readiness.level}`}>
        <div>
          <h3>{readiness.title}</h3>
          <p>{readiness.message}</p>
        </div>
        {readiness.action === "environment" && onOpenEnvironment !== undefined ? (
          <button type="button" onClick={onOpenEnvironment}>
            Configure Nmap
          </button>
        ) : null}
        {readiness.action === "configure" ? (
          <button type="button" onClick={() => setActivePanel("configure")}>
            Fix Target
          </button>
        ) : null}
        {readiness.action === "options" ? (
          <button type="button" onClick={() => setActivePanel("options")}>
            Fix Options
          </button>
        ) : null}
      </section>

      {safetyWarnings.length === 0 ? null : (
        <section className="scan-safety-notes" aria-label="Scan safety notes">
          <h3>Safety notes</h3>
          <ul>
            {safetyWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Scan context" className="scan-context-strip">
        <h3>Scan context</h3>
        <ContextMetric label="Recipe" value={selectedPreset?.name ?? "Custom scan"} />
        <ContextMetric label="Target type" value={targetModeContextLabel(targetModeId)} />
        <ContextMetric label="Targets" value={parsedTargetSummary.parsedTargets} />
        <ContextMetric
          label="Status"
          value={status === "idle" ? readiness.title : scanStatusLabel(status)}
        />
      </section>

      <div className="scan-panel-tabs" role="tablist" aria-label="Scan setup sections">
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
          badge={optionsBadgeCount}
          onSelect={setActivePanel}
        />
        <ScanPanelButton
          activePanel={activePanel}
          id="scripts"
          label="Scripts"
          badge={scriptsBadgeCount}
          onSelect={setActivePanel}
        />
        <ScanPanelButton
          activePanel={activePanel}
          id="output"
          label="Output"
          onSelect={setActivePanel}
        />
      </div>

      {error === "" ? null : <p className="error">{error}</p>}

      {activePanel === "configure" ? (
        <div
          className="scan-panel"
          data-testid="configure-panel"
          id="scan-panel-configure"
          role="tabpanel"
          aria-labelledby="scan-tab-configure"
        >
          <div className="scan-grid">
            <div className="target-input">
              <div>
                <h3>Targets</h3>
                <p className="target-mode-help">
                  Enter a host, range, subnet, or list. The shape selector only changes validation
                  and examples.
                </p>
              </div>
              <div className="target-entry-grid">
                <textarea
                  aria-label="Targets"
                  className={
                    targetModeId === "list" ? "target-textarea-list" : "target-textarea-compact"
                  }
                  onChange={(event) => updateTargets(event.target.value, setTargets, setPreview)}
                  placeholder={targetModePlaceholder(targetModeId)}
                  rows={targetModeId === "list" ? 7 : 2}
                  value={targets}
                />
                <label>
                  <span>Target shape</span>
                  <select
                    aria-label="Target shape"
                    onChange={(event) => {
                      const value = event.target.value;
                      if (isTargetModeID(value)) {
                        updateTargetMode(value);
                      }
                    }}
                    value={targetModeId}
                  >
                    {targetModes.map((mode) => (
                      <option key={mode.id} value={mode.id}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="target-mode-note">
                <p>{targetModeHelp(targetModeId)}</p>
                <p>
                  Example: <code>{targetModePlaceholder(targetModeId)}</code>
                </p>
              </div>
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
                <div>
                  <strong>Target validation</strong>
                  <span
                    className={
                      targetValidation.valid ? "target-validation-ok" : "target-validation-warn"
                    }
                  >
                    {targetValidation.message}
                  </span>
                </div>
              </div>
            </div>
            <section className="recipe-column" aria-label="Scan recipe setup">
              <div>
                <h3>Scan Recipe</h3>
                <p className="target-mode-help">
                  Recipes choose scan defaults, options, and scripts. Targets stay separate.
                </p>
              </div>
              <label>
                <span>Scan recipe</span>
                <select
                  aria-label="Scan recipe"
                  onChange={(event) => applyPreset(event.target.value)}
                  value={selectedPresetID}
                >
                  {selectedPresetID === "" ? <option value="">Custom unsaved recipe</option> : null}
                  <optgroup label="Built-in recipes">
                    {builtInScanPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </optgroup>
                  {savedPresets.length === 0 ? null : (
                    <optgroup label="Custom recipes">
                      {savedPresets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              <div className="recipe-selection">
                <span>Selected recipe</span>
                <strong>{selectedPreset?.name ?? "Custom unsaved recipe"}</strong>
                <p>{selectedPresetSummary?.intentLabel ?? "Current manual scan settings"}</p>
              </div>
              <div className="recipe-defaults">
                <span>Recipe defaults</span>
                <ProfileSummary profile={selectedProfile} />
              </div>
              <div className="recipe-save-row">
                <label>
                  <span>Recipe name</span>
                  <input
                    onChange={(event) => setPresetName(event.target.value)}
                    placeholder="Web TLS check"
                    type="text"
                    value={presetName}
                  />
                </label>
                <button
                  disabled={presetName.trim() === ""}
                  onClick={saveCurrentPreset}
                  type="button"
                >
                  Save Recipe
                </button>
              </div>
            </section>
          </div>
          {scope?.warning === undefined ? null : <p className="scan-scope">{scope.warning}</p>}
        </div>
      ) : null}

      {activePanel === "options" ? (
        <div
          className="scan-panel options-panel"
          id="scan-panel-options"
          role="tabpanel"
          aria-labelledby="scan-tab-options"
        >
          <div>
            <h3>Nmap options</h3>
            <p className="target-mode-help">
              Add common Nmap switches as structured choices. Maple still builds argv directly.
            </p>
          </div>
          <div className="option-group-tabs" role="tablist" aria-label="Option groups">
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
          </div>
          <div
            className="options-grid"
            id={`option-panel-${activeOptionGroup}`}
            role="tabpanel"
            aria-labelledby={`option-tab-${activeOptionGroup}`}
          >
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
                        updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
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
                      updateScanOptions((current) => ({
                        ...current,
                        serviceDetection:
                          event.target.value === "" ? current.serviceDetection : true,
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
          </div>
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
        <div
          className="scan-panel scripts-panel"
          id="scan-panel-scripts"
          role="tabpanel"
          aria-labelledby="scan-tab-scripts"
        >
          <div>
            <h3>NSE scripts</h3>
            <p className="target-mode-help">
              Select categories, browse suggested scripts, or add absolute custom files without
              typing raw shell commands.
            </p>
          </div>
          <section className="script-workspace-section selected-script-list">
            <h4>Selected scripts</h4>
            {selectedScriptValues.length === 0 ? (
              <p className="target-mode-help">
                No script categories, names, files, or directories selected.
              </p>
            ) : (
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
            )}
          </section>
          <section className="script-workspace-section">
            <h4>Browse scripts</h4>
            <p className="target-mode-help">
              Categories pass category names to Nmap. Search adds individual built-in scripts.
            </p>
            <fieldset className="script-category-picker">
              <legend>Categories</legend>
              {nseCategories.map((category) => (
                <label key={category}>
                  <input
                    aria-label={category}
                    checked={scriptCategories.includes(category)}
                    onChange={(event) => updateScriptCategory(category, event.target.checked)}
                    type="checkbox"
                  />
                  <span>{category}</span>
                  <small>{nseCategoryDescription(category)}</small>
                  <ScriptRiskBadge risk={nseCategoryRisk(category)} />
                </label>
              ))}
            </fieldset>
            <p className="target-mode-help">
              Risky categories can be intrusive, exploit-oriented, or disruptive.
            </p>
            <label className="custom-script-paths">
              <span>Search built-in scripts</span>
              <input
                onChange={(event) => setScriptSearch(event.target.value)}
                placeholder="http, ssl, smb"
                type="search"
                value={scriptSearch}
              />
            </label>
            <fieldset className="script-category-picker">
              <legend>Script browser</legend>
              {visibleScripts.map((script) => {
                const details = nseScriptDetails(script);
                return (
                  <label key={script}>
                    <input
                      aria-label={script}
                      checked={selectedScriptNames.includes(script)}
                      onChange={(event) => updateNamedScript(script, event.target.checked)}
                      type="checkbox"
                    />
                    <span>{script}</span>
                    <small>{details.description}</small>
                    {details.categories.length === 0 ? null : (
                      <small>Categories: {details.categories.join(", ")}</small>
                    )}
                    <ScriptRiskBadge risk={details.risk} />
                  </label>
                );
              })}
            </fieldset>
            {scriptSearch.trim() === "" && scriptCategories.length > 0 ? (
              <p className="target-mode-help">
                Showing scripts commonly used with selected categories.
              </p>
            ) : null}
            <label className="custom-script-paths">
              <span>Manual script names</span>
              <textarea
                aria-label="Manual script names"
                onChange={(event) => {
                  setScriptNames(event.target.value);
                  setSelectedPresetID("");
                  setPreview([]);
                }}
                placeholder="http-title&#10;ssl-enum-ciphers"
                rows={3}
                value={scriptNames}
              />
            </label>
          </section>
          <section className="script-workspace-section">
            <h4>Custom scripts and arguments</h4>
            <p className="target-mode-help">
              Add one absolute custom script path per line. Maple passes scripts as argv values and
              Nmap runs them locally.
            </p>
            <label className="custom-script-paths">
              <span>Custom .nse script files</span>
              <textarea
                onChange={(event) => {
                  setCustomScriptPaths(event.target.value);
                  setSelectedPresetID("");
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
                  setSelectedPresetID("");
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
                  setSelectedPresetID("");
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
                  setSelectedPresetID("");
                  setPreview([]);
                }}
                placeholder="/Users/you/nmap-scripts/script-args.txt"
                type="text"
                value={scriptArgsFile}
              />
            </label>
          </section>
        </div>
      ) : null}

      {activePanel === "output" ? (
        <div
          className="scan-panel output-panel"
          id="scan-panel-output"
          role="tabpanel"
          aria-labelledby="scan-tab-output"
        >
          <section className="output-section">
            <h3>Run status</h3>
            <p className="scan-status">{scanStatusLabel(status)}</p>
            <p className="muted">{scanStatusDetail(status)}</p>
            <p className="muted">Raw XML is captured for History exports, not shown here.</p>
            {phases.length === 0 ? null : (
              <ol className="scan-phase-list" aria-label="Scan phases">
                {phases.map((phase) => (
                  <li key={phase.id}>
                    <strong>{scanPhaseLabel(phase.phase)}</strong>
                    <span>{phase.message}</span>
                  </li>
                ))}
              </ol>
            )}
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
                <div className="preview-command-actions">
                  <button type="button" onClick={() => void copyPreviewCommand()}>
                    Copy argv
                  </button>
                  {copyMessage === "" ? null : (
                    <p
                      className={
                        copyMessage === "Copied argv to clipboard."
                          ? "copy-status copy-status-success"
                          : "copy-status error"
                      }
                    >
                      {copyMessage}
                    </p>
                  )}
                </div>
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
            {diagnostics === "" ? (
              <p className="muted">No diagnostics captured yet.</p>
            ) : (
              <details className="diagnostics-details">
                <summary>Parser notes and stderr diagnostics</summary>
                <pre>{diagnostics}</pre>
              </details>
            )}
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

function ContextMetric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function scriptNameLines(value: string): string[] {
  return lineValues(value);
}

function isTargetModeID(value: string): value is TargetModeID {
  return targetModes.some((mode) => mode.id === value);
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

function clipboardErrorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : "Unable to copy argv to clipboard.";
}

type ScanReadinessLevel = "ready" | "blocked";
type ScanReadinessAction = "environment" | "configure" | "options" | "none";

interface ScanReadiness {
  action: ScanReadinessAction;
  level: ScanReadinessLevel;
  message: string;
  title: string;
}

function scanReadiness(
  nmapPath: string | undefined,
  targetsReady: boolean,
  optionsMessage: string,
): ScanReadiness {
  if (nmapPath === undefined) {
    return {
      action: "environment",
      level: "blocked",
      message: "Maple needs a locally installed Nmap binary before it can preview or run scans.",
      title: "Nmap is missing",
    };
  }
  if (!targetsReady) {
    return {
      action: "configure",
      level: "blocked",
      message: "Choose a target shape and enter targets that match it before previewing argv.",
      title: "Target needs attention",
    };
  }
  if (optionsMessage !== "") {
    return {
      action: "options",
      level: "blocked",
      message: optionsMessage,
      title: "Options need attention",
    };
  }
  return {
    action: "none",
    level: "ready",
    message: "Maple can preview the exact argv before it starts Nmap.",
    title: "Ready to preview",
  };
}

function ScriptRiskBadge({ risk }: { risk: NSERiskLevel }): React.JSX.Element | null {
  if (risk === "normal") {
    return null;
  }
  return (
    <small className={`script-risk-label script-risk-label--${risk}`}>
      {risk === "intrusive" ? "Intrusive" : "Noisy"}
    </small>
  );
}

interface ScanPanelButtonProps {
  activePanel: ScanPanel;
  badge?: number;
  id: ScanPanel;
  label: string;
  onSelect: (panel: ScanPanel) => void;
}

function ScanPanelButton({
  activePanel,
  badge,
  id,
  label,
  onSelect,
}: ScanPanelButtonProps): React.JSX.Element {
  const isActive = activePanel === id;
  const showBadge = badge !== undefined && badge > 0;
  const accessibleLabel = showBadge ? `${label}, ${badge} change${badge === 1 ? "" : "s"}` : label;
  return (
    <button
      aria-controls={`scan-panel-${id}`}
      aria-label={accessibleLabel}
      aria-selected={isActive}
      className="scan-panel-tab"
      id={`scan-tab-${id}`}
      role="tab"
      type="button"
      onClick={() => onSelect(id)}
    >
      {label}
      {showBadge ? (
        <span className="tab-badge" aria-hidden="true">
          {badge}
        </span>
      ) : null}
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
      aria-controls={`option-panel-${group}`}
      aria-selected={activeGroup === group}
      className="option-group-tab"
      id={`option-tab-${group}`}
      role="tab"
      type="button"
      onClick={() => onSelect(group)}
    >
      {label}
    </button>
  );
}
