//go:build !windows

package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/krisarmstrong/maple/internal/nmap"
	"github.com/krisarmstrong/maple/internal/scanner"
	"github.com/krisarmstrong/maple/internal/store"
)

// fakeNmapScript is a POSIX shell stand-in for nmap: it writes a minimal but
// valid nmap XML document to the path passed after -oX and prints a couple of
// stdout lines, exiting 0. It lets the integration test exercise the real
// exec -> stream -> XML-read path without a real Nmap install.
const fakeNmapScript = `#!/bin/sh
out=""
prev=""
for a in "$@"; do
  if [ "$prev" = "-oX" ]; then out="$a"; fi
  prev="$a"
done
echo "Starting Nmap"
if [ -n "$out" ]; then
  printf '%s' '<?xml version="1.0"?><nmaprun scanner="nmap"><host><status state="up"/><address addr="127.0.0.1" addrtype="ipv4"/><ports><port protocol="tcp" portid="80"><state state="open"/><service name="http"/></port></ports></host><runstats><finished/><hosts up="1" down="0" total="1"/></runstats></nmaprun>' > "$out"
fi
echo "Nmap done"
`

func writeFakeNmap(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "fake-nmap")
	// The fake nmap must be executable for the runner to exec it; this is a
	// throwaway script in a per-test temp dir, never shipped.
	if err := os.WriteFile(path, []byte(fakeNmapScript), 0o755); err != nil { // #nosec G306 -- test-only executable stub in t.TempDir()
		t.Fatalf("write fake nmap: %v", err)
	}
	return path
}

func TestScanThroughManagerWithFakeNmapPersistsAndReports(t *testing.T) {
	manager := nmap.NewManager(nmap.NewRunner())
	finishedCh := make(chan scanner.ScanFinished, 1)
	var sawOutput atomic.Bool
	emit := func(event string, payload interface{}) {
		switch event {
		case nmap.EventScanOutput:
			sawOutput.Store(true)
		case nmap.EventScanFinished:
			if value, ok := payload.(scanner.ScanFinished); ok {
				finishedCh <- value
			}
		}
	}

	if _, err := manager.Start(context.Background(), scanner.ScanRequest{
		ProfileID: scanner.ProfileConnect,
		Targets:   "127.0.0.1",
		NmapPath:  writeFakeNmap(t),
	}, emit); err != nil {
		t.Fatalf("manager.Start returned error: %v", err)
	}

	var finished scanner.ScanFinished
	select {
	case finished = <-finishedCh:
	case <-time.After(10 * time.Second):
		t.Fatal("timed out waiting for scan to finish")
	}

	if finished.ExitCode != 0 {
		t.Fatalf("ExitCode = %d, want 0 (diagnostics: %s)", finished.ExitCode, finished.Diagnostics)
	}
	if !strings.Contains(finished.XML, "<nmaprun") {
		t.Fatalf("XML missing nmaprun document: %q", finished.XML)
	}
	if !sawOutput.Load() {
		t.Fatal("expected nmap stdout to be streamed as scan output")
	}

	// Drive the finished event through the same persistence path app.go uses;
	// historyEmitter avoids the Wails runtime emitter so it is unit-testable.
	app := &App{history: store.NewHistoryStore(filepath.Join(t.TempDir(), "history.json"))}
	persisted := make(chan struct{}, 1)
	wrapped := app.historyEmitter(func(event string, _ interface{}) {
		if event == nmap.EventScanFinished {
			persisted <- struct{}{}
		}
	})
	wrapped(nmap.EventScanStarted, scanner.ScanStarted{RunID: finished.RunID})
	wrapped(nmap.EventScanFinished, finished)
	<-persisted

	records, err := app.ScanHistory()
	if err != nil {
		t.Fatalf("ScanHistory returned error: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("len(records) = %d, want 1", len(records))
	}
	if records[0].Error != "" {
		t.Fatalf("record error = %q, want clean parse", records[0].Error)
	}
	if records[0].Summary.HostsUp != 1 {
		t.Fatalf("Summary.HostsUp = %d, want 1", records[0].Summary.HostsUp)
	}

	report, err := app.ScanReport(finished.RunID)
	if err != nil {
		t.Fatalf("ScanReport returned error: %v", err)
	}
	if !strings.Contains(report, finished.RunID) {
		t.Fatalf("report missing run id %q", finished.RunID)
	}
}
