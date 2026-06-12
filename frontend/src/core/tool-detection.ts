export interface ToolDetection {
  name: string;
  displayName: string;
  required: boolean;
  installed: boolean;
  path?: string;
  version?: string;
  error?: string;
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
    return `${requiredMissing} required tool missing`;
  }

  const installed = tools.filter((tool) => tool.installed).length;
  return `${installed} tools detected`;
}
