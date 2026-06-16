export interface ToolDetection {
  name: string;
  displayName: string;
  required: boolean;
  installed: boolean;
  path?: string;
  version?: string;
  error?: string;
  installHint?: string;
  /** True when the detected Nmap version is older than the supported minimum. */
  belowMinVersion?: boolean;
  /** The minimum recommended version string (e.g. "7.80"). Set when belowMinVersion is true. */
  minVersion?: string;
}

export type ToolStatus = "installed" | "missing-required" | "missing-optional";

export function getToolStatus(tool: ToolDetection): ToolStatus {
  if (tool.installed) {
    return "installed";
  }
  return tool.required ? "missing-required" : "missing-optional";
}

export function summarizeTools(tools: readonly ToolDetection[]): string {
  const requiredMissing = tools.filter((tool) => tool.required && !tool.installed).length;
  if (requiredMissing > 0) {
    return `${requiredMissing} required ${requiredMissing === 1 ? "tool" : "tools"} missing`;
  }

  const installed = tools.filter((tool) => tool.installed).length;
  return `${installed} tools detected`;
}
