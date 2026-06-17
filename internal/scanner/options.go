package scanner

import (
	"errors"
	"math"
	"net/netip"
	"strconv"
	"strings"
)

type DNSMode string
type DiscoveryMode string
type ScanTechnique string
type VerbosityMode string
type VersionMode string

const (
	DNSModeDefault DNSMode = ""
	DNSModeSkip    DNSMode = "skip"
	DNSModeSystem  DNSMode = "system"

	DiscoveryModeDefault DiscoveryMode = ""
	DiscoveryModeSkip    DiscoveryMode = "skip"
	DiscoveryModePing    DiscoveryMode = "ping"

	ScanTechniqueDefault    ScanTechnique = ""
	ScanTechniqueConnect    ScanTechnique = "connect"
	ScanTechniqueSYN        ScanTechnique = "syn"
	ScanTechniqueUDP        ScanTechnique = "udp"
	ScanTechniqueACK        ScanTechnique = "ack"
	ScanTechniqueWindow     ScanTechnique = "window"
	ScanTechniqueMaimon     ScanTechnique = "maimon"
	ScanTechniqueNull       ScanTechnique = "null"
	ScanTechniqueFIN        ScanTechnique = "fin"
	ScanTechniqueXmas       ScanTechnique = "xmas"
	ScanTechniqueSCTPInit   ScanTechnique = "sctp-init"
	ScanTechniqueSCTPCookie ScanTechnique = "sctp-cookie"
	ScanTechniqueProtocol   ScanTechnique = "protocol"

	VerbosityModeDefault VerbosityMode = ""
	VerbosityModeVerbose VerbosityMode = "verbose"
	VerbosityModeDebug   VerbosityMode = "debug"

	VersionModeDefault VersionMode = ""
	VersionModeLight   VersionMode = "light"
	VersionModeAll     VersionMode = "all"
)

var ErrInvalidScanOption = errors.New("enter valid structured Nmap options")

type ScanOptions struct {
	ScanTechnique     ScanTechnique `json:"scanTechnique,omitempty"`
	DiscoveryMode     DiscoveryMode `json:"discoveryMode,omitempty"`
	TCPSYNProbes      string        `json:"tcpSynProbes,omitempty"`
	TCPACKProbes      string        `json:"tcpAckProbes,omitempty"`
	UDPProbes         string        `json:"udpProbes,omitempty"`
	SCTPInitProbes    string        `json:"sctpInitProbes,omitempty"`
	ICMPEchoProbe     bool          `json:"icmpEchoProbe,omitempty"`
	ICMPTimestamp     bool          `json:"icmpTimestamp,omitempty"`
	ICMPNetmask       bool          `json:"icmpNetmask,omitempty"`
	TargetInputFile   string        `json:"targetInputFile,omitempty"`
	ExcludeTargets    string        `json:"excludeTargets,omitempty"`
	ExcludeFile       string        `json:"excludeFile,omitempty"`
	TimingTemplate    string        `json:"timingTemplate,omitempty"`
	Ports             string        `json:"ports,omitempty"`
	TopPorts          int           `json:"topPorts,omitempty"`
	AllPorts          bool          `json:"allPorts,omitempty"`
	FastScan          bool          `json:"fastScan,omitempty"`
	ServiceDetection  bool          `json:"serviceDetection,omitempty"`
	VersionMode       VersionMode   `json:"versionMode,omitempty"`
	VersionIntensity  string        `json:"versionIntensity,omitempty"`
	IPv6              bool          `json:"ipv6,omitempty"`
	OSDetection       bool          `json:"osDetection,omitempty"`
	Traceroute        bool          `json:"traceroute,omitempty"`
	DNSMode           DNSMode       `json:"dnsMode,omitempty"`
	DNSServers        string        `json:"dnsServers,omitempty"`
	VerbosityMode     VerbosityMode `json:"verbosityMode,omitempty"`
	Reason            bool          `json:"reason,omitempty"`
	OpenOnly          bool          `json:"openOnly,omitempty"`
	MinRate           int           `json:"minRate,omitempty"`
	MaxRate           int           `json:"maxRate,omitempty"`
	MaxRetries        string        `json:"maxRetries,omitempty"`
	HostTimeout       string        `json:"hostTimeout,omitempty"`
	MaxRTTTimeout     string        `json:"maxRttTimeout,omitempty"`
	MinRTTTimeout     string        `json:"minRttTimeout,omitempty"`
	InitialRTTTimeout string        `json:"initialRttTimeout,omitempty"`
	ExcludePorts      string        `json:"excludePorts,omitempty"`
	StatsEvery        string        `json:"statsEvery,omitempty"`
	ScanDelay         string        `json:"scanDelay,omitempty"`
	MaxScanDelay      string        `json:"maxScanDelay,omitempty"`
	MinHostGroup      int           `json:"minHostGroup,omitempty"`
	MaxHostGroup      int           `json:"maxHostGroup,omitempty"`
	MinParallelism    int           `json:"minParallelism,omitempty"`
	MaxParallelism    int           `json:"maxParallelism,omitempty"`
	FragmentPackets   bool          `json:"fragmentPackets,omitempty"`
	MTU               int           `json:"mtu,omitempty"`
	DataLength        int           `json:"dataLength,omitempty"`
	SourcePort        string        `json:"sourcePort,omitempty"`
	Decoys            string        `json:"decoys,omitempty"`
	SourceAddress     string        `json:"sourceAddress,omitempty"`
	NetworkInterface  string        `json:"networkInterface,omitempty"`
	SpoofMAC          string        `json:"spoofMac,omitempty"`
	PacketTrace       bool          `json:"packetTrace,omitempty"`
}

