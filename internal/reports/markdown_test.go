package reports

import (
	"strings"
	"testing"
	"time"

	"github.com/krisarmstrong/maple/internal/scanner"
)

func TestMarkdownIncludesCommandAndSummary(t *testing.T) {
	report := Markdown(MarkdownInput{
		RunID:      "scan-1",
		StartedAt:  time.Date(2026, 6, 12, 10, 0, 0, 0, time.UTC),
		FinishedAt: time.Date(2026, 6, 12, 10, 0, 5, 0, time.UTC),
		Preview: scanner.CommandPreview{
			Executable: "nmap",
			Args:       []string{"-oX", "<managed-xml-file>", "-sn", "--", "192.0.2.0/30"},
			Targets:    []scanner.Target{{Value: "192.0.2.0/30", Kind: scanner.TargetCIDR}},
			Profile:    scanner.Profile{Name: "Ping Sweep"},
		},
		Summary: Summary{
			HostCount:   2,
			HostsUp:     1,
			HostsDown:   1,
			ElapsedTime: "5.00",
			Hosts: []Host{
				{
					Address:  "192.0.2.1",
					Hostname: "router.example",
					State:    "up",
					Ports: []Port{
						{
							Protocol:  "tcp",
							ID:        "22",
							State:     "open",
							Reason:    "syn-ack",
							Service:   "ssh",
							Product:   "OpenSSH",
							Version:   "9.6",
							ExtraInfo: "protocol 2.0",
						},
					},
				},
				{Address: "192.0.2.2", State: "down"},
			},
		},
		ExitCode:    0,
		Diagnostics: "Strange read error from 127.0.0.1",
	})

	containsAll(t, report, []string{
		"# Maple Scan Report",
		"- Run ID: scan-1",
		"- Profile: Ping Sweep",
		"nmap -oX <managed-xml-file> -sn -- 192.0.2.0/30",
		"- Hosts found: 2",
		"- Hosts up: 1",
		"- Hosts down: 1",
		"- Open ports: 1",
		"- Diagnostics: Strange read error from 127.0.0.1",
		"- Elapsed: 5.00s",
		"## Hosts",
		"| 192.0.2.1 | router.example | up |",
		"| 192.0.2.2 | - | down |",
		"### Ports for router.example",
		"| tcp/22 | open | syn-ack | ssh | OpenSSH 9.6 | protocol 2.0 |",
	})
}

func TestMarkdownIncludesErrorAndEmptyResults(t *testing.T) {
	report := Markdown(MarkdownInput{
		RunID:      "scan-empty",
		StartedAt:  time.Date(2026, 6, 12, 10, 0, 0, 0, time.UTC),
		FinishedAt: time.Date(2026, 6, 12, 10, 0, 5, 0, time.UTC),
		Preview: scanner.CommandPreview{
			Executable: "nmap",
			Args:       []string{"-oX", "<managed-xml-file>", "--", "192.0.2.1"},
			Targets:    []scanner.Target{{Value: "192.0.2.1", Kind: scanner.TargetIP}},
			Profile:    scanner.Profile{Name: "TCP Connect"},
		},
		Summary:  Summary{HostCount: 0},
		ExitCode: 1,
		Error:    "scan failed",
	})

	containsAll(t, report, []string{
		"- Error: scan failed",
		"## Hosts",
		"No parsed hosts were reported.",
	})
}

func containsAll(t *testing.T, value string, needles []string) {
	t.Helper()
	for _, needle := range needles {
		if !strings.Contains(value, needle) {
			t.Fatalf("report does not contain %q:\n%s", needle, value)
		}
	}
}
