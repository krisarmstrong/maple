import { useEffect, useState } from "react";
import { ScanHistoryList } from "./components/ScanHistoryList";
import { ScanWorkspace } from "./components/ScanWorkspace";
import { ThemeModePicker } from "./components/ThemeModePicker";
import { ToolStatusList } from "./components/ToolStatusList";
import { summarizeTools, type ToolDetection } from "./core/tool-detection";
import {
  clearScanHistory,
  loadScanHistory,
  type ScanHistoryRecord,
} from "./services/history-service";
import { useThemeMode } from "./services/theme-service";
import { detectTools } from "./services/tool-service";
import "./styles/app.css";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; tools: ToolDetection[] }
  | { status: "failed"; message: string };

type HistoryState =
  | { status: "loading" }
  | { status: "ready"; records: ScanHistoryRecord[] }
  | { status: "failed"; message: string };

export default function App(): React.JSX.Element {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [historyState, setHistoryState] = useState<HistoryState>({ status: "loading" });
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [toolActionError, setToolActionError] = useState("");
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

  return (
    <main className="app-shell">
      <section className="overview">
        <div>
          <p className="eyebrow">Maple</p>
          <h1>Modern Nmap workbench</h1>
          <p className="summary">
            Build scan profiles, inspect live results, keep local history, and export clean reports
            without bundling Nmap.
          </p>
        </div>
        <div className="status-panel">
          <span>Environment</span>
          <strong>{statusText(state)}</strong>
          <ThemeModePicker mode={themeMode} onChange={setThemeMode} />
        </div>
      </section>

      <ScanWorkspace
        nmapPath={nmapPathFor(state)}
        onScanFinished={() => refreshHistory(setHistoryState)}
      />

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
        {historyState.status === "failed" ? <p className="error">{historyState.message}</p> : null}
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
        {state.status === "ready" ? (
          <ToolStatusList tools={state.tools} onError={setToolActionError} />
        ) : null}
      </section>
    </main>
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

function nmapPathFor(state: LoadState): string | undefined {
  if (state.status !== "ready") {
    return undefined;
  }
  return state.tools.find((tool) => tool.name === "nmap" && tool.installed)?.path;
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
