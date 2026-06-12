import { getToolStatus, type ToolDetection } from "../core/tool-detection";

interface ToolStatusListProps {
  tools: readonly ToolDetection[];
}

export function ToolStatusList({ tools }: ToolStatusListProps): React.JSX.Element {
  return (
    <div className="tool-list" data-testid="tool-status-list">
      {tools.map((tool) => {
        const status = getToolStatus(tool);
        return (
          <article className={`tool-card tool-card--${status}`} key={tool.name}>
            <div>
              <h3>{tool.displayName}</h3>
              <p>{tool.version ?? tool.path ?? tool.error ?? "Not detected"}</p>
              {tool.installed ||
              tool.installHint === undefined ||
              tool.installHint === "" ? null : (
                <p className="tool-hint">{tool.installHint}</p>
              )}
            </div>
            <span>{labelForStatus(status)}</span>
          </article>
        );
      })}
    </div>
  );
}

function labelForStatus(status: ReturnType<typeof getToolStatus>): string {
  if (status === "installed") {
    return "Detected";
  }
  if (status === "missing-required") {
    return "Required";
  }
  return "Optional";
}
