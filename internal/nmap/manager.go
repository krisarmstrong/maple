package nmap

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/krisarmstrong/maple/internal/scanner"
)

const (
	EventScanStarted  = "scan:started"
	EventScanPhase    = "scan:phase"
	EventScanOutput   = "scan:output"
	EventScanFinished = "scan:finished"
)

var ErrScanRunning = errors.New("a scan is already running")

type EventEmitter func(string, interface{})

type ScanRunner interface {
	Run(context.Context, scanner.ScanRequest, func(scanner.ScanOutput)) (Result, error)
}

type Manager struct {
	runner ScanRunner
	mu     sync.Mutex
	cancel context.CancelFunc
	// generation identifies the currently claimed scan. context.CancelFunc
	// values are not comparable in Go, so a monotonic token is used to verify
	// that a releasing scan still owns the manager before clearing it.
	generation uint64
}

func NewManager(runner ScanRunner) *Manager {
	return &Manager{runner: runner}
}

func (m *Manager) Start(
	ctx context.Context,
	request scanner.ScanRequest,
	emit EventEmitter,
) (scanner.ScanStarted, error) {
	runCtx, cancel, token, err := m.claim(ctx)
	if err != nil {
		return scanner.ScanStarted{}, err
	}
	started, err := m.started(request)
	if err != nil {
		m.release(token)
		cancel()
		return scanner.ScanStarted{}, err
	}
	emit(EventScanStarted, started)
	emit(EventScanPhase, scanPhase(started.RunID, "validating", "Target and option validation passed."))
	go m.run(runCtx, cancel, token, started.RunID, request, emit)
	return started, nil
}

func (m *Manager) Cancel() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cancel == nil {
		return false
	}
	m.cancel()
	return true
}

func (m *Manager) claim(ctx context.Context) (context.Context, context.CancelFunc, uint64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cancel != nil {
		return nil, nil, 0, ErrScanRunning
	}
	runCtx, cancel := context.WithCancel(ctx)
	m.cancel = cancel
	m.generation++
	return runCtx, cancel, m.generation, nil
}

func (m *Manager) started(request scanner.ScanRequest) (scanner.ScanStarted, error) {
	preview, err := BuildPreview(request.NmapPath, request)
	if err != nil {
		return scanner.ScanStarted{}, err
	}
	return scanner.ScanStarted{RunID: fmt.Sprintf("scan-%d", time.Now().UTC().UnixNano()), Preview: preview}, nil
}

func (m *Manager) release(token uint64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cancel != nil && m.generation == token {
		m.cancel = nil
	}
}

func (m *Manager) run(
	ctx context.Context,
	cancel context.CancelFunc,
	token uint64,
	runID string,
	request scanner.ScanRequest,
	emit EventEmitter,
) {
	defer cancel()
	defer m.release(token)
	emit(EventScanPhase, scanPhase(runID, "launching", "Starting local Nmap process."))
	outputSeen := false
	result, err := m.runner.Run(ctx, request, func(output scanner.ScanOutput) {
		if !outputSeen {
			outputSeen = true
			emit(EventScanPhase, scanPhase(runID, "running", "Nmap is producing live output."))
		}
		emit(EventScanOutput, scanner.ScanChunk{
			RunID:  runID,
			Stream: output.Stream,
			Text:   output.Text,
		})
	})
	emit(EventScanPhase, scanPhase(runID, "parsing", "Reading Nmap XML output."))
	finished := scanner.ScanFinished{
		RunID:       runID,
		ExitCode:    result.ExitCode,
		XML:         result.XML,
		Diagnostics: result.Diagnostics,
	}
	if err != nil {
		finished.Error = err.Error()
	}
	emit(EventScanFinished, finished)
}

func scanPhase(runID string, phase string, message string) scanner.ScanPhase {
	return scanner.ScanPhase{RunID: runID, Phase: phase, Message: message}
}
