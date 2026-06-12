import { DetectTools } from "../../wailsjs/go/main/App";
import type { ToolDetection } from "../core/tool-detection";
import { hasWailsBackend } from "./wails-bridge";

export async function detectTools(): Promise<ToolDetection[]> {
  if (!hasWailsBackend()) {
    return [];
  }
  return DetectTools();
}
