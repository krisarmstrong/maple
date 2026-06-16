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

func TestManagerEmitsScanPhases(t *testing.T) {
	runner := fakeRunner{chunks: []scanner.ScanOutput{
		{Stream: scanner.StreamStderr, Text: "starting"},
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
	sink.finished(t, started.RunID)

	got := sink.phaseNames(started.RunID)
	want := []string{"validating", "launching", "running", "parsing"}
	if len(got) != len(want) {
		t.Fatalf("phases = %v, want %v", got, want)
	}
	for index, phase := range want {
		if got[index] != phase {
			t.Fatalf("phases = %v, want %v", got, want)
		}
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
	mu             sync.Mutex
	done           chan struct{}
	finishedEvents []scanner.ScanFinished
	phases         []scanner.ScanPhase
}

func newRecordingSink() *recordingSink {
	return &recordingSink{done: make(chan struct{})}
}

func (r *recordingSink) Emit(event string, payload interface{}) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if event == EventScanPhase {
		if phase, ok := payload.(scanner.ScanPhase); ok {
			r.phases = append(r.phases, phase)
		}
	}
	if event == EventScanFinished {
		if finished, ok := payload.(scanner.ScanFinished); ok {
			r.finishedEvents = append(r.finishedEvents, finished)
			close(r.done)
		}
	}
}

func (r *recordingSink) phaseNames(runID string) []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	names := []string{}
	for _, phase := range r.phases {
		if phase.RunID == runID {
			names = append(names, phase.Phase)
		}
	}
	return names
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
	for _, finished := range r.finishedEvents {
		if finished.RunID == runID {
			return finished
		}
	}
	t.Fatalf("no finished event for run %s", runID)
	return scanner.ScanFinished{}
}
