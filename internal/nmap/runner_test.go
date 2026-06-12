package nmap

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/krisarmstrong/maple/internal/scanner"
)

func TestManagerStreamsAndCapturesXML(t *testing.T) {
	runner := fakeRunner{chunks: []scanner.ScanOutput{
		{Stream: scanner.StreamStdout, Text: "<nmaprun>"},
		{Stream: scanner.StreamStderr, Text: "note"},
		{Stream: scanner.StreamStdout, Text: "</nmaprun>"},
	}}
	manager := NewManager(runner)
	sink := newRecordingSink()

	started, err := manager.Start(context.Background(), scanner.ScanRequest{
		ProfileID: scanner.ProfilePing,
		Targets:   "scanme.nmap.org",
		NmapPath:  "nmap",
	}, sink.Emit)
	if err != nil {
		t.Fatalf("Start returned error: %v", err)
	}

	finished := sink.finished(t, started.RunID)
	if finished.XML != "<nmaprun></nmaprun>" {
		t.Fatalf("xml = %q", finished.XML)
	}
	if finished.Diagnostics != "note" {
		t.Fatalf("diagnostics = %q, want note", finished.Diagnostics)
	}
	if finished.ExitCode != 0 {
		t.Fatalf("exit code = %d", finished.ExitCode)
	}
}

func TestExitCodeReturnsZeroForSuccessfulCommand(t *testing.T) {
	if code := exitCode(nil); code != 0 {
		t.Fatalf("exitCode(nil) = %d, want 0", code)
	}
}

func TestManagerRejectsConcurrentScan(t *testing.T) {
	runner := newBlockingRunner()
	manager := NewManager(runner)
	sink := newRecordingSink()
	defer runner.unblock()

	_, err := manager.Start(context.Background(), scanner.ScanRequest{
		ProfileID: scanner.ProfilePing,
		Targets:   "scanme.nmap.org",
		NmapPath:  "nmap",
	}, sink.Emit)
	if err != nil {
		t.Fatalf("Start returned error: %v", err)
	}

	_, err = manager.Start(context.Background(), scanner.ScanRequest{
		ProfileID: scanner.ProfilePing,
		Targets:   "example.com",
		NmapPath:  "nmap",
	}, sink.Emit)
	if !errors.Is(err, ErrScanRunning) {
		t.Fatalf("expected ErrScanRunning, got %v", err)
	}
}

type fakeRunner struct {
	chunks []scanner.ScanOutput
}

func (f fakeRunner) Run(
	_ context.Context,
	_ scanner.ScanRequest,
	emit func(scanner.ScanOutput),
) (Result, error) {
	xml := ""
	diagnostics := ""
	for _, chunk := range f.chunks {
		emit(chunk)
		if chunk.Stream == scanner.StreamStdout {
			xml += chunk.Text
		}
		if chunk.Stream == scanner.StreamStderr {
			diagnostics += chunk.Text
		}
	}
	return Result{ExitCode: 0, XML: xml, Diagnostics: diagnostics}, nil
}

type blockingRunner struct {
	done chan struct{}
}

func newBlockingRunner() *blockingRunner {
	return &blockingRunner{done: make(chan struct{})}
}

func (b *blockingRunner) Run(
	ctx context.Context,
	_ scanner.ScanRequest,
	_ func(scanner.ScanOutput),
) (Result, error) {
	select {
	case <-b.done:
		return Result{}, nil
	case <-ctx.Done():
		return Result{ExitCode: -1}, ctx.Err()
	}
}

func (b *blockingRunner) unblock() {
	close(b.done)
}

type recordingSink struct {
	mu     sync.Mutex
	done   chan struct{}
	events []scanner.ScanFinished
}

func newRecordingSink() *recordingSink {
	return &recordingSink{done: make(chan struct{})}
}

func (r *recordingSink) Emit(event string, payload interface{}) {
	if event != EventScanFinished {
		return
	}
	finished, ok := payload.(scanner.ScanFinished)
	if !ok {
		return
	}
	r.mu.Lock()
	r.events = append(r.events, finished)
	close(r.done)
	r.mu.Unlock()
}

func (r *recordingSink) finished(t *testing.T, runID string) scanner.ScanFinished {
	t.Helper()
	select {
	case <-r.done:
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for finished event")
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, finished := range r.events {
		if finished.RunID == runID {
			return finished
		}
	}
	t.Fatalf("no finished event for run %s", runID)
	return scanner.ScanFinished{}
}
