package version

import (
	"runtime/debug"
	"testing"
)

func TestCurrentUsesInjectedBuildMetadata(t *testing.T) {
	restore := SetForTesting("v0.2.0", "abc1234", "2026-06-15T14:00:00Z", "uihash")
	defer restore()

	info := Current()
	if info.Version != "v0.2.0" {
		t.Fatalf("Version = %q, want injected version", info.Version)
	}
	if info.Commit != "abc1234" {
		t.Fatalf("Commit = %q, want injected commit", info.Commit)
	}
	if info.BuildTime != "2026-06-15T14:00:00Z" {
		t.Fatalf("BuildTime = %q, want injected build time", info.BuildTime)
	}
	if info.UIBuildHash != "uihash" {
		t.Fatalf("UIBuildHash = %q, want injected UI hash", info.UIBuildHash)
	}
}

func TestCurrentDefaultsEmptyInjectedFields(t *testing.T) {
	restore := SetForTesting("v0.2.0", "", "", "")
	defer restore()

	info := Current()
	if info.Commit != unknownValue {
		t.Fatalf("Commit = %q, want unknown", info.Commit)
	}
	if info.BuildTime != unknownValue {
		t.Fatalf("BuildTime = %q, want unknown", info.BuildTime)
	}
	if info.UIBuildHash != unknownValue {
		t.Fatalf("UIBuildHash = %q, want unknown", info.UIBuildHash)
	}
}

func TestFromDebugBuildInfoUsesVCSSettings(t *testing.T) {
	info := &debug.BuildInfo{
		Main: debug.Module{Version: "v0.3.0"},
		Settings: []debug.BuildSetting{
			{Key: "vcs.revision", Value: "abcdef1234567890"},
			{Key: "vcs.time", Value: "2026-06-15T14:30:00Z"},
		},
	}

	version, commit, buildTime := fromDebugBuildInfo(info)
	if version != "v0.3.0" {
		t.Fatalf("version = %q, want build info version", version)
	}
	if commit != "abcdef1" {
		t.Fatalf("commit = %q, want short commit", commit)
	}
	if buildTime != "2026-06-15T14:30:00Z" {
		t.Fatalf("buildTime = %q, want VCS time", buildTime)
	}
}

func TestFromDebugBuildInfoMarksReleasedDirtyBuilds(t *testing.T) {
	info := &debug.BuildInfo{
		Main: debug.Module{Version: "v0.3.0"},
		Settings: []debug.BuildSetting{
			{Key: "vcs.modified", Value: "true"},
		},
	}

	version, _, _ := fromDebugBuildInfo(info)
	if version != "v0.3.0-dirty" {
		t.Fatalf("version = %q, want dirty suffix", version)
	}
}
