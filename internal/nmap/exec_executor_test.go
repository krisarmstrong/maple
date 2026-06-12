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

func TestExecExecutorHelperProcess(t *testing.T) {
	if os.Getenv("MAPLE_EXEC_EXECUTOR_HELPER") != "1" {
		return
	}
	xmlPath := helperXMLPath(os.Args)
	if xmlPath == "" {
		os.Exit(2)
	}
	if _, err := os.Stdout.WriteString("plain stdout diagnostic\n"); err != nil {
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
