package nmap

import (
	"testing"

	"github.com/krisarmstrong/maple/internal/scanner"
)

func TestBuildPreviewConstructsArgv(t *testing.T) {
	preview, err := BuildPreview("/usr/local/bin/nmap", scanner.ScanRequest{
		ProfileID: "ping",
		Targets:   "scanme.nmap.org,192.168.1.1",
	})
	if err != nil {
		t.Fatalf("BuildPreview returned error: %v", err)
	}

	wantArgs := []string{"-oX", "<managed-xml-file>", "-sn", "--", "scanme.nmap.org", "192.168.1.1"}
	if !sameStrings(preview.Args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", preview.Args, wantArgs)
	}
	if preview.Executable != "/usr/local/bin/nmap" {
		t.Fatalf("unexpected executable: %s", preview.Executable)
	}
}

func TestBuildPreviewIncludesStructuredScriptArgsBeforeTargets(t *testing.T) {
	preview, err := BuildPreview("/usr/local/bin/nmap", scanner.ScanRequest{
		ProfileID:      "service",
		Targets:        "scanme.nmap.org",
		ScriptArgsFile: "/Users/krisarmstrong/nse-args.txt",
		Scripts: []scanner.Script{
			{Kind: scanner.ScriptCategory, Value: "safe"},
			{Kind: scanner.ScriptPath, Value: "/Users/krisarmstrong/Scripts/custom-check.nse"},
		},
	})
	if err != nil {
		t.Fatalf("BuildPreview returned error: %v", err)
	}

	wantArgs := []string{
		"-oX", "<managed-xml-file>",
		"-sV", "--version-light",
		"--script", "safe",
		"--script", "/Users/krisarmstrong/Scripts/custom-check.nse",
		"--script-args-file", "/Users/krisarmstrong/nse-args.txt",
		"--", "scanme.nmap.org",
	}
	if !sameStrings(preview.Args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", preview.Args, wantArgs)
	}
}

func TestBuildPreviewIncludesStructuredOptionsBeforeScriptsAndTargets(t *testing.T) {
	preview, err := BuildPreview("/usr/local/bin/nmap", scanner.ScanRequest{
		ProfileID: "quick",
		Targets:   "scanme.nmap.org",
		Options: scanner.ScanOptions{
			TimingTemplate: "T4",
			Ports:          "22,80,443",
			IPv6:           true,
			DNSMode:        "skip",
		},
		Scripts: []scanner.Script{{Kind: scanner.ScriptCategory, Value: "safe"}},
	})
	if err != nil {
		t.Fatalf("BuildPreview returned error: %v", err)
	}

	wantArgs := []string{
		"-oX", "<managed-xml-file>",
		"-T4", "-p", "22,80,443", "-6", "-n",
		"--script", "safe",
		"--", "scanme.nmap.org",
	}
	if !sameStrings(preview.Args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", preview.Args, wantArgs)
	}
}

func TestBuildPreviewRejectsUnknownProfile(t *testing.T) {
	_, err := BuildPreview("nmap", scanner.ScanRequest{
		ProfileID: "unsafe",
		Targets:   "scanme.nmap.org",
	})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestBuildPreviewRejectsInvalidScripts(t *testing.T) {
	_, err := BuildPreview("nmap", scanner.ScanRequest{
		ProfileID: scanner.ProfilePing,
		Targets:   "scanme.nmap.org",
		Scripts:   []scanner.Script{{Kind: scanner.ScriptCategory, Value: "safe,default"}},
	})
	if err == nil {
		t.Fatal("expected error")
	}
}

func sameStrings(got []string, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	for index := range got {
		if got[index] != want[index] {
			return false
		}
	}
	return true
}
