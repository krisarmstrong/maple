import { useEffect, useState } from "react";
import { HelpWorkspace } from "./components/HelpWorkspace";
import { NmapPathControl } from "./components/NmapPathControl";
import { ScanCompare } from "./components/ScanCompare";
import { ScanHistoryList } from "./components/ScanHistoryList";
import { ScanWorkspace } from "./components/ScanWorkspace";
import { ThemeModePicker } from "./components/ThemeModePicker";
import { ToolStatusList } from "./components/ToolStatusList";
import type { BuildVersionInfo } from "./core/build-version";
import { parseTargets } from "./core/scan-targets";
import { getToolStatus, summarizeTools, type ToolDetection } from "./core/tool-detection";
import {
  clearScanHistory,
  loadScanHistory,
  type ScanHistoryRecord,
} from "./services/history-service";
import { useThemeMode } from "./services/theme-service";
import { appVersion, detectTools } from "./services/tool-service";
import "./styles/app.css";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; tools: ToolDetection[] }
  | { status: "failed"; message: string };

type HistoryState =
  | { status: "loading" }
  | { status: "ready"; records: ScanHistoryRecord[] }
  | { status: "failed"; message: string };

type AppView = "scan" | "history" | "compare" | "tools" | "environment" | "help";

const nmapPathStorageKey = "maple.nmapPath";

