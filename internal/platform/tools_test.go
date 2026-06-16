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

func TestDetectPathRunsExplicitToolPath(t *testing.T) {
	detector := Detector{
		lookPath: func(string) (string, error) {
			t.Fatal("lookPath should not run for explicit paths")
			return "", nil
		},
		run: func(_ context.Context, path string, args ...string) ([]byte, error) {
			if path != "/custom/nmap" {
				t.Fatalf("path = %q, want explicit path", path)
			}
			if len(args) != 1 || args[0] != "--version" {
				t.Fatalf("args = %v, want --version", args)
			}
			return []byte("Nmap version 7.99\n"), nil
		},
	}

	result := detector.DetectPath(context.Background(), ToolSpec{
		Name:        "nmap",
		DisplayName: "Nmap",
		Required:    true,
		VersionArg:  "--version",
	}, "/custom/nmap")

	if !result.Installed {
		t.Fatal("expected explicit tool path to be installed")
	}
	if result.Path != "/custom/nmap" {
		t.Fatalf("Path = %q, want explicit path", result.Path)
	}
	if result.Version != "Nmap version 7.99" {
		t.Fatalf("Version = %q, want version output", result.Version)
	}
}

func TestDetectPathRejectsBlankPath(t *testing.T) {
	result := NewDetector().DetectPath(context.Background(), ToolSpec{
		Name:        "nmap",
		DisplayName: "Nmap",
		Required:    true,
		VersionArg:  "--version",
	}, " ")

	if result.Installed {
		t.Fatal("expected blank path to be rejected")
	}
	if result.Error == "" {
		t.Fatal("expected blank path error")
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
		{name: "macOS", goos: "darwin", want: "Install Nmap separately with Homebrew or the official Nmap Project macOS package; Maple does not download or bundle it."},
		{name: "Windows", goos: "windows", want: "Install Nmap separately from the Nmap Project. Install Npcap separately for scan modes that require packet capture."},
		{name: "Linux", goos: "linux", want: "Install Nmap separately with apt, dnf, pacman, zypper, or official Nmap Project packages."},
		{name: "Other", goos: "freebsd", want: "Install Nmap separately and make sure it is available on PATH; Maple does not bundle it."},
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
	want := "Optional Nmap companion tool. Install it separately; Maple does not bundle Nmap companion binaries."
	if got != want {
		t.Fatalf("installHint() = %q, want %q", got, want)
	}
}

func TestHelpRunsToolHelpWithArgvOnly(t *testing.T) {
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
			if len(args) != 1 || args[0] != "--help" {
				t.Fatalf("unexpected args: %v", args)
			}
			return []byte("Nmap 7.95 usage: nmap [Scan Type] [Options] {target}\n"), nil
		},
	}

	result, err := detector.Help(context.Background(), ToolSpec{
		Name:        "nmap",
		DisplayName: "Nmap",
		Required:    true,
	}, "--help")
	if err != nil {
		t.Fatalf("Help returned error: %v", err)
	}

	if result.Path != "/usr/local/bin/nmap" {
		t.Fatalf("result.Path = %q, want executable path", result.Path)
	}
	if result.Output != "Nmap 7.95 usage: nmap [Scan Type] [Options] {target}\n" {
		t.Fatalf("unexpected output: %q", result.Output)
	}
}

func TestHelpReportsMissingToolWithoutRunningHelp(t *testing.T) {
	detector := Detector{
		lookPath: func(string) (string, error) {
			return "", errors.New("executable file not found in PATH")
		},
		run: func(context.Context, string, ...string) ([]byte, error) {
			t.Fatal("help command should not run for missing tool")
			return nil, nil
		},
	}

	_, err := detector.Help(context.Background(), ToolSpec{
		Name:        "nmap",
		DisplayName: "Nmap",
		Required:    true,
	}, "--help")
	if err == nil {
		t.Fatal("expected missing tool error")
	}
}

