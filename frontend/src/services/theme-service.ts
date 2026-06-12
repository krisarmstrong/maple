import { useEffect, useState } from "react";
import { isThemeMode, resolveThemeMode, type ThemeMode } from "../core/theme";

const storageKey = "maple.themeMode";

export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(readThemeMode);

  useEffect(() => {
    storage()?.setItem(storageKey, mode);
    applyTheme(mode);
  }, [mode]);

  useEffect(() => watchSystemTheme(mode), [mode]);
  return [mode, setMode];
}

function readThemeMode(): ThemeMode {
  const stored = storage()?.getItem(storageKey) ?? null;
  return isThemeMode(stored) ? stored : "system";
}

function storage(): Storage | undefined {
  return typeof window.localStorage === "undefined" ? undefined : window.localStorage;
}

function applyTheme(mode: ThemeMode): void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  document.documentElement.dataset.theme = resolveThemeMode(mode, media.matches);
  document.documentElement.dataset.themeMode = mode;
}

function watchSystemTheme(mode: ThemeMode): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const update = (): void => applyTheme(mode);
  media.addEventListener("change", update);
  update();
  return () => media.removeEventListener("change", update);
}
