import {
  AppVersion,
  DetectTools,
  LoadNmapHelp,
  OpenNmapDownloads,
  OpenNmapNSEDocs,
  OpenNmapReferenceGuide,
} from "../../wailsjs/go/main/App";
import type { BuildVersionInfo } from "../core/build-version";
import type { ToolDetection } from "../core/tool-detection";
import type { ToolHelp } from "../core/tool-help";
import { hasWailsBackend, unavailableBridgeError } from "./wails-bridge";

export async function detectTools(): Promise<ToolDetection[]> {
  if (!hasWailsBackend()) {
    return [];
  }
  return DetectTools();
}

export async function appVersion(): Promise<BuildVersionInfo> {
  if (!hasWailsBackend()) {
    return {
      version: "dev",
      commit: "unknown",
      buildTime: "unknown",
      uiBuildHash: "unknown",
    };
  }
  return AppVersion();
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
