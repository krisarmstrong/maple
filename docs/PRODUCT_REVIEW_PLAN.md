# Maple Product Review Plan

Updated: 2026-06-16

Maple has reached a local unsigned release-candidate shape. The current bar remains a polished
local desktop Nmap workbench that preserves Nmap power without exposing raw shell command entry,
bundles no Nmap/Npcap tools, and remains understandable on macOS, Windows, and Linux.

The active release train is tracked in `docs/RELEASE_TRAIN.md`: `v0.3.0 Beta 2` focuses on
stronger NSE, recipes, and option building; `v0.4.0 Release Candidate` focuses on docs, polish,
package trust, and platform smoke closure.

## Current Assessment

- Scan setup, target validation, recipes, options, scripts, output preview, history, exports,
  environment detection, and help are implemented.
- Local gates pass: `make rc-check`.
- Screenshot QA found no horizontal overflow, no raw XML console display, and no stale
  profile/preset wording.
- A 2026-06-16 real scan against an owned `10.0.0.1` gateway completed with `exit 0` using
  user-installed Nmap 7.99 and produced readable service results.

## Remaining Workstreams

1. **Responsive and Visual QA**
   - Keep desktop, tablet, mobile, and narrow viewport screenshots as a release gate.
   - Guard target setup against cramped intermediate widths.
   - Keep chip/tab controls large enough for touch and high-DPI desktop use.
   - Status: in progress.

2. **First-Run and Tool Readiness**
   - Add a first-run checklist for Nmap availability, optional Npcap guidance on Windows, and
     permission expectations for privileged scans.
   - Make the disabled Preview/Run state explain whether the blocker is missing Nmap, invalid
     target input, or invalid options.
   - Add a one-click route from Scan to Environment when Nmap is missing.
   - Status: scan blockers and Environment checklist implemented.

3. **Utility Tool Workspaces**
   - Add focused UI for detected Nmap suite tools: Ncat, Ndiff, and Nping.
   - Keep these as argv-safe builders, not raw shell fields.
   - Start with read-only/help and safe builders before adding deeper workflows.
   - Status: preview-only argv builders implemented for Ncat, Ndiff, and Nping.

4. **Nmap Option Builder Depth**
   - Expand the structured option model for high-value flags that are still help-only.
   - Add searchable option descriptions that map directly to existing structured controls.
   - Keep unsupported expert flags visible as roadmap items rather than adding arbitrary command
     strings.
   - Status: option coverage search now maps entries to their Maple UI control locations.

5. **NSE Script Workflow**
   - Improve script search results with richer descriptions, category badges, and risk badges.
   - Add selected-script details so users understand what a script does before running it.
   - Improve custom script file/directory validation and explain absolute-path requirements inline.
   - Status: category/script descriptions, noisy/intrusive badges, richer discovery search, and a
     30-recipe built-in library are implemented in script browsing.

6. **Scan Run Reliability**
   - Add clearer live run phases: validating, launching, running, parsing, saving history.
   - Improve cancelled/failed/partial-result language.
   - Keep raw XML out of live output while preserving XML/JSON/Markdown exports.
   - Status: Output status copy, cancellation feedback, diagnostics details, tab contrast, and
     backend scan phase events are implemented.

7. **History and Reporting**
   - Add richer filtering and sorting for hosts, ports, services, and findings.
   - Add report preview/export affordances that confirm filenames and saved paths.
   - Add comparison groundwork for future Ndiff integration.
   - Status: history sorting by newest, oldest, open ports, hosts up, and review-needed scans
     implemented; saved XML records can now preview an argv-only Ndiff comparison.

8. **Safety Guardrails**
   - Add warnings for broad subnets, intrusive NSE categories, UDP scans, spoofing/evasion, and
     privileged scan modes.
   - Keep warnings plain-language and action-oriented.
   - Preserve argv-only execution throughout.
   - Status: centralized Safety notes summary added for broad scope, privileged/slow scan modes,
     spoofing/packet shaping, packet trace, and risky NSE selections.

9. **Release Automation**
   - Keep local `make build` host-only.
   - Use GitHub Actions for platform release artifacts: macOS arm64, Linux arm64/x86_64, Windows
     arm64/x86_64.
   - Continue versioning through tags/release-please and one canonical version source.
   - Status: release-please versioning, host-native local packaging guards, the GitHub release
     matrix, artifact checksums, and release artifact verification are implemented. Signed and
     notarized installers plus real Windows/Linux target-host smoke remain outside the unsigned
     release-candidate gate until signing credentials and tester machines are available.

10. **Release-Candidate Polish**
   - Add a repeatable screenshot review artifact set.
   - Add smoke checklist updates for Windows/Linux testers.
   - Finish accessibility pass for focus states, control sizing, and color contrast.
   - Only call Maple release-candidate ready after the above workstreams have green gates and
     a clean desktop smoke on the latest build.
   - Status: local screenshot cycles, local real-scan evidence, and smoke docs are complete.
     Remaining external validation is signed/notarized installers and real Windows/Linux
     target-host smoke.
