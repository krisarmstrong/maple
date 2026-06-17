package nmap

import (
	"context"
	"errors"
	"runtime"
	"strings"

	"github.com/krisarmstrong/maple/internal/scanner"
)

// ErrElevationUnsupported is returned when elevated execution is requested on a
// platform Maple does not yet support for privilege elevation.
var ErrElevationUnsupported = errors.New("elevated scanning is not supported on this platform yet")

// ElevatedExecutor runs the SAME validated argv as ExecExecutor but launches the
// Nmap process through a platform-native privilege-elevation mechanism. It never
// constructs a command from user input: the argv it elevates is exactly the one
// the scanner builders already produced and validated. See
// docs/PRIVILEGED_EXECUTION.md for the threat model.
//
// This type is the reviewable core for epic #89 and is not yet wired into the
// app; the opt-in scan path is added after the threat model is signed off.
type ElevatedExecutor struct {
	goos  string
	inner Executor
}

// NewElevatedExecutor returns an ElevatedExecutor for the current platform.
func NewElevatedExecutor() ElevatedExecutor {
	return ElevatedExecutor{goos: runtime.GOOS, inner: ExecExecutor{}}
}

// Execute rewrites the launch of command via the platform elevation mechanism,
// preserving the managed XML output path, then runs it through the standard
// streaming executor.
func (e ElevatedExecutor) Execute(
	ctx context.Context,
	command Command,
	emit func(scanner.ScanOutput),
) (Result, error) {
	elevated, err := buildElevatedCommand(e.goos, command)
	if err != nil {
		return Result{}, err
	}
	inner := e.inner
	if inner == nil {
		inner = ExecExecutor{}
	}
	return inner.Execute(ctx, elevated, emit)
}

// buildElevatedCommand wraps command in a platform-native privilege-elevation
// launcher, reusing command.Path + command.Args verbatim. The managed XML output
// path is carried through unchanged so results are still read back.
func buildElevatedCommand(goos string, command Command) (Command, error) {
	switch goos {
	case "linux":
		// pkexec receives the program and arguments as a real argv. No shell.
		args := make([]string, 0, len(command.Args)+1)
		args = append(args, command.Path)
		args = append(args, command.Args...)
		return Command{Path: "pkexec", Args: args, XMLPath: command.XMLPath}, nil
	case "darwin":
		// osascript "do shell script ... with administrator privileges" evaluates
		// a shell string, so every token is single-quoted (defense in depth; the
		// scanner validators already forbid shell metacharacters), then the whole
		// shell string is AppleScript-escaped for the -e argument.
		shellCommand := shellQuoteArgs(append([]string{command.Path}, command.Args...))
		script := "do shell script " + appleScriptStringLiteral(shellCommand) +
			" with administrator privileges"
		return Command{Path: "osascript", Args: []string{"-e", script}, XMLPath: command.XMLPath}, nil
	default:
		// Windows (UAC/runas) and others are deferred; see docs/PRIVILEGED_EXECUTION.md.
		return Command{}, ErrElevationUnsupported
	}
}

// shellQuoteArgs renders argv as a POSIX shell command line with every token
// single-quoted, so no token can be interpreted by the shell.
func shellQuoteArgs(argv []string) string {
	quoted := make([]string, len(argv))
	for index, token := range argv {
		quoted[index] = singleQuote(token)
	}
	return strings.Join(quoted, " ")
}

// singleQuote wraps a token in single quotes, escaping any embedded single quote
// using the standard '\” sequence.
func singleQuote(token string) string {
	return "'" + strings.ReplaceAll(token, "'", `'\''`) + "'"
}

// appleScriptStringLiteral renders s as an AppleScript double-quoted string,
// escaping backslashes and double quotes.
func appleScriptStringLiteral(s string) string {
	escaped := strings.ReplaceAll(s, `\`, `\\`)
	escaped = strings.ReplaceAll(escaped, `"`, `\"`)
	return `"` + escaped + `"`
}