func BuildOptionArgs(options ScanOptions) ([]string, error) {
	if err := validatePortSelection(options); err != nil {
		return nil, err
	}
	if err := validateDiscoveryOptions(options); err != nil {
		return nil, err
	}
	if err := validatePerformanceOptions(options); err != nil {
		return nil, err
	}
	targetScopeArgs, err := buildTargetScopeArgs(options)
	if err != nil {
		return nil, err
	}

	args := make([]string, 0, 12)
	techniqueArgs, err := buildTechniqueArgs(options.ScanTechnique)
	if err != nil {
		return nil, err
	}
	args = append(args, techniqueArgs...)
	discoveryArgs, err := buildDiscoveryArgs(options.DiscoveryMode)
	if err != nil {
		return nil, err
	}
	args = append(args, discoveryArgs...)
	probeArgs, err := buildDiscoveryProbeArgs(options)
	if err != nil {
		return nil, err
	}
	args = append(args, probeArgs...)
	args = append(args, targetScopeArgs...)
	if options.TimingTemplate != "" {
		timing, err := validateTimingTemplate(options.TimingTemplate)
		if err != nil {
			return nil, err
		}
		args = append(args, "-"+timing)
	}
	if options.Ports != "" {
		ports, err := validatePorts(options.Ports)
		if err != nil {
			return nil, err
		}
		args = append(args, "-p", ports)
	}
	if options.AllPorts {
		args = append(args, "-p-")
	}
	if options.TopPorts != 0 {
		args = append(args, "--top-ports", strconv.Itoa(options.TopPorts))
	}
	if options.FastScan {
		args = append(args, "-F")
	}
	if strings.TrimSpace(options.ExcludePorts) != "" {
		excludePorts, err := validatePorts(options.ExcludePorts)
		if err != nil {
			return nil, err
		}
		args = append(args, "--exclude-ports", excludePorts)
	}
	versionArgs, err := buildVersionArgs(options)
	if err != nil {
		return nil, err
	}
	args = append(args, versionArgs...)
	if options.IPv6 {
		args = append(args, "-6")
	}
	if options.OSDetection {
		args = append(args, "-O")
	}
	if options.Traceroute {
		args = append(args, "--traceroute")
	}
	dnsArgs, err := buildDNSArgs(options.DNSMode)
	if err != nil {
		return nil, err
	}
	args = append(args, dnsArgs...)
	dnsServerArgs, err := buildDNSServerArgs(options)
	if err != nil {
		return nil, err
	}
	args = append(args, dnsServerArgs...)
	verbosityArgs, err := buildVerbosityArgs(options.VerbosityMode)
	if err != nil {
		return nil, err
	}
	args = append(args, verbosityArgs...)
	if options.Reason {
		args = append(args, "--reason")
	}
	if options.OpenOnly {
		args = append(args, "--open")
	}
	if options.MinRate != 0 {
		args = append(args, "--min-rate", strconv.Itoa(options.MinRate))
	}
	if options.MaxRate != 0 {
		args = append(args, "--max-rate", strconv.Itoa(options.MaxRate))
	}
	if strings.TrimSpace(options.MaxRetries) != "" {
		args = append(args, "--max-retries", strings.TrimSpace(options.MaxRetries))
	}
	if strings.TrimSpace(options.HostTimeout) != "" {
		args = append(args, "--host-timeout", strings.TrimSpace(options.HostTimeout))
	}
	if strings.TrimSpace(options.MaxRTTTimeout) != "" {
		args = append(args, "--max-rtt-timeout", strings.TrimSpace(options.MaxRTTTimeout))
	}
	if strings.TrimSpace(options.MinRTTTimeout) != "" {
		args = append(args, "--min-rtt-timeout", strings.TrimSpace(options.MinRTTTimeout))
	}
	if strings.TrimSpace(options.InitialRTTTimeout) != "" {
		args = append(args, "--initial-rtt-timeout", strings.TrimSpace(options.InitialRTTTimeout))
	}
	if strings.TrimSpace(options.StatsEvery) != "" {
		args = append(args, "--stats-every", strings.TrimSpace(options.StatsEvery))
	}
	if strings.TrimSpace(options.ScanDelay) != "" {
		args = append(args, "--scan-delay", strings.TrimSpace(options.ScanDelay))
	}
	if strings.TrimSpace(options.MaxScanDelay) != "" {
		args = append(args, "--max-scan-delay", strings.TrimSpace(options.MaxScanDelay))
	}
	if options.MinHostGroup != 0 {
		args = append(args, "--min-hostgroup", strconv.Itoa(options.MinHostGroup))
	}
	if options.MaxHostGroup != 0 {
		args = append(args, "--max-hostgroup", strconv.Itoa(options.MaxHostGroup))
	}
	if options.MinParallelism != 0 {
		args = append(args, "--min-parallelism", strconv.Itoa(options.MinParallelism))
	}
	if options.MaxParallelism != 0 {
		args = append(args, "--max-parallelism", strconv.Itoa(options.MaxParallelism))
	}
	if options.FragmentPackets {
		args = append(args, "-f")
	}
	if options.MTU != 0 {
		args = append(args, "--mtu", strconv.Itoa(options.MTU))
	}
	if options.DataLength != 0 {
		args = append(args, "--data-length", strconv.Itoa(options.DataLength))
	}
	if strings.TrimSpace(options.SourcePort) != "" {
		args = append(args, "--source-port", strings.TrimSpace(options.SourcePort))
	}
	if strings.TrimSpace(options.Decoys) != "" {
		args = append(args, "-D", strings.TrimSpace(options.Decoys))
	}
	if strings.TrimSpace(options.SourceAddress) != "" {
		args = append(args, "-S", strings.TrimSpace(options.SourceAddress))
	}
	if strings.TrimSpace(options.NetworkInterface) != "" {
		args = append(args, "-e", strings.TrimSpace(options.NetworkInterface))
	}
	if strings.TrimSpace(options.SpoofMAC) != "" {
		args = append(args, "--spoof-mac", strings.TrimSpace(options.SpoofMAC))
	}
	if options.PacketTrace {
		args = append(args, "--packet-trace")
	}
	return args, nil
}

