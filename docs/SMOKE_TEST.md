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
- The Scan view starts with System theme selected by default.

Recommended scan:

1. In Target Builder, choose `Single target` and enter `127.0.0.1`.
2. Confirm Target Builder shows accepted syntax, parsed target type, and estimated addresses.
2. Click `Preview`.
3. Confirm Output shows Run status, Preview argv, Live log, and Diagnostics sections.
4. Confirm the command is shown as argv tokens and includes `--` before the target.
   The XML output path should appear as Maple's managed XML placeholder, not as `-oX -`.
5. Click `Run Scan`.
6. Confirm the live log does not show raw XML.
7. Confirm a history row appears with `exit 0` for a successful Nmap run.
8. Open `Details` and confirm host/port rows are grouped and readable.
9. Test Details filters: `All ports`, `Open ports`, `Hosts up`, and `Hosts with findings`.
10. Export Raw XML, Full JSON, and Markdown Report.
11. Confirm each export shows the generated filename and saved path.

## Windows Smoke

Prerequisites:

- Install Maple.
- Install Nmap separately from the Nmap Project.
- Install Npcap separately if the selected Nmap scan mode requires it.

Expected:

- Maple starts without requiring bundled Nmap or bundled Npcap.
- Tool detection finds user-installed `nmap.exe` when it is on `PATH`.
- Missing Nmap is reported cleanly.
- Target Builder, preview argv tokens, scan/history/details, and all three export formats pass.

## Linux Smoke

Prerequisites:

- Install Maple.
- Install Nmap separately through the distribution package manager or the Nmap Project packages.

Expected:

- Maple starts with the system WebKit dependencies required by Wails.
- Tool detection finds user-installed `nmap` when it is on `PATH`.
- Missing Nmap is reported cleanly.
- Target Builder, preview argv tokens, scan/history/details, and all three export formats pass.

## Invariants

- Maple never bundles or redistributes Nmap, Npcap, Ndiff, Ncat, or Nping.
- Maple invokes tools with argv arrays only.
- Raw Nmap XML is preserved for export but hidden from the live log.
- Preview and execution remain argv-only.
- Successful Nmap runs record `exit 0`.
