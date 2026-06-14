package store

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/krisarmstrong/maple/internal/reports"
	"github.com/krisarmstrong/maple/internal/scanner"
)

const historyFileMode = 0o600

var ErrRecordNotFound = errors.New("scan record not found")

type ScanRecord struct {
	RunID       string                 `json:"runId"`
	StartedAt   time.Time              `json:"startedAt"`
	FinishedAt  time.Time              `json:"finishedAt"`
	Preview     scanner.CommandPreview `json:"preview"`
	Summary     reports.Summary        `json:"summary"`
	ExitCode    int                    `json:"exitCode"`
	XML         string                 `json:"xml"`
	Diagnostics string                 `json:"diagnostics,omitempty"`
	Error       string                 `json:"error,omitempty"`
}

type HistoryStore struct {
	path string
	mu   sync.Mutex
}

func NewHistoryStore(path string) *HistoryStore {
	return &HistoryStore{path: path}
}

func DefaultHistoryStore() (*HistoryStore, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	return NewHistoryStore(filepath.Join(configDir, "Maple", "history.json")), nil
}

func FallbackHistoryPath() string {
	return filepath.Join(os.TempDir(), "Maple", "history.json")
}

func (s *HistoryStore) List() ([]ScanRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.readLocked()
}

func (s *HistoryStore) Find(runID string) (ScanRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	records, err := s.readLocked()
	if err != nil {
		return ScanRecord{}, err
	}
	for _, record := range records {
		if record.RunID == runID {
			return record, nil
		}
	}
	return ScanRecord{}, ErrRecordNotFound
}

func (s *HistoryStore) Delete(runID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	records, err := s.readLocked()
	if err != nil {
		return err
	}
	next := make([]ScanRecord, 0, len(records))
	found := false
	for _, record := range records {
		if record.RunID == runID {
			found = true
			continue
		}
		next = append(next, record)
	}
	if !found {
		return ErrRecordNotFound
	}
	return s.writeLocked(next)
}

func (s *HistoryStore) Clear() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.writeLocked([]ScanRecord{})
}

func (s *HistoryStore) Add(record ScanRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	records, err := s.readLocked()
	if err != nil {
		return err
	}
	records = append([]ScanRecord{record}, records...)

	if err := os.MkdirAll(filepath.Dir(s.path), 0o700); err != nil {
		return err
	}
	return s.writeLocked(records)
}

func (s *HistoryStore) writeLocked(records []ScanRecord) error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	return writeFileAtomic(s.path, data, historyFileMode)
}

// writeFileAtomic writes data to a sibling temp file and renames it into place
// so a crash mid-write cannot truncate or corrupt the existing history file.
func writeFileAtomic(path string, data []byte, mode os.FileMode) error {
	dir := filepath.Dir(path)
	temp, err := os.CreateTemp(dir, ".history-*.tmp")
	if err != nil {
		return err
	}
	tempPath := temp.Name()
	defer func() {
		_ = os.Remove(tempPath)
	}()
	if err := temp.Chmod(mode); err != nil {
		_ = temp.Close()
		return err
	}
	if _, err := temp.Write(data); err != nil {
		_ = temp.Close()
		return err
	}
	if err := temp.Sync(); err != nil {
		_ = temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	return os.Rename(tempPath, path)
}

func (s *HistoryStore) readLocked() ([]ScanRecord, error) {
	data, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return []ScanRecord{}, nil
	}
	if err != nil {
		return nil, err
	}
	var records []ScanRecord
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, err
	}
	if records == nil {
		return []ScanRecord{}, nil
	}
	return records, nil
}
