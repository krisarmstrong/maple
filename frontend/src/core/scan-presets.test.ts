import { describe, expect, it } from "vitest";
import { defaultScanOptions } from "./scan-options";
import { loadSavedPresets, makePresetID, savedPresetStorageKey, savePreset } from "./scan-presets";

describe("scan-presets", () => {
  it("loads saved presets from storage", () => {
    const storage = storageWith(
      JSON.stringify([
        {
          id: "web-check",
          name: "Web Check",
          profileId: "service",
          options: defaultScanOptions,
          scriptCategories: ["safe"],
          scriptNames: "http-title",
          customScriptPaths: "",
          customScriptDirectories: "",
          scriptArgs: "",
          scriptArgsFile: "",
        },
      ]),
    );

    expect(loadSavedPresets(storage)).toHaveLength(1);
    expect(loadSavedPresets(storage)[0]?.name).toBe("Web Check");
  });

  it("ignores malformed storage", () => {
    expect(loadSavedPresets(storageWith("{bad json"))).toEqual([]);
    expect(loadSavedPresets(storageWith(JSON.stringify([{ id: 42 }])))).toEqual([]);
  });

  it("saves newest matching preset first", () => {
    const storage = storageWith("[]");
    const next = savePreset(storage, [], {
      id: "web-check",
      name: "Web Check",
      profileId: "service",
      options: defaultScanOptions,
      scriptCategories: ["safe"],
      scriptNames: "http-title",
      customScriptPaths: "",
      customScriptDirectories: "",
      scriptArgs: "",
      scriptArgsFile: "",
    });

    expect(next[0]?.name).toBe("Web Check");
    expect(storage.getItem(savedPresetStorageKey)).toContain("Web Check");
  });

  it("builds stable ids from names", () => {
    expect(makePresetID(" Web / TLS Check ")).toBe("web-tls-check");
  });
});

function storageWith(initial: string): Storage {
  let value = initial;
  return {
    get length() {
      return 1;
    },
    clear: () => {
      value = "";
    },
    getItem: () => value,
    key: () => savedPresetStorageKey,
    removeItem: () => {
      value = "";
    },
    setItem: (_key: string, nextValue: string) => {
      value = nextValue;
    },
  };
}
