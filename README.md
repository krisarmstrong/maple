# Maple

Maple is a modern desktop app for Nmap scans, profiles, live results, history, and reports.

Maple is built with Wails: a Go backend, a React frontend, and a native desktop shell. It is not a hosted website.

Maple is not affiliated with or endorsed by the Nmap Project. Maple does not bundle Nmap or Npcap; it detects and uses locally installed Nmap tools.

## Goals

- Provide a polished Nmap workbench for engineers.
- Keep generated commands visible before execution.
- Store scan history locally.
- Preserve original Nmap XML while adding structured views and reports.
- Keep the scanner backend replaceable so the UI architecture remains clean.

## Requirements

- Go 1.26.4
- Node.js 26.2.0
- npm 11.7.0 or newer
- Wails CLI 2.12.0
- React 19.2.7
- TypeScript 7 beta via `@typescript/native-preview` 7.0.0-dev.20260421.2 and `tsgo`
- Biome 2.5.0, Vite 8.0.16, and Vitest 4.1.8 from `frontend/package-lock.json`
- Nmap installed separately for real scans

## Development

```bash
make tidy
npm --prefix frontend ci
make test
make dev
```

## Build

```bash
make build
```

The local development binary is written to `build/bin/maple`.

Platform package targets:

```bash
make package-macos
make package-windows
make package-linux
make package-dryrun
```

Run the smoke checklist in `docs/SMOKE_TEST.md` on each target operating system before publishing an artifact.

See `docs/CROSS_PLATFORM.md` for current packaging notes. The validated local macOS path today is `make build`; Wails package mode needs target-host verification before release.

## Platform Notes

- macOS users install Nmap separately.
- Windows users install Nmap separately and install Npcap separately when their chosen Nmap scan mode requires it.
- Linux users install Nmap separately through their distribution package manager or the Nmap Project packages.
- Maple does not bundle or redistribute Nmap, Npcap, Ndiff, Ncat, or Nping.

## Legal Notes

Nmap is distributed by the Nmap Project under its own license. Maple invokes user-installed Nmap tools and does not redistribute Nmap, Npcap, or related binaries.
