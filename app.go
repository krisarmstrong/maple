package main

import (
	"context"
	"errors"
	"time"

	"github.com/krisarmstrong/maple/internal/nmap"
	"github.com/krisarmstrong/maple/internal/platform"
	"github.com/krisarmstrong/maple/internal/reports"
	"github.com/krisarmstrong/maple/internal/scanner"
	"github.com/krisarmstrong/maple/internal/store"
	"github.com/krisarmstrong/maple/internal/version"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var errNmapNotInstalled = errors.New("nmap is not installed or not available on PATH")

const nmapDownloadsURL = "https://nmap.org/download.html"
const nmapReferenceURL = "https://nmap.org/book/man.html"
const nmapNSEDocsURL = "https://nmap.org/nsedoc/"

type App struct {
	ctx         context.Context
	detector    platform.Detector
	history     *store.HistoryStore
	scanManager *nmap.Manager
}

func NewApp() *App {
	history, err := store.DefaultHistoryStore()
	if err != nil {
		history = store.NewHistoryStore(store.FallbackHistoryPath())
	}
	return &App{
		detector:    platform.NewDetector(),
		history:     history,
		scanManager: nmap.NewManager(nmap.NewRunner()),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) DetectTools() []platform.ToolDetection {
	return a.detector.Detect(a.context(), platform.DefaultToolSpecs())
}

func (a *App) AppVersion() version.Info {
	return version.Current()
}

func (a *App) OpenNmapDownloads() {
	runtime.BrowserOpenURL(a.context(), nmapDownloadsURL)
}

func (a *App) OpenNmapReferenceGuide() {
	runtime.BrowserOpenURL(a.context(), nmapReferenceURL)
}

func (a *App) OpenNmapNSEDocs() {
	runtime.BrowserOpenURL(a.context(), nmapNSEDocsURL)
}

func (a *App) LoadNmapHelp() (platform.ToolHelp, error) {
	return a.detector.Help(a.context(), platform.ToolSpec{
		Name:        "nmap",
		DisplayName: "Nmap",
		Required:    true,
	}, "--help")
}

func (a *App) ScanProfiles() []scanner.Profile {
	return scanner.BuiltInProfiles()
}

func (a *App) PreviewScan(request scanner.ScanRequest) (scanner.CommandPreview, error) {
	resolved, err := a.resolveScanRequest(request)
	if err != nil {
		return scanner.CommandPreview{}, err
	}
	return nmap.BuildPreview(resolved.NmapPath, resolved)
}

func (a *App) StartScan(request scanner.ScanRequest) (scanner.ScanStarted, error) {
	resolved, err := a.resolveScanRequest(request)
	if err != nil {
		return scanner.ScanStarted{}, err
	}
	return a.scanManager.Start(a.context(), resolved, a.historyEmitter(nmap.RuntimeEmitter(a.context())))
}

func (a *App) CancelScan() bool {
	return a.scanManager.Cancel()
}

func (a *App) ScanHistory() ([]store.ScanRecord, error) {
	return a.history.List()
}

func (a *App) ScanReport(runID string) (string, error) {
	record, err := a.history.Find(runID)
	if err != nil {
		return "", err
	}
	return reports.Markdown(reports.MarkdownInput{
		RunID:       record.RunID,
		StartedAt:   record.StartedAt,
		FinishedAt:  record.FinishedAt,
		Preview:     record.Preview,
		Summary:     record.Summary,
		ExitCode:    record.ExitCode,
		Diagnostics: record.Diagnostics,
		Error:       record.Error,
	}), nil
}

func (a *App) DeleteScanHistoryRecord(runID string) error {
	return a.history.Delete(runID)
}

func (a *App) ClearScanHistory() error {
	return a.history.Clear()
}

func (a *App) resolveScanRequest(request scanner.ScanRequest) (scanner.ScanRequest, error) {
	if request.NmapPath != "" {
		return request, nil
	}
	detection := a.detector.DetectOne(a.context(), platform.ToolSpec{
		Name:        "nmap",
		DisplayName: "Nmap",
		Required:    true,
		VersionArg:  "--version",
	})
	if !detection.Installed || detection.Path == "" {
		return scanner.ScanRequest{}, errNmapNotInstalled
	}
	request.NmapPath = detection.Path
	return request, nil
}

func (a *App) historyEmitter(emit nmap.EventEmitter) nmap.EventEmitter {
	var started scanner.ScanStarted
	var startedAt time.Time
	return func(event string, payload interface{}) {
		if event == nmap.EventScanStarted {
			if value, ok := payload.(scanner.ScanStarted); ok {
				started = value
				startedAt = time.Now().UTC()
			}
		}
		if event == nmap.EventScanFinished {
			if value, ok := payload.(scanner.ScanFinished); ok {
				summary, err := reports.SummarizeNmapXML(value.XML)
				recordError := value.Error
				if err != nil {
					summary = reports.Summary{}
					if recordError == "" {
						recordError = "Unable to parse Nmap XML: " + err.Error()
					}
				}
				_ = a.history.Add(store.ScanRecord{
					RunID:       value.RunID,
					StartedAt:   startedAt,
					FinishedAt:  time.Now().UTC(),
					Preview:     started.Preview,
					Summary:     summary,
					ExitCode:    value.ExitCode,
					XML:         value.XML,
					Diagnostics: value.Diagnostics,
					Error:       recordError,
				})
			}
		}
		emit(event, payload)
	}
}

func (a *App) context() context.Context {
	if a.ctx == nil {
		return context.Background()
	}
	return a.ctx
}
