package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/krisarmstrong/maple/internal/scanner"
)

func TestHistoryStoreAddsNewestRecordFirst(t *testing.T) {
	store := NewHistoryStore(filepath.Join(t.TempDir(), "history.json"))

	first := scanRecord("scan-1")
	second := scanRecord("scan-2")
	if err := store.Add(first); err != nil {
		t.Fatalf("Add first returned error: %v", err)
	}
	if err := store.Add(second); err != nil {
		t.Fatalf("Add second returned error: %v", err)
	}

	records, err := store.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(records) != 2 {
		t.Fatalf("len(records) = %d, want 2", len(records))
	}
	if records[0].RunID != "scan-2" || records[1].RunID != "scan-1" {
		t.Fatalf("unexpected order: %#v", records)
	}
}

func TestHistoryStoreListsEmptyMissingFile(t *testing.T) {
	store := NewHistoryStore(filepath.Join(t.TempDir(), "missing", "history.json"))

	records, err := store.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(records) != 0 {
		t.Fatalf("len(records) = %d, want 0", len(records))
	}
}

func TestHistoryStoreFindsRecordByRunID(t *testing.T) {
	store := NewHistoryStore(filepath.Join(t.TempDir(), "history.json"))
	record := scanRecord("scan-1")
	if err := store.Add(record); err != nil {
		t.Fatalf("Add returned error: %v", err)
	}

	got, err := store.Find("scan-1")
	if err != nil {
		t.Fatalf("Find returned error: %v", err)
	}
	if got.RunID != "scan-1" {
		t.Fatalf("RunID = %q, want scan-1", got.RunID)
	}
	if got.XML != "<nmaprun></nmaprun>" {
		t.Fatalf("XML = %q, want hydrated XML", got.XML)
	}
}

func TestHistoryStoreStoresRawXMLOutsideManifest(t *testing.T) {
	path := filepath.Join(t.TempDir(), "history.json")
	store := NewHistoryStore(path)
	record := scanRecord("scan-1")

	if err := store.Add(record); err != nil {
		t.Fatalf("Add returned error: %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile returned error: %v", err)
	}
	if strings.Contains(string(data), record.XML) {
		t.Fatalf("history manifest contains raw XML: %s", string(data))
	}

	var records []ScanRecord
	if err := json.Unmarshal(data, &records); err != nil {
		t.Fatalf("json.Unmarshal returned error: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("len(records) = %d, want 1", len(records))
	}
	if records[0].XMLPath == "" {
		t.Fatal("XMLPath is empty, want sidecar XML path")
	}
	xml, err := os.ReadFile(records[0].XMLPath)
	if err != nil {
		t.Fatalf("ReadFile XMLPath returned error: %v", err)
	}
	if string(xml) != record.XML {
		t.Fatalf("sidecar XML = %q, want %q", string(xml), record.XML)
	}
}

func TestHistoryStoreFindReturnsNotFound(t *testing.T) {
	store := NewHistoryStore(filepath.Join(t.TempDir(), "history.json"))

	_, err := store.Find("missing")
	if !errors.Is(err, ErrRecordNotFound) {
		t.Fatalf("expected ErrRecordNotFound, got %v", err)
	}
}

func TestHistoryStoreDeletesRecordByRunID(t *testing.T) {
	store := NewHistoryStore(filepath.Join(t.TempDir(), "history.json"))
	if err := store.Add(scanRecord("scan-1")); err != nil {
		t.Fatalf("Add scan-1 returned error: %v", err)
	}
	if err := store.Add(scanRecord("scan-2")); err != nil {
		t.Fatalf("Add scan-2 returned error: %v", err)
	}

	if err := store.Delete("scan-1"); err != nil {
		t.Fatalf("Delete returned error: %v", err)
	}

	records, err := store.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("len(records) = %d, want 1", len(records))
	}
	if records[0].RunID != "scan-2" {
		t.Fatalf("remaining RunID = %q, want scan-2", records[0].RunID)
	}
	if _, err := os.Stat(filepath.Join(filepath.Dir(store.path), "records", "scan-1.xml")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("deleted sidecar stat error = %v, want not exist", err)
	}
}

