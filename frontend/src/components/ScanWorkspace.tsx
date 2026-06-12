import { useEffect, useState } from "react";
import { findProfile, type ScanProfileID, scanProfiles } from "../core/scan-profiles";
import {
  type TargetModeID,
  targetModeHelp,
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

export function ScanWorkspace({ nmapPath, onScanFinished }: ScanWorkspaceProps): React.JSX.Element {
  const [targets, setTargets] = useState("");
  const [targetModeId, setTargetModeId] = useState<TargetModeID>("single");
  const [profileId, setProfileId] = useState<ScanProfileID>("connect");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const targetSummary = summarizeTargets(targets);
  const selectedProfile = findProfile(profileId);

  useEffect(
    () =>
      onScanEvent((event) =>
        handleScanEvent(event, { setRunning, setLog, setStatus, onScanFinished }),
      ),
    [onScanFinished],
  );

  async function previewCommand(): Promise<void> {
    const request = makeRequest(profileId, targetModeId, targets, nmapPath);
    if (request === undefined) {
      setError(messageForInvalidTargets(targetModeId, targets));
      return;
    }
    setError("");
    setPreview(await previewScanCommand(request));
  }

  async function runScan(): Promise<void> {
    const request = makeRequest(profileId, targetModeId, targets, nmapPath);
    if (request === undefined) {
      setError(messageForInvalidTargets(targetModeId, targets));
      return;
    }
    setError("");
    setLog([]);
    setStatus("running");
    await startScan(request);
  }

  function updateTargetMode(modeId: TargetModeID): void {
    setTargetModeId(modeId);
    updateTargets(targetModePlaceholder(modeId), setTargets, setPreview);
    setError("");
  }

  return (
    <section className="workspace scan-workspace">
      <div className="workspace-header">
        <div>
          <h2>New Scan</h2>
          <p>Choose a safe profile, validate targets, preview argv, then run Nmap locally.</p>
        </div>
        <button disabled={!running} onClick={() => void cancelScan()} type="button">
          Cancel
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
            <span>Targets</span>
            <textarea
              onChange={(event) => updateTargets(event.target.value, setTargets, setPreview)}
              placeholder={targetModePlaceholder(targetModeId)}
              rows={5}
              value={targets}
            />
          </label>
          <p className="target-mode-help">{targetModeHelp(targetModeId)}</p>
        </div>
      </div>
      <ProfileSummary profile={selectedProfile} />

      {error === "" ? null : <p className="error">{error}</p>}
      {status === "idle" ? null : <p className="scan-status">{scanStatusLabel(status)}</p>}
      {targetSummary === "" ? null : <p className="target-summary">{targetSummary}</p>}
      {preview.length === 0 ? null : <code className="command-preview">{preview.join(" ")}</code>}

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
      </div>

      <output className="scan-log" data-testid="scan-log">
        {log.map((entry) => (
          <span key={entry.id}>{entry.text}</span>
        ))}
      </output>
    </section>
  );
}
