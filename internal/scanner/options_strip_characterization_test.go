package scanner

import (
	"strings"
	"testing"
)

// legacyProfileArgsForOptions is a frozen copy of the original hand-written
// if-chain that ProfileArgsForOptions replaced. It is the oracle for the
// characterization test below: the declarative rule table must produce byte
// identical output to this for every (profile, options) combination.
func legacyProfileArgsForOptions(profile Profile, options ScanOptions) []string {
	args := make([]string, 0, len(profile.Args))
	for index := 0; index < len(profile.Args); index++ {
		arg := profile.Args[index]
		if options.TimingTemplate != "" && isTimingArg(arg) {
			continue
		}
		if hasPortSelection(options) {
			if arg == "-p" || arg == "--top-ports" {
				index++
				continue
			}
			if arg == "-p-" {
				continue
			}
		}
		if strings.TrimSpace(options.ExcludePorts) != "" && arg == "--exclude-ports" {
			index++
			continue
		}
		if hasVersionSelection(options) && isVersionArg(arg) {
			if arg == "--version-intensity" {
				index++
			}
			continue
		}
		if options.ScanTechnique != ScanTechniqueDefault && isTechniqueArg(arg) {
			continue
		}
		if shouldStripDiscoveryArg(arg, options) {
			continue
		}
		if options.VerbosityMode != VerbosityModeDefault && isVerbosityArg(arg) {
			continue
		}
		if options.Reason && arg == "--reason" {
			continue
		}
		if options.OpenOnly && arg == "--open" {
			continue
		}
		if options.MinRate != 0 && arg == "--min-rate" {
			index++
			continue
		}
		if options.MaxRate != 0 && arg == "--max-rate" {
			index++
			continue
		}
		if strings.TrimSpace(options.MaxRetries) != "" && arg == "--max-retries" {
			index++
			continue
		}
		if strings.TrimSpace(options.HostTimeout) != "" && arg == "--host-timeout" {
			index++
			continue
		}
		if strings.TrimSpace(options.MaxRTTTimeout) != "" && arg == "--max-rtt-timeout" {
			index++
			continue
		}
		if strings.TrimSpace(options.MinRTTTimeout) != "" && arg == "--min-rtt-timeout" {
			index++
			continue
		}
		if strings.TrimSpace(options.InitialRTTTimeout) != "" && arg == "--initial-rtt-timeout" {
			index++
			continue
		}
		if strings.TrimSpace(options.StatsEvery) != "" && arg == "--stats-every" {
			index++
			continue
		}
		if strings.TrimSpace(options.ScanDelay) != "" && arg == "--scan-delay" {
			index++
			continue
		}
		if strings.TrimSpace(options.MaxScanDelay) != "" && arg == "--max-scan-delay" {
			index++
			continue
		}
		if options.MinHostGroup != 0 && arg == "--min-hostgroup" {
			index++
			continue
		}
		if options.MaxHostGroup != 0 && arg == "--max-hostgroup" {
			index++
			continue
		}
		if options.MinParallelism != 0 && arg == "--min-parallelism" {
			index++
			continue
		}
		if options.MaxParallelism != 0 && arg == "--max-parallelism" {
			index++
			continue
		}
		if options.FragmentPackets && arg == "-f" {
			continue
		}
		if options.MTU != 0 && arg == "--mtu" {
			index++
			continue
		}
		if options.DataLength != 0 && arg == "--data-length" {
			index++
			continue
		}
		if strings.TrimSpace(options.SourcePort) != "" && arg == "--source-port" {
			index++
			continue
		}
		if strings.TrimSpace(options.Decoys) != "" && arg == "-D" {
			index++
			continue
		}
		if strings.TrimSpace(options.SourceAddress) != "" && arg == "-S" {
			index++
			continue
		}
		if strings.TrimSpace(options.NetworkInterface) != "" && arg == "-e" {
			index++
			continue
		}
		if strings.TrimSpace(options.SpoofMAC) != "" && arg == "--spoof-mac" {
			index++
			continue
		}
		if options.PacketTrace && arg == "--packet-trace" {
			continue
		}
		args = append(args, arg)
	}
	return args
}

