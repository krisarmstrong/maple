# Cross-Platform Builds

Maple is a Wails desktop app. The frontend is React, but the deliverable is a native desktop application.

## Build Targets

```bash
make package-macos
make package-windows
make package-linux
make package-all
```

The targets use Wails v2.12 and pinned frontend tooling from `frontend/package-lock.json`.

Command-generation checks that do not require the target OS packaging toolchain:

```bash
make package-dryrun
make package-macos-dryrun
make package-windows-dryrun
make package-linux-dryrun
```

## Platform Notes

### macOS

- Target: `darwin/arm64`
- Runtime: Wails WebKit wrapper.
- Nmap must be installed separately, for example through Homebrew or the Nmap Project package.

### Windows

- Target: `windows/amd64`
- Runtime: Wails WebView2.
- Nmap must be installed separately.
- Npcap must be installed separately by the user if the chosen Nmap scan requires it.
- Maple must not ship Nmap, Npcap, Ndiff, Ncat, or Nping binaries.

### Linux

- Target: `linux/amd64`
- Runtime: Wails WebKitGTK stack.
- Nmap must be installed separately through the distribution package manager or the Nmap Project packages.
- Maple must not ship Nmap, Ndiff, Ncat, or Nping binaries.
- Wails v2.12 reports that cross-compiling to Linux is not supported from macOS; run `make package-linux` on a Linux packaging host.

## Release Gate

Before publishing an artifact:

```bash
make fmt-check
make lint
make test
make build
```

Then run the relevant smoke checklist in `docs/SMOKE_TEST.md` on the target operating system.

## Current Packaging Note

On macOS 26 SDK with Wails v2.12.0, `make build` succeeds and produces a runnable desktop binary, but `wails build` package mode currently reports `exit status 1` during the Wails compile wrapper even when the equivalent `go build` command succeeds. Keep `make build` as the validated local binary path until this Wails/SDK packaging issue is resolved on the packaging host.

`make package-dryrun` validates macOS and Windows package command generation on macOS. Linux dry-run reports Wails' cross-compilation limitation and should be treated as a reminder to package Linux on Linux.
