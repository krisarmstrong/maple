package nmap

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/krisarmstrong/maple/internal/scanner"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	EventScanStarted  = "scan:started"
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
}

func NewManager(runner ScanRunner) *Manager {
	return &Manager{runner: runner}
}

func (m *Manager) Start(
	ctx context.Context,
	request scanner.ScanRequest,
	emit EventEmitter,
) (scanner.ScanStarted, error) {
	runCtx, cancel, err := m.claim(ctx)
	if err != nil {
		return scanner.ScanStarted{}, err
	}
	started, err := m.started(request)
	if err != nil {
		m.release(cancel)
		return scanner.ScanStarted{}, err
	}
	emit(EventScanStarted, started)
	go m.run(runCtx, cancel, started.RunID, request, emit)
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

func RuntimeEmitter(ctx context.Context) EventEmitter {
	return func(name string, payload interface{}) {
		runtime.EventsEmit(ctx, name, payload)
	}
}

func (m *Manager) claim(ctx context.Context) (context.Context, context.CancelFunc, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cancel != nil {
		return nil, nil, ErrScanRunning
	}
	runCtx, cancel := context.WithCancel(ctx)
	m.cancel = cancel
	return runCtx, cancel, nil
}

func (m *Manager) started(request scanner.ScanRequest) (scanner.ScanStarted, error) {
	preview, err := BuildPreview(request.NmapPath, request)
	if err != nil {
		return scanner.ScanStarted{}, err
	}
	return scanner.ScanStarted{RunID: fmt.Sprintf("scan-%d", time.Now().UTC().UnixNano()), Preview: preview}, nil
}

func (m *Manager) release(cancel context.CancelFunc) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if sameCancel(m.cancel, cancel) {
		m.cancel = nil
	}
}

func sameCancel(current context.CancelFunc, next context.CancelFunc) bool {
	return current != nil && next != nil
}

func (m *Manager) run(
	ctx context.Context,
	cancel context.CancelFunc,
	runID string,
	request scanner.ScanRequest,
	emit EventEmitter,
) {
	defer m.release(cancel)
	result, err := m.runner.Run(ctx, request, func(output scanner.ScanOutput) {
		emit(EventScanOutput, scanner.ScanChunk{
			RunID:  runID,
			Stream: output.Stream,
			Text:   output.Text,
		})
	})
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
