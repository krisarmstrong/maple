package platform

import (
	"context"
	"errors"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

const versionTimeout = 2 * time.Second

var errEmptyToolName = errors.New("tool name cannot be empty")
var errEmptyToolPath = errors.New("tool path cannot be empty")

type ToolSpec struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Required    bool   `json:"required"`
	VersionArg  string `json:"versionArg"`
}

type ToolDetection struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Required    bool   `json:"required"`
	Installed   bool   `json:"installed"`
	Path        string `json:"path,omitempty"`
	Version     string `json:"version,omitempty"`
	Error       string `json:"error,omitempty"`
	InstallHint string `json:"installHint,omitempty"`
}

type Detector struct {
	lookPath func(string) (string, error)
	run      func(context.Context, string, ...string) ([]byte, error)
}

func NewDetector() Detector {
	return Detector{
		lookPath: exec.LookPath,
		run: func(ctx context.Context, path string, args ...string) ([]byte, error) {
			return exec.CommandContext(ctx, path, args...).CombinedOutput() // #nosec G204 -- path comes from exec.LookPath for fixed tool specs; args are fixed version flags
		},
	}
}

func DefaultToolSpecs() []ToolSpec {
	return []ToolSpec{
		{Name: "nmap", DisplayName: "Nmap", Required: true, VersionArg: "--version"},
		{Name: "ndiff", DisplayName: "Ndiff", Required: false, VersionArg: "--version"},
		{Name: "ncat", DisplayName: "Ncat", Required: false, VersionArg: "--version"},
		{Name: "nping", DisplayName: "Nping", Required: false, VersionArg: "--version"},
	}
}

func (d Detector) Detect(ctx context.Context, specs []ToolSpec) []ToolDetection {
	results := make([]ToolDetection, 0, len(specs))
	for _, spec := range specs {
		results = append(results, d.DetectOne(ctx, spec))
	}
	return results
}

func (d Detector) DetectOne(ctx context.Context, spec ToolSpec) ToolDetection {
	result := ToolDetection{
		Name:        spec.Name,
		DisplayName: spec.DisplayName,
		Required:    spec.Required,
	}
	if spec.Name == "" {
		result.Error = errEmptyToolName.Error()
		return result
	}

	path, err := d.lookPath(spec.Name)
	if err != nil {
		result.Error = err.Error()
		result.InstallHint = installHint(spec.Name, runtime.GOOS)
		return result
	}

	result.Installed = true
	result.Path = path
	result.Version = d.version(ctx, path, spec.VersionArg)
	return result
}

func (d Detector) DetectPath(ctx context.Context, spec ToolSpec, path string) ToolDetection {
	result := ToolDetection{
		Name:        spec.Name,
		DisplayName: spec.DisplayName,
		Required:    spec.Required,
	}
	if spec.Name == "" {
		result.Error = errEmptyToolName.Error()
		return result
	}
	value := strings.TrimSpace(path)
	if value == "" {
		result.Error = errEmptyToolPath.Error()
		result.InstallHint = installHint(spec.Name, runtime.GOOS)
		return result
	}
	result.Installed = true
	result.Path = value
	result.Version = d.version(ctx, value, spec.VersionArg)
	if result.Version == "" {
		result.Installed = false
		result.Error = "unable to run " + spec.DisplayName + " at the selected path"
		result.InstallHint = installHint(spec.Name, runtime.GOOS)
	}
	return result
}

func installHint(name string, goos string) string {
	if name != "nmap" {
		return "Optional Nmap companion tool. Install it separately; Maple does not bundle Nmap companion binaries."
	}
	switch goos {
	case "darwin":
		return "Install Nmap separately with Homebrew or the official Nmap Project macOS package; Maple does not download or bundle it."
	case "windows":
		return "Install Nmap separately from the Nmap Project. Install Npcap separately for scan modes that require packet capture."
	case "linux":
		return "Install Nmap separately with apt, dnf, pacman, zypper, or official Nmap Project packages."
	default:
		return "Install Nmap separately and make sure it is available on PATH; Maple does not bundle it."
	}
}

func (d Detector) version(ctx context.Context, path string, versionArg string) string {
	if versionArg == "" {
		return ""
	}

	versionCtx, cancel := context.WithTimeout(ctx, versionTimeout)
	defer cancel()

	output, err := d.run(versionCtx, path, versionArg)
	if err != nil {
		return ""
	}

	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(lines) == 0 {
		return ""
	}
	return strings.TrimSpace(lines[0])
}
