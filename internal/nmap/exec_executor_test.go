package nmap

import (
	"context"
	"os"
	"strings"
	"testing"

	"github.com/krisarmstrong/maple/internal/scanner"
)

func TestExecExecutorReadsXMLFromManagedFile(t *testing.T) {
	t.Setenv("MAPLE_EXEC_EXECUTOR_HELPER", "1")

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
	result, err := executor.Execute(
		context.Background(),
		Command{
			Path: os.Args[0],
			Args: []string{
				"-test.run=TestExecExecutorHelperProcess",
				"--",
				"-oX",
				xmlPath,
			},
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
	t.Setenv("MAPLE_EXEC_EXECUTOR_HELPER", "1")
	t.Setenv("MAPLE_EXEC_EXECUTOR_XML_STDOUT", "1")

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
	result, err := executor.Execute(
		context.Background(),
		Command{
			Path: os.Args[0],
			Args: []string{
				"-test.run=TestExecExecutorHelperProcess",
				"--",
				"-oX",
				xmlPath,
			},
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

func TestExecExecutorHelperProcess(t *testing.T) {
	if os.Getenv("MAPLE_EXEC_EXECUTOR_HELPER") != "1" {
		return
	}
	xmlPath := helperXMLPath(os.Args)
	if xmlPath == "" {
		os.Exit(2)
	}
	stdout := "plain stdout diagnostic\n"
	if os.Getenv("MAPLE_EXEC_EXECUTOR_XML_STDOUT") == "1" {
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
	os.Exit(0)
}

func helperXMLPath(args []string) string {
	for index := 0; index < len(args)-1; index++ {
		if args[index] == "-oX" {
			return args[index+1]
		}
	}
	return ""
}
