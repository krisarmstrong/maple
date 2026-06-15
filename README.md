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
- Node.js 26.3.0
- npm 11.17.0 or newer
- Wails CLI 2.12.0
- React 19.2.7
- TypeScript 7 beta via `@typescript/native-preview` 7.0.0-dev.20260614.1 and `tsgo`
- Biome 2.5.0, Vite 8.0.16, and Vitest 4.1.8 from `frontend/package-lock.json`
- Nmap installed separately for real scans

## Development

```bash
make tidy
npm --prefix frontend ci
make test
make test-e2e
make security
make dev
```

Release candidate validation:

```bash
make rc-check
```

## Build

```bash
make build
```

The local development binary is written to `build/bin/maple`.

Native package targets:

```bash
make package
make package-macos
make package-windows
make package-linux
make package-linux-installers
make package-dryrun
```

Run the smoke checklist in `docs/SMOKE_TEST.md` on each target operating system before publishing an artifact.
Local `make` package targets only build for the host operating system and architecture. Use `make package-dryrun` locally to validate native package command generation. The GitHub release matrix builds each release artifact on a matching native runner.

The GitHub release workflow builds unsigned artifacts for macOS ARM, Linux ARM/x86, and Windows ARM/x86. See `docs/RELEASE_CANDIDATE.md` and `docs/CROSS_PLATFORM.md` for current release and packaging notes.

## Versioning

Maple versions are tag-driven. Conventional commits merged to `main` feed release-please, which maintains `CHANGELOG.md`, opens release PRs, and creates `v*` tags. Release builds stamp the product from that git tag through the Go `internal/version` package; package versions strip the leading `v` only where installer tooling requires plain semver.

## Platform Notes

- macOS users install Nmap separately.
- Windows users install Nmap separately and install Npcap separately when their chosen Nmap scan mode requires it.
- Linux users install Nmap separately through their distribution package manager or the Nmap Project packages.
- Maple does not bundle or redistribute Nmap, Npcap, Ndiff, Ncat, or Nping.

## Legal Notes

Maple is licensed under the Apache License 2.0. See `LICENSE` and `NOTICE`.

Nmap is distributed by the Nmap Project under its own license. Maple invokes user-installed Nmap tools and does not redistribute Nmap, Npcap, or related binaries.
