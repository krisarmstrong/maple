# Maple Architecture

Maple is a local Nmap workbench with a Go backend, React frontend, and Wails desktop shell.

## Desktop Shell Decision

Beta 2 ships as a Wails desktop app. Wails gives Maple a native window, local file dialogs, clipboard access, platform config paths, and direct argv-only process execution without exposing a local HTTP service.

The frontend is intentionally written as normal React because that keeps the UI portable. If Maple later needs a browser-served Web UI, the scanner, history, reports, and platform detection boundaries are already separated from the React components.

## Why Not Browser-Only Yet

A browser-only app would need a local server process for scans, exports, and Nmap detection. That is viable, but it changes the beta surface:

- Localhost port allocation and firewall prompts become user-facing.
- Browser origin and CSRF rules become part of the security model.
- File export, clipboard, and process lifecycle behavior need separate browser/server handling.
- Windows and Linux install validation expands from one desktop runtime to a service plus browser flow.

For Beta 2, the desktop shell is the smaller and safer release shape. A browser Web UI should be treated as a planned product mode, not an accidental side effect of the React frontend.

## Boundaries To Preserve

- Nmap execution stays argv-only.
- Maple does not bundle Nmap, Npcap, Ncat, Ndiff, or Nping.
- Scanner logic stays in Go packages under `internal/`.
- React services remain thin bridge wrappers around Wails calls.
- Export/history/report logic remains independent of the desktop shell.
