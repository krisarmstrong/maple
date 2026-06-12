package main

import (
	"os"

	"github.com/krisarmstrong/maple/internal/exporter"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const exportFileMode = 0o600

func (a *App) ExportScanHistoryRecord(runID string, format exporter.Format) (string, error) {
	record, err := a.history.Find(runID)
	if err != nil {
		return "", err
	}
	file, err := exporter.Build(record, format)
	if err != nil {
		return "", err
	}
	path, err := a.exportPath(file.Filename, format)
	if err != nil || path == "" {
		return path, err
	}
	return path, os.WriteFile(path, file.Content, exportFileMode)
}

func (a *App) exportPath(filename string, format exporter.Format) (string, error) {
	return runtime.SaveFileDialog(a.context(), runtime.SaveDialogOptions{
		Title:                "Export Scan",
		DefaultFilename:      filename,
		CanCreateDirectories: true,
		Filters:              exportFilters(format),
	})
}

func exportFilters(format exporter.Format) []runtime.FileFilter {
	switch format {
	case exporter.FormatXML:
		return []runtime.FileFilter{{DisplayName: "Nmap XML (*.xml)", Pattern: "*.xml"}}
	case exporter.FormatMarkdown:
		return []runtime.FileFilter{{DisplayName: "Markdown (*.md)", Pattern: "*.md"}}
	default:
		return []runtime.FileFilter{{DisplayName: "JSON (*.json)", Pattern: "*.json"}}
	}
}
