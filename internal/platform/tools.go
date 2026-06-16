package platform

import (
	"context"
	"errors"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const versionTimeout = 2 * time.Second

// NmapMinVersion is the oldest Nmap release that Maple fully supports.
// 7.80 (released 2019-10-31) introduced modern TLS probes and a significant
// NSE library refresh; versions older than this may lack script categories or
// flag syntax that Maple exposes in its UI.
const NmapMinVersion = "7.80"

var errEmptyToolName = errors.New("tool name cannot be empty")
var errEmptyToolPath = errors.New("tool path cannot be empty")

type ToolSpec struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Required    bool   `json:"required"`
	VersionArg  string `json:"versionArg"`
}

type ToolDetection struct {
	Name            string `json:"name"`
	DisplayName     string `json:"displayName"`
	Required        bool   `json:"required"`
	Installed       bool   `json:"installed"`
	Path            string `json:"path,omitempty"`
	Version         string `json:"version,omitempty"`
	Error           string `json:"error,omitempty"`
	InstallHint     string `json:"installHint,omitempty"`
	BelowMinVersion bool   `json:"belowMinVersion,omitempty"`
	MinVersion      string `json:"minVersion,omitempty"`
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
	if spec.Name == "nmap" {
		applyNmapVersionIntel(&result)
	}
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
	if spec.Name == "nmap" && result.Installed {
		applyNmapVersionIntel(&result)
	}
	return result
}

// applyNmapVersionIntel sets BelowMinVersion and MinVersion on a detected Nmap
// result. It is a no-op when the version cannot be parsed.
func applyNmapVersionIntel(result *ToolDetection) {
	v, ok := parseNmapVersion(result.Version)
	if !ok {
		return
	}
	result.MinVersion = NmapMinVersion
	if versionLessThan(v, NmapMinVersion) {
		result.BelowMinVersion = true
	}
}

// parseNmapVersion extracts the dotted numeric version string from Nmap's
// --version output. It handles both release builds ("Nmap version 7.95") and
// development builds that carry a suffix ("Nmap version 7.94SVN"). Returns
// ("", false) for unrecognised or empty input — never an error.
//
// Examples:
//
//	"Nmap version 7.95 ( https://nmap.org )" → ("7.95", true)
//	"Nmap version 7.94SVN ( https://nmap.org )" → ("7.94", true)
//	"" → ("", false)
//	"garbled" → ("", false)
func parseNmapVersion(s string) (string, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return "", false
	}

	// Nmap outputs: "Nmap version 7.95 ( https://nmap.org )"
	// Find the token after "version "
	const marker = "version "
	idx := strings.Index(strings.ToLower(s), marker)
	if idx < 0 {
		return "", false
	}
	rest := strings.TrimSpace(s[idx+len(marker):])
	if rest == "" {
		return "", false
	}

	// Take the first whitespace-delimited token — it may have a non-numeric
	// suffix such as "SVN". Strip any trailing non-numeric characters from
	// each dotted component.
	token := strings.Fields(rest)[0]

	// Strip any non-digit, non-dot suffix from the token (e.g. "7.94SVN" → "7.94").
	end := len(token)
	for i, c := range token {
		if c != '.' && (c < '0' || c > '9') {
			end = i
			break
		}
	}
	token = token[:end]
	token = strings.TrimRight(token, ".")

	// Validate: must have at least one dotted segment of digits.
	if token == "" {
		return "", false
	}
	for _, part := range strings.Split(token, ".") {
		if part == "" {
			return "", false
		}
		if _, err := strconv.Atoi(part); err != nil {
			return "", false
		}
	}

	return token, true
}

// versionLessThan reports whether dotted version string a is strictly less
// than dotted version string b. Segments are compared numerically left to
// right; a shorter version is padded with zeros.
func versionLessThan(a, b string) bool {
	aParts := strings.Split(a, ".")
	bParts := strings.Split(b, ".")

	maxLen := len(aParts)
	if len(bParts) > maxLen {
		maxLen = len(bParts)
	}

	for i := range maxLen {
		aVal := 0
		if i < len(aParts) {
			aVal, _ = strconv.Atoi(aParts[i])
		}
		bVal := 0
		if i < len(bParts) {
			bVal, _ = strconv.Atoi(bParts[i])
		}
		if aVal != bVal {
			return aVal < bVal
		}
	}
	return false
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
