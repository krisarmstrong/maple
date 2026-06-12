interface WailsRuntimeBridge {
  EventsOnMultiple?: unknown;
}

interface WailsBackendBridge {
  main?: {
    App?: Record<string, unknown>;
  };
}

interface WailsGlobal {
  go?: WailsBackendBridge;
  runtime?: WailsRuntimeBridge;
}

export function hasWailsBackend(): boolean {
  return wailsGlobal().go?.main?.App !== undefined;
}

export function hasWailsRuntime(): boolean {
  return typeof wailsGlobal().runtime?.EventsOnMultiple === "function";
}

export function unavailableBridgeError(): Error {
  return new Error("Maple desktop bridge is unavailable.");
}

function wailsGlobal(): WailsGlobal {
  return globalThis as WailsGlobal;
}
