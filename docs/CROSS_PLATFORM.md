# Cross-Platform Builds

Maple is a Wails desktop app. The frontend is React, but the deliverable is a native desktop application.

## Build Targets

```bash
make package-macos
make package-macos-installer
make package-windows
make package-linux
make package-linux-installers
make package-all
```

The targets use Wails v2.12 and pinned frontend tooling from `frontend/package-lock.json`.
Linux `.deb` and `.rpm` artifacts are built with nFPM from the Wails Linux binary; Nmap remains a separately installed user dependency.

Command-generation checks that do not require the target OS packaging toolchain:

```bash
make package-dryrun
make package-macos-dryrun
make package-windows-dryrun
make package-windows-amd64-dryrun
make package-windows-arm64-dryrun
make package-linux-dryrun
make package-linux-amd64-dryrun
make package-linux-arm64-dryrun
```

## Platform Notes

### macOS

- Target: `darwin/arm64`
- Runtime: Wails WebKit wrapper.
- Nmap must be installed separately, for example through Homebrew or the Nmap Project package.
- CI artifacts: compressed Wails `.app` output plus an unsigned `.pkg` installer from the `macos-15` runner.
- Signing and notarization require Apple credentials and are tracked separately from unsigned release-candidate artifacts.

### Windows

- Targets: `windows/amd64`, `windows/arm64`
- Runtime: Wails WebView2.
- Nmap must be installed separately.
- Npcap must be installed separately by the user if the chosen Nmap scan requires it.
- Maple must not ship Nmap, Npcap, Ndiff, Ncat, or Nping binaries.
- CI artifact: compressed Wails output with NSIS installer generation enabled.
- Authenticode signing requires certificate credentials and is tracked separately from unsigned release-candidate artifacts.

### Linux

- Targets: `linux/amd64`, `linux/arm64`
- Runtime: Wails WebKitGTK stack.
- CI baseline: Ubuntu 24.04 with Wails' `webkit2_41` build tag and WebKitGTK 4.1 runtime dependencies.
- Nmap must be installed separately through the distribution package manager or the Nmap Project packages.
- Maple must not ship Nmap, Ndiff, Ncat, or Nping binaries.
- Wails v2.12 reports that cross-compiling to Linux is not supported from macOS; run `make package-linux` on a Linux packaging host.
- CI artifacts: compressed Wails output plus `.deb` and `.rpm` packages built by nFPM on native Linux runners.

## GitHub Release Workflow

The `.github/workflows/release.yml` workflow builds the release matrix in CI:

| Artifact | Runner | Platform |
|---|---|---|
| `maple-macos-arm64` | `macos-15` | `darwin/arm64` |
| `maple-linux-amd64` | `ubuntu-24.04` | `linux/amd64` |
| `maple-linux-arm64` | `ubuntu-24.04-arm` | `linux/arm64` |
| `maple-windows-amd64` | `windows-2025` | `windows/amd64` |
| `maple-windows-arm64` | `windows-11-arm` | `windows/arm64` |

The workflow runs on version tags and can also be started manually. Tag builds publish the generated artifacts to a GitHub Release. Manual runs keep artifacts attached to the workflow run for inspection. Each matrix artifact includes a per-platform SHA256 manifest.

## Release Gate

Before publishing an artifact:

```bash
make rc-check
```

Then run the relevant smoke checklist in `docs/SMOKE_TEST.md` on the target operating system.
For Windows and Linux, the target-host smoke must include target validation, DNS resolver validation,
version intensity, preview argv tokens, one safe local scan, History details, and Raw XML, Full JSON,
and Markdown Report exports.

## Release Candidate Platform Bar

The release candidate platform bar is:

- macOS: `make build` produces a runnable desktop binary, CI builds the `darwin/arm64` Wails artifact plus `.pkg` installer, and the macOS smoke checklist passes.
- Windows: CI builds `windows/amd64` and `windows/arm64` Wails artifacts with NSIS enabled; final smoke runs on a Windows host with user-installed Nmap and, when needed, user-installed Npcap.
- Linux: CI builds `linux/amd64` and `linux/arm64` Wails artifacts plus `.deb` and `.rpm` packages; final smoke runs on a Linux host with user-installed Nmap and WebKitGTK dependencies.

Signed and notarized installers require platform signing credentials. Unsigned CI artifacts are the release-candidate packaging gate until those credentials exist.

## Current Packaging Note

On macOS 26 SDK with Wails v2.12.0, `make build` succeeds and produces a runnable desktop binary, but `wails build` package mode currently reports `exit status 1` during the Wails compile wrapper even when the equivalent `go build` command succeeds. Keep `make build` as the validated local binary path until this Wails/SDK packaging issue is resolved on the packaging host.

`make package-dryrun` validates macOS ARM, Windows x86/ARM, and Linux x86/ARM package command generation on macOS. Linux dry-runs report Wails' cross-compilation limitation and should be treated as a reminder to package Linux on Linux or in CI.
