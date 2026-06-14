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
		VersionIntensity: "7",
		IPv6:             true,
		OSDetection:      true,
		Traceroute:       true,
		DNSServers:       "1.1.1.1,2606:4700:4700::1111",
		VerbosityMode:    VerbosityModeDebug,
		Reason:           true,
		OpenOnly:         true,
		MinRate:          500,
		MaxRate:          2000,
		MaxRetries:       "2",
		HostTimeout:      "30m",
		MaxRTTTimeout:    "2s",
		StatsEvery:       "10s",
		ScanDelay:        "50ms",
		MaxScanDelay:     "1s",
		MinHostGroup:     8,
		MaxHostGroup:     256,
		MinParallelism:   4,
		MaxParallelism:   64,
		FragmentPackets:  true,
		DataLength:       24,
		SourcePort:       "53",
		Decoys:           "ME,198.51.100.10,RND:2",
		SourceAddress:    "192.0.2.20",
		NetworkInterface: "en0",
		SpoofMAC:         "02:11:22:33:44:55",
		PacketTrace:      true,
	})
	if err != nil {
		t.Fatalf("BuildOptionArgs returned error: %v", err)
	}

	want := []string{"-sU", "-PS22,80,443", "-PA80,443", "-PU53,161", "-PY80", "-PE", "-PP", "-PM", "-iL", "/Users/krisarmstrong/targets.txt", "--exclude", "192.168.1.10,scanme.nmap.org", "--excludefile", "/Users/krisarmstrong/exclude-targets.txt", "-T4", "-p", "22,80,443", "-sV", "--version-intensity", "7", "-6", "-O", "--traceroute", "--dns-servers", "1.1.1.1,2606:4700:4700::1111", "-vv", "--reason", "--open", "--min-rate", "500", "--max-rate", "2000", "--max-retries", "2", "--host-timeout", "30m", "--max-rtt-timeout", "2s", "--stats-every", "10s", "--scan-delay", "50ms", "--max-scan-delay", "1s", "--min-hostgroup", "8", "--max-hostgroup", "256", "--min-parallelism", "4", "--max-parallelism", "64", "-f", "--data-length", "24", "--source-port", "53", "-D", "ME,198.51.100.10,RND:2", "-S", "192.0.2.20", "-e", "en0", "--spoof-mac", "02:11:22:33:44:55", "--packet-trace"}
	if !sameStrings(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func TestBuildOptionArgsAddsCustomMTU(t *testing.T) {
	args, err := BuildOptionArgs(ScanOptions{MTU: 24})
	if err != nil {
		t.Fatalf("BuildOptionArgs returned error: %v", err)
	}

	want := []string{"--mtu", "24"}
	if !sameStrings(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func TestBuildOptionArgsAcceptsIdentityValues(t *testing.T) {
	args, err := BuildOptionArgs(ScanOptions{
		Decoys:        "ME,2001:db8::10,RND:17",
		SourceAddress: "2001:db8::20",
		SpoofMAC:      "0",
	})
	if err != nil {
		t.Fatalf("BuildOptionArgs returned error: %v", err)
	}

	want := []string{"-D", "ME,2001:db8::10,RND:17", "-S", "2001:db8::20", "--spoof-mac", "0"}
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
		{DNSMode: DNSModeSkip, DNSServers: "1.1.1.1"},
		{DNSServers: "resolver.example.com"},
		{DNSServers: "1.1.1.1 --script"},
		{DNSServers: "1.1.1.1,,8.8.8.8"},
		{VersionMode: "deep"},
		{VersionMode: VersionModeAll, VersionIntensity: "7"},
		{VersionIntensity: "-1"},
		{VersionIntensity: "10"},
		{VersionIntensity: "fast"},
		{VersionIntensity: "7\n--script"},
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
		{MaxRate: -1},
		{MinRate: 2000, MaxRate: 1000},
		{MaxRetries: "-1"},
		{MaxRetries: "abc"},
		{MaxRetries: "11"},
		{HostTimeout: "30 minutes"},
		{HostTimeout: "30m\n--script"},
		{MaxRTTTimeout: "2 seconds"},
		{MaxRTTTimeout: "2s\n--script"},
		{StatsEvery: "every 10s"},
		{StatsEvery: "10s\n--packet-trace"},
		{ScanDelay: "50 milliseconds"},
		{ScanDelay: "50ms\n--script"},
		{MaxScanDelay: "one-second"},
		{ScanDelay: "2s", MaxScanDelay: "1s"},
		{MinHostGroup: -1},
		{MaxHostGroup: -1},
		{MinHostGroup: 100001},
		{MaxHostGroup: 100001},
		{MinHostGroup: 50, MaxHostGroup: 10},
		{MinParallelism: -1},
		{MaxParallelism: -1},
		{MinParallelism: 1001},
		{MaxParallelism: 1001},
		{MinParallelism: 50, MaxParallelism: 10},
		{FragmentPackets: true, MTU: 24},
		{MTU: -1},
		{MTU: 7},
		{MTU: 1504},
		{DataLength: -1},
		{DataLength: 4097},
		{SourcePort: "0"},
		{SourcePort: "65536"},
		{SourcePort: "domain"},
		{SourcePort: "53\n--script"},
		{Decoys: "ME,not-an-ip"},
		{Decoys: "-D"},
		{Decoys: "RND:0"},
		{Decoys: "RND:127"},
		{Decoys: "RND:126,ME"},
		{Decoys: "ME RND"},
		{Decoys: "ME\n--script"},
		{SourceAddress: "scanme.nmap.org"},
		{SourceAddress: "192.0.2.1\n--script"},
		{NetworkInterface: "-en0"},
		{NetworkInterface: "en 0"},
		{NetworkInterface: "en0;rm"},
		{SpoofMAC: "Apple"},
		{SpoofMAC: "random"},
		{SpoofMAC: "02:11:22:33:44"},
		{SpoofMAC: "02:11:22:33:44:gg"},
		{SpoofMAC: "02:11:22:33:44:55\n--script"},
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
	profile := Profile{Args: []string{"-sT", "-Pn", "-sV", "--version-light", "-T3", "--top-ports", "100", "-v", "--reason", "--open", "--min-rate", "100", "--max-rate", "1000", "--min-hostgroup", "8", "--max-hostgroup", "128"}}

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
		MinRate:          500,
		MaxRate:          2000,
		MinHostGroup:     16,
		MaxHostGroup:     256,
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

func TestProfileArgsForOptionsRemovesDetailedTimingDefaults(t *testing.T) {
	profile := Profile{Args: []string{
		"--scan-delay", "100ms",
		"--max-scan-delay", "1s",
		"--min-parallelism", "2",
		"--max-parallelism", "32",
		"-T3",
	}}

	args := ProfileArgsForOptions(profile, ScanOptions{
		ScanDelay:      "50ms",
		MaxScanDelay:   "500ms",
		MinParallelism: 4,
		MaxParallelism: 16,
	})

	want := []string{"-T3"}
	if !sameStrings(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func TestProfileArgsForOptionsRemovesPacketShapingDefaults(t *testing.T) {
	profile := Profile{Args: []string{
		"-f",
		"--mtu", "24",
		"--data-length", "16",
		"--source-port", "53",
		"-T3",
	}}

	args := ProfileArgsForOptions(profile, ScanOptions{
		FragmentPackets: true,
		MTU:             32,
		DataLength:      24,
		SourcePort:      "80",
	})

	want := []string{"-T3"}
	if !sameStrings(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func TestProfileArgsForOptionsRemovesIdentityDefaults(t *testing.T) {
	profile := Profile{Args: []string{
		"-D", "ME,198.51.100.10",
		"-S", "192.0.2.20",
		"-e", "en0",
		"--spoof-mac", "02:11:22:33:44:55",
		"-T3",
	}}

	args := ProfileArgsForOptions(profile, ScanOptions{
		Decoys:           "ME,RND:2",
		SourceAddress:    "192.0.2.30",
		NetworkInterface: "eth0",
		SpoofMAC:         "0",
	})

	want := []string{"-T3"}
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
