package platform

import (
	"context"
	"errors"
	"time"
)

const helpTimeout = 4 * time.Second

var errEmptyHelpArgument = errors.New("help argument cannot be empty")

type ToolHelp struct {
	Path   string `json:"path"`
	Output string `json:"output"`
}

func (d Detector) Help(ctx context.Context, spec ToolSpec, helpArg string) (ToolHelp, error) {
	if helpArg == "" {
		return ToolHelp{}, errEmptyHelpArgument
	}
	detection := d.DetectOne(ctx, spec)
	if !detection.Installed || detection.Path == "" {
		return ToolHelp{}, errors.New(detection.Error)
	}

	helpCtx, cancel := context.WithTimeout(ctx, helpTimeout)
	defer cancel()

	output, err := d.run(helpCtx, detection.Path, helpArg)
	return ToolHelp{
		Path:   detection.Path,
		Output: string(output),
	}, err
}
