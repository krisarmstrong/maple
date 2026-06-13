package scanner

import (
	"errors"
	"strconv"
	"strings"
)

type DNSMode string

const (
	DNSModeDefault DNSMode = ""
	DNSModeSkip    DNSMode = "skip"
	DNSModeSystem  DNSMode = "system"
)

var ErrInvalidScanOption = errors.New("enter valid structured Nmap options")

type ScanOptions struct {
	TimingTemplate string  `json:"timingTemplate,omitempty"`
	Ports          string  `json:"ports,omitempty"`
	TopPorts       int     `json:"topPorts,omitempty"`
	AllPorts       bool    `json:"allPorts,omitempty"`
	IPv6           bool    `json:"ipv6,omitempty"`
	OSDetection    bool    `json:"osDetection,omitempty"`
	Traceroute     bool    `json:"traceroute,omitempty"`
	DNSMode        DNSMode `json:"dnsMode,omitempty"`
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
		args = append(args, arg)
	}
	return args
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
