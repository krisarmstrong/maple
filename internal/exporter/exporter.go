package exporter

import (
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/krisarmstrong/maple/internal/reports"
	"github.com/krisarmstrong/maple/internal/store"
)

type Format string

const (
	FormatXML      Format = "xml"
	FormatJSON     Format = "json"
	FormatMarkdown Format = "markdown"
)

var ErrUnknownFormat = errors.New("unknown export format")

type File struct {
	Filename string
	Content  []byte
}

func Build(record store.ScanRecord, format Format) (File, error) {
	switch format {
	case FormatXML:
		return exportXML(record), nil
	case FormatJSON:
		return exportJSON(record)
	case FormatMarkdown:
		return exportMarkdown(record), nil
	default:
		return File{}, ErrUnknownFormat
	}
}

func exportXML(record store.ScanRecord) File {
	return File{
		Filename: exportFilename(record, "xml"),
		Content:  []byte(record.XML),
	}
}

func exportJSON(record store.ScanRecord) (File, error) {
	content, err := json.MarshalIndent(record, "", "  ")
	if err != nil {
		return File{}, err
	}
	return File{Filename: exportFilename(record, "json"), Content: append(content, '\n')}, nil
}

func exportMarkdown(record store.ScanRecord) File {
	content := reports.Markdown(reports.MarkdownInput{
		RunID:       record.RunID,
		StartedAt:   record.StartedAt,
		FinishedAt:  record.FinishedAt,
		Preview:     record.Preview,
		Summary:     record.Summary,
		ExitCode:    record.ExitCode,
		Diagnostics: record.Diagnostics,
		Error:       record.Error,
	})
	return File{Filename: exportFilename(record, "md"), Content: []byte(content)}
}

func exportFilename(record store.ScanRecord, extension string) string {
	stamp := timestamp(record.FinishedAt)
	return "maple-scan-" + stamp + "-" + shortRunID(record.RunID) + "." + extension
}

func timestamp(value time.Time) string {
	if value.IsZero() {
		return time.Now().UTC().Format("20060102-150405")
	}
	return value.UTC().Format("20060102-150405")
}

func shortRunID(runID string) string {
	value := strings.TrimSpace(runID)
	if len(value) <= 8 {
		return value
	}
	return value[:8]
}
