package platform

import (
	"context"
	"errors"
	"testing"
)

func TestDetectOneFindsInstalledTool(t *testing.T) {
	detector := Detector{
		lookPath: func(name string) (string, error) {
			if name != "nmap" {
				t.Fatalf("unexpected tool lookup: %s", name)
			}
			return "/usr/local/bin/nmap", nil
		},
		run: func(_ context.Context, path string, args ...string) ([]byte, error) {
			if path != "/usr/local/bin/nmap" {
				t.Fatalf("unexpected path: %s", path)
			}
			if len(args) != 1 || args[0] != "--version" {
				t.Fatalf("unexpected args: %v", args)
			}
			return []byte("Nmap version 7.95 ( https://nmap.org )\nPlatform: test\n"), nil
		},
	}

	result := detector.DetectOne(context.Background(), ToolSpec{
		Name:        "nmap",
		DisplayName: "Nmap",
		Required:    true,
		VersionArg:  "--version",
	})

	if !result.Installed {
		t.Fatal("expected tool to be installed")
	}
	if result.Path != "/usr/local/bin/nmap" {
		t.Fatalf("unexpected path: %s", result.Path)
	}
	if result.Version != "Nmap version 7.95 ( https://nmap.org )" {
		t.Fatalf("unexpected version: %s", result.Version)
	}
	if result.Error != "" {
		t.Fatalf("unexpected error: %s", result.Error)
	}
}

func TestDetectOneReportsMissingTool(t *testing.T) {
	detector := Detector{
		lookPath: func(string) (string, error) {
			return "", errors.New("executable file not found in PATH")
		},
		run: func(context.Context, string, ...string) ([]byte, error) {
			t.Fatal("version command should not run for missing tool")
			return nil, nil
		},
	}

	result := detector.DetectOne(context.Background(), ToolSpec{
		Name:        "nmap",
		DisplayName: "Nmap",
		Required:    true,
		VersionArg:  "--version",
	})

	if result.Installed {
		t.Fatal("expected tool to be missing")
	}
	if result.Error == "" {
		t.Fatal("expected missing tool error")
	}
	if result.InstallHint == "" {
		t.Fatal("expected install hint")
	}
}

func TestDetectOneRejectsEmptyToolName(t *testing.T) {
	result := NewDetector().DetectOne(context.Background(), ToolSpec{})

	if result.Error != errEmptyToolName.Error() {
		t.Fatalf("unexpected error: %s", result.Error)
	}
}

func TestInstallHintUsesPlatformSpecificNmapGuidance(t *testing.T) {
	tests := []struct {
		name string
		goos string
		want string
	}{
		{name: "macOS", goos: "darwin", want: "Install Nmap separately with Homebrew or the Nmap Project macOS package."},
		{name: "Windows", goos: "windows", want: "Install Nmap separately from the Nmap Project. Install Npcap separately if the selected scan mode requires it."},
		{name: "Linux", goos: "linux", want: "Install Nmap separately with your distribution package manager or the Nmap Project packages."},
		{name: "Other", goos: "freebsd", want: "Install Nmap separately and make sure it is available on PATH."},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := installHint("nmap", test.goos); got != test.want {
				t.Fatalf("installHint() = %q, want %q", got, test.want)
			}
		})
	}
}

func TestInstallHintDescribesOptionalCompanionTools(t *testing.T) {
	got := installHint("ncat", "linux")
	want := "Optional Nmap companion tool. Install it separately if you need this workflow."
	if got != want {
		t.Fatalf("installHint() = %q, want %q", got, want)
	}
}
