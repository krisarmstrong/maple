package version

import "runtime/debug"

var (
	Version     string
	Commit      string
	BuildTime   string
	UIBuildHash string
)

const (
	defaultVersion = "dev"
	shortCommitLen = 7
	unknownValue   = "unknown"
)

type Info struct {
	Version     string `json:"version"`
	Commit      string `json:"commit"`
	BuildTime   string `json:"buildTime"`
	UIBuildHash string `json:"uiBuildHash"`
}

func Current() Info {
	version, commit, buildTime := buildInfo()
	uiBuildHash := UIBuildHash
	if uiBuildHash == "" {
		uiBuildHash = unknownValue
	}
	return Info{
		Version:     version,
		Commit:      commit,
		BuildTime:   buildTime,
		UIBuildHash: uiBuildHash,
	}
}

func buildInfo() (string, string, string) {
	if Version != "" {
		commit := Commit
		if commit == "" {
			commit = unknownValue
		}
		buildTime := BuildTime
		if buildTime == "" {
			buildTime = unknownValue
		}
		return Version, commit, buildTime
	}

	info, ok := debug.ReadBuildInfo()
	if !ok {
		return defaultVersion, unknownValue, unknownValue
	}
	return fromDebugBuildInfo(info)
}

func fromDebugBuildInfo(info *debug.BuildInfo) (string, string, string) {
	version := defaultVersion
	commit := unknownValue
	buildTime := unknownValue
	if info == nil {
		return version, commit, buildTime
	}
	if info.Main.Version != "" && info.Main.Version != "(devel)" {
		version = info.Main.Version
	}

	var modified bool
	for _, setting := range info.Settings {
		switch setting.Key {
		case "vcs.revision":
			commit = setting.Value
			if len(commit) > shortCommitLen {
				commit = commit[:shortCommitLen]
			}
		case "vcs.time":
			buildTime = setting.Value
		case "vcs.modified":
			modified = setting.Value == "true"
		}
	}
	if modified && version != defaultVersion {
		version += "-dirty"
	}
	return version, commit, buildTime
}

func SetForTesting(version, commit, buildTime, uiBuildHash string) func() {
	originalVersion := Version
	originalCommit := Commit
	originalBuildTime := BuildTime
	originalUIBuildHash := UIBuildHash
	Version = version
	Commit = commit
	BuildTime = buildTime
	UIBuildHash = uiBuildHash
	return func() {
		Version = originalVersion
		Commit = originalCommit
		BuildTime = originalBuildTime
		UIBuildHash = originalUIBuildHash
	}
}
