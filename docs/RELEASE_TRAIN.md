# Maple Release Train

Maple uses release-please for changelog updates, manifest updates, tags, and GitHub Releases.
Do not hand-tag `v*` releases unless release automation is broken and the recovery is explicit.

## Current Baseline

- Latest published release: `v0.1.7`.
- `main` is the integration branch.
- Local completion gate: `make rc-check`.
- Release artifacts are built by GitHub Actions on native platform runners.

## v0.3.0 Beta 2

Milestone: [v0.3.0 Beta 2](https://github.com/krisarmstrong/maple/milestone/1)

Purpose: make NSE, scan recipes, and structured Nmap option building substantially stronger while
preserving Maple's safety model.

Tracked scope:

- [Epic: v0.3.0 Beta 2 - NSE, recipes, and options](https://github.com/krisarmstrong/maple/issues/57)
- [Feature: deepen NSE script browser](https://github.com/krisarmstrong/maple/issues/58)
- [Feature: strengthen built-in scan recipes](https://github.com/krisarmstrong/maple/issues/59)
- [Feature: expand structured Nmap option builder](https://github.com/krisarmstrong/maple/issues/60)

Release criteria:

- NSE category browsing, search, risk labeling, selected-script review, and custom script handling
  are understandable without raw text editing as the only removal path.
- Recipe selection remains compact, target-free, searchable or grouped when needed, and covered by
  UI tests.
- The Nmap option catalog maps each important flag to structured, escape-hatch, planned, or
  blocked status.
- Go argv generation tests cover every added option.
- `make rc-check` passes locally and in CI.

## v0.4.0 Release Candidate

Milestone: [v0.4.0 Release Candidate](https://github.com/krisarmstrong/maple/milestone/2)

Purpose: finish release-candidate docs, UI polish, package trust story, and platform smoke
readiness.

Tracked scope:

- [Epic: v0.4.0 Release Candidate - docs, polish, and trust](https://github.com/krisarmstrong/maple/issues/61)
- [Docs: finalize release-candidate operator docs](https://github.com/krisarmstrong/maple/issues/62)
- [Feature: package trust and signing readiness](https://github.com/krisarmstrong/maple/issues/63)
- [Chore: complete cross-platform RC smoke evidence](https://github.com/krisarmstrong/maple/issues/64)

Release criteria:

- Smoke docs match the final desktop workflow and owned-target examples.
- Light, dark, and system theme screenshots are captured for the release candidate.
- CI artifacts clearly identify unsigned status unless signing credentials are configured.
- Checksums and package verification steps are documented for every platform artifact.
- Windows and Linux target-host smoke is completed or explicitly marked blocked by host access.
- `make rc-check` passes locally and in CI.

## Version Handling

Release-please currently owns `.release-please-manifest.json`, `CHANGELOG.md`, and
`frontend/package*.json` version updates. When the Beta 2 milestone is ready, use a release-please
release PR that targets `0.3.0`; when the RC milestone is ready, use one that targets `0.4.0`.

If release-please opens an incidental patch release before these trains are ready, do not merge it
unless that patch is intentionally being shipped. Close or supersede that release PR and let the
next approved train carry the changelog.

## Non-Negotiables

- Keep argv-only execution.
- Do not bundle or redistribute Nmap, Npcap, Ncat, Ndiff, or Nping.
- Keep Wails v2.12.0, Go 1.26.4, Node 26.3.0, React 19.2.7, and pinned frontend tooling.
- Local `make build` stays host-native; CI owns platform release artifacts.