func TestParseNmapVersion(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantVer string
		wantOK  bool
	}{
		{
			name:    "release build",
			input:   "Nmap version 7.95 ( https://nmap.org )",
			wantVer: "7.95",
			wantOK:  true,
		},
		{
			name:    "development build with SVN suffix",
			input:   "Nmap version 7.94SVN ( https://nmap.org )",
			wantVer: "7.94",
			wantOK:  true,
		},
		{
			name:    "older release",
			input:   "Nmap version 7.70 ( https://nmap.org )",
			wantVer: "7.70",
			wantOK:  true,
		},
		{
			name:    "three-part version",
			input:   "Nmap version 7.80.1 ( https://nmap.org )",
			wantVer: "7.80.1",
			wantOK:  true,
		},
		{
			name:    "version string without URL",
			input:   "Nmap version 7.99",
			wantVer: "7.99",
			wantOK:  true,
		},
		{
			name:    "empty string",
			input:   "",
			wantVer: "",
			wantOK:  false,
		},
		{
			name:    "garbled output",
			input:   "garbled",
			wantVer: "",
			wantOK:  false,
		},
		{
			name:    "missing version keyword",
			input:   "Nmap 7.95",
			wantVer: "",
			wantOK:  false,
		},
		{
			name:    "version keyword with no number following",
			input:   "Nmap version ",
			wantVer: "",
			wantOK:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotVer, gotOK := parseNmapVersion(tt.input)
			if gotOK != tt.wantOK {
				t.Fatalf("parseNmapVersion(%q) ok = %v, want %v", tt.input, gotOK, tt.wantOK)
			}
			if gotVer != tt.wantVer {
				t.Fatalf("parseNmapVersion(%q) = %q, want %q", tt.input, gotVer, tt.wantVer)
			}
		})
	}
}

func TestDetectOnePopulatesVersionIntelForNmap(t *testing.T) {
	tests := []struct {
		name           string
		versionOutput  string
		wantBelow      bool
		wantMinVersion string
	}{
		{
			name:           "current release — not below minimum",
			versionOutput:  "Nmap version 7.95 ( https://nmap.org )\n",
			wantBelow:      false,
			wantMinVersion: NmapMinVersion,
		},
		{
			name:           "exactly at minimum — not below",
			versionOutput:  "Nmap version 7.80 ( https://nmap.org )\n",
			wantBelow:      false,
			wantMinVersion: NmapMinVersion,
		},
		{
			name:           "older than minimum — below",
			versionOutput:  "Nmap version 7.70 ( https://nmap.org )\n",
			wantBelow:      true,
			wantMinVersion: NmapMinVersion,
		},
		{
			name:           "development build older than minimum",
			versionOutput:  "Nmap version 7.60SVN ( https://nmap.org )\n",
			wantBelow:      true,
			wantMinVersion: NmapMinVersion,
		},
		{
			name:           "unparseable version — no intel fields set",
			versionOutput:  "garbled output\n",
			wantBelow:      false,
			wantMinVersion: "",
		},
		{
			name:           "empty version output — no intel fields set",
			versionOutput:  "",
			wantBelow:      false,
			wantMinVersion: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			detector := Detector{
				lookPath: func(string) (string, error) { return "/usr/bin/nmap", nil },
				run: func(context.Context, string, ...string) ([]byte, error) {
					return []byte(tt.versionOutput), nil
				},
			}
			result := detector.DetectOne(context.Background(), ToolSpec{
				Name:        "nmap",
				DisplayName: "Nmap",
				Required:    true,
				VersionArg:  "--version",
			})

			if result.BelowMinVersion != tt.wantBelow {
				t.Fatalf("BelowMinVersion = %v, want %v", result.BelowMinVersion, tt.wantBelow)
			}
			if result.MinVersion != tt.wantMinVersion {
				t.Fatalf("MinVersion = %q, want %q", result.MinVersion, tt.wantMinVersion)
			}
		})
	}
}
