package scanner

import "testing"

func TestBuildOptionArgsAddsStructuredNmapOptions(t *testing.T) {
	args, err := BuildOptionArgs(ScanOptions{
		ScanTechnique:    ScanTechniqueUDP,
		TCPSYNProbes:     "22,80,443",
		TCPACKProbes:     "80,443",
		UDPProbes:        "53,161",
		SCTPInitProbes:   "80",
		ICMPEchoProbe:    true,
		ICMPTimestamp:    true,
		ICMPNetmask:      true,
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

	want := []string{"-sU", "-PS22,80,443", "-PA80,443", "-PU53,161", "-PY80", "-PE", "-PP", "-PM", "-iL", "/Users/krisarmstrong/targets.txt", "--exclude", "192.168.1.10,scanme.nmap.org", "--excludefile", "/Users/krisarmstrong/exclude-targets.txt", "-T4", "-p", "22,80,443", "-sV", "--version-all", "-6", "-O", "--traceroute", "-n", "-vv", "--reason", "--open", "--min-rate", "500", "--max-retries", "2", "--host-timeout", "30m", "--max-rtt-timeout", "2s", "--stats-every", "10s", "--packet-trace"}
	if !sameStrings(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func TestBuildOptionArgsAddsDiscoveryProbeRanges(t *testing.T) {
	args, err := BuildOptionArgs(ScanOptions{
		TCPSYNProbes:   "1-1024",
		TCPACKProbes:   "80,443",
		UDPProbes:      "53",
		SCTPInitProbes: "3868",
	})
	if err != nil {
		t.Fatalf("BuildOptionArgs returned error: %v", err)
	}

	want := []string{"-PS1-1024", "-PA80,443", "-PU53", "-PY3868"}
	if !sameStrings(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func TestBuildOptionArgsAddsSpecializedScanTechniques(t *testing.T) {
	tests := []struct {
		name      string
		technique ScanTechnique
		want      []string
	}{
		{name: "ack", technique: ScanTechniqueACK, want: []string{"-sA"}},
		{name: "window", technique: ScanTechniqueWindow, want: []string{"-sW"}},
		{name: "maimon", technique: ScanTechniqueMaimon, want: []string{"-sM"}},
		{name: "null", technique: ScanTechniqueNull, want: []string{"-sN"}},
		{name: "fin", technique: ScanTechniqueFIN, want: []string{"-sF"}},
		{name: "xmas", technique: ScanTechniqueXmas, want: []string{"-sX"}},
		{name: "sctp init", technique: ScanTechniqueSCTPInit, want: []string{"-sY"}},
		{name: "sctp cookie", technique: ScanTechniqueSCTPCookie, want: []string{"-sZ"}},
		{name: "protocol", technique: ScanTechniqueProtocol, want: []string{"-sO"}},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			args, err := BuildOptionArgs(ScanOptions{ScanTechnique: test.technique})
			if err != nil {
				t.Fatalf("BuildOptionArgs returned error: %v", err)
			}
			if !sameStrings(args, test.want) {
				t.Fatalf("args = %#v, want %#v", args, test.want)
			}
		})
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
		{ScanTechnique: "idle"},
		{DiscoveryMode: "arp"},
		{DiscoveryMode: DiscoveryModeSkip, TCPSYNProbes: "22"},
		{TCPSYNProbes: "22 80"},
		{TCPSYNProbes: "22;80"},
		{TCPSYNProbes: "-22"},
		{TCPSYNProbes: "+22"},
		{TCPSYNProbes: "0"},
		{TCPSYNProbes: "65536"},
		{TCPSYNProbes: "1024-22"},
		{TCPSYNProbes: "1-+1024"},
		{TCPACKProbes: "http"},
		{UDPProbes: "53\n--script"},
		{SCTPInitProbes: "80,,443"},
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

func TestProfileArgsForOptionsRemovesDiscoveryDefaultsWhenProbesAreSelected(t *testing.T) {
	profile := Profile{Args: []string{"-sT", "-Pn", "-T3", "--top-ports", "100"}}

	args := ProfileArgsForOptions(profile, ScanOptions{TCPSYNProbes: "22,80"})

	want := []string{"-sT", "-T3", "--top-ports", "100"}
	if !sameStrings(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func TestProfileArgsForOptionsPreservesPingSweepWhenProbesAreSelected(t *testing.T) {
	profile := Profile{Args: []string{"-sn"}}

	args := ProfileArgsForOptions(profile, ScanOptions{TCPSYNProbes: "22,80"})

	want := []string{"-sn"}
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
