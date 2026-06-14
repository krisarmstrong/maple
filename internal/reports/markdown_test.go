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
					OSMatches: []OSMatch{
						{Name: "Linux 5.x", Accuracy: "98"},
					},
					ExtraPorts: []ExtraPorts{
						{State: "filtered", Count: 998, Reason: "no-responses"},
					},
					Trace: []TraceHop{
						{TTL: "1", Address: "192.0.2.254", Hostname: "gateway.example", RTT: "1.23"},
					},
					Scripts: []ScriptOutput{
						{ID: "nbstat", Output: "NetBIOS name: ROUTER"},
					},
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
							CPEs:      []string{"cpe:/a:openbsd:openssh:9.6"},
							Scripts: []ScriptOutput{
								{ID: "ssh-hostkey", Output: "2048 SHA256:abc (RSA)\n```"},
							},
						},
						{
							Protocol: "tcp",
							ID:       "80",
							State:    "closed",
							Reason:   "reset",
							Service:  "http",
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
		"### Host details for router.example",
		"- OS: Linux 5.x (98%)",
		"- Other ports: 998 filtered (no-responses)",
		"#### Trace for router.example",
		"| 1 | 192.0.2.254 | gateway.example | 1.23 |",
		"#### Host scripts for router.example",
		"- nbstat",
		"```text\nNetBIOS name: ROUTER\n```",
		"### Ports for router.example",
		"| tcp/22 | open | syn-ack | ssh | OpenSSH 9.6 | protocol 2.0 |",
		"| tcp/80 | closed | reset | http | - | - |",
		"#### CPEs for tcp/22",
		"- cpe:/a:openbsd:openssh:9.6",
		"#### Scripts for tcp/22",
		"- ssh-hostkey",
		"````text\n2048 SHA256:abc (RSA)\n```\n````",
	})
	secondHostIndex := strings.Index(report, "| 192.0.2.2 | - | down |")
	hostScriptsIndex := strings.Index(report, "#### Host scripts for router.example")
	if secondHostIndex == -1 || hostScriptsIndex == -1 || hostScriptsIndex < secondHostIndex {
		t.Fatalf("host scripts must be emitted after the complete host table:\n%s", report)
	}
	portsTableIndex := strings.Index(report, "| tcp/80 | closed | reset | http | - | - |")
	portScriptsIndex := strings.Index(report, "#### Scripts for tcp/22")
	if portsTableIndex == -1 || portScriptsIndex == -1 || portScriptsIndex < portsTableIndex {
		t.Fatalf("port scripts must be emitted after the complete port table:\n%s", report)
	}
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
