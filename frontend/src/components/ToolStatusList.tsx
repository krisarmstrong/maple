import { getToolStatus, type ToolDetection } from "../core/tool-detection";
import { openNmapDownloads } from "../services/tool-service";

interface ToolStatusListProps {
  tools: readonly ToolDetection[];
  onError?: (message: string) => void;
}

export function ToolStatusList({ tools, onError }: ToolStatusListProps): React.JSX.Element {
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
              {tool.belowMinVersion === true &&
              tool.version !== undefined &&
              tool.minVersion !== undefined ? (
                <p className="tool-hint tool-hint--warning" data-testid="nmap-version-warning">
                  {`${tool.version} is older than the recommended minimum ${tool.minVersion}; some scan options or scripts may not work.`}
                </p>
              ) : null}
              {shouldShowDownloadButton(tool) ? (
                <button
                  className="link-button"
                  type="button"
                  onClick={() => void openDownloads(onError)}
                >
                  Open official Nmap downloads
                </button>
              ) : null}
            </div>
            <span>{labelForStatus(status)}</span>
          </article>
        );
      })}
    </div>
  );
}

async function openDownloads(onError: ToolStatusListProps["onError"]): Promise<void> {
  try {
    await openNmapDownloads();
  } catch (caught: unknown) {
    const message = caught instanceof Error ? caught.message : "Unable to open Nmap downloads";
    onError?.(message);
  }
}

function shouldShowDownloadButton(tool: ToolDetection): boolean {
  return tool.name === "nmap" && !tool.installed;
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
