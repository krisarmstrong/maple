# Maple Smoke Test

Run this checklist before tagging a build or making the initial baseline commit.

## macOS Desktop Smoke

Automated browser smoke:

```bash
npm --prefix frontend run test:e2e:install
make test-e2e
```

Expected:

- Chromium desktop and mobile smoke checks pass.
- System theme is selected by default.
- Configure, Options, Scripts, Output, Environment, and Help render without horizontal overflow.
- Target Builder mode summaries are visible.
- Help and Environment continue to explain that Nmap and Npcap are not bundled.

Native desktop smoke:

```bash
make build
build/bin/maple
```

Expected:

- A native Maple window opens.
- The Environment panel reports local tool detection.
- If Nmap is installed, Nmap appears as detected with its version.
- If Nmap is missing, Maple shows a clear missing-tool state and disables scan actions.
- Environment accepts a validated custom Nmap binary path and can clear it back to PATH detection.
- The app creates a local history store under the platform app config directory.
- The Scan view starts with System theme selected by default.
- Configure, Options, Scripts, Output, History, Environment, and Help are reachable without horizontal overflow.

Recommended scan:

1. In Target Builder, choose `Single target` and enter `10.0.0.1` on an owned local network.
   Use `127.0.0.1` when no local gateway target is available.
2. Confirm Target Builder shows accepted syntax, parsed target type, estimated addresses, and `Matches selected target type`.
3. Switch to `Subnet` without changing the target and confirm Target Builder explains the mismatch before preview or run.
4. Switch back to `Single target`.
5. Open Options and confirm structured controls render for discovery, DNS, scan technique, ports, version detail, timing, packet shaping, and identity/evasion.
6. In Scan shape, enter DNS servers such as `1.1.1.1,8.8.8.8`, then switch DNS to `Skip DNS lookup` and confirm the resolver list clears.
7. In Ports, enter Version intensity `7` and confirm Service detection is enabled. Select `All probes` and confirm the custom intensity clears.
8. Open Scripts and confirm built-in categories, named scripts, absolute custom script paths, custom script directories, script args, and script args files are available without raw shell input.
9. Click `Preview`.
10. Confirm Output shows Run status, Preview argv, Live log, and Diagnostics sections.
11. Confirm the command is shown as argv tokens and includes `--` before the target.
   The XML output path should appear as Maple's managed XML placeholder, not as `-oX -`.
12. Click `Copy argv` and confirm Maple reports that argv was copied.
13. Click `Run Scan`.
14. Confirm the live log does not show raw XML.
15. Confirm a history row appears with `exit 0` for a successful Nmap run.
16. Open `Details` and confirm host/port rows are grouped and readable.
17. Test Details filters: `All ports`, `Open ports`, `Hosts up`, and `Hosts with findings`.
18. Export Raw XML, Full JSON, and Markdown Report.
19. Confirm each export shows the generated filename and saved path.
20. Open Help and confirm Nmap Option Coverage reports zero tracked option gaps.
21. Load local Nmap help and confirm search filters the local help output.
22. Optional owned-network subnet smoke: choose `Subnet`, enter `10.0.0.0/24`, preview only
    first, confirm the large-scan warning is visible, then run only when the network scope is
    authorized.

## Windows Smoke

Prerequisites:

- Install Maple from the Windows CI artifact for the host architecture.
- Install Nmap separately from the Nmap Project.
- Install Npcap separately if the selected Nmap scan mode requires it.

Expected:

- Maple starts without requiring bundled Nmap or bundled Npcap.
- Tool detection finds user-installed `nmap.exe` when it is on `PATH`.
- A custom absolute `nmap.exe` path can be validated and used when Nmap is outside `PATH`.
- Missing Nmap is reported cleanly.
- Target Builder, DNS resolver validation, version intensity, preview argv tokens, scan/history/details, and all three export formats pass against a safe local target such as `127.0.0.1` or an owned gateway such as `10.0.0.1`.
- The Windows CI artifact is unsigned unless a signing certificate has been configured.

## Linux Smoke

Prerequisites:

- Install Maple from the Linux `.deb`, `.rpm`, or compressed Wails CI artifact for the host architecture.
- Install Nmap separately through the distribution package manager or the Nmap Project packages.

Expected:

- Maple starts with the system WebKit dependencies required by Wails.
- Tool detection finds user-installed `nmap` when it is on `PATH`.
- A custom absolute `nmap` path can be validated and used when Nmap is outside `PATH`.
- Missing Nmap is reported cleanly.
- Target Builder, DNS resolver validation, version intensity, preview argv tokens, scan/history/details, and all three export formats pass against a safe local target such as `127.0.0.1` or an owned gateway such as `10.0.0.1`.
- The Linux `.deb` and `.rpm` packages recommend Nmap but do not bundle it.

## Invariants

- Maple never bundles or redistributes Nmap, Npcap, Ndiff, Ncat, or Nping.
- Maple invokes tools with argv arrays only.
- Raw Nmap XML is preserved for export but hidden from the live log.
- Preview and execution remain argv-only.
- Successful Nmap runs record `exit 0`.