// profileFlagRule declares how an explicitly-set scan option supersedes a
// profile's default flag, so the profile arg (and its value, if any) is dropped
// before the explicit option is appended. This declarative table is the single
// source of truth for the strip logic; it replaced a hand-mirrored if-chain
// that paralleled BuildOptionArgs and had to be kept in sync by hand.
type profileFlagRule struct {
	// active is true when the user explicitly set the corresponding option.
	active bool
	// matches reports whether a profile arg belongs to this option.
	matches func(string) bool
	// takesValue reports whether a matched arg also consumes the following token
	// (a value-carrying flag such as "--top-ports 100").
	takesValue func(string) bool
}

func ProfileArgsForOptions(profile Profile, options ScanOptions) []string {
	rules := profileFlagRules(options)
	args := make([]string, 0, len(profile.Args))
	for index := 0; index < len(profile.Args); index++ {
		arg := profile.Args[index]
		rule, matched := matchingProfileFlagRule(rules, arg)
		if !matched {
			args = append(args, arg)
			continue
		}
		if rule.takesValue(arg) {
			index++
		}
	}
	return args
}

func matchingProfileFlagRule(rules []profileFlagRule, arg string) (profileFlagRule, bool) {
	for _, rule := range rules {
		if rule.active && rule.matches(arg) {
			return rule, true
		}
	}
	return profileFlagRule{}, false
}

