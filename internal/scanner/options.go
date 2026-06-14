package scanner

import (
	"errors"
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
	ScanTechnique    ScanTechnique `json:"scanTechnique,omitempty"`
	DiscoveryMode    DiscoveryMode `json:"discoveryMode,omitempty"`
	TCPSYNProbes     string        `json:"tcpSynProbes,omitempty"`
	TCPACKProbes     string        `json:"tcpAckProbes,omitempty"`
	UDPProbes        string        `json:"udpProbes,omitempty"`
	SCTPInitProbes   string        `json:"sctpInitProbes,omitempty"`
	ICMPEchoProbe    bool          `json:"icmpEchoProbe,omitempty"`
	ICMPTimestamp    bool          `json:"icmpTimestamp,omitempty"`
	ICMPNetmask      bool          `json:"icmpNetmask,omitempty"`
	TargetInputFile  string        `json:"targetInputFile,omitempty"`
	ExcludeTargets   string        `json:"excludeTargets,omitempty"`
	ExcludeFile      string        `json:"excludeFile,omitempty"`
	TimingTemplate   string        `json:"timingTemplate,omitempty"`
	Ports            string        `json:"ports,omitempty"`
	TopPorts         int           `json:"topPorts,omitempty"`
	AllPorts         bool          `json:"allPorts,omitempty"`
	ServiceDetection bool          `json:"serviceDetection,omitempty"`
	VersionMode      VersionMode   `json:"versionMode,omitempty"`
	IPv6             bool          `json:"ipv6,omitempty"`
	OSDetection      bool          `json:"osDetection,omitempty"`
	Traceroute       bool          `json:"traceroute,omitempty"`
	DNSMode          DNSMode       `json:"dnsMode,omitempty"`
	VerbosityMode    VerbosityMode `json:"verbosityMode,omitempty"`
	Reason           bool          `json:"reason,omitempty"`
	OpenOnly         bool          `json:"openOnly,omitempty"`
	MinRate          int           `json:"minRate,omitempty"`
	MaxRetries       string        `json:"maxRetries,omitempty"`
	HostTimeout      string        `json:"hostTimeout,omitempty"`
	MaxRTTTimeout    string        `json:"maxRttTimeout,omitempty"`
	StatsEvery       string        `json:"statsEvery,omitempty"`
	PacketTrace      bool          `json:"packetTrace,omitempty"`
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
	if strings.TrimSpace(options.MaxRetries) != "" {
		args = append(args, "--max-retries", strings.TrimSpace(options.MaxRetries))
	}
	if strings.TrimSpace(options.HostTimeout) != "" {
		args = append(args, "--host-timeout", strings.TrimSpace(options.HostTimeout))
	}
	if strings.TrimSpace(options.MaxRTTTimeout) != "" {
		args = append(args, "--max-rtt-timeout", strings.TrimSpace(options.MaxRTTTimeout))
	}
	if strings.TrimSpace(options.StatsEvery) != "" {
		args = append(args, "--stats-every", strings.TrimSpace(options.StatsEvery))
	}
	if options.PacketTrace {
		args = append(args, "--packet-trace")
	}
	return args, nil
}

func ProfileArgsForOptions(profile Profile, options ScanOptions) []string {
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
		if strings.TrimSpace(options.StatsEvery) != "" && arg == "--stats-every" {
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
	return options.ServiceDetection || options.VersionMode != VersionModeDefault
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
	return nil
}

func hasPortSelection(options ScanOptions) bool {
	return strings.TrimSpace(options.Ports) != "" || options.AllPorts || options.TopPorts != 0
}

func validatePerformanceOptions(options ScanOptions) error {
	if options.MinRate < 0 || options.MinRate > 1_000_000 {
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
	if _, err := validateDurationExpression(options.StatsEvery); err != nil {
		return err
	}
	return nil
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
		return args, nil
	case VersionModeLight:
		return append(args, "--version-light"), nil
	case VersionModeAll:
		return append(args, "--version-all"), nil
	default:
		return nil, ErrInvalidScanOption
	}
}