// kitchenSinkProfile contains every strippable flag (value-carrying flags with
// a following value), plus some flags that must always pass through, so the
// strip logic is exercised end to end.
func kitchenSinkProfile() Profile {
	return Profile{Args: []string{
		"-sT", "-Pn", "-PE", "-PS22", "-T3",
		"-p", "80", "--top-ports", "100", "-p-", "--exclude-ports", "9100",
		"-sV", "--version-intensity", "7", "--version-light",
		"-v", "--reason", "--open",
		"--min-rate", "100", "--max-rate", "200", "--max-retries", "2",
		"--host-timeout", "30s", "--max-rtt-timeout", "1s", "--min-rtt-timeout", "100ms",
		"--initial-rtt-timeout", "200ms", "--stats-every", "5s",
		"--scan-delay", "1s", "--max-scan-delay", "5s",
		"--min-hostgroup", "10", "--max-hostgroup", "100",
		"--min-parallelism", "5", "--max-parallelism", "50",
		"-f", "--mtu", "16", "--data-length", "8", "--source-port", "53",
		"-D", "RND:5", "-S", "10.0.0.9", "-e", "en0", "--spoof-mac", "0", "--packet-trace",
		// always-passthrough extras:
		"-A", "--randomize-hosts",
	}}
}

// optionsMatrix returns a broad set of option combinations: empty, all-set, and
// one per individual option engaged.
func optionsMatrix() []ScanOptions {
	all := ScanOptions{
		ScanTechnique: ScanTechniqueSYN, DiscoveryMode: DiscoveryModeSkip,
		TimingTemplate: "T4", Ports: "443", ExcludePorts: "9100",
		ServiceDetection: true, VersionMode: VersionModeLight, VersionIntensity: "",
		VerbosityMode: VerbosityModeVerbose, Reason: true, OpenOnly: true,
		MinRate: 100, MaxRate: 200, MaxRetries: "2",
		HostTimeout: "30s", MaxRTTTimeout: "1s", MinRTTTimeout: "100ms", InitialRTTTimeout: "200ms",
		StatsEvery: "5s", ScanDelay: "1s", MaxScanDelay: "5s",
		MinHostGroup: 10, MaxHostGroup: 100, MinParallelism: 5, MaxParallelism: 50,
		FragmentPackets: true, DataLength: 8, SourcePort: "53",
		Decoys: "RND:5", SourceAddress: "10.0.0.9", NetworkInterface: "en0", SpoofMAC: "0", PacketTrace: true,
	}
	cases := []ScanOptions{
		{}, // empty: nothing stripped
		all,
		{ScanTechnique: ScanTechniqueConnect},
		{DiscoveryMode: DiscoveryModePing},
		{TopPorts: 50},
		{AllPorts: true},
		{FastScan: true},
		{TCPSYNProbes: "22"}, // discovery probe selection
		{ICMPEchoProbe: true},
		{VersionMode: VersionModeAll},
		{VerbosityMode: VerbosityModeDebug},
		{MTU: 24}, // mutually exclusive with fragment; exercises --mtu strip
	}
	return cases
}

func TestProfileArgsForOptionsMatchesLegacyAcrossMatrix(t *testing.T) {
	profiles := append([]Profile{kitchenSinkProfile()}, BuiltInProfiles()...)
	for _, profile := range profiles {
		for _, options := range optionsMatrix() {
			got := ProfileArgsForOptions(profile, options)
			want := legacyProfileArgsForOptions(profile, options)
			if !sameStrings(got, want) {
				t.Fatalf("profile %q options %+v:\n got  %#v\n want %#v", profile.ID, options, got, want)
			}
		}
	}
}