// profileFlagRules builds the strip rules for the given options. Each entry
// mirrors a BuildOptionArgs emission: when the option is active, the profile's
// equivalent default flag is stripped so the explicit value wins.
func profileFlagRules(options ScanOptions) []profileFlagRule {
	is := func(flag string) func(string) bool {
		return func(arg string) bool { return arg == flag }
	}
	never := func(string) bool { return false }
	always := func(string) bool { return true }
	set := func(value string) bool { return strings.TrimSpace(value) != "" }

	valueFlag := func(active bool, flag string) profileFlagRule {
		return profileFlagRule{active: active, matches: is(flag), takesValue: always}
	}
	boolFlag := func(active bool, flag string) profileFlagRule {
		return profileFlagRule{active: active, matches: is(flag), takesValue: never}
	}

	return []profileFlagRule{
		{active: options.TimingTemplate != "", matches: isTimingArg, takesValue: never},
		{
			active:  hasPortSelection(options),
			matches: func(arg string) bool { return arg == "-p" || arg == "--top-ports" || arg == "-p-" },
			takesValue: func(arg string) bool {
				return arg == "-p" || arg == "--top-ports"
			},
		},
		valueFlag(set(options.ExcludePorts), "--exclude-ports"),
		{
			active:     hasVersionSelection(options),
			matches:    isVersionArg,
			takesValue: is("--version-intensity"),
		},
		{active: options.ScanTechnique != ScanTechniqueDefault, matches: isTechniqueArg, takesValue: never},
		{active: true, matches: func(arg string) bool { return shouldStripDiscoveryArg(arg, options) }, takesValue: never},
		{active: options.VerbosityMode != VerbosityModeDefault, matches: isVerbosityArg, takesValue: never},
		boolFlag(options.Reason, "--reason"),
		boolFlag(options.OpenOnly, "--open"),
		valueFlag(options.MinRate != 0, "--min-rate"),
		valueFlag(options.MaxRate != 0, "--max-rate"),
		valueFlag(set(options.MaxRetries), "--max-retries"),
		valueFlag(set(options.HostTimeout), "--host-timeout"),
		valueFlag(set(options.MaxRTTTimeout), "--max-rtt-timeout"),
		valueFlag(set(options.MinRTTTimeout), "--min-rtt-timeout"),
		valueFlag(set(options.InitialRTTTimeout), "--initial-rtt-timeout"),
		valueFlag(set(options.StatsEvery), "--stats-every"),
		valueFlag(set(options.ScanDelay), "--scan-delay"),
		valueFlag(set(options.MaxScanDelay), "--max-scan-delay"),
		valueFlag(options.MinHostGroup != 0, "--min-hostgroup"),
		valueFlag(options.MaxHostGroup != 0, "--max-hostgroup"),
		valueFlag(options.MinParallelism != 0, "--min-parallelism"),
		valueFlag(options.MaxParallelism != 0, "--max-parallelism"),
		boolFlag(options.FragmentPackets, "-f"),
		valueFlag(options.MTU != 0, "--mtu"),
		valueFlag(options.DataLength != 0, "--data-length"),
		valueFlag(set(options.SourcePort), "--source-port"),
		valueFlag(set(options.Decoys), "-D"),
		valueFlag(set(options.SourceAddress), "-S"),
		valueFlag(set(options.NetworkInterface), "-e"),
		valueFlag(set(options.SpoofMAC), "--spoof-mac"),
		boolFlag(options.PacketTrace, "--packet-trace"),
	}
}

func isTechniqueArg(value string) bool {
	switch value {
	case "-sS", "-sT", "-sU", "-sA", "-sW", "-sM", "-sN", "-sF", "-sX", "-sY", "-sZ", "-sO":
		return true
	default:
		return false
	}
}

func isDiscoveryArg(value string) bool {
	switch value {
	case "-Pn", "-sn", "-PE", "-PP", "-PM":
		return true
	default:
		return strings.HasPrefix(value, "-PS") ||
			strings.HasPrefix(value, "-PA") ||
			strings.HasPrefix(value, "-PU") ||
			strings.HasPrefix(value, "-PY")
	}
}

func shouldStripDiscoveryArg(arg string, options ScanOptions) bool {
	if options.DiscoveryMode != DiscoveryModeDefault {
		return isDiscoveryArg(arg)
	}
	return hasDiscoveryProbeSelection(options) && isDiscoveryProbeOrSkipArg(arg)
}

func isDiscoveryProbeOrSkipArg(value string) bool {
	switch value {
	case "-Pn", "-PE", "-PP", "-PM":
		return true
	default:
		return strings.HasPrefix(value, "-PS") ||
			strings.HasPrefix(value, "-PA") ||
			strings.HasPrefix(value, "-PU") ||
			strings.HasPrefix(value, "-PY")
	}
}

func hasDiscoveryProbeSelection(options ScanOptions) bool {
	return strings.TrimSpace(options.TCPSYNProbes) != "" ||
		strings.TrimSpace(options.TCPACKProbes) != "" ||
		strings.TrimSpace(options.UDPProbes) != "" ||
		strings.TrimSpace(options.SCTPInitProbes) != "" ||
		options.ICMPEchoProbe ||
		options.ICMPTimestamp ||
		options.ICMPNetmask
}

func isVerbosityArg(value string) bool {
	switch value {
	case "-v", "-vv":
		return true
	default:
		return false
	}
}

func hasVersionSelection(options ScanOptions) bool {
	return options.ServiceDetection ||
		options.VersionMode != VersionModeDefault ||
		strings.TrimSpace(options.VersionIntensity) != ""
}

func isVersionArg(value string) bool {
	switch value {
	case "-sV", "--version-light", "--version-all", "--version-intensity":
		return true
	default:
		return false
	}
}

