import { ClipboardSetText } from "../../wailsjs/runtime/runtime";

export async function copyText(text: string): Promise<void> {
  const copied = await ClipboardSetText(text);
  if (!copied) {
    throw new Error("Unable to copy argv to clipboard.");
  }
}
