# Maple Smoke Test

Run this checklist before tagging a build or making the initial baseline commit.

## macOS Desktop Smoke

```bash
make build
build/bin/maple
```

Expected:

- A native Maple window opens.
- The Environment panel reports local tool detection.
- If Nmap is installed, Nmap appears as detected with its version.
- If Nmap is missing, Maple shows a clear missing-tool state and disables scan actions.
- The app creates a local history store under the platform app config directory.

Recommended scan:

1. Enter `127.0.0.1` as a single target.
2. Click `Preview`.
3. Confirm the command is argv-shaped and includes `--` before the target.
4. Click `Run Scan`.
5. Confirm the live log does not show raw XML.
6. Confirm a history row appears with `exit 0` for a successful Nmap run.
7. Open `Details` and confirm host/port rows are readable.
8. Export XML, JSON, and Markdown report.

## Windows Smoke

Prerequisites:

- Install Maple.
- Install Nmap separately from the Nmap Project.
- Install Npcap separately if the selected Nmap scan mode requires it.

Expected:

- Maple starts without requiring bundled Nmap or bundled Npcap.
- Tool detection finds user-installed `nmap.exe` when it is on `PATH`.
- Missing Nmap is reported cleanly.
- The same scan/history/export checklist passes.

## Linux Smoke

Prerequisites:

- Install Maple.
- Install Nmap separately through the distribution package manager or the Nmap Project packages.

Expected:

- Maple starts with the system WebKit dependencies required by Wails.
- Tool detection finds user-installed `nmap` when it is on `PATH`.
- Missing Nmap is reported cleanly.
- The same scan/history/export checklist passes.

## Invariants

- Maple never bundles or redistributes Nmap, Npcap, Ndiff, Ncat, or Nping.
- Maple invokes tools with argv arrays only.
- Raw Nmap XML is preserved for export but hidden from the live log.
- Successful Nmap runs record `exit 0`.
