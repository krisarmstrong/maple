package scanner

import (
	"errors"
	"strconv"
	"strings"
)

type DNSMode string
type VersionMode string

const (
	DNSModeDefault DNSMode = ""
	DNSModeSkip    DNSMode = "skip"
	DNSModeSystem  DNSMode = "system"

	VersionModeDefault VersionMode = ""
	VersionModeLight   VersionMode = "light"
	VersionModeAll     VersionMode = "all"
)

var ErrInvalidScanOption = errors.New("enter valid structured Nmap options")

type ScanOptions struct {
	TimingTemplate   string      `json:"timingTemplate,omitempty"`
	Ports            string      `json:"ports,omitempty"`
	TopPorts         int         `json:"topPorts,omitempty"`
	AllPorts         bool        `json:"allPorts,omitempty"`
	ServiceDetection bool        `json:"serviceDetection,omitempty"`
	VersionMode      VersionMode `json:"versionMode,omitempty"`
	IPv6             bool        `json:"ipv6,omitempty"`
	OSDetection      bool        `json:"osDetection,omitempty"`
	Traceroute       bool        `json:"traceroute,omitempty"`
	DNSMode          DNSMode     `json:"dnsMode,omitempty"`
}

func BuildOptionArgs(options ScanOptions) ([]string, error) {
	if err := validatePortSelection(options); err != nil {
		return nil, err
	}

	args := make([]string, 0, 10)
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
		args = append(args, arg)
	}
	return args
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
