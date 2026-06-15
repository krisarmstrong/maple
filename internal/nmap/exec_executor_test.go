package nmap

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/krisarmstrong/maple/internal/scanner"
)

func TestExecExecutorReadsXMLFromManagedFile(t *testing.T) {
	xmlFile, err := os.CreateTemp(t.TempDir(), "maple-nmap-*.xml")
	if err != nil {
		t.Fatalf("CreateTemp returned error: %v", err)
	}
	xmlPath := xmlFile.Name()
	if err := xmlFile.Close(); err != nil {
		t.Fatalf("Close returned error: %v", err)
	}

	executor := ExecExecutor{}
	var chunks []scanner.ScanOutput
	commandPath, commandArgs := helperCommand(t, xmlPath, false)
	result, err := executor.Execute(
		context.Background(),
		Command{
			Path:    commandPath,
			Args:    commandArgs,
			XMLPath: xmlPath,
		},
		func(output scanner.ScanOutput) {
			chunks = append(chunks, output)
		},
	)
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	if result.XML != "<nmaprun><host /></nmaprun>" {
		t.Fatalf("XML = %q", result.XML)
	}
	if !strings.Contains(result.Diagnostics, "plain stdout diagnostic\n") ||
		!strings.Contains(result.Diagnostics, "plain stderr diagnostic\n") {
		t.Fatalf("Diagnostics = %q", result.Diagnostics)
	}
	if _, err := os.Stat(xmlPath); !os.IsNotExist(err) {
		t.Fatalf("managed XML file should be removed, stat err = %v", err)
	}
	if len(chunks) != 2 {
		t.Fatalf("emitted chunks = %d, want 2", len(chunks))
	}
}

func TestExecExecutorDoesNotEmitXMLLikeStdout(t *testing.T) {
	xmlFile, err := os.CreateTemp(t.TempDir(), "maple-nmap-*.xml")
	if err != nil {
		t.Fatalf("CreateTemp returned error: %v", err)
	}
	xmlPath := xmlFile.Name()
	if err := xmlFile.Close(); err != nil {
		t.Fatalf("Close returned error: %v", err)
	}

	executor := ExecExecutor{}
	var chunks []scanner.ScanOutput
	commandPath, commandArgs := helperCommand(t, xmlPath, true)
	result, err := executor.Execute(
		context.Background(),
		Command{
			Path:    commandPath,
			Args:    commandArgs,
			XMLPath: xmlPath,
		},
		func(output scanner.ScanOutput) {
			chunks = append(chunks, output)
		},
	)
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}
	if strings.Contains(result.Diagnostics, "nmaprun") {
		t.Fatalf("Diagnostics contains XML: %q", result.Diagnostics)
	}
	if !strings.Contains(result.Diagnostics, "plain stderr diagnostic\n") {
		t.Fatalf("Diagnostics = %q", result.Diagnostics)
	}

	for _, chunk := range chunks {
		if strings.Contains(chunk.Text, "nmaprun") {
			t.Fatalf("emitted XML chunk: %#v", chunk)
		}
	}
}

