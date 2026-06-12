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
	if strings.Contains(value, ".") && strings.Contains(value, "-") {
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
	start, end, ok := strings.Cut(value, "-")
	if !ok || start == "" || end == "" || strings.Contains(end, "-") {
		return false
	}
	address, err := netip.ParseAddr(start)
	if err != nil || !address.Is4() {
		return false
	}
	endAddress, err := netip.ParseAddr("192.0.2." + end)
	if err != nil || !endAddress.Is4() {
		return false
	}
	return int(endAddress.As4()[3]) >= int(address.As4()[3])
}
