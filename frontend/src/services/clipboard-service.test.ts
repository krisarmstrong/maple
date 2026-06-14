import { describe, expect, it, vi } from "vitest";
import { ClipboardSetText } from "../../wailsjs/runtime/runtime";
import { copyText } from "./clipboard-service";

vi.mock("../../wailsjs/runtime/runtime", () => ({
  ClipboardSetText: vi.fn(),
}));

const clipboardSetTextMock = vi.mocked(ClipboardSetText);

describe("clipboard service", () => {
  it("copies text through the Wails runtime clipboard", async () => {
    clipboardSetTextMock.mockResolvedValue(true);

    await copyText("nmap -- scanme.nmap.org");

    expect(clipboardSetTextMock).toHaveBeenCalledWith("nmap -- scanme.nmap.org");
  });

  it("reports clipboard write failures", async () => {
    clipboardSetTextMock.mockResolvedValue(false);

    await expect(copyText("nmap")).rejects.toThrow("Unable to copy argv to clipboard.");
  });
});
