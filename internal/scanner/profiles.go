package scanner

import "errors"

type ProfileID string

const (
	ProfileConnect ProfileID = "connect"
	ProfilePing    ProfileID = "ping"
	ProfileQuick   ProfileID = "quick"
	ProfileService ProfileID = "service"
)

var ErrUnknownProfile = errors.New("unknown scan profile")

type Profile struct {
	ID          ProfileID `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Args        []string  `json:"args"`
}

type ScanRequest struct {
	ProfileID      ProfileID   `json:"profileId"`
	Targets        string      `json:"targets"`
	NmapPath       string      `json:"nmapPath"`
	Options        ScanOptions `json:"options,omitempty"`
	Scripts        []Script    `json:"scripts,omitempty"`
	ScriptArgs     string      `json:"scriptArgs,omitempty"`
	ScriptArgsFile string      `json:"scriptArgsFile,omitempty"`
}

type CommandPreview struct {
	Executable string   `json:"executable"`
	Args       []string `json:"args"`
	Targets    []Target `json:"targets"`
	Profile    Profile  `json:"profile"`
}

type ScanOutput struct {
	Stream string `json:"stream"`
	Text   string `json:"text"`
}

type ScanChunk struct {
	RunID  string `json:"runId"`
	Stream string `json:"stream"`
	Text   string `json:"text"`
}

type ScanStarted struct {
	RunID   string         `json:"runId"`
	Preview CommandPreview `json:"preview"`
}

type ScanFinished struct {
	RunID       string `json:"runId"`
	ExitCode    int    `json:"exitCode"`
	XML         string `json:"xml"`
	Diagnostics string `json:"diagnostics,omitempty"`
	Error       string `json:"error,omitempty"`
}

const (
	StreamStdout = "stdout"
	StreamStderr = "stderr"
)

func BuiltInProfiles() []Profile {
	return []Profile{
		{
			ID:          ProfileConnect,
			Name:        "TCP Connect",
			Description: "Unprivileged TCP scan for local desktop use.",
			Args:        []string{"-sT", "-Pn", "-T3", "--top-ports", "100"},
		},
		{ID: ProfilePing, Name: "Ping Sweep", Description: "Host discovery only.", Args: []string{"-sn"}},
		{ID: ProfileQuick, Name: "Quick Scan", Description: "Top ports with conservative timing.", Args: []string{"-T3", "--top-ports", "100"}},
		{ID: ProfileService, Name: "Service Scan", Description: "Light service version detection.", Args: []string{"-sV", "--version-light"}},
	}
}

func FindProfile(id ProfileID) (Profile, error) {
	for _, profile := range BuiltInProfiles() {
		if profile.ID == id {
			profile.Args = append([]string(nil), profile.Args...)
			return profile, nil
		}
	}
	return Profile{}, ErrUnknownProfile
}

func BuildArgv(
	nmapPath string,
	xmlOutputPath string,
	profile Profile,
	optionArgs []string,
	scriptArgs []string,
	scriptArgsFileArgs []string,
	targets []Target,
) []string {
	argv := make(
		[]string,
		0,
		4+len(profile.Args)+len(optionArgs)+len(scriptArgs)+len(scriptArgsFileArgs)+len(targets),
	)
	argv = append(argv, nmapPath)
	argv = append(argv, "-oX", xmlOutputPath)
	argv = append(argv, profile.Args...)
	argv = append(argv, optionArgs...)
	argv = append(argv, scriptArgs...)
	argv = append(argv, scriptArgsFileArgs...)
	argv = append(argv, "--")
	for _, target := range targets {
		argv = append(argv, target.Value)
	}
	return argv
}
