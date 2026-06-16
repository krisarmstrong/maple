import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import { onScanEvent } from "./scan-service";

vi.mock("../../wailsjs/go/main/App", () => ({
  CancelScan: vi.fn(),
  PreviewScan: vi.fn(),
  StartScan: vi.fn(),
}));

vi.mock("../../wailsjs/runtime/runtime", () => ({
  EventsOn: vi.fn(() => vi.fn()),
}));

const eventsOnMock = vi.mocked(EventsOn);

describe("onScanEvent", () => {
  beforeEach(() => {
    eventsOnMock.mockClear();
  });

  it("is a no-op when the Wails runtime bridge is unavailable", () => {
    const originalRuntime = runtimeBridge();
    setRuntimeBridge(undefined);

    const unsubscribe = onScanEvent(() => undefined);
    unsubscribe();

    expect(eventsOnMock).not.toHaveBeenCalled();
    setRuntimeBridge(originalRuntime);
  });

  it("subscribes to typed scan phase events", () => {
    const listener = vi.fn();

    const unsubscribe = onScanEvent(listener);
    const phaseSubscription = eventsOnMock.mock.calls.find((call) => call[0] === "scan:phase");
    phaseSubscription?.[1]({
      runId: "scan-1",
      phase: "launching",
      message: "Starting local Nmap process.",
    });
    unsubscribe();

    expect(listener).toHaveBeenCalledWith({
      type: "phase",
      phase: {
        runId: "scan-1",
        phase: "launching",
        message: "Starting local Nmap process.",
      },
    });
  });
});

function runtimeBridge(): unknown {
  return (globalThis as { runtime?: unknown }).runtime;
}

function setRuntimeBridge(runtime: unknown): void {
  (globalThis as { runtime?: unknown }).runtime = runtime;
}
