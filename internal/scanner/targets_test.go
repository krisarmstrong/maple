package scanner

import "testing"

func TestParseTargetsAcceptsSimpleTargetLists(t *testing.T) {
	targets, err := ParseTargets("scanme.nmap.org, 192.168.1.1\n10.0.0.0/24, 192.168.1.1-20")
	if err != nil {
		t.Fatalf("ParseTargets returned error: %v", err)
	}

	expected := []Target{
		{Value: "scanme.nmap.org", Kind: TargetHostname},
		{Value: "192.168.1.1", Kind: TargetIP},
		{Value: "10.0.0.0/24", Kind: TargetCIDR},
		{Value: "192.168.1.1-20", Kind: TargetRange},
	}
	if len(targets) != len(expected) {
		t.Fatalf("expected %d targets, got %d", len(expected), len(targets))
	}
	for index, want := range expected {
		if targets[index] != want {
			t.Fatalf("target %d = %#v, want %#v", index, targets[index], want)
		}
	}
}

func TestParseTargetsRejectsInvalidTargets(t *testing.T) {
	cases := []string{
		"",
		"-sV",
		"bad host",
		"example..com",
		"192.168.1.400",
		"192.168.1.20-1",
		"10.0.0.0/99",
	}

	for _, input := range cases {
		if _, err := ParseTargets(input); err == nil {
			t.Fatalf("ParseTargets(%q) expected error", input)
		}
	}
}

func TestIsIPv4Range(t *testing.T) {
	cases := []struct {
		input string
		want  bool
	}{
		{"192.168.1.1-20", true},
		{"10.0.0-255.1-100", true},
		{"10-20.0.0.1", true},
		{"192.168.1.*", true},
		{"*.*.*.*", true},
		{"10-200.0-255.0-255.1-254", true},
		{"192.168.1.20-1", false}, // reversed range
		{"10.0.255-0.1", false},   // reversed multi-octet
		{"192.168.1.256", false},  // out of bounds, not a range
		{"192.168.1", false},      // missing octet
		{"1.2.3.4.5", false},      // too many parts
		{"192.168..1-5", false},   // empty part
	}
	for _, tc := range cases {
		got := isIPv4Range(tc.input)
		if got != tc.want {
			t.Errorf("isIPv4Range(%q) = %v, want %v", tc.input, got, tc.want)
		}
	}
}

func TestParseTargetsAcceptsMultiOctetRange(t *testing.T) {
	targets, err := ParseTargets("10.0.0-255.1-100")
	if err != nil {
		t.Fatalf("ParseTargets returned error: %v", err)
	}
	if len(targets) != 1 {
		t.Fatalf("expected 1 target, got %d", len(targets))
	}
	if targets[0].Kind != TargetRange {
		t.Fatalf("Kind = %q, want TargetRange", targets[0].Kind)
	}
	if targets[0].Value != "10.0.0-255.1-100" {
		t.Fatalf("Value = %q, want 10.0.0-255.1-100", targets[0].Value)
	}
}
