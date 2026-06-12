package nmap

import (
	"bytes"
	"context"
	"io"
	"os/exec"
	"sync"

	"github.com/krisarmstrong/maple/internal/scanner"
)

type ExecExecutor struct{}

func (ExecExecutor) Execute(
	ctx context.Context,
	command Command,
	emit func(scanner.ScanOutput),
) (Result, error) {
	cmd := exec.CommandContext(ctx, command.Path, command.Args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return Result{}, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return Result{}, err
	}
	if err := cmd.Start(); err != nil {
		return Result{}, err
	}

	var xml bytes.Buffer
	var diagnostics bytes.Buffer
	var waitGroup sync.WaitGroup
	waitGroup.Add(2)
	go copyStream(stdout, scanner.StreamStdout, emit, &xml, &waitGroup)
	go copyStream(stderr, scanner.StreamStderr, emit, &diagnostics, &waitGroup)

	err = cmd.Wait()
	waitGroup.Wait()
	return Result{ExitCode: exitCode(err), XML: xml.String(), Diagnostics: diagnostics.String()}, err
}

func copyStream(
	reader io.Reader,
	stream string,
	emit func(scanner.ScanOutput),
	capture *bytes.Buffer,
	waitGroup *sync.WaitGroup,
) {
	defer waitGroup.Done()
	buffer := make([]byte, 4096)
	for {
		count, err := reader.Read(buffer)
		if count > 0 {
			writeOutput(stream, buffer[:count], emit, capture)
		}
		if err != nil {
			return
		}
	}
}

func writeOutput(stream string, chunk []byte, emit func(scanner.ScanOutput), capture *bytes.Buffer) {
	text := string(chunk)
	if capture != nil {
		_, _ = capture.Write(chunk)
	}
	emit(scanner.ScanOutput{Stream: stream, Text: text})
}
