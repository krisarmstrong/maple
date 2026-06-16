package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/krisarmstrong/maple/internal/exporter"
)

func TestWriteExportFileUsesOwnerOnlyMode(t *testing.T) {
	path := filepath.Join(t.TempDir(), "export.json")
	if err := writeExportFile(path, []byte("{}")); err != nil {
		t.Fatalf("writeExportFile returned error: %v", err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat returned error: %v", err)
	}
	if info.Mode().Perm() != exportFileMode {
		t.Fatalf("mode = %04o, want %04o", info.Mode().Perm(), exportFileMode)
	}
}

func TestExportFiltersMatchFormat(t *testing.T) {
	cases := []struct {
		format  exporter.Format
		pattern string
	}{
		{exporter.FormatXML, "*.xml"},
		{exporter.FormatMarkdown, "*.md"},
		{exporter.FormatJSON, "*.json"},
		{exporter.Format("unknown"), "*.json"},
	}
	for _, tc := range cases {
		filters := exportFilters(tc.format)
		if len(filters) != 1 || filters[0].Pattern != tc.pattern {
			t.Fatalf("exportFilters(%q) = %+v, want pattern %q", tc.format, filters, tc.pattern)
		}
	}
}
