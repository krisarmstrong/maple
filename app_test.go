package main

import (
	"strings"
	"testing"

	"github.com/krisarmstrong/maple/internal/nmap"
	"github.com/krisarmstrong/maple/internal/scanner"
	"github.com/krisarmstrong/maple/internal/store"
)

func TestHistoryEmitterStoresXMLParseErrors(t *testing.T) {
	app := &App{history: store.NewHistoryStore(t.TempDir() + "/history.json")}
	emit := app.historyEmitter(func(_ string, _ interface{}) {})

	emit(nmap.EventScanStarted, scanner.ScanStarted{
		RunID: "scan-1",
		Preview: scanner.CommandPreview{
			Executable: "nmap",
			Args:       []string{"-oX", "<managed-xml-file>", "-sn", "--", "127.0.0.1"},
			Targets:    []scanner.Target{{Value: "127.0.0.1", Kind: scanner.TargetIP}},
			Profile:    scanner.Profile{Name: "Ping Sweep"},
		},
	})
	emit(nmap.EventScanFinished, scanner.ScanFinished{
		RunID:    "scan-1",
		ExitCode: 0,
		XML:      "<nmaprun>",
	})

	records, err := app.ScanHistory()
	if err != nil {
		t.Fatalf("ScanHistory returned error: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("len(records) = %d, want 1", len(records))
	}
	if !strings.HasPrefix(records[0].Error, "Unable to parse Nmap XML:") {
		t.Fatalf("record error = %q", records[0].Error)
	}
}

func TestNmapDownloadsURLUsesOfficialProjectPage(t *testing.T) {
	if nmapDownloadsURL != "https://nmap.org/download.html" {
		t.Fatalf("nmapDownloadsURL = %q", nmapDownloadsURL)
	}
}
