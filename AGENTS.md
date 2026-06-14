# Maple Development Instructions

Maple is a personal desktop UI for locally installed Nmap tools.

## Core Rules

- Do not bundle or redistribute Nmap, Npcap, Ndiff, Ncat, or Nping.
- Detect user-installed tools and call them with argv arrays, never shell strings.
- Keep Maple independent from Mustard Seed Networks and Seed internals.
- Do not use JavaScript. TypeScript only.
- Do not use `any`; use explicit types or `unknown`.
- Keep dependencies pinned to exact versions.
- Prefer small, typed provider interfaces over UI-specific process logic.

## Architecture

- `internal/platform`: OS and local dependency detection.
- `internal/scanner`: provider contracts and normalized scan domain types.
- `internal/nmap`: Nmap provider implementation.
- `internal/store`: local persistence.
- `internal/reports`: export and report rendering.
- `frontend/src/core`: pure TypeScript domain logic.
- `frontend/src/services`: Wails bridge wrappers and side effects.
- `frontend/src/components`: React components with colocated tests.

## Quality Gates

Run before declaring done:

```bash
make fmt-check
make lint
make test
make test-e2e
make security
make build
make package-dryrun
```