func TestScanOutputFilterSuppressesMultiChunkXMLStdout(t *testing.T) {
	filter := newScanOutputFilter(scanner.StreamStdout)
	var chunks []scanner.ScanOutput
	emit := func(output scanner.ScanOutput) {
		chunks = append(chunks, output)
	}

	writeOutput(scanner.StreamStdout, []byte(`<?xml version="1.0"?>`), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("<nmaprun>"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("<host><status state=\"up\"/></host>"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("</nmaprun>"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("Nmap done\n"), emit, nil, filter)

	if len(chunks) != 1 {
		t.Fatalf("emitted chunks = %d, want 1", len(chunks))
	}
	if chunks[0].Text != "Nmap done\n" {
		t.Fatalf("emitted chunk = %#v", chunks[0])
	}
}

func TestScanOutputFilterHandlesSplitXMLTerminator(t *testing.T) {
	filter := newScanOutputFilter(scanner.StreamStdout)
	var chunks []scanner.ScanOutput
	emit := func(output scanner.ScanOutput) {
		chunks = append(chunks, output)
	}

	writeOutput(scanner.StreamStdout, []byte(`<?xml version="1.0"?><nmaprun>`), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("<host><status state=\"up\"/></host>"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("</nma"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("prun>"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("Nmap done\n"), emit, nil, filter)

	if len(chunks) != 1 {
		t.Fatalf("emitted chunks = %d, want 1", len(chunks))
	}
	if chunks[0].Text != "Nmap done\n" {
		t.Fatalf("emitted chunk = %#v", chunks[0])
	}
}

func TestScanOutputFilterWaitsForTerminatorClosingBracket(t *testing.T) {
	filter := newScanOutputFilter(scanner.StreamStdout)
	var chunks []scanner.ScanOutput
	emit := func(output scanner.ScanOutput) {
		chunks = append(chunks, output)
	}

	writeOutput(scanner.StreamStdout, []byte(`<?xml version="1.0"?><nmaprun>`), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("<host><status state=\"up\"/></host>"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("</nmaprun"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte(">"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("Nmap done\n"), emit, nil, filter)

	if len(chunks) != 1 {
		t.Fatalf("emitted chunks = %d, want 1", len(chunks))
	}
	if chunks[0].Text != "Nmap done\n" {
		t.Fatalf("emitted chunk = %#v", chunks[0])
	}
}

func TestScanOutputFilterHandlesSplitXMLPrefix(t *testing.T) {
	filter := newScanOutputFilter(scanner.StreamStdout)
	var chunks []scanner.ScanOutput
	emit := func(output scanner.ScanOutput) {
		chunks = append(chunks, output)
	}

	writeOutput(scanner.StreamStdout, []byte("<"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("nmaprun><host /></nmaprun>"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("Nmap done\n"), emit, nil, filter)

	if len(chunks) != 1 {
		t.Fatalf("emitted chunks = %d, want 1", len(chunks))
	}
	if chunks[0].Text != "Nmap done\n" {
		t.Fatalf("emitted chunk = %#v", chunks[0])
	}
}

func TestScanOutputFilterEmitsNonXMLPrefix(t *testing.T) {
	filter := newScanOutputFilter(scanner.StreamStdout)
	var chunks []scanner.ScanOutput
	emit := func(output scanner.ScanOutput) {
		chunks = append(chunks, output)
	}

	writeOutput(scanner.StreamStdout, []byte("<"), emit, nil, filter)
	writeOutput(scanner.StreamStdout, []byte("not-xml>\n"), emit, nil, filter)

	if len(chunks) != 1 {
		t.Fatalf("emitted chunks = %d, want 1", len(chunks))
	}
	if chunks[0].Text != "<not-xml>\n" {
		t.Fatalf("emitted chunk = %#v", chunks[0])
	}
}

func TestScanOutputFilterFlushesPendingNonXMLAtEOF(t *testing.T) {
	filter := newScanOutputFilter(scanner.StreamStdout)
	capture := newDiagnosticsCapture()
	var chunks []scanner.ScanOutput
	emit := func(output scanner.ScanOutput) {
		chunks = append(chunks, output)
	}

	writeOutput(scanner.StreamStdout, []byte("<"), emit, capture, filter)
	flushOutput(scanner.StreamStdout, emit, capture, filter)

	if len(chunks) != 1 {
		t.Fatalf("emitted chunks = %d, want 1", len(chunks))
	}
	if chunks[0].Text != "<" {
		t.Fatalf("emitted chunk = %#v", chunks[0])
	}
	if capture.String() != "<" {
		t.Fatalf("capture = %q", capture.String())
	}
}

func helperCommand(t *testing.T, xmlPath string, xmlStdout bool) (string, []string) {
	t.Helper()

	goPath, err := exec.LookPath("go")
	if err != nil {
		t.Fatalf("go executable not found: %v", err)
	}
	helperPath := filepath.Join(t.TempDir(), "executor-helper.go")
	if err := os.WriteFile(helperPath, []byte(execExecutorHelperSource), 0o600); err != nil {
		t.Fatalf("WriteFile returned error: %v", err)
	}
	args := []string{"run", helperPath}
	if xmlStdout {
		args = append(args, "--xml-stdout")
	}
	args = append(args, "--", "-oX", xmlPath)
	return goPath, args
}

const execExecutorHelperSource = `package main

import (
	"os"
)

func main() {
	xmlPath := helperXMLPath(os.Args)
	if xmlPath == "" {
		os.Exit(2)
	}
	stdout := "plain stdout diagnostic\n"
	if hasArg(os.Args, "--xml-stdout") {
		stdout = "<?xml version=\"1.0\"?>\n<nmaprun>\n</nmaprun>\n"
	}
	if _, err := os.Stdout.WriteString(stdout); err != nil {
		os.Exit(2)
	}
	if _, err := os.Stderr.WriteString("plain stderr diagnostic\n"); err != nil {
		os.Exit(2)
	}
	if err := os.WriteFile(xmlPath, []byte("<nmaprun><host /></nmaprun>"), 0o600); err != nil {
		os.Exit(2)
	}
}

func helperXMLPath(args []string) string {
	for index := 0; index < len(args)-1; index++ {
		if args[index] == "-oX" {
			return args[index+1]
		}
	}
	return ""
}

func hasArg(args []string, want string) bool {
	for _, arg := range args {
		if arg == want {
			return true
		}
	}
	return false
}
`