func validatePortSelection(options ScanOptions) error {
	selected := 0
	if strings.TrimSpace(options.Ports) != "" {
		selected++
	}
	if options.AllPorts {
		selected++
	}
	if options.TopPorts != 0 {
		selected++
	}
	if options.FastScan {
		selected++
	}
	if selected > 1 {
		return ErrInvalidScanOption
	}
	if options.TopPorts < 0 || options.TopPorts > 1000 {
		return ErrInvalidScanOption
	}
	return nil
}

func validateDiscoveryOptions(options ScanOptions) error {
	if options.DiscoveryMode == DiscoveryModeSkip && hasDiscoveryProbeSelection(options) {
		return ErrInvalidScanOption
	}
	if options.DNSMode == DNSModeSkip && strings.TrimSpace(options.DNSServers) != "" {
		return ErrInvalidScanOption
	}
	return nil
}

func hasPortSelection(options ScanOptions) bool {
	return strings.TrimSpace(options.Ports) != "" || options.AllPorts || options.TopPorts != 0 ||
		options.FastScan
}

func validatePerformanceOptions(options ScanOptions) error {
	if options.MinRate < 0 || options.MinRate > 1_000_000 {
		return ErrInvalidScanOption
	}
	if options.MaxRate < 0 || options.MaxRate > 1_000_000 {
		return ErrInvalidScanOption
	}
	if options.MinRate != 0 && options.MaxRate != 0 && options.MinRate > options.MaxRate {
		return ErrInvalidScanOption
	}
	if strings.TrimSpace(options.MaxRetries) != "" {
		retries, err := strconv.Atoi(strings.TrimSpace(options.MaxRetries))
		if err != nil || retries < 0 || retries > 10 {
			return ErrInvalidScanOption
		}
	}
	if _, err := validateDurationExpression(options.HostTimeout); err != nil {
		return err
	}
	if _, err := validateDurationExpression(options.MaxRTTTimeout); err != nil {
		return err
	}
	if _, err := validateDurationExpression(options.MinRTTTimeout); err != nil {
		return err
	}
	if _, err := validateDurationExpression(options.InitialRTTTimeout); err != nil {
		return err
	}
	if _, err := validateDurationExpression(options.StatsEvery); err != nil {
		return err
	}
	if _, err := validateDurationExpression(options.ScanDelay); err != nil {
		return err
	}
	if _, err := validateDurationExpression(options.MaxScanDelay); err != nil {
		return err
	}
	if err := validateScanDelayOptions(options); err != nil {
		return err
	}
	if err := validateParallelismOptions(options); err != nil {
		return err
	}
	if err := validateHostGroupOptions(options); err != nil {
		return err
	}
	if err := validatePacketShapingOptions(options); err != nil {
		return err
	}
	if err := validateIdentityOptions(options); err != nil {
		return err
	}
	return nil
}

func validateScanDelayOptions(options ScanOptions) error {
	scanDelay, err := durationMillis(options.ScanDelay)
	if err != nil {
		return err
	}
	maxScanDelay, err := durationMillis(options.MaxScanDelay)
	if err != nil {
		return err
	}
	if scanDelay != 0 && maxScanDelay != 0 && scanDelay > maxScanDelay {
		return ErrInvalidScanOption
	}
	return nil
}

func validateHostGroupOptions(options ScanOptions) error {
	if options.MinHostGroup < 0 || options.MinHostGroup > 100_000 {
		return ErrInvalidScanOption
	}
	if options.MaxHostGroup < 0 || options.MaxHostGroup > 100_000 {
		return ErrInvalidScanOption
	}
	if options.MinHostGroup != 0 && options.MaxHostGroup != 0 &&
		options.MinHostGroup > options.MaxHostGroup {
		return ErrInvalidScanOption
	}
	return nil
}

func validateParallelismOptions(options ScanOptions) error {
	if options.MinParallelism < 0 || options.MinParallelism > 1000 {
		return ErrInvalidScanOption
	}
	if options.MaxParallelism < 0 || options.MaxParallelism > 1000 {
		return ErrInvalidScanOption
	}
	if options.MinParallelism != 0 && options.MaxParallelism != 0 &&
		options.MinParallelism > options.MaxParallelism {
		return ErrInvalidScanOption
	}
	return nil
}

func validatePacketShapingOptions(options ScanOptions) error {
	if options.FragmentPackets && options.MTU != 0 {
		return ErrInvalidScanOption
	}
	if options.MTU < 0 || options.MTU > 1500 || (options.MTU != 0 && options.MTU%8 != 0) {
		return ErrInvalidScanOption
	}
	if options.DataLength < 0 || options.DataLength > 4096 {
		return ErrInvalidScanOption
	}
	if strings.TrimSpace(options.SourcePort) != "" {
		sourcePort, err := parseDiscoveryProbePort(strings.TrimSpace(options.SourcePort))
		if err != nil || sourcePort < 1 || sourcePort > 65535 {
			return ErrInvalidScanOption
		}
	}
	return nil
}

