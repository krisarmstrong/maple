package scanner

import "testing"

func TestBuildOptionArgsAddsStructuredNmapOptions(t *testing.T) {
	args, err := BuildOptionArgs(ScanOptions{
		ScanTechnique:    ScanTechniqueUDP,
		DiscoveryMode:    DiscoveryModeSkip,
		TargetInputFile:  "/Users/krisarmstrong/targets.txt",
		ExcludeTargets:   "192.168.1.10, scanme.nmap.org",
		ExcludeFile:      "/Users/krisarmstrong/exclude-targets.txt",
		TimingTemplate:   "T4",
		Ports:            "22,80,443",
		ServiceDetection: true,
		VersionMode:      VersionModeAll,
		IPv6:             true,
		OSDetection:      true,
		Traceroute:       true,
		DNSMode:          "skip",
		VerbosityMode:    VerbosityModeDebug,
		Reason:           true,
		OpenOnly:         true,
		MinRate:          500,
		MaxRetries:       "2",
		HostTimeout:      "30m",
		MaxRTTTimeout:    "2s",
		StatsEvery:       "10s",
		PacketTrace:      true,
	})
	if err != nil {
		t.Fatalf("BuildOptionArgs returned error: %v", err)
	}

	want := []string{"-sU", "-Pn", "-iL", "/Users/krisarmstrong/targets.txt", "--exclude", "192.168.1.10,scanme.nmap.org", "--excludefile", "/Users/krisarmstrong/exclude-targets.txt", "-T4", "-p", "22,80,443", "-sV", "--version-all", "-6", "-O", "--traceroute", "-n", "-vv", "--reason", "--open", "--min-rate", "500", "--max-retries", "2", "--host-timeout", "30m", "--max-rtt-timeout", "2s", "--stats-every", "10s", "--packet-trace"}
	if !sameStrings(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func TestBuildOptionArgsSupportsAllPortsAndTopPorts(t *testing.T) {
	args, err := BuildOptionArgs(ScanOptions{AllPorts: true})
	if err != nil {
		t.Fatalf("BuildOptionArgs returned error: %v", err)
	}
	if !sameStrings(args, []string{"-p-"}) {
		t.Fatalf("args = %#v", args)
	}

	args, err = BuildOptionArgs(ScanOptions{TopPorts: 250})
	if err != nil {
		t.Fatalf("BuildOptionArgs returned error: %v", err)
	}
	if !sameStrings(args, []string{"--top-ports", "250"}) {
		t.Fatalf("args = %#v", args)
	}
}

func TestBuildOptionArgsRejectsInvalidOptions(t *testing.T) {
	tests := []ScanOptions{
		{TimingTemplate: "fast"},
		{Ports: "22;rm"},
		{Ports: "22 80"},
		{TopPorts: -1},
		{TopPorts: 1001},
		{Ports: "22", AllPorts: true},
		{Ports: "22", TopPorts: 10},
		{AllPorts: true, TopPorts: 10},
		{DNSMode: "recursive"},
		{VersionMode: "deep"},
		{ScanTechnique: "ack"},
		{DiscoveryMode: "arp"},
		{VerbosityMode: "trace"},
		{MinRate: -1},
		{MaxRetries: "-1"},
		{MaxRetries: "abc"},
		{MaxRetries: "11"},
		{HostTimeout: "30 minutes"},
		{HostTimeout: "30m\n--script"},
		{MaxRTTTimeout: "2 seconds"},
		{MaxRTTTimeout: "2s\n--script"},
		{StatsEvery: "every 10s"},
		{StatsEvery: "10s\n--packet-trace"},
		{TargetInputFile: "relative-targets.txt"},
		{TargetInputFile: "/Users/krisarmstrong/targets\n--script.txt"},
		{ExcludeFile: "relative-excludes.txt"},
		{ExcludeFile: "/Users/krisarmstrong/excludes\x00.txt"},
		{ExcludeTargets: "192.168.1.1;rm"},
		{ExcludeTargets: "-Pn"},
	}

	for _, test := range tests {
		if _, err := BuildOptionArgs(test); err == nil {
			t.Fatalf("expected error for %#v", test)
		}
	}
}

func TestProfileArgsForOptionsRemovesOverriddenProfileDefaults(t *testing.T) {
	profile := Profile{Args: []string{"-sT", "-Pn", "-sV", "--version-light", "-T3", "--top-ports", "100", "-v", "--reason", "--open"}}

	args := ProfileArgsForOptions(profile, ScanOptions{
		ScanTechnique:    ScanTechniqueSYN,
		DiscoveryMode:    DiscoveryModePing,
		TimingTemplate:   "T4",
		Ports:            "22,80",
		ServiceDetection: true,
		VersionMode:      VersionModeAll,
		VerbosityMode:    VerbosityModeDebug,
		Reason:           true,
		OpenOnly:         true,
	})

	want := []string{}
	if !sameStrings(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func sameStrings(got []string, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	for index := range got {
		if got[index] != want[index] {
			return false
		}
	}
	return true
}