export default function App(): React.JSX.Element {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [historyState, setHistoryState] = useState<HistoryState>({ status: "loading" });
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [toolActionError, setToolActionError] = useState("");
  const [activeView, setActiveView] = useState<AppView>("scan");
  const [customNmapPath, setCustomNmapPath] = useState(readCustomNmapPath);
  const [lastScanRunId, setLastScanRunId] = useState<string | undefined>(undefined);
  const [versionInfo, setVersionInfo] = useState<BuildVersionInfo>({
    version: "dev",
    commit: "unknown",
    buildTime: "unknown",
    uiBuildHash: "unknown",
  });
  const [themeMode, setThemeMode] = useThemeMode();

  useEffect(() => {
    let cancelled = false;

    void refreshTools((nextState) => {
      if (!cancelled) {
        setState(nextState);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshHistory(setHistoryState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void appVersion().then((info) => {
      if (!cancelled) {
        setVersionInfo(info);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-panel">
          <p className="eyebrow">Maple</p>
          <h1>Modern Nmap workbench</h1>
          <p className="summary">
            Build scans, inspect results, and export reports with locally installed Nmap.
          </p>
          <div className="app-badges">
            <span>Local desktop</span>
            <span>Release candidate</span>
          </div>
        </div>
        <nav className="app-nav" aria-label="Maple sections">
          <NavButton activeView={activeView} id="scan" label="Scan" onSelect={setActiveView} />
          <NavButton
            activeView={activeView}
            id="history"
            label="History"
            meta={historyMeta(historyState)}
            onSelect={setActiveView}
          />
          <NavButton
            activeView={activeView}
            id="compare"
            label="Compare"
            onSelect={setActiveView}
          />
          <NavButton activeView={activeView} id="tools" label="Tools" onSelect={setActiveView} />
          <NavButton
            activeView={activeView}
            id="environment"
            label="Environment"
            meta={statusText(state)}
            onSelect={setActiveView}
          />
          <NavButton activeView={activeView} id="help" label="Help" onSelect={setActiveView} />
        </nav>
        <div className="sidebar-footer">
          <span>Maple {versionInfo.version}</span>
          <ThemeModePicker mode={themeMode} onChange={setThemeMode} />
        </div>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <div>
            <span className="topbar-kicker">Desktop scan console</span>
            <strong>{viewTitle(activeView)}</strong>
          </div>
          <div className="topbar-status">
            <span>{statusText(state)}</span>
            <span>{historyMeta(historyState)}</span>
            <span>argv-only execution</span>
          </div>
        </header>

        {activeView === "scan" ? (
          <ScanWorkspace
            nmapPath={nmapPathFor(state, customNmapPath)}
            onOpenEnvironment={() => setActiveView("environment")}
            onScanStarted={setLastScanRunId}
            onScanFinished={() => refreshHistory(setHistoryState)}
            completedRecord={completedRecordFor(historyState, lastScanRunId)}
          />
        ) : null}

        {activeView === "history" ? (
          <section className="workspace history-workspace">
            <div className="workspace-header">
              <div>
                <h2>Recent Scans</h2>
                <p>Completed scans are stored locally on this machine.</p>
              </div>
              <div className="header-actions">
                <button type="button" onClick={() => refreshHistory(setHistoryState)}>
                  Refresh
                </button>
                {historyState.status === "ready" && historyState.records.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      clearHistory(confirmClearHistory, setConfirmClearHistory, setHistoryState)
                    }
                  >
                    {confirmClearHistory ? "Confirm Clear" : "Clear History"}
                  </button>
                ) : null}
              </div>
            </div>
            {historyState.status === "loading" ? (
              <p className="muted">Loading scan history...</p>
            ) : null}
            {historyState.status === "failed" ? (
              <p className="error">{historyState.message}</p>
            ) : null}
            {historyState.status === "ready" ? (
              <ScanHistoryList
                records={historyState.records}
                onChanged={() => {
                  setConfirmClearHistory(false);
                  refreshHistory(setHistoryState);
                }}
                onStartScan={() => setActiveView("scan")}
              />
            ) : null}
          </section>
        ) : null}

        {activeView === "compare" ? (
          <section className="workspace compare-view-workspace">
            <div className="workspace-header">
              <div>
                <h2>Compare Scans</h2>
                <p>
                  Select two completed scans to see which hosts, ports, and services changed between
                  runs.
                </p>
              </div>
            </div>
            {historyState.status === "loading" ? (
              <p className="muted">Loading scan history...</p>
            ) : null}
            {historyState.status === "failed" ? (
              <p className="error">{historyState.message}</p>
            ) : null}
            {historyState.status === "ready" ? (
              <ScanCompare records={historyState.records} />
            ) : null}
          </section>
        ) : null}

        {activeView === "tools" ? <UtilityToolsWorkspace state={state} /> : null}

        {activeView === "environment" ? (
          <section className="workspace">
            <div className="workspace-header">
              <div>
                <h2>Tool Detection</h2>
                <p>Maple uses locally installed Nmap tools and never shells through user input.</p>
              </div>
              <button type="button" onClick={() => refreshTools(setState)}>
                Refresh
              </button>
            </div>
            {state.status === "loading" ? <p className="muted">Detecting local tools...</p> : null}
            {state.status === "failed" ? <p className="error">{state.message}</p> : null}
            {toolActionError === "" ? null : <p className="error">{toolActionError}</p>}
            <FirstRunChecklist nmapPath={nmapPathFor(state, customNmapPath)} />
            <NmapPathControl
              nmapPath={customNmapPath}
              onPathChange={setStoredCustomNmapPath(setCustomNmapPath)}
            />
            {state.status === "ready" ? (
              <ToolStatusList tools={state.tools} onError={setToolActionError} />
            ) : null}
          </section>
        ) : null}

        {activeView === "help" ? <HelpWorkspace /> : null}
      </div>
    </main>
  );
}

interface NavButtonProps {
  activeView: AppView;
  id: AppView;
  label: string;
  meta?: string;
  onSelect: (view: AppView) => void;
}

function NavButton({ activeView, id, label, meta, onSelect }: NavButtonProps): React.JSX.Element {
  const accessibleLabel = meta === undefined || meta === "" ? label : `${label}, ${meta}`;
  return (
    <button
      aria-label={accessibleLabel}
      aria-current={activeView === id ? "page" : undefined}
      className="nav-button"
      type="button"
      onClick={() => onSelect(id)}
    >
      <span>{label}</span>
      {meta === undefined || meta === "" ? null : <small>{meta}</small>}
    </button>
  );
}

async function refreshTools(setState: (state: LoadState) => void): Promise<void> {
  setState({ status: "loading" });
  try {
    const tools = await detectTools();
    setState({ status: "ready", tools });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to detect tools";
    setState({ status: "failed", message });
  }
}

async function refreshHistory(setHistoryState: (state: HistoryState) => void): Promise<void> {
  setHistoryState({ status: "loading" });
  try {
    const records = await loadScanHistory();
    setHistoryState({ status: "ready", records });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load scan history";
    setHistoryState({ status: "failed", message });
  }
}

async function clearHistory(
  confirmClearHistory: boolean,
  setConfirmClearHistory: (value: boolean) => void,
  setHistoryState: (state: HistoryState) => void,
): Promise<void> {
  if (!confirmClearHistory) {
    setConfirmClearHistory(true);
    return;
  }
  try {
    await clearScanHistory();
    setConfirmClearHistory(false);
    await refreshHistory(setHistoryState);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to clear scan history";
    setHistoryState({ status: "failed", message });
  }
}

function nmapPathFor(state: LoadState, customNmapPath: string): string | undefined {
  const trimmedPath = customNmapPath.trim();
  if (trimmedPath !== "") {
    return trimmedPath;
  }
  if (state.status !== "ready") {
    return undefined;
  }
  return state.tools.find((tool) => tool.name === "nmap" && tool.installed)?.path;
}

function completedRecordFor(
  historyState: HistoryState,
  runId: string | undefined,
): ScanHistoryRecord | undefined {
  if (historyState.status !== "ready" || runId === undefined) {
    return undefined;
  }
  return historyState.records.find((record) => record.runId === runId);
}

function readCustomNmapPath(): string {
  return storage()?.getItem(nmapPathStorageKey) ?? "";
}

function setStoredCustomNmapPath(
  setCustomNmapPath: (path: string) => void,
): (path: string) => void {
  return (path: string) => {
    const trimmedPath = path.trim();
    if (trimmedPath === "") {
      storage()?.removeItem(nmapPathStorageKey);
      setCustomNmapPath("");
      return;
    }
    storage()?.setItem(nmapPathStorageKey, trimmedPath);
    setCustomNmapPath(trimmedPath);
  };
}

function storage(): Storage | undefined {
  return typeof window.localStorage === "undefined" ? undefined : window.localStorage;
}

function statusText(state: LoadState): string {
  if (state.status === "loading") {
    return "Checking tools";
  }
  if (state.status === "failed") {
    return "Detection failed";
  }
  return summarizeTools(state.tools);
}

function historyMeta(state: HistoryState): string {
  if (state.status === "loading") {
    return "Loading";
  }
  if (state.status === "failed") {
    return "Unavailable";
  }
  return `${state.records.length} ${state.records.length === 1 ? "scan" : "scans"}`;
}

function viewTitle(view: AppView): string {
  if (view === "scan") {
    return "Scan workspace";
  }
  if (view === "history") {
    return "History and exports";
  }
  if (view === "compare") {
    return "Compare scans";
  }
  if (view === "tools") {
    return "Utility tools";
  }
  if (view === "environment") {
    return "Environment";
  }
  return "Help and references";
}

function FirstRunChecklist({ nmapPath }: { nmapPath: string | undefined }): React.JSX.Element {
  const nmapReady = nmapPath !== undefined;
  return (
    <section className="first-run-checklist" aria-labelledby="first-run-checklist-title">
      <div>
        <p className="eyebrow">First-run readiness</p>
        <h3 id="first-run-checklist-title">Before the first scan</h3>
      </div>
      <div className="first-run-grid">
        <ChecklistItem
          status={nmapReady ? "Ready" : "Required"}
          title="Local Nmap"
          tone={nmapReady ? "ready" : "blocked"}
        >
          {nmapReady
            ? `Using ${nmapPath}. Preview and Run can build argv from this binary.`
            : "Install Nmap or choose a custom nmap binary before Maple can preview or run scans."}
        </ChecklistItem>
        <ChecklistItem status="Review" title="Windows packet capture" tone="review">
          Windows packet scans may require Npcap from the official Nmap project. Maple detects
          tools, but it does not bundle Nmap, Npcap, Ncat, Ndiff, or Nping.
        </ChecklistItem>
        <ChecklistItem status="Review" title="Privileged scan modes" tone="review">
          TCP connect scans are the safest desktop default. SYN, UDP, OS detection, spoofing, and
          some evasion options may need elevated permissions on macOS, Linux, or Windows.
        </ChecklistItem>
      </div>
    </section>
  );
}

function ChecklistItem({
  children,
  status,
  title,
  tone,
}: {
  children: React.ReactNode;
  status: string;
  title: string;
  tone: "blocked" | "ready" | "review";
}): React.JSX.Element {
  return (
    <article className={`first-run-item first-run-item--${tone}`}>
      <div>
        <h4>{title}</h4>
        <p>{children}</p>
      </div>
      <span>{status}</span>
    </article>
  );
}

function UtilityToolsWorkspace({ state }: { state: LoadState }): React.JSX.Element {
  const tools = state.status === "ready" ? utilityTools(state.tools) : [];
  const [selectedTool, setSelectedTool] = useState("ncat");
  return (
    <section className="workspace utility-workspace">
      <div className="workspace-header">
        <div>
          <h2>Utility Tools</h2>
          <p>Build safe argv previews for Ncat, Ndiff, and Nping without raw shell input.</p>
        </div>
      </div>
      {state.status === "loading" ? <p className="muted">Detecting local tools...</p> : null}
      {state.status === "failed" ? <p className="error">{state.message}</p> : null}
      {state.status === "ready" ? (
        <>
          <div className="utility-tool-grid">
            {tools.map((tool) => (
              <UtilityToolCard
                key={tool.name}
                selected={tool.name === selectedTool}
                tool={tool}
                onSelect={setSelectedTool}
              />
            ))}
          </div>
          <UtilityToolBuilder tool={tools.find((tool) => tool.name === selectedTool) ?? tools[0]} />
        </>
      ) : null}
    </section>
  );
}

function UtilityToolCard({
  onSelect,
  selected,
  tool,
}: {
  onSelect: (toolName: string) => void;
  selected: boolean;
  tool: ToolDetection;
}): React.JSX.Element {
  const status = getToolStatus(tool);
  return (
    <button
      aria-pressed={selected}
      className={`utility-tool-card tool-card--${status}`}
      type="button"
      onClick={() => onSelect(tool.name)}
    >
      <div>
        <h3>{tool.displayName}</h3>
        <p>{tool.version ?? tool.path ?? tool.error ?? "Not detected"}</p>
      </div>
      <div className="utility-tool-meta">
        <span>{labelForToolStatus(status)}</span>
        <strong>{selected ? "Builder selected" : "Open builder"}</strong>
      </div>
    </button>
  );
}

function UtilityToolBuilder({ tool }: { tool: ToolDetection | undefined }): React.JSX.Element {
  if (tool === undefined) {
    return <p className="muted">Utility tool status is unavailable.</p>;
  }
  if (tool.name === "ndiff") {
    return <NdiffBuilder tool={tool} />;
  }
  if (tool.name === "nping") {
    return <NpingBuilder tool={tool} />;
  }
  return <NcatBuilder tool={tool} />;
}

function NcatBuilder({ tool }: { tool: ToolDetection }): React.JSX.Element {
  const [mode, setMode] = useState<"connect" | "listen">("connect");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const validation = validateNcatInputs(mode, host, port);
  const argv =
    validation === ""
      ? mode === "connect"
        ? [toolCommand(tool, "ncat"), host.trim(), port.trim()]
        : [toolCommand(tool, "ncat"), "-l", port.trim()]
      : [toolCommand(tool, "ncat")];
  return (
    <section className="utility-builder" aria-labelledby="ncat-builder-title">
      <BuilderHeader
        description="Preview a TCP connect or listen argv. Maple does not execute utility tools yet."
        title="Ncat argv builder"
        tool={tool}
      />
      <div className="utility-builder-grid">
        <label>
          <span>Mode</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
            <option value="connect">Connect to host</option>
            <option value="listen">Listen on port</option>
          </select>
        </label>
        {mode === "connect" ? (
          <label>
            <span>Host</span>
            <input
              placeholder="10.0.0.1"
              value={host}
              onChange={(event) => setHost(event.target.value)}
            />
          </label>
        ) : null}
        <label>
          <span>Port</span>
          <input placeholder="443" value={port} onChange={(event) => setPort(event.target.value)} />
        </label>
      </div>
      <BuilderPreview argv={argv} validation={validation} />
    </section>
  );
}

function NdiffBuilder({ tool }: { tool: ToolDetection }): React.JSX.Element {
  const [baseline, setBaseline] = useState("");
  const [current, setCurrent] = useState("");
  const validation = validateNdiffInputs(baseline, current);
  const argv =
    validation === ""
      ? [toolCommand(tool, "ndiff"), baseline.trim(), current.trim()]
      : [toolCommand(tool, "ndiff")];
  return (
    <section className="utility-builder" aria-labelledby="ndiff-builder-title">
      <BuilderHeader
        description="Preview comparison argv for two saved Nmap XML files."
        title="Ndiff argv builder"
        tool={tool}
      />
      <div className="utility-builder-grid">
        <label>
          <span>Baseline XML</span>
          <input
            placeholder="/Users/krisarmstrong/scans/baseline.xml"
            value={baseline}
            onChange={(event) => setBaseline(event.target.value)}
          />
        </label>
        <label>
          <span>Current XML</span>
          <input
            placeholder="/Users/krisarmstrong/scans/current.xml"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </label>
      </div>
      <BuilderPreview argv={argv} validation={validation} />
    </section>
  );
}

function NpingBuilder({ tool }: { tool: ToolDetection }): React.JSX.Element {
  const [mode, setMode] = useState<"tcp" | "udp" | "icmp">("tcp");
  const [target, setTarget] = useState("");
  const [count, setCount] = useState("5");
  const validation = validateNpingInputs(target, count);
  const argv =
    validation === ""
      ? [toolCommand(tool, "nping"), `--${mode}`, "-c", count.trim(), target.trim()]
      : [toolCommand(tool, "nping")];
  return (
    <section className="utility-builder" aria-labelledby="nping-builder-title">
      <BuilderHeader
        description="Preview a small Nping probe argv for a single host or IP."
        title="Nping argv builder"
        tool={tool}
      />
      <div className="utility-builder-grid">
        <label>
          <span>Probe type</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="icmp">ICMP</option>
          </select>
        </label>
        <label>
          <span>Target</span>
          <input
            placeholder="10.0.0.1"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </label>
        <label>
          <span>Count</span>
          <input value={count} onChange={(event) => setCount(event.target.value)} />
        </label>
      </div>
      <BuilderPreview argv={argv} validation={validation} />
    </section>
  );
}

function BuilderHeader({
  description,
  title,
  tool,
}: {
  description: string;
  title: string;
  tool: ToolDetection;
}): React.JSX.Element {
  return (
    <div className="utility-builder-header">
      <div>
        <h3 id={`${tool.name}-builder-title`}>{title}</h3>
        <p>{description}</p>
      </div>
      <span>{tool.installed ? "Detected" : "Preview only"}</span>
    </div>
  );
}

function BuilderPreview({
  argv,
  validation,
}: {
  argv: readonly string[];
  validation: string;
}): React.JSX.Element {
  return (
    <div className="utility-builder-preview">
      <div>
        <h4>Preview argv</h4>
        {validation === "" ? <p>Ready to copy into a terminal.</p> : <p>{validation}</p>}
      </div>
      <ul className="argv-token-list" aria-label="Utility argv tokens">
        {argv.map((token) => (
          <li key={token}>
            <code>{token}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

function validateNcatInputs(mode: "connect" | "listen", host: string, port: string): string {
  if (mode === "connect") {
    const hostMessage = validateSingleUtilityTarget(host);
    if (hostMessage !== "") {
      return hostMessage;
    }
  }
  return validatePort(port);
}

function validateNdiffInputs(baseline: string, current: string): string {
  const baselineMessage = validateAbsoluteXMLPath(baseline, "baseline XML");
  if (baselineMessage !== "") {
    return baselineMessage;
  }
  return validateAbsoluteXMLPath(current, "current XML");
}

function validateNpingInputs(target: string, count: string): string {
  const targetMessage = validateSingleUtilityTarget(target);
  if (targetMessage !== "") {
    return targetMessage;
  }
  const trimmedCount = count.trim();
  if (!/^[1-9]\d*$/.test(trimmedCount)) {
    return "Enter a probe count from 1 to 100.";
  }
  const numericCount = Number(trimmedCount);
  if (numericCount > 100) {
    return "Enter a probe count from 1 to 100.";
  }
  return "";
}

function validateSingleUtilityTarget(target: string): string {
  const result = parseTargets(target);
  if (!result.ok) {
    return "Enter one hostname or IP address.";
  }
  if (result.targets.length !== 1) {
    return "Enter exactly one hostname or IP address.";
  }
  const [parsed] = result.targets;
  if (parsed.kind !== "hostname" && parsed.kind !== "ip") {
    return "Enter one hostname or IP address.";
  }
  return "";
}

function validatePort(port: string): string {
  const trimmedPort = port.trim();
  if (!/^[1-9]\d*$/.test(trimmedPort)) {
    return "Enter a TCP port from 1 to 65535.";
  }
  const numericPort = Number(trimmedPort);
  if (numericPort > 65535) {
    return "Enter a TCP port from 1 to 65535.";
  }
  return "";
}

function validateAbsoluteXMLPath(path: string, label: string): string {
  const trimmedPath = path.trim();
  if (trimmedPath === "") {
    return `Enter an absolute ${label} path.`;
  }
  if (trimmedPath.includes("\n") || trimmedPath.includes("\r") || trimmedPath.includes("\0")) {
    return `Enter a single-line ${label} path.`;
  }
  if (!isAbsoluteUtilityPath(trimmedPath)) {
    return `Enter an absolute ${label} path.`;
  }
  if (!trimmedPath.toLowerCase().endsWith(".xml")) {
    return `Enter a ${label} path ending in .xml.`;
  }
  return "";
}

function isAbsoluteUtilityPath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}

function toolCommand(tool: ToolDetection, fallback: string): string {
  return tool.path ?? fallback;
}

function utilityTools(tools: readonly ToolDetection[]): ToolDetection[] {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  return ["ncat", "ndiff", "nping"].map(
    (name) =>
      byName.get(name) ?? {
        name,
        displayName: utilityToolDisplayName(name),
        required: false,
        installed: false,
      },
  );
}

function utilityToolDisplayName(name: string): string {
  if (name === "ncat") {
    return "Ncat";
  }
  if (name === "ndiff") {
    return "Ndiff";
  }
  return "Nping";
}

function labelForToolStatus(status: ReturnType<typeof getToolStatus>): string {
  if (status === "installed") {
    return "Detected";
  }
  if (status === "missing-required") {
    return "Required";
  }
  return "Optional";
}