func validateIdentityOptions(options ScanOptions) error {
	if err := validateDecoys(options.Decoys); err != nil {
		return err
	}
	if strings.TrimSpace(options.SourceAddress) != "" {
		if _, err := netip.ParseAddr(strings.TrimSpace(options.SourceAddress)); err != nil {
			return ErrInvalidScanOption
		}
	}
	if err := validateInterfaceName(options.NetworkInterface); err != nil {
		return err
	}
	return validateSpoofMAC(options.SpoofMAC)
}

func validateDecoys(value string) error {
	const maxDecoyCount = 126

	decoys := strings.TrimSpace(value)
	if decoys == "" {
		return nil
	}
	if strings.ContainsAny(decoys, "\x00\r\n\t ") || strings.HasPrefix(decoys, "-") {
		return ErrInvalidScanOption
	}
	parts := strings.Split(decoys, ",")
	if len(parts) > maxDecoyCount {
		return ErrInvalidScanOption
	}
	totalDecoys := 0
	for _, part := range parts {
		count, err := validateDecoy(part, maxDecoyCount)
		if err != nil {
			return err
		}
		totalDecoys += count
		if totalDecoys > maxDecoyCount {
			return ErrInvalidScanOption
		}
	}
	return nil
}

func validateDecoy(value string, maxDecoyCount int) (int, error) {
	if value == "ME" {
		return 1, nil
	}
	if strings.HasPrefix(value, "RND:") {
		count, err := strconv.Atoi(strings.TrimPrefix(value, "RND:"))
		if err != nil || count < 1 || count > maxDecoyCount {
			return 0, ErrInvalidScanOption
		}
		return count, nil
	}
	if value == "RND" {
		return 1, nil
	}
	if _, err := netip.ParseAddr(value); err != nil {
		return 0, ErrInvalidScanOption
	}
	return 1, nil
}

func validateInterfaceName(value string) error {
	name := strings.TrimSpace(value)
	if name == "" {
		return nil
	}
	if len(name) > 64 || strings.ContainsAny(name, "\x00\r\n\t ") || strings.HasPrefix(name, "-") {
		return ErrInvalidScanOption
	}
	for _, char := range name {
		if !isInterfaceNameRune(char) {
			return ErrInvalidScanOption
		}
	}
	return nil
}

func isInterfaceNameRune(char rune) bool {
	return (char >= '0' && char <= '9') ||
		(char >= 'A' && char <= 'Z') ||
		(char >= 'a' && char <= 'z') ||
		char == '.' ||
		char == '_' ||
		char == '-' ||
		char == ':'
}

func validateSpoofMAC(value string) error {
	mac := strings.TrimSpace(value)
	if mac == "" || mac == "0" {
		return nil
	}
	if len(mac) != 17 || strings.ContainsAny(mac, "\x00\r\n\t ") || strings.HasPrefix(mac, "-") {
		return ErrInvalidScanOption
	}
	for index, char := range mac {
		if index%3 == 2 {
			if char != ':' {
				return ErrInvalidScanOption
			}
			continue
		}
		if !isHexRune(char) {
			return ErrInvalidScanOption
		}
	}
	return nil
}

func isHexRune(char rune) bool {
	return (char >= '0' && char <= '9') ||
		(char >= 'A' && char <= 'F') ||
		(char >= 'a' && char <= 'f')
}

func durationMillis(value string) (int64, error) {
	duration, err := validateDurationExpression(value)
	if err != nil || duration == "" {
		return 0, err
	}
	index := 0
	for index < len(duration) && duration[index] >= '0' && duration[index] <= '9' {
		index++
	}
	count, err := strconv.ParseInt(duration[:index], 10, 64)
	if err != nil {
		return 0, ErrInvalidScanOption
	}
	switch duration[index:] {
	case "h":
		return multiplyDuration(count, 60*60*1000)
	case "m":
		return multiplyDuration(count, 60*1000)
	case "s":
		return multiplyDuration(count, 1000)
	default:
		return count, nil
	}
}

func multiplyDuration(count int64, multiplier int64) (int64, error) {
	if count > math.MaxInt64/multiplier {
		return 0, ErrInvalidScanOption
	}
	return count * multiplier, nil
}

func buildTargetScopeArgs(options ScanOptions) ([]string, error) {
	args := make([]string, 0, 6)
	targetInputFile, err := validateAbsoluteOptionPath(options.TargetInputFile)
	if err != nil {
		return nil, err
	}
	if targetInputFile != "" {
		args = append(args, "-iL", targetInputFile)
	}
	excludeTargets, err := validateExcludeTargets(options.ExcludeTargets)
	if err != nil {
		return nil, err
	}
	if excludeTargets != "" {
		args = append(args, "--exclude", excludeTargets)
	}
	excludeFile, err := validateAbsoluteOptionPath(options.ExcludeFile)
	if err != nil {
		return nil, err
	}
	if excludeFile != "" {
		args = append(args, "--excludefile", excludeFile)
	}
	return args, nil
}

