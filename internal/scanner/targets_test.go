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
