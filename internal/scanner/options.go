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

	ScanTechniqueDefault ScanTechnique = ""
	ScanTechniqueConnect ScanTechnique = "connect"
	ScanTechniqueSYN     ScanTechnique = "syn"
	ScanTechniqueUDP     ScanTechnique = "udp"

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
}

func BuildOptionArgs(options ScanOptions) ([]string, error) {
	if err := validatePortSelection(options); err != nil {
		return nil, err
	}
	if err := validatePerformanceOptions(options); err != nil {
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
		if options.DiscoveryMode != DiscoveryModeDefault && isDiscoveryArg(arg) {
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
		args = append(args, arg)
	}
	return args
}

func isTechniqueArg(value string) bool {
	switch value {
	case "-sS", "-sT", "-sU":
		return true
	default:
		return false
	}
}

func isDiscoveryArg(value string) bool {
	switch value {
	case "-Pn", "-sn":
		return true
	default:
		return false
	}
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
	return nil
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