func buildDiscoveryProbeArgs(options ScanOptions) ([]string, error) {
	args := make([]string, 0, 7)
	tcpSynProbes, err := validateDiscoveryProbePorts(options.TCPSYNProbes)
	if err != nil {
		return nil, err
	}
	if tcpSynProbes != "" {
		args = append(args, "-PS"+tcpSynProbes)
	}
	tcpACKProbes, err := validateDiscoveryProbePorts(options.TCPACKProbes)
	if err != nil {
		return nil, err
	}
	if tcpACKProbes != "" {
		args = append(args, "-PA"+tcpACKProbes)
	}
	udpProbes, err := validateDiscoveryProbePorts(options.UDPProbes)
	if err != nil {
		return nil, err
	}
	if udpProbes != "" {
		args = append(args, "-PU"+udpProbes)
	}
	sctpInitProbes, err := validateDiscoveryProbePorts(options.SCTPInitProbes)
	if err != nil {
		return nil, err
	}
	if sctpInitProbes != "" {
		args = append(args, "-PY"+sctpInitProbes)
	}
	if options.ICMPEchoProbe {
		args = append(args, "-PE")
	}
	if options.ICMPTimestamp {
		args = append(args, "-PP")
	}
	if options.ICMPNetmask {
		args = append(args, "-PM")
	}
	return args, nil
}

func validateDiscoveryProbePorts(value string) (string, error) {
	ports := strings.TrimSpace(value)
	if ports == "" {
		return "", nil
	}
	if strings.ContainsAny(ports, "\x00\r\n\t ") || strings.HasPrefix(ports, "-") {
		return "", ErrInvalidScanOption
	}
	for _, part := range strings.Split(ports, ",") {
		if err := validateDiscoveryProbePortPart(part); err != nil {
			return "", err
		}
	}
	return ports, nil
}

func validateDiscoveryProbePortPart(value string) error {
	if value == "" {
		return ErrInvalidScanOption
	}
	bounds := strings.Split(value, "-")
	if len(bounds) > 2 {
		return ErrInvalidScanOption
	}
	ports := make([]int, 0, len(bounds))
	for _, bound := range bounds {
		port, err := parseDiscoveryProbePort(bound)
		if err != nil || port < 1 || port > 65535 {
			return ErrInvalidScanOption
		}
		ports = append(ports, port)
	}
	if len(ports) == 2 && ports[0] > ports[1] {
		return ErrInvalidScanOption
	}
	return nil
}

func parseDiscoveryProbePort(value string) (int, error) {
	if value == "" {
		return 0, ErrInvalidScanOption
	}
	for _, char := range value {
		if char < '0' || char > '9' {
			return 0, ErrInvalidScanOption
		}
	}
	return strconv.Atoi(value)
}

func validateExcludeTargets(value string) (string, error) {
	targets, err := ParseTargets(value)
	if strings.TrimSpace(value) == "" {
		return "", nil
	}
	if err != nil {
		return "", ErrInvalidScanOption
	}
	values := make([]string, 0, len(targets))
	for _, target := range targets {
		values = append(values, target.Value)
	}
	return strings.Join(values, ","), nil
}

func validateAbsoluteOptionPath(path string) (string, error) {
	value := strings.TrimSpace(path)
	if value == "" {
		return "", nil
	}
	if strings.ContainsAny(value, "\x00\r\n") || !isAbsoluteUserPath(value) {
		return "", ErrInvalidScanOption
	}
	return value, nil
}

func isTimingArg(value string) bool {
	switch value {
	case "-T0", "-T1", "-T2", "-T3", "-T4", "-T5":
		return true
	default:
		return false
	}
}

func validateTimingTemplate(value string) (string, error) {
	switch strings.TrimSpace(value) {
	case "T0", "T1", "T2", "T3", "T4", "T5":
		return strings.TrimSpace(value), nil
	default:
		return "", ErrInvalidScanOption
	}
}

func validateDurationExpression(value string) (string, error) {
	duration := strings.TrimSpace(value)
	if duration == "" {
		return "", nil
	}
	if strings.ContainsAny(duration, "\x00\r\n\t ") {
		return "", ErrInvalidScanOption
	}
	index := 0
	for index < len(duration) && duration[index] >= '0' && duration[index] <= '9' {
		index++
	}
	if index == 0 {
		return "", ErrInvalidScanOption
	}
	switch duration[index:] {
	case "", "ms", "s", "m", "h":
		return duration, nil
	default:
		return "", ErrInvalidScanOption
	}
}

