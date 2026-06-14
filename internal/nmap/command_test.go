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
		ScriptArgs:     "http.useragent=Maple",
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
		"--script-args", "http.useragent=Maple",
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
			TCPSYNProbes:   "22,80",
			ICMPEchoProbe:  true,
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
		"-PS22,80", "-PE", "-T4", "-p", "22,80,443", "-6", "-n",
		"--script", "safe",
		"--", "scanme.nmap.org",
	}
	if !sameStrings(preview.Args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", preview.Args, wantArgs)
	}
}

func TestBuildPreviewRemovesProfileTechniqueDefaultForSpecializedTechnique(t *testing.T) {
	preview, err := BuildPreview("/usr/local/bin/nmap", scanner.ScanRequest{
		ProfileID: scanner.ProfileConnect,
		Targets:   "scanme.nmap.org",
		Options: scanner.ScanOptions{
			ScanTechnique: scanner.ScanTechniqueACK,
		},
	})
	if err != nil {
		t.Fatalf("BuildPreview returned error: %v", err)
	}

	wantArgs := []string{
		"-oX", "<managed-xml-file>",
		"-Pn", "-T3", "--top-ports", "100",
		"-sA",
		"--", "scanme.nmap.org",
	}
	if !sameStrings(preview.Args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", preview.Args, wantArgs)
	}
}

func TestBuildPreviewRemovesProfileDiscoveryDefaultsWhenProbesAreSelected(t *testing.T) {
	preview, err := BuildPreview("/usr/local/bin/nmap", scanner.ScanRequest{
		ProfileID: scanner.ProfileConnect,
		Targets:   "scanme.nmap.org",
		Options: scanner.ScanOptions{
			TCPSYNProbes:  "22,80",
			ICMPEchoProbe: true,
		},
	})
	if err != nil {
		t.Fatalf("BuildPreview returned error: %v", err)
	}

	wantArgs := []string{
		"-oX", "<managed-xml-file>",
		"-sT", "-T3", "--top-ports", "100",
		"-PS22,80", "-PE",
		"--", "scanme.nmap.org",
	}
	if !sameStrings(preview.Args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", preview.Args, wantArgs)
	}
}

func TestBuildPreviewPreservesPingSweepWhenProbesAreSelected(t *testing.T) {
	preview, err := BuildPreview("/usr/local/bin/nmap", scanner.ScanRequest{
		ProfileID: scanner.ProfilePing,
		Targets:   "scanme.nmap.org",
		Options: scanner.ScanOptions{
			TCPSYNProbes: "22,80",
		},
	})
	if err != nil {
		t.Fatalf("BuildPreview returned error: %v", err)
	}

	wantArgs := []string{
		"-oX", "<managed-xml-file>",
		"-sn", "-PS22,80",
		"--", "scanme.nmap.org",
	}
	if !sameStrings(preview.Args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", preview.Args, wantArgs)
	}
}

func TestBuildPreviewAllowsTargetInputFileWithoutTypedTargets(t *testing.T) {
	preview, err := BuildPreview("/usr/local/bin/nmap", scanner.ScanRequest{
		ProfileID: scanner.ProfilePing,
		Targets:   "  ",
		Options: scanner.ScanOptions{
			TargetInputFile: "/Users/krisarmstrong/targets.txt",
			ExcludeTargets:  "192.168.1.10,scanme.nmap.org",
			ExcludeFile:     "/Users/krisarmstrong/excludes.txt",
		},
	})
	if err != nil {
		t.Fatalf("BuildPreview returned error: %v", err)
	}

	wantArgs := []string{
		"-oX", "<managed-xml-file>",
		"-sn", "-iL", "/Users/krisarmstrong/targets.txt",
		"--exclude", "192.168.1.10,scanme.nmap.org",
		"--excludefile", "/Users/krisarmstrong/excludes.txt",
		"--",
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
