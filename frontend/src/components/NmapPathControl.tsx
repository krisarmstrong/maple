import { useState } from "react";
import type { ToolDetection } from "../core/tool-detection";
import { chooseNmapPath, detectNmapPath } from "../services/tool-service";

interface NmapPathControlProps {
  nmapPath: string;
  onPathChange: (path: string) => void;
}

export function NmapPathControl({
  nmapPath,
  onPathChange,
}: NmapPathControlProps): React.JSX.Element {
  const [candidatePath, setCandidatePath] = useState(nmapPath);
  const [detection, setDetection] = useState<ToolDetection | undefined>(undefined);
  const [message, setMessage] = useState("");

  async function validatePath(): Promise<void> {
    setMessage("");
    const result = await detectNmapPath(candidatePath);
    setDetection(result);
    if (result.installed && result.path !== undefined && result.path !== "") {
      onPathChange(result.path);
      return;
    }
    setMessage(result.error ?? "Unable to validate the selected Nmap binary.");
  }

  async function browsePath(): Promise<void> {
    setMessage("");
    const path = await chooseNmapPath();
    if (path !== "") {
      setCandidatePath(path);
    }
  }

  function clearPath(): void {
    setCandidatePath("");
    setDetection(undefined);
    setMessage("");
    onPathChange("");
  }

  return (
    <section className="custom-tool-path">
      <div>
        <h3>Custom Nmap Binary</h3>
        <p>Use this when Nmap is installed outside PATH.</p>
      </div>
      <label>
        <span>Custom Nmap binary</span>
        <input
          onChange={(event) => setCandidatePath(event.target.value)}
          placeholder="/usr/local/bin/nmap"
          value={candidatePath}
        />
      </label>
      <div className="inline-actions">
        <button type="button" onClick={() => void browsePath()}>
          Browse
        </button>
        <button
          disabled={candidatePath.trim() === ""}
          type="button"
          onClick={() => void validatePath()}
        >
          Validate and use
        </button>
        {nmapPath === "" ? null : (
          <button type="button" onClick={clearPath}>
            Use PATH detection
          </button>
        )}
      </div>
      {detection?.installed === true ? (
        <p className="success">
          {detection.version ?? detection.path ?? "Custom Nmap path ready."}
        </p>
      ) : null}
      {message === "" ? null : <p className="error">{message}</p>}
    </section>
  );
}
