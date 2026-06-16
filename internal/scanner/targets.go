package scanner

import (
	"errors"
	"net/netip"
	"regexp"
	"strings"
)

type TargetKind string

const (
	TargetHostname TargetKind = "hostname"
	TargetIP       TargetKind = "ip"
	TargetCIDR     TargetKind = "cidr"
	TargetRange    TargetKind = "range"
)

var hostnamePattern = regexp.MustCompile(`^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$`)

var (
	ErrEmptyTargets  = errors.New("enter at least one target")
	ErrInvalidTarget = errors.New("enter hostnames, IPs, CIDR subnets, or IPv4 ranges separated by commas or new lines")
)

type Target struct {
	Value string     `json:"value"`
	Kind  TargetKind `json:"kind"`
}

func ParseTargets(input string) ([]Target, error) {
	fields := splitTargets(input)
	if len(fields) == 0 {
		return nil, ErrEmptyTargets
	}

	targets := make([]Target, 0, len(fields))
	for _, field := range fields {
		target, ok := parseTarget(field)
		if !ok {
			return nil, ErrInvalidTarget
		}
		targets = append(targets, target)
	}
	return targets, nil
}

func splitTargets(input string) []string {
	parts := strings.FieldsFunc(input, func(value rune) bool {
		return value == ',' || value == '\n'
	})
	fields := make([]string, 0, len(parts))
	for _, part := range parts {
		field := strings.TrimSpace(part)
		if field != "" {
			fields = append(fields, field)
		}
	}
	return fields
}

func parseTarget(value string) (Target, bool) {
	if strings.ContainsAny(value, " \t\r;|&$`'\"<>") {
		return Target{}, false
	}
	if strings.HasPrefix(value, "-") {
		return Target{}, false
	}
	if _, err := netip.ParsePrefix(value); err == nil {
		return Target{Value: value, Kind: TargetCIDR}, true
	}
	if strings.Contains(value, "/") {
		return Target{}, false
	}
	if isIPv4Range(value) {
		return Target{Value: value, Kind: TargetRange}, true
	}
	if strings.Contains(value, "-") {
		return Target{}, false
	}
	if _, err := netip.ParseAddr(value); err == nil {
		return Target{Value: value, Kind: TargetIP}, true
	}
	if looksLikeInvalidIP(value) {
		return Target{}, false
	}
	if hostnamePattern.MatchString(value) {
		return Target{Value: value, Kind: TargetHostname}, true
	}
	return Target{}, false
}

func looksLikeInvalidIP(value string) bool {
	if !strings.Contains(value, ".") {
		return false
	}
	for _, part := range strings.Split(value, ".") {
		if part == "" || strings.Trim(part, "0123456789") != "" {
			return false
		}
	}
	return true
}

func isIPv4Range(value string) bool {
	parts := strings.Split(value, ".")
	if len(parts) != 4 {
		return false
	}
	hasRange := false
	for _, part := range parts {
		if part == "*" {
			hasRange = true
			continue
		}
		if strings.Contains(part, "-") {
			hasRange = true
			lo, hi, ok := strings.Cut(part, "-")
			if !ok || lo == "" || hi == "" {
				return false
			}
			if strings.Contains(hi, "-") {
				return false
			}
			loVal, err := parseOctet(lo)
			if err != nil {
				return false
			}
			hiVal, err := parseOctet(hi)
			if err != nil {
				return false
			}
			if loVal > hiVal {
				return false
			}
			continue
		}
		if _, err := parseOctet(part); err != nil {
			return false
		}
	}
	return hasRange
}

func parseOctet(s string) (int, error) {
	if s == "" || len(s) > 3 {
		return 0, errors.New("invalid octet")
	}
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, errors.New("invalid octet char")
		}
		n = n*10 + int(c-'0')
	}
	if n > 255 {
		return 0, errors.New("octet out of range")
	}
	return n, nil
}
