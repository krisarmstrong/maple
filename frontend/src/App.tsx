import { useEffect, useState } from "react";
import { HelpWorkspace } from "./components/HelpWorkspace";
import { NmapPathControl } from "./components/NmapPathControl";
import { ScanHistoryList } from "./components/ScanHistoryList";
import { ScanWorkspace } from "./components/ScanWorkspace";
import { ThemeModePicker } from "./components/ThemeModePicker";
import { ToolStatusList } from "./components/ToolStatusList";
import type { BuildVersionInfo } from "./core/build-version";
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

type AppView = "scan" | "history" | "tools" | "environment" | "help";

const nmapPathStorageKey = "maple.nmapPath";

export default function App(): React.JSX.Element {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [historyState, setHistoryState] = useState<HistoryState>({ status: "loading" });
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [toolActionError, setToolActionError] = useState("");
  const [activeView, setActiveView] = useState<AppView>("scan");
  const [customNmapPath, setCustomNmapPath] = useState(readCustomNmapPath);
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
            onScanFinished={() => refreshHistory(setHistoryState)}
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
              />
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
  if (view === "tools") {
    return "Utility tools";
  }
  if (view === "environment") {
    return "Environment";
  }
  return "Help and references";
}

function UtilityToolsWorkspace({ state }: { state: LoadState }): React.JSX.Element {
  const tools = state.status === "ready" ? utilityTools(state.tools) : [];
  return (
    <section className="workspace utility-workspace">
      <div className="workspace-header">
        <div>
          <h2>Utility Tools</h2>
          <p>These tools stay separate from Nmap scan recipes and keep argv-only execution.</p>
        </div>
      </div>
      {state.status === "loading" ? <p className="muted">Detecting local tools...</p> : null}
      {state.status === "failed" ? <p className="error">{state.message}</p> : null}
      {state.status === "ready" ? (
        <div className="utility-tool-grid">
          {tools.map((tool) => (
            <UtilityToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function UtilityToolCard({ tool }: { tool: ToolDetection }): React.JSX.Element {
  const status = getToolStatus(tool);
  return (
    <article className={`utility-tool-card tool-card--${status}`}>
      <div>
        <h3>{tool.displayName}</h3>
        <p>{tool.version ?? tool.path ?? tool.error ?? "Not detected"}</p>
      </div>
      <div className="utility-tool-meta">
        <span>{labelForToolStatus(status)}</span>
        <strong>Command builder planned</strong>
      </div>
    </article>
  );
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
