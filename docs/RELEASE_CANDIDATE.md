# Release Candidate Checklist

Maple is release-candidate ready when the local RC gate passes and target-host smoke is either
complete or explicitly tracked as pending external validation.

## Local RC Gate

Run from the repository root:

```bash
make rc-check
```

This expands to:

- `make fmt-check`
- `make lint`
- `make test`
- `make test-e2e`
- `make security`
- `make build`
- `make package-dryrun`

Expected result:

- Frontend and Go formatting are clean.
- Go tests and frontend unit tests pass.
- Browser smoke passes for desktop and mobile Chromium.
- `govulncheck` reports no vulnerabilities.
- `build/bin/maple` is produced.
- macOS ARM and Windows x86/ARM package command dry-runs are valid.
- Linux x86/ARM dry-runs document Wails' macOS cross-compilation limitation.

## Native Smoke

Run the checklist in `docs/SMOKE_TEST.md` on each target host:

- macOS with user-installed Nmap.
- Windows with user-installed Nmap and user-installed Npcap when a scan mode requires it.
- Linux with user-installed Nmap and Wails WebKitGTK runtime dependencies.

Required smoke coverage:

- System theme default.
- Target Builder validation for single host, range, subnet, and list modes.
- Preview argv tokens with `--` before targets.
- A safe local scan such as `127.0.0.1`.
- Readable History details.
- Raw XML, Full JSON, and Markdown Report exports.
- Environment and Help guidance that Maple does not bundle Nmap, Npcap, Ncat, Ndiff, or Nping.

## CI Release Gate

The GitHub release workflow builds unsigned artifacts for:

- macOS ARM: Wails `darwin/arm64`.
- macOS ARM installer: unsigned `.pkg` generated from the Wails `.app`.
- Linux x86: Wails `linux/amd64`, `.deb`, and `.rpm`.
- Linux ARM: Wails `linux/arm64`, `.deb`, and `.rpm`.
- Windows x86: Wails `windows/amd64` with NSIS enabled.
- Windows ARM: Wails `windows/arm64` with NSIS enabled.

Linux artifacts build on Ubuntu 24.04 runners with the Wails `webkit2_41` tag and WebKitGTK 4.1 package dependencies. Manual workflow runs keep artifacts on the run. Tag builds publish the artifacts to a GitHub Release. Every platform artifact includes a SHA256 manifest. Signing and notarization are intentionally not part of this gate until the required platform credentials are available.

Before upload, CI verifies that each platform produced the expected files:

- macOS: compressed Wails output, Wails `.app`, unsigned `.pkg`, and SHA256 manifest.
- Linux: compressed Wails output, `.deb`, `.rpm`, and SHA256 manifest.
- Windows: compressed Wails output containing installer/executable output and SHA256 manifest.

## Release Constraints

- Keep Wails v2.12.0.
- Keep Go 1.26.4.
- Keep Node 26.3.0.
- Keep React 19.2.7.
- Keep frontend tooling pinned through `frontend/package-lock.json`.
- Never accept shell command strings.
- Never bundle or redistribute Nmap, Npcap, Ncat, Ndiff, or Nping.
