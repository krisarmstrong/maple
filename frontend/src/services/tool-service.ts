import {
  DetectTools,
  LoadNmapHelp,
  OpenNmapDownloads,
  OpenNmapNSEDocs,
  OpenNmapReferenceGuide,
} from "../../wailsjs/go/main/App";
import type { ToolDetection } from "../core/tool-detection";
import type { ToolHelp } from "../core/tool-help";
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

export function loadNmapHelp(): Promise<ToolHelp> {
  if (!hasWailsBackend()) {
    return Promise.reject(unavailableBridgeError());
  }
  return LoadNmapHelp();
}

export function openNmapReferenceGuide(): Promise<void> {
  if (!hasWailsBackend()) {
    return Promise.reject(unavailableBridgeError());
  }
  return OpenNmapReferenceGuide();
}

export function openNmapNSEDocs(): Promise<void> {
  if (!hasWailsBackend()) {
    return Promise.reject(unavailableBridgeError());
  }
  return OpenNmapNSEDocs();
}
