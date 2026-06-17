package nmap

import (
	"bytes"
	"context"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"

	"github.com/krisarmstrong/maple/internal/scanner"
)

type ExecExecutor struct{}

func (ExecExecutor) Execute(
	ctx context.Context,
	command Command,
	emit func(scanner.ScanOutput),
) (Result, error) {
	if command.XMLPath != "" {
		defer func() {
			_ = os.Remove(command.XMLPath)
		}()
	}
	// command.Path resolves to a user-detected nmap binary and command.Args is
	// an argv slice assembled solely by the internal/scanner builders, which
	// validate every token (shell metacharacters and leading dashes rejected)
	// and never interpolate a shell. No untrusted string reaches a shell here.
	cmd := exec.CommandContext(ctx, command.Path, command.Args...) // #nosec G204 -- argv built and validated by internal/scanner; no shell
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

	diagnostics := newDiagnosticsCapture()
	var waitGroup sync.WaitGroup
	var emitMutex sync.Mutex
	emitOutput := func(output scanner.ScanOutput) {
		emitMutex.Lock()
		defer emitMutex.Unlock()
		emit(output)
	}
	waitGroup.Add(2)
	go copyStream(stdout, scanner.StreamStdout, emitOutput, diagnostics, &waitGroup)
	go copyStream(stderr, scanner.StreamStderr, emitOutput, diagnostics, &waitGroup)

	// Drain stdout/stderr to EOF before reaping the process. cmd.Wait closes the
	// pipes once the process exits, so waiting on it first can truncate a fast
	// process's tail output (see os/exec StdoutPipe docs). The copy goroutines
	// finish when the process closes its write ends, so this cannot deadlock.
	waitGroup.Wait()
	processErr := cmd.Wait()
	xmlContent, readErr := readXMLFile(command.XMLPath)
	if readErr != nil && processErr == nil {
		return Result{
			ExitCode:    exitCode(processErr),
			Diagnostics: diagnostics.String(),
		}, readErr
	}
	return Result{
		ExitCode:    exitCode(processErr),
		XML:         xmlContent,
		Diagnostics: diagnostics.String(),
	}, processErr
}

func copyStream(
	reader io.Reader,
	stream string,
	emit func(scanner.ScanOutput),
	capture *diagnosticsCapture,
	waitGroup *sync.WaitGroup,
) {
	defer waitGroup.Done()
	buffer := make([]byte, 4096)
	filter := newScanOutputFilter(stream)
	for {
		count, err := reader.Read(buffer)
		if count > 0 {
			writeOutput(stream, buffer[:count], emit, capture, filter)
		}
		if err != nil {
			flushOutput(stream, emit, capture, filter)
			return
		}
	}
}

func writeOutput(
	stream string,
	chunk []byte,
	emit func(scanner.ScanOutput),
	capture *diagnosticsCapture,
	filter *scanOutputFilter,
) {
	outputs := []string{string(chunk)}
	if filter != nil {
		outputs = filter.Filter(outputs[0])
	}
	for _, text := range outputs {
		emitTextOutput(stream, text, emit, capture)
	}
}

func flushOutput(
	stream string,
	emit func(scanner.ScanOutput),
	capture *diagnosticsCapture,
	filter *scanOutputFilter,
) {
	if filter == nil {
		return
	}
	for _, text := range filter.Flush() {
		emitTextOutput(stream, text, emit, capture)
	}
}

func emitTextOutput(
	stream string,
	text string,
	emit func(scanner.ScanOutput),
	capture *diagnosticsCapture,
) {
	if text == "" {
		return
	}
	if capture != nil {
		capture.Write([]byte(text))
	}
	emit(scanner.ScanOutput{Stream: stream, Text: text})
}

type scanOutputFilter struct {
	stream      string
	suppressXML bool
	pending     string
}

func newScanOutputFilter(stream string) *scanOutputFilter {
	return &scanOutputFilter{stream: stream}
}

func (f *scanOutputFilter) Filter(value string) []string {
	if f.stream != scanner.StreamStdout {
		return []string{value}
	}
	if f.suppressXML {
		return f.suppress(value)
	}
	candidate := f.pending + value
	if isXMLLikeScanOutputStart(candidate) {
		f.pending = ""
		return f.suppress(candidate)
	}
	if isPossibleXMLLikeScanOutputPrefix(candidate) {
		f.pending = candidate
		return nil
	}
	f.pending = ""
	return []string{candidate}
}

func (f *scanOutputFilter) Flush() []string {
	if f.stream != scanner.StreamStdout || f.suppressXML || f.pending == "" {
		f.pending = ""
		return nil
	}
	output := f.pending
	f.pending = ""
	return []string{output}
}

const scanXMLTerminator = "</nmaprun>"

func isXMLLikeScanOutputStart(value string) bool {
	trimmed := strings.TrimLeft(value, " \t\r\n")
	return strings.HasPrefix(trimmed, "<?xml") ||
		strings.HasPrefix(trimmed, "<!DOCTYPE nmaprun") ||
		strings.HasPrefix(trimmed, "<?xml-stylesheet") ||
		strings.HasPrefix(trimmed, "<nmaprun") ||
		strings.HasPrefix(trimmed, "</nmaprun")
}

func (f *scanOutputFilter) suppress(value string) []string {
	f.suppressXML = true
	combined := f.pending + value
	index := strings.Index(combined, scanXMLTerminator)
	if index == -1 {
		f.pending = trailingSuffix(combined, len(scanXMLTerminator)-1)
		return nil
	}
	f.suppressXML = false
	f.pending = ""
	remainderStart := index + len(scanXMLTerminator)
	if remainderStart >= len(combined) {
		return nil
	}
	return f.Filter(combined[remainderStart:])
}

func isPossibleXMLLikeScanOutputPrefix(value string) bool {
	trimmed := strings.TrimLeft(value, " \t\r\n")
	if trimmed == "" {
		return len(value) < longestXMLStartPrefix()
	}
	for _, prefix := range xmlStartPrefixes() {
		if strings.HasPrefix(prefix, trimmed) {
			return true
		}
	}
	return false
}

func longestXMLStartPrefix() int {
	longest := 0
	for _, prefix := range xmlStartPrefixes() {
		if len(prefix) > longest {
			longest = len(prefix)
		}
	}
	return longest
}

func xmlStartPrefixes() []string {
	return []string{"<?xml", "<!DOCTYPE nmaprun", "<?xml-stylesheet", "<nmaprun", "</nmaprun"}
}

func trailingSuffix(value string, limit int) string {
	if len(value) <= limit {
		return value
	}
	return value[len(value)-limit:]
}

type diagnosticsCapture struct {
	buffer bytes.Buffer
	mutex  sync.Mutex
}

func newDiagnosticsCapture() *diagnosticsCapture {
	return &diagnosticsCapture{}
}

func (c *diagnosticsCapture) Write(chunk []byte) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	_, _ = c.buffer.Write(chunk)
}

func (c *diagnosticsCapture) String() string {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	return c.buffer.String()
}

func readXMLFile(path string) (string, error) {
	if path == "" {
		return "", nil
	}
	// path is the manager-owned temp file created by os.CreateTemp in runner.go
	// (createXMLOutputPath); it is never derived from user input.
	content, err := os.ReadFile(path) // #nosec G304 -- internal os.CreateTemp path, not user-controlled
	if err != nil {
		return "", err
	}
	return string(content), nil
}
