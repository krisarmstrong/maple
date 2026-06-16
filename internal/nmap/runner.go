package nmap

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"strings"

	"github.com/krisarmstrong/maple/internal/scanner"
)

var ErrMissingNmapPath = errors.New("nmap path is required")

const previewXMLOutputPath = "<managed-xml-file>"

type Command struct {
	Path    string
	Args    []string
	XMLPath string
}

type Result struct {
	ExitCode    int    `json:"exitCode"`
	XML         string `json:"xml"`
	Diagnostics string `json:"diagnostics,omitempty"`
}

type Executor interface {
	Execute(context.Context, Command, func(scanner.ScanOutput)) (Result, error)
}

type Runner struct {
	executor Executor
}

func NewRunner() Runner {
	return Runner{executor: ExecExecutor{}}
}

func (r Runner) Run(
	ctx context.Context,
	request scanner.ScanRequest,
	emit func(scanner.ScanOutput),
) (Result, error) {
	command, err := BuildCommand(request)
	if err != nil {
		return Result{}, err
	}
	return r.executorOrDefault().Execute(ctx, command, emit)
}

func BuildCommand(request scanner.ScanRequest) (Command, error) {
	command, _, _, err := buildCommandParts(request)
	return command, err
}

func buildCommandParts(request scanner.ScanRequest) (Command, scanner.Profile, []scanner.Target, error) {
	if request.NmapPath == "" {
		return Command{}, scanner.Profile{}, nil, ErrMissingNmapPath
	}

	profile, err := scanner.FindProfile(request.ProfileID)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	targets, err := parseRequestTargets(request)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	scriptArgs, err := scanner.BuildScriptArgs(request.Scripts)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	scriptArgsValueArgs, err := scanner.BuildScriptArgsValueArgs(request.ScriptArgs)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	scriptArgs = append(scriptArgs, scriptArgsValueArgs...)
	scriptArgsFileArgs, err := scanner.BuildScriptArgsFileArgs(request.ScriptArgsFile)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	optionArgs, err := scanner.BuildOptionArgs(request.Options)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}

	xmlPath, err := createXMLOutputPath()
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	profile.Args = scanner.ProfileArgsForOptions(profile, request.Options)
	argv := scanner.BuildArgv(
		request.NmapPath,
		xmlPath,
		profile,
		optionArgs,
		scriptArgs,
		scriptArgsFileArgs,
		targets,
	)
	return Command{Path: argv[0], Args: argv[1:], XMLPath: xmlPath}, profile, targets, nil
}

func (r Runner) executorOrDefault() Executor {
	if r.executor != nil {
		return r.executor
	}
	return ExecExecutor{}
}

func previewCommandParts(request scanner.ScanRequest) (Command, scanner.Profile, []scanner.Target, error) {
	if request.NmapPath == "" {
		return Command{}, scanner.Profile{}, nil, ErrMissingNmapPath
	}

	profile, err := scanner.FindProfile(request.ProfileID)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	targets, err := parseRequestTargets(request)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	scriptArgs, err := scanner.BuildScriptArgs(request.Scripts)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	scriptArgsValueArgs, err := scanner.BuildScriptArgsValueArgs(request.ScriptArgs)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	scriptArgs = append(scriptArgs, scriptArgsValueArgs...)
	scriptArgsFileArgs, err := scanner.BuildScriptArgsFileArgs(request.ScriptArgsFile)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}
	optionArgs, err := scanner.BuildOptionArgs(request.Options)
	if err != nil {
		return Command{}, scanner.Profile{}, nil, err
	}

	profile.Args = scanner.ProfileArgsForOptions(profile, request.Options)
	argv := scanner.BuildArgv(
		request.NmapPath,
		previewXMLOutputPath,
		profile,
		optionArgs,
		scriptArgs,
		scriptArgsFileArgs,
		targets,
	)
	return Command{Path: argv[0], Args: argv[1:], XMLPath: previewXMLOutputPath}, profile, targets, nil
}

func parseRequestTargets(request scanner.ScanRequest) ([]scanner.Target, error) {
	if strings.TrimSpace(request.Options.TargetInputFile) != "" && strings.TrimSpace(request.Targets) == "" {
		return nil, nil
	}
	return scanner.ParseTargets(request.Targets)
}

func createXMLOutputPath() (string, error) {
	file, err := os.CreateTemp("", "maple-nmap-*.xml")
	if err != nil {
		return "", err
	}
	path := file.Name()
	if err := file.Chmod(0o600); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return "", err
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(path)
		return "", err
	}
	return path, nil
}

func exitCode(err error) int {
	if err == nil {
		return 0
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode()
	}
	return -1
}
