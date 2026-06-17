# Privileged Scan Execution — Design & Threat Model

Status: **PROPOSED — awaiting owner sign-off before the elevated path is wired into the app.**

Tracks epic #89. The privilege-error classifier (#69) already detects when a scan
fails for lack of privileges and tells the user. This document covers the next
step: giving the user a safe, opt-in way to *re-run that scan with elevated
privileges*.

## Why this is needed

Several useful Nmap scan types require raw-socket / raw-packet access, which on
all three platforms means elevated privileges:

- SYN scan (`-sS`), and most non-connect TCP techniques (`-sA/-sW/-sM/-sN/-sF/-sX`)
- OS detection (`-O`)
- raw ICMP/protocol host discovery, `--traceroute`, custom packet shaping

Without privileges Nmap exits with a recognizable "requires root privileges"
message. Today the user is told to re-run elevated but has no in-app way to do
it. This feature provides that path.

## Non-negotiable invariant (unchanged)

Maple executes Nmap as a **validated argv with no shell**. Every token in
`Command.Args` is produced by the typed builders in `internal/scanner`, which
reject shell metacharacters, leading dashes on targets, and out-of-range values.
The elevated path **reuses the exact same `Command.Path` + `Command.Args`** — it
does not build a new command from user input and does not add a free-text
command string. This is the property that makes running as root acceptable.

## Design

A new `nmap.ElevatedExecutor` implements the existing `Executor` interface. It
takes the already-built, already-validated `Command` and rewrites *only how the
process is launched*, per platform, via `buildElevatedCommand(goos, command)`:

| Platform | Mechanism | Shell? | Streaming |
|----------|-----------|--------|-----------|
| Linux | `pkexec <nmapPath> <args...>` — argv passed directly to PolicyKit | **No shell** | Live |
| macOS | `osascript -e 'do shell script "<cmd>" with administrator privileges'` | Shell string (see below) | Output at end only |
| Windows | `runas`/UAC via `ShellExecute` | n/a | **Deferred** — see Open Items |

The XML output path (`Command.XMLPath`, an `os.CreateTemp` file owned by the
unprivileged Maple process) is preserved. The elevated Nmap (running as root)
writes XML there; Maple reads it back afterward. Cleanup is unchanged.

The feature is **opt-in per scan**: the user explicitly chooses "Run with
elevated privileges" from the privilege-error guidance (#69). The OS prompts for
credentials natively **every time**; Maple never stores or caches credentials
and never runs elevated by default.

## Threat model

**Asset:** root/Administrator execution on the user's machine.

**Boundary:** the argv handed to the elevation mechanism. If an attacker could
inject tokens, they could run arbitrary code as root.

**Why it holds:**
1. The argv is the same one the unprivileged path uses; it is built solely by
   `internal/scanner` builders, which validate every token. No user free-text
   reaches it.
2. Linux `pkexec` receives the program and arguments as a real argv (execv-style)
   — there is no shell to inject into.
3. macOS `osascript "do shell script"` *does* evaluate a shell string. This is
   the one place a shell re-enters. Mitigation is defense-in-depth, both layers
   required:
   - Each argv token is single-quoted for the shell (`'` → `'\''`), so even if a
     token contained a metacharacter it would be inert.
   - The scanner validators already guarantee tokens contain **no** shell
     metacharacters or quotes, so the quoting has nothing to escape in practice.
   - The shell string is then AppleScript-string-escaped for the `-e` argument.
   `buildElevatedCommand` is unit-tested to prove the constructed command for
   representative argv (including a hostile-looking token) is inert.

**Explicitly rejected / out of scope:**
- No persistent privileged helper / setuid binary (would be a standing escalation
  surface). Each elevated scan is a fresh, user-approved prompt.
- No credential caching, no "remember me," no sudoers edits by Maple.
- The Linux alternative that needs **no** elevation at all — granting Nmap
  capabilities once with `sudo setcap cap_net_raw,cap_net_admin+eip $(which nmap)`
  — is documented in-app as the preferred approach for repeated use.

## Open items requiring decisions before wiring

1. **macOS shell boundary.** Approve the `osascript` + double-quoting approach, or
   require a no-shell alternative (a notarized SMJobBless privileged helper — much
   larger surface and effort).
2. **Windows.** UAC elevation needs `ShellExecute(..., "runas", ...)` via
   `golang.org/x/sys/windows`; elevated child output cannot be streamed back the
   same way. Deferred to a follow-up; until then the elevated path returns a
   clear "not supported on Windows yet" message.
3. **Wiring.** Where the opt-in surfaces (the #69 privilege message → "Run
   elevated" button → a distinct `StartElevatedScan` Wails binding), and how the
   UI signals that elevated macOS scans have no live log (output appears at the
   end).

This PR contains the threat model and the unit-tested `buildElevatedCommand` /
`ElevatedExecutor` core only. It is **not wired into the app** and will not run
until the above are signed off.
