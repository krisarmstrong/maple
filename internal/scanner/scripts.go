package scanner

import (
	"errors"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

type ScriptKind string

const (
	ScriptCategory ScriptKind = "category"
	ScriptName     ScriptKind = "name"
	ScriptPath     ScriptKind = "path"
)

var (
	ErrInvalidScript  = errors.New("enter known NSE categories, built-in script names, or absolute .nse script file paths")
	scriptNamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.+-]*$`)
	windowsDrivePath  = regexp.MustCompile(`^[A-Za-z]:[\\/].+`)
)

type Script struct {
	Kind  ScriptKind `json:"kind"`
	Value string     `json:"value"`
}

var nseCategories = []string{
	"auth",
	"broadcast",
	"brute",
	"default",
	"discovery",
	"dos",
	"exploit",
	"external",
	"fuzzer",
	"intrusive",
	"malware",
	"safe",
	"version",
	"vuln",
}

func BuildScriptArgs(scripts []Script) ([]string, error) {
	args := make([]string, 0, len(scripts)*2)
	for _, script := range scripts {
		value, err := validateScript(script)
		if err != nil {
			return nil, err
		}
		args = append(args, "--script", value)
	}
	return args, nil
}

func BuildScriptArgsValueArgs(value string) ([]string, error) {
	args := strings.TrimSpace(value)
	if args == "" {
		return nil, nil
	}
	if strings.ContainsAny(args, "\x00\r\n") {
		return nil, ErrInvalidScript
	}
	return []string{"--script-args", args}, nil
}

func BuildScriptArgsFileArgs(path string) ([]string, error) {
	value := strings.TrimSpace(path)
	if value == "" {
		return nil, nil
	}
	if strings.ContainsAny(value, "\x00\r\n") || !isAbsoluteScriptPath(value) {
		return nil, ErrInvalidScript
	}
	return []string{"--script-args-file", value}, nil
}

func NSECategories() []string {
	return append([]string(nil), nseCategories...)
}

func validateScript(script Script) (string, error) {
	value := strings.TrimSpace(script.Value)
	if value == "" || strings.ContainsAny(value, "\x00\r\n,") {
		return "", ErrInvalidScript
	}
	switch script.Kind {
	case ScriptCategory:
		if slices.Contains(nseCategories, value) {
			return value, nil
		}
	case ScriptName:
		if scriptNamePattern.MatchString(value) {
			return value, nil
		}
	case ScriptPath:
		if isAbsoluteScriptPath(value) && strings.EqualFold(filepath.Ext(value), ".nse") {
			return value, nil
		}
	}
	return "", ErrInvalidScript
}

func isAbsoluteScriptPath(value string) bool {
	return filepath.IsAbs(value) || windowsDrivePath.MatchString(value) || strings.HasPrefix(value, `\\`)
}