func TestHistoryStoreDeleteReturnsNotFound(t *testing.T) {
	store := NewHistoryStore(filepath.Join(t.TempDir(), "history.json"))

	err := store.Delete("missing")
	if !errors.Is(err, ErrRecordNotFound) {
		t.Fatalf("expected ErrRecordNotFound, got %v", err)
	}
}

func TestHistoryStoreClearsRecords(t *testing.T) {
	store := NewHistoryStore(filepath.Join(t.TempDir(), "history.json"))
	if err := store.Add(scanRecord("scan-1")); err != nil {
		t.Fatalf("Add scan-1 returned error: %v", err)
	}
	if err := store.Add(scanRecord("scan-2")); err != nil {
		t.Fatalf("Add scan-2 returned error: %v", err)
	}

	if err := store.Clear(); err != nil {
		t.Fatalf("Clear returned error: %v", err)
	}

	records, err := store.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(records) != 0 {
		t.Fatalf("len(records) = %d, want 0", len(records))
	}
	if _, err := os.Stat(filepath.Join(filepath.Dir(store.path), "records")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("records directory stat error = %v, want not exist", err)
	}
}

func scanRecord(runID string) ScanRecord {
	now := time.Date(2026, 6, 12, 10, 0, 0, 0, time.UTC)
	return ScanRecord{
		RunID:      runID,
		StartedAt:  now,
		FinishedAt: now.Add(time.Second),
		Preview: scanner.CommandPreview{
			Executable: "nmap",
			Args:       []string{"-oX", "<managed-xml-file>", "-sn", "--", "scanme.nmap.org"},
		},
		ExitCode: 0,
		XML:      "<nmaprun></nmaprun>",
	}
}

func TestHistoryStoreCapEnforcesMaxAndRemovesSidecars(t *testing.T) {
	s := NewHistoryStore(filepath.Join(t.TempDir(), "history.json"))

	// Add maxHistoryRecords+1 records; the oldest (scan-0) should be trimmed.
	for i := 0; i <= maxHistoryRecords; i++ {
		r := scanRecord(fmt.Sprintf("scan-%d", i))
		if err := s.Add(r); err != nil {
			t.Fatalf("Add scan-%d returned error: %v", i, err)
		}
	}

	records, err := s.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(records) != maxHistoryRecords {
		t.Fatalf("len(records) = %d, want %d", len(records), maxHistoryRecords)
	}

	// The oldest record (scan-0) sidecar should be gone.
	sidecarPath := filepath.Join(filepath.Dir(s.path), "records", "scan-0.xml")
	if _, err := os.Stat(sidecarPath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("trimmed sidecar stat error = %v, want not exist", err)
	}
}

func TestHistoryStoreDeleteOlderThanRemovesMatchingRecords(t *testing.T) {
	s := NewHistoryStore(filepath.Join(t.TempDir(), "history.json"))
	now := time.Date(2026, 6, 16, 12, 0, 0, 0, time.UTC)

	old1 := scanRecord("scan-old1")
	old1.FinishedAt = now.Add(-2 * time.Hour)

	old2 := scanRecord("scan-old2")
	old2.FinishedAt = now.Add(-1 * time.Hour)

	future := scanRecord("scan-future")
	future.FinishedAt = now.Add(1 * time.Hour)

	for _, r := range []ScanRecord{old1, old2, future} {
		if err := s.Add(r); err != nil {
			t.Fatalf("Add %s returned error: %v", r.RunID, err)
		}
	}

	if err := s.DeleteOlderThan(now); err != nil {
		t.Fatalf("DeleteOlderThan returned error: %v", err)
	}

	records, err := s.List()
	if err != nil {
		t.Fatalf("List returned error: %v", err)
	}
	if len(records) != 1 {
		t.Fatalf("len(records) = %d, want 1", len(records))
	}
	if records[0].RunID != "scan-future" {
		t.Fatalf("remaining RunID = %q, want scan-future", records[0].RunID)
	}

	// Sidecars for removed records should be gone.
	for _, runID := range []string{"scan-old1", "scan-old2"} {
		sidecarPath := filepath.Join(filepath.Dir(s.path), "records", runID+".xml")
		if _, err := os.Stat(sidecarPath); !errors.Is(err, os.ErrNotExist) {
			t.Fatalf("removed sidecar %s stat error = %v, want not exist", runID, err)
		}
	}
}
