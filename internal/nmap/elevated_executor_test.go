package nmap

import (
	"errors"
	"strings"
	"testing"
)

func TestBuildElevatedCommandLinuxUsesPkexecArgv(t *testing.T) {
	command := Command{
		Path:    "/usr/bin/nmap",
		Args:    []string{"-oX", "/tmp/out.xml", "-sS", "--", "10.0.0.1"},
		XMLPath: "/tmp/out.xml",
	}
	got, err := buildElevatedCommand("linux", command)
	if err != nil {
		t.Fatalf("buildElevatedCommand returned error: %v", err)
	}
	if got.Path != "pkexec" {
		t.Fatalf("Path = %q, want pkexec", got.Path)
	}
	want := []string{"/usr/bin/nmap", "-oX", "/tmp/out.xml", "-sS", "--", "10.0.0.1"}
	if strings.Join(got.Args, "\x00") != strings.Join(want, "\x00") {
		t.Fatalf("Args = %#v, want %#v", got.Args, want)
	}
	if got.XMLPath != command.XMLPath {
		t.Fatalf("XMLPath = %q, want preserved %q", got.XMLPath, command.XMLPath)
	}
}

func TestBuildElevatedCommandDarwinUsesOsascriptAdmin(t *testing.T) {
	command := Command{
		Path:    "/usr/local/bin/nmap",
		Args:    []string{"-oX", "/tmp/out.xml", "-O", "--", "10.0.0.1"},
		XMLPath: "/tmp/out.xml",
	}
	got, err := buildElevatedCommand("darwin", command)
	if err != nil {
		t.Fatalf("buildElevatedCommand returned error: %v", err)
	}
	if got.Path != "osascript" {
		t.Fatalf("Path = %q, want osascript", got.Path)
	}
	if len(got.Args) != 2 || got.Args[0] != "-e" {
		t.Fatalf("Args = %#v, want [-e <script>]", got.Args)
	}
	script := got.Args[1]
	if !strings.HasSuffix(script, " with administrator privileges") {
		t.Fatalf("script missing admin clause: %q", script)
	}
	// Every argv token must be single-quoted inside the shell string.
	for _, token := range []string{"/usr/local/bin/nmap", "-oX", "/tmp/out.xml", "-O", "10.0.0.1"} {
		if !strings.Contains(script, "'"+token+"'") {
			t.Fatalf("script missing single-quoted token %q: %q", token, script)
		}
	}
	if got.XMLPath != command.XMLPath {
		t.Fatalf("XMLPath = %q, want preserved", got.XMLPath)
	}
}

func TestBuildElevatedCommandDarwinNeutralizesHostileToken(t *testing.T) {
	// The scanner validators already forbid such tokens; this proves the quoting
	// renders one inert as defense in depth.
	command := Command{
		Path:    "/usr/local/bin/nmap",
		Args:    []string{"-oX", "/tmp/out.xml", "--", "$(touch /tmp/pwned)"},
		XMLPath: "/tmp/out.xml",
	}
	got, err := buildElevatedCommand("darwin", command)
	if err != nil {
		t.Fatalf("buildElevatedCommand returned error: %v", err)
	}
	script := got.Args[1]
	// The hostile token must appear only inside a single-quoted span, never bare.
	if !strings.Contains(script, "'$(touch /tmp/pwned)'") {
		t.Fatalf("hostile token not single-quoted: %q", script)
	}
}

func TestSingleQuoteEscapesEmbeddedQuote(t *testing.T) {
	if got := singleQuote("a'b"); got != `'a'\''b'` {
		t.Fatalf("singleQuote = %q, want %q", got, `'a'\''b'`)
	}
}

func TestBuildElevatedCommandWindowsAndUnknownAreUnsupported(t *testing.T) {
	for _, goos := range []string{"windows", "plan9"} {
		if _, err := buildElevatedCommand(goos, Command{Path: "nmap"}); !errors.Is(err, ErrElevationUnsupported) {
			t.Fatalf("buildElevatedCommand(%q) err = %v, want ErrElevationUnsupported", goos, err)
		}
	}
}
