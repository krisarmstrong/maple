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
- Configure, Options, Scripts, Output, History, Environment, and Help are reachable without horizontal overflow.

Recommended scan:

1. In Target Builder, choose `Single target` and enter `127.0.0.1`.
2. Confirm Target Builder shows accepted syntax, parsed target type, and estimated addresses.
3. Open Options and confirm structured controls render for discovery, scan technique, ports, timing, packet shaping, and identity/evasion.
4. Open Scripts and confirm built-in categories, named scripts, absolute custom script paths, custom script directories, script args, and script args files are available without raw shell input.
5. Click `Preview`.
6. Confirm Output shows Run status, Preview argv, Live log, and Diagnostics sections.
7. Confirm the command is shown as argv tokens and includes `--` before the target.
   The XML output path should appear as Maple's managed XML placeholder, not as `-oX -`.
8. Click `Run Scan`.
9. Confirm the live log does not show raw XML.
10. Confirm a history row appears with `exit 0` for a successful Nmap run.
11. Open `Details` and confirm host/port rows are grouped and readable.
12. Test Details filters: `All ports`, `Open ports`, `Hosts up`, and `Hosts with findings`.
13. Export Raw XML, Full JSON, and Markdown Report.
14. Confirm each export shows the generated filename and saved path.
15. Open Help and confirm Nmap Option Coverage reports zero planned option gaps.

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
- The macOS `make package-windows-dryrun` command is documented as the local package command-generation gate; final smoke happens on Windows.

## Linux Smoke

Prerequisites:

- Install Maple.
- Install Nmap separately through the distribution package manager or the Nmap Project packages.

Expected:

- Maple starts with the system WebKit dependencies required by Wails.
- Tool detection finds user-installed `nmap` when it is on `PATH`.
- Missing Nmap is reported cleanly.
- Target Builder, preview argv tokens, scan/history/details, and all three export formats pass.
- The macOS `make package-linux-dryrun` command records Wails' cross-compilation limitation; final smoke happens on Linux.

## Invariants

- Maple never bundles or redistributes Nmap, Npcap, Ndiff, Ncat, or Nping.
- Maple invokes tools with argv arrays only.
- Raw Nmap XML is preserved for export but hidden from the live log.
- Preview and execution remain argv-only.
- Successful Nmap runs record `exit 0`.
