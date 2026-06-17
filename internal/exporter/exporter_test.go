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

// ── CSV export ────────────────────────────────────────────────────────────────

func TestBuildCSVExport_HeaderRow(t *testing.T) {
	file, err := Build(exportRecord(), FormatCSV)
	if err != nil {
		t.Fatalf("Build(FormatCSV) error = %v", err)
	}

	lines := strings.Split(strings.TrimRight(string(file.Content), "\n"), "\n")
	if len(lines) == 0 {
		t.Fatal("CSV output is empty")
	}
	want := "host,address,port,protocol,state,service,product/version"
	if lines[0] != want {
		t.Fatalf("CSV header = %q, want %q", lines[0], want)
	}
}

func TestBuildCSVExport_OneRowPerPort(t *testing.T) {
	record := exportRecordWithPorts()
	file, err := Build(record, FormatCSV)
	if err != nil {
		t.Fatalf("Build(FormatCSV) error = %v", err)
	}

	lines := strings.Split(strings.TrimRight(string(file.Content), "\n"), "\n")
	// header + 2 ports
	if len(lines) != 3 {
		t.Fatalf("CSV line count = %d, want 3 (header + 2 ports)\n%s", len(lines), string(file.Content))
	}
}

func TestBuildCSVExport_QuotesCommaInService(t *testing.T) {
	record := store.ScanRecord{
		RunID:      "scan-abc123456",
		FinishedAt: time.Date(2026, 6, 12, 14, 6, 16, 0, time.UTC),
		Preview: scanner.CommandPreview{
			Executable: "/opt/homebrew/bin/nmap",
			Args:       []string{"-oX", "<managed-xml-file>", "-sT", "--", "127.0.0.1"},
		},
		Summary: scanner.Summary{
			Hosts: []scanner.Host{
				{
					Address:  "192.168.1.1",
					Hostname: "router.local",
					Ports: []scanner.Port{
						{ID: "80", Protocol: "tcp", State: "open", Service: "http,alt", Product: "", Version: ""},
					},
				},
			},
		},
		XML: "<nmaprun />",
	}

	file, err := Build(record, FormatCSV)
	if err != nil {
		t.Fatalf("Build(FormatCSV) error = %v", err)
	}

	content := string(file.Content)
	// RFC-4180: comma in field must be double-quoted
	if !strings.Contains(content, `"http,alt"`) {
		t.Fatalf("CSV did not quote comma-containing service field:\n%s", content)
	}
}

func TestBuildCSVExport_EmptyRecord(t *testing.T) {
	file, err := Build(exportRecord(), FormatCSV)
	if err != nil {
		t.Fatalf("Build(FormatCSV) error = %v", err)
	}

	lines := strings.Split(strings.TrimRight(string(file.Content), "\n"), "\n")
	// only the header — exportRecord() has no hosts
	if len(lines) != 1 {
		t.Fatalf("CSV line count = %d, want 1 (header only)\n%s", len(lines), string(file.Content))
	}
}

func TestBuildCSVExport_Filename(t *testing.T) {
	file, err := Build(exportRecord(), FormatCSV)
	if err != nil {
		t.Fatalf("Build(FormatCSV) error = %v", err)
	}
	if file.Filename != "maple-scan-20260612-140616-scan-abc.csv" {
		t.Fatalf("filename = %q", file.Filename)
	}
}

// ── Grepable export ───────────────────────────────────────────────────────────

func TestBuildGrepableExport_OneLinePerHost(t *testing.T) {
	record := exportRecordWithPorts()
	file, err := Build(record, FormatGrepable)
	if err != nil {
		t.Fatalf("Build(FormatGrepable) error = %v", err)
	}

	content := string(file.Content)
	// one host in exportRecordWithPorts
	hostLines := 0
	for _, line := range strings.Split(content, "\n") {
		if strings.HasPrefix(line, "Host:") {
			hostLines++
		}
	}
	if hostLines != 1 {
		t.Fatalf("grepable host line count = %d, want 1\n%s", hostLines, content)
	}
}

func TestBuildGrepableExport_ContainsPorts(t *testing.T) {
	record := exportRecordWithPorts()
	file, err := Build(record, FormatGrepable)
	if err != nil {
		t.Fatalf("Build(FormatGrepable) error = %v", err)
	}

	content := string(file.Content)
	if !strings.Contains(content, "80/open/tcp//http//") {
		t.Fatalf("grepable output missing expected port entry:\n%s", content)
	}
	if !strings.Contains(content, "443/open/tcp//https//") {
		t.Fatalf("grepable output missing expected port entry:\n%s", content)
	}
}

func TestBuildGrepableExport_EmptyRecord(t *testing.T) {
	file, err := Build(exportRecord(), FormatGrepable)
	if err != nil {
		t.Fatalf("Build(FormatGrepable) error = %v", err)
	}

	content := string(file.Content)
	// no hosts — should only have the comment header
	hostLines := 0
	for _, line := range strings.Split(content, "\n") {
		if strings.HasPrefix(line, "Host:") {
			hostLines++
		}
	}
	if hostLines != 0 {
		t.Fatalf("grepable host line count = %d, want 0\n%s", hostLines, content)
	}
}

func TestBuildGrepableExport_Filename(t *testing.T) {
	file, err := Build(exportRecord(), FormatGrepable)
	if err != nil {
		t.Fatalf("Build(FormatGrepable) error = %v", err)
	}
	if file.Filename != "maple-scan-20260612-140616-scan-abc.gnmap" {
		t.Fatalf("filename = %q", file.Filename)
	}
}

// ── fixtures ──────────────────────────────────────────────────────────────────

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

func exportRecordWithPorts() store.ScanRecord {
	return store.ScanRecord{
		RunID:      "scan-abc123456",
		FinishedAt: time.Date(2026, 6, 12, 14, 6, 16, 0, time.UTC),
		Preview: scanner.CommandPreview{
			Executable: "/opt/homebrew/bin/nmap",
			Args:       []string{"-oX", "<managed-xml-file>", "-sT", "--", "192.168.1.1"},
		},
		Summary: scanner.Summary{
			Hosts: []scanner.Host{
				{
					Address:  "192.168.1.1",
					Hostname: "router.local",
					Ports: []scanner.Port{
						{ID: "80", Protocol: "tcp", State: "open", Service: "http", Product: "nginx", Version: "1.25.3"},
						{ID: "443", Protocol: "tcp", State: "open", Service: "https", Product: "nginx", Version: "1.25.3"},
					},
				},
			},
		},
		XML: "<nmaprun />",
	}
}
