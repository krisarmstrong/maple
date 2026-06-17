import { useState } from "react";
import { parseTargets } from "../core/scan-targets";
import { getToolStatus, type LoadState, type ToolDetection } from "../core/tool-detection";

export function UtilityToolsWorkspace({ state }: { state: LoadState }): React.JSX.Element {
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