func validatePorts(value string) (string, error) {
	ports := strings.TrimSpace(value)
	if ports == "" || strings.ContainsAny(ports, "\x00\r\n\t ") {
		return "", ErrInvalidScanOption
	}
	for _, char := range ports {
		if !isPortExpressionRune(char) {
			return "", ErrInvalidScanOption
		}
	}
	return ports, nil
}

func isPortExpressionRune(char rune) bool {
	return (char >= '0' && char <= '9') ||
		(char >= 'A' && char <= 'Z') ||
		(char >= 'a' && char <= 'z') ||
		char == ',' ||
		char == '-' ||
		char == ':' ||
		char == '*'
}

func buildDNSArgs(mode DNSMode) ([]string, error) {
	switch mode {
	case DNSModeDefault:
		return nil, nil
	case DNSModeSkip:
		return []string{"-n"}, nil
	case DNSModeSystem:
		return []string{"--system-dns"}, nil
	default:
		return nil, ErrInvalidScanOption
	}
}

func buildDNSServerArgs(options ScanOptions) ([]string, error) {
	servers, err := validateDNSServers(options.DNSServers)
	if err != nil || servers == "" {
		return nil, err
	}
	return []string{"--dns-servers", servers}, nil
}

func validateDNSServers(value string) (string, error) {
	servers := strings.TrimSpace(value)
	if servers == "" {
		return "", nil
	}
	if strings.ContainsAny(servers, "\x00\r\n\t ") || strings.HasPrefix(servers, "-") {
		return "", ErrInvalidScanOption
	}
	parts := strings.Split(servers, ",")
	for _, part := range parts {
		if part == "" {
			return "", ErrInvalidScanOption
		}
		if _, err := netip.ParseAddr(part); err != nil {
			return "", ErrInvalidScanOption
		}
	}
	return servers, nil
}

func buildTechniqueArgs(technique ScanTechnique) ([]string, error) {
	switch technique {
	case ScanTechniqueDefault:
		return nil, nil
	case ScanTechniqueConnect:
		return []string{"-sT"}, nil
	case ScanTechniqueSYN:
		return []string{"-sS"}, nil
	case ScanTechniqueUDP:
		return []string{"-sU"}, nil
	case ScanTechniqueACK:
		return []string{"-sA"}, nil
	case ScanTechniqueWindow:
		return []string{"-sW"}, nil
	case ScanTechniqueMaimon:
		return []string{"-sM"}, nil
	case ScanTechniqueNull:
		return []string{"-sN"}, nil
	case ScanTechniqueFIN:
		return []string{"-sF"}, nil
	case ScanTechniqueXmas:
		return []string{"-sX"}, nil
	case ScanTechniqueSCTPInit:
		return []string{"-sY"}, nil
	case ScanTechniqueSCTPCookie:
		return []string{"-sZ"}, nil
	case ScanTechniqueProtocol:
		return []string{"-sO"}, nil
	default:
		return nil, ErrInvalidScanOption
	}
}

func buildDiscoveryArgs(mode DiscoveryMode) ([]string, error) {
	switch mode {
	case DiscoveryModeDefault:
		return nil, nil
	case DiscoveryModeSkip:
		return []string{"-Pn"}, nil
	case DiscoveryModePing:
		return []string{"-sn"}, nil
	default:
		return nil, ErrInvalidScanOption
	}
}

func buildVerbosityArgs(mode VerbosityMode) ([]string, error) {
	switch mode {
	case VerbosityModeDefault:
		return nil, nil
	case VerbosityModeVerbose:
		return []string{"-v"}, nil
	case VerbosityModeDebug:
		return []string{"-vv"}, nil
	default:
		return nil, ErrInvalidScanOption
	}
}

func buildVersionArgs(options ScanOptions) ([]string, error) {
	if !hasVersionSelection(options) {
		return nil, nil
	}
	args := []string{"-sV"}
	switch options.VersionMode {
	case VersionModeDefault:
		return appendVersionIntensity(args, options.VersionIntensity)
	case VersionModeLight:
		if strings.TrimSpace(options.VersionIntensity) != "" {
			return nil, ErrInvalidScanOption
		}
		return append(args, "--version-light"), nil
	case VersionModeAll:
		if strings.TrimSpace(options.VersionIntensity) != "" {
			return nil, ErrInvalidScanOption
		}
		return append(args, "--version-all"), nil
	default:
		return nil, ErrInvalidScanOption
	}
}

func appendVersionIntensity(args []string, value string) ([]string, error) {
	intensity := strings.TrimSpace(value)
	if intensity == "" {
		return args, nil
	}
	parsed, err := strconv.Atoi(intensity)
	if err != nil || parsed < 0 || parsed > 9 {
		return nil, ErrInvalidScanOption
	}
	return append(args, "--version-intensity", intensity), nil
}
