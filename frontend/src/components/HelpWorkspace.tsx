import { useState } from "react";
import type { ToolHelp } from "../core/tool-help";
import { loadNmapHelp, openNmapNSEDocs, openNmapReferenceGuide } from "../services/tool-service";

type HelpState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; help: ToolHelp }
  | { status: "failed"; message: string };

export function HelpWorkspace(): React.JSX.Element {
  const [state, setState] = useState<HelpState>({ status: "idle" });
  const [linkError, setLinkError] = useState("");

  return (
    <section className="workspace help-workspace">
      <div className="workspace-header">
        <div>
          <h2>Help</h2>
          <p>Maple keeps its own guidance separate from official Nmap reference material.</p>
        </div>
      </div>

      <div className="help-grid">
        <article className="help-panel">
          <h3>Maple Guide</h3>
          <ul className="help-list">
            <li>Choose a target mode first: single host, range, subnet, or a pasted list.</li>
            <li>Use Ping Sweep before deeper scans when you are mapping an unfamiliar subnet.</li>
            <li>Add NSE categories or absolute custom script paths without typing raw commands.</li>
            <li>Export reports from completed scans when you need to share findings cleanly.</li>
          </ul>
        </article>

        <article className="help-panel">
          <h3>Official Nmap References</h3>
          <p>
            Maple opens official Nmap pages in your browser instead of bundling their manual or
            script documentation.
          </p>
          <div className="help-actions">
            <button
              type="button"
              onClick={() => openOfficialLink(openNmapReferenceGuide, setLinkError)}
            >
              Open Nmap Reference Guide
            </button>
            <button type="button" onClick={() => openOfficialLink(openNmapNSEDocs, setLinkError)}>
              Open NSE documentation
            </button>
          </div>
          {linkError === "" ? null : <p className="error">{linkError}</p>}
        </article>
      </div>

      <article className="help-panel local-help-panel">
        <div className="workspace-header compact-header">
          <div>
            <h3>Local Nmap Help</h3>
            <p>Loads help from the Nmap executable installed on this machine.</p>
          </div>
          <button type="button" onClick={() => loadLocalHelp(setState)}>
            {state.status === "loading" ? "Loading..." : "Load local Nmap help"}
          </button>
        </div>
        {state.status === "failed" ? <p className="error">{state.message}</p> : null}
        {state.status === "ready" ? (
          <div className="local-help-output">
            <p className="help-source-note">Loaded from {state.help.path}</p>
            <pre>{state.help.output}</pre>
          </div>
        ) : null}
      </article>
    </section>
  );
}

async function loadLocalHelp(setState: (state: HelpState) => void): Promise<void> {
  setState({ status: "loading" });
  try {
    const help = await loadNmapHelp();
    setState({ status: "ready", help });
  } catch (error) {
    setState({ status: "failed", message: errorMessage(error) });
  }
}

async function openOfficialLink(
  opener: () => Promise<void>,
  setError: (message: string) => void,
): Promise<void> {
  setError("");
  try {
    await opener();
  } catch (error) {
    setError(errorMessage(error));
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected help action failure.";
}
