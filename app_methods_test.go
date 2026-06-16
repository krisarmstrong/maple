package main

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"github.com/krisarmstrong/maple/internal/nmap"
	"github.com/krisarmstrong/maple/internal/platform"
	"github.com/krisarmstrong/maple/internal/scanner"
	"github.com/krisarmstrong/maple/internal/store"
)

// fakeDetector satisfies toolDetector so App methods can be exercised without a
// real Nmap binary on PATH.
type fakeDetector struct {
	detection platform.ToolDetection
}

func (f fakeDetector) Detect(context.Context, []platform.ToolSpec) []platform.ToolDetection {
	return []platform.ToolDetection{f.detection}
}

func (f fakeDetector) DetectOne(context.Context, platform.ToolSpec) platform.ToolDetection {
	return f.detection
}

func (f fakeDetector) DetectPath(context.Context, platform.ToolSpec, string) platform.ToolDetection {
	return f.detection
}

func (f fakeDetector) Help(context.Context, platform.ToolSpec, string) (platform.ToolHelp, error) {
	return platform.ToolHelp{}, nil
}

func newTestApp(t *testing.T, detector toolDetector) *App {
	t.Helper()
	return &App{
		detector: detector,
		history:  store.NewHistoryStore(filepath.Join(t.TempDir(), "history.json")),
	}
}

func TestResolveScanRequestKeepsExplicitPath(t *testing.T) {
	app := newTestApp(t, fakeDetector{})
	resolved, err := app.resolveScanRequest(scanner.ScanRequest{NmapPath: "/opt/nmap"})
	if err != nil {
		t.Fatalf("resolveScanRequest returned error: %v", err)
	}
	if resolved.NmapPath != "/opt/nmap" {
		t.Fatalf("NmapPath = %q, want explicit path preserved", resolved.NmapPath)
	}
}

func TestResolveScanRequestFillsDetectedPath(t *testing.T) {
	app := newTestApp(t, fakeDetector{detection: platform.ToolDetection{Installed: true, Path: "/usr/bin/nmap"}})
	resolved, err := app.resolveScanRequest(scanner.ScanRequest{})
	if err != nil {
		t.Fatalf("resolveScanRequest returned error: %v", err)
	}
	if resolved.NmapPath != "/usr/bin/nmap" {
		t.Fatalf("NmapPath = %q, want detected path", resolved.NmapPath)
	}
}

func TestResolveScanRequestErrsWhenNmapMissing(t *testing.T) {
	app := newTestApp(t, fakeDetector{detection: platform.ToolDetection{Installed: false}})
	if _, err := app.resolveScanRequest(scanner.ScanRequest{}); !errors.Is(err, errNmapNotInstalled) {
		t.Fatalf("err = %v, want errNmapNotInstalled", err)
	}
}

func TestScanReportRendersStoredRecord(t *testing.T) {
	app := newTestApp(t, fakeDetector{})
	if err := app.history.Add(store.ScanRecord{RunID: "run-42", XML: "<nmaprun></nmaprun>"}); err != nil {
		t.Fatalf("seed history: %v", err)
	}
	report, err := app.ScanReport("run-42")
	if err != nil {
		t.Fatalf("ScanReport returned error: %v", err)
	}
	if !strings.Contains(report, "run-42") {
		t.Fatalf("report missing run id: %q", report)
	}
}

func TestScanReportErrsForUnknownRun(t *testing.T) {
	app := newTestApp(t, fakeDetector{})
	if _, err := app.ScanReport("missing"); err == nil {
		t.Fatal("ScanReport accepted an unknown run id")
	}
}

func TestScanHistoryDeleteAndClearRoundTrip(t *testing.T) {
	app := newTestApp(t, fakeDetector{})
	for _, id := range []string{"a", "b"} {
		if err := app.history.Add(store.ScanRecord{RunID: id, XML: "<nmaprun></nmaprun>"}); err != nil {
			t.Fatalf("seed %s: %v", id, err)
		}
	}

	if err := app.DeleteScanHistoryRecord("a"); err != nil {
		t.Fatalf("DeleteScanHistoryRecord: %v", err)
	}
	records, err := app.ScanHistory()
	if err != nil {
		t.Fatalf("ScanHistory: %v", err)
	}
	if len(records) != 1 || records[0].RunID != "b" {
		t.Fatalf("records = %+v, want only run b", records)
	}

	if err := app.ClearScanHistory(); err != nil {
		t.Fatalf("ClearScanHistory: %v", err)
	}
	records, err = app.ScanHistory()
	if err != nil {
		t.Fatalf("ScanHistory after clear: %v", err)
	}
	if len(records) != 0 {
		t.Fatalf("records = %+v, want empty after clear", records)
	}
}

func TestHistoryEmitterReportsPersistFailure(t *testing.T) {
	// Point the store at a path whose parent is a regular file so MkdirAll
	// fails and history.Add returns an error.
	blocker := filepath.Join(t.TempDir(), "not-a-dir")
	if err := writeExportFile(blocker, []byte("x")); err != nil {
		t.Fatalf("seed blocker file: %v", err)
	}
	app := &App{history: store.NewHistoryStore(filepath.Join(blocker, "history.json"))}

	var finished scanner.ScanFinished
	emit := app.historyEmitter(func(event string, payload interface{}) {
		if event == nmap.EventScanFinished {
			if value, ok := payload.(scanner.ScanFinished); ok {
				finished = value
			}
		}
	})
	emit(nmap.EventScanStarted, scanner.ScanStarted{RunID: "scan-1"})
	emit(nmap.EventScanFinished, scanner.ScanFinished{RunID: "scan-1", XML: "<nmaprun></nmaprun>"})

	if finished.PersistError == "" {
		t.Fatal("expected PersistError to be set when history write fails")
	}
}
