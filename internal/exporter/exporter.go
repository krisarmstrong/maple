package exporter

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
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
	FormatCSV      Format = "csv"
	FormatGrepable Format = "grepable"
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
	case FormatCSV:
		return exportCSV(record)
	case FormatGrepable:
		return exportGrepable(record), nil
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

// exportCSV produces an RFC-4180 CSV file with one row per open port across all
// hosts in the scan. Fields: host, address, port, protocol, state, service,
// product/version.
func exportCSV(record store.ScanRecord) (File, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	if err := w.Write([]string{"host", "address", "port", "protocol", "state", "service", "product/version"}); err != nil {
		return File{}, err
	}

	for _, host := range record.Summary.Hosts {
		for _, port := range host.Ports {
			productVersion := strings.TrimSpace(port.Product + " " + port.Version)
			row := []string{
				host.Hostname,
				host.Address,
				port.ID,
				port.Protocol,
				port.State,
				port.Service,
				productVersion,
			}
			if err := w.Write(row); err != nil {
				return File{}, err
			}
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return File{}, err
	}

	return File{Filename: exportFilename(record, "csv"), Content: buf.Bytes()}, nil
}

// exportGrepable produces an nmap -oG style grepable output file with one line
// per host listing all ports in the form:
//
//	Host: <addr> (<hostname>)\tPorts: <port>/<state>/<proto>//<service>//, ...
func exportGrepable(record store.ScanRecord) File {
	var sb strings.Builder
	sb.WriteString("# Maple scan — grepable format\n")

	for _, host := range record.Summary.Hosts {
		fmt.Fprintf(&sb, "Host: %s (%s)", host.Address, host.Hostname)
		if len(host.Ports) > 0 {
			sb.WriteString("\tPorts: ")
			for i, port := range host.Ports {
				if i > 0 {
					sb.WriteString(", ")
				}
				// nmap -oG field order: port/state/proto/owner/service/rpcnum/info/
				fmt.Fprintf(&sb, "%s/%s/%s//%s//", port.ID, port.State, port.Protocol, port.Service)
			}
		}
		sb.WriteString("\n")
	}

	return File{Filename: exportFilename(record, "gnmap"), Content: []byte(sb.String())}
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
