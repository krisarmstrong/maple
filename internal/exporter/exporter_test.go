package exporter

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/krisarmstrong/maple/internal/scanner"
	"github.com/krisarmstrong/maple/internal/store"
)

func TestBuildXMLExport(t *testing.T) {
	record := exportRecord()

	file, err := Build(record, FormatXML)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	if string(file.Content) != "<nmaprun />" {
		t.Fatalf("content = %q, want raw XML", string(file.Content))
	}
	if file.Filename != "maple-scan-20260612-140616-scan-abc.xml" {
		t.Fatalf("filename = %q", file.Filename)
	}
}

func TestBuildJSONExport(t *testing.T) {
	file, err := Build(exportRecord(), FormatJSON)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	var decoded store.ScanRecord
	if err := json.Unmarshal(file.Content, &decoded); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if decoded.RunID != "scan-abc123456" || decoded.XML != "<nmaprun />" {
		t.Fatalf("decoded record = %#v", decoded)
	}
	if !strings.HasSuffix(string(file.Content), "\n") {
		t.Fatal("JSON export should end with a newline")
	}
}

func TestBuildMarkdownExport(t *testing.T) {
	file, err := Build(exportRecord(), FormatMarkdown)
	if err != nil {
		t.Fatalf("Build() error = %v", err)
	}

	content := string(file.Content)
	if !strings.Contains(content, "# Maple Scan Report") {
		t.Fatalf("content = %q, want markdown report", content)
	}
	if file.Filename != "maple-scan-20260612-140616-scan-abc.md" {
		t.Fatalf("filename = %q", file.Filename)
	}
}

func TestBuildRejectsUnknownFormat(t *testing.T) {
	_, err := Build(exportRecord(), Format("yaml"))
	if err == nil {
		t.Fatal("Build() error = nil, want error")
	}
}

func exportRecord() store.ScanRecord {
	return store.ScanRecord{
		RunID:      "scan-abc123456",
		FinishedAt: time.Date(2026, 6, 12, 14, 6, 16, 0, time.UTC),
		Preview: scanner.CommandPreview{
			Executable: "/opt/homebrew/bin/nmap",
			Args:       []string{"-oX", "<managed-xml-file>", "-sT", "--", "127.0.0.1"},
		},
		XML: "<nmaprun />",
	}
}
