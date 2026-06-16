//go:build !windows

package main

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/krisarmstrong/maple/internal/nmap"
	"github.com/krisarmstrong/maple/internal/scanner"
	"github.com/krisarmstrong/maple/internal/store"
)

// fakeNmapSource is a Go stand-in for nmap: it writes a minimal but valid nmap
// XML document to the path passed after -oX and prints a couple of stdout
// lines, exiting 0. It is compiled with `go build` so the toolchain sets the
// executable bit — no executable-permission file write (and thus no gosec
// suppression) is required.
const fakeNmapSource = `package main

import (
	"fmt"
	"os"
)

const xml = "<?xml version=\"1.0\"?><nmaprun scanner=\"nmap\"><host><status state=\"up\"/><address addr=\"127.0.0.1\" addrtype=\"ipv4\"/><ports><port protocol=\"tcp\" portid=\"80\"><state state=\"open\"/><service name=\"http\"/></port></ports></host><runstats><finished/><hosts up=\"1\" down=\"0\" total=\"1\"/></runstats></nmaprun>"

func main() {
	out := ""
	for i := 0; i+1 < len(os.Args); i++ {
		if os.Args[i] == "-oX" {
			out = os.Args[i+1]
		}
	}
	fmt.Fprintln(os.Stdout, "Starting Nmap")
	if out != "" {
		if err := os.WriteFile(out, []byte(xml), 0o600); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	}
	fmt.Fprintln(os.Stdout, "Nmap done")
}
`

// buildFakeNmap compiles the fake nmap stand-in to a temp binary and returns its
// path. The toolchain produces an executable, so the test never has to write a
// file with an executable mode itself.
func buildFakeNmap(t *testing.T) string {
	t.Helper()
	goBin, err := exec.LookPath("go")
	if err != nil {
		t.Skipf("go toolchain not available: %v", err)
	}
	dir := t.TempDir()
	src := filepath.Join(dir, "fakenmap.go")
	if err := os.WriteFile(src, []byte(fakeNmapSource), 0o600); err != nil {
		t.Fatalf("write fake nmap source: %v", err)
	}
	bin := filepath.Join(dir, "fakenmap")
	if out, err := exec.Command(goBin, "build", "-o", bin, src).CombinedOutput(); err != nil {
		t.Fatalf("build fake nmap: %v\n%s", err, out)
	}
	return bin
}

func TestScanThroughManagerWithFakeNmapPersistsAndReports(t *testing.T) {
	manager := nmap.NewManager(nmap.NewRunner())
	finishedCh := make(chan scanner.ScanFinished, 1)
	// Note: stdout streaming is asserted by exec_executor_test.go. It is not
	// checked here because a fake binary that exits instantly races the pipe
	// drain in ExecExecutor, making the assertion flaky; the deterministic
	// value of this test is the scan -> parse -> persist -> report path.
	emit := func(event string, payload interface{}) {
		if event == nmap.EventScanFinished {
			if value, ok := payload.(scanner.ScanFinished); ok {
				finishedCh <- value
			}
		}
	}

	if _, err := manager.Start(context.Background(), scanner.ScanRequest{
		ProfileID: scanner.ProfileConnect,
		Targets:   "127.0.0.1",
		NmapPath:  buildFakeNmap(t),
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
