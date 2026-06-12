package store

import (
	"errors"
	"path/filepath"
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
}

func scanRecord(runID string) ScanRecord {
	now := time.Date(2026, 6, 12, 10, 0, 0, 0, time.UTC)
	return ScanRecord{
		RunID:      runID,
		StartedAt:  now,
		FinishedAt: now.Add(time.Second),
		Preview: scanner.CommandPreview{
			Executable: "nmap",
			Args:       []string{"-oX", "-", "-sn", "--", "scanme.nmap.org"},
		},
		ExitCode: 0,
		XML:      "<nmaprun></nmaprun>",
	}
}
