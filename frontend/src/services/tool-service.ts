import { DetectTools, OpenNmapDownloads } from "../../wailsjs/go/main/App";
import type { ToolDetection } from "../core/tool-detection";
import { hasWailsBackend, unavailableBridgeError } from "./wails-bridge";

export async function detectTools(): Promise<ToolDetection[]> {
  if (!hasWailsBackend()) {
    return [];
  }
  return DetectTools();
}

export function openNmapDownloads(): Promise<void> {
  if (!hasWailsBackend()) {
    return Promise.reject(unavailableBridgeError());
  }
  return OpenNmapDownloads();
}
