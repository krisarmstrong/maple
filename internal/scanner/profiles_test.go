package scanner

import "testing"

func TestBuiltInProfilesAreSafeAndPinned(t *testing.T) {
	profiles := BuiltInProfiles()
	if len(profiles) != 4 {
		t.Fatalf("expected 4 built-in profiles, got %d", len(profiles))
	}

	for _, profile := range profiles {
		if profile.ID == "" || profile.Name == "" {
			t.Fatalf("profile must have id and name: %#v", profile)
		}
		for _, arg := range profile.Args {
			if arg == "-A" || arg == "-O" || arg == "--script" {
				t.Fatalf("unsafe arg %q in profile %s", arg, profile.ID)
			}
		}
	}
}

func TestConnectProfileUsesUnprivilegedTCPConnect(t *testing.T) {
	profile, err := FindProfile("connect")
	if err != nil {
		t.Fatalf("FindProfile returned error: %v", err)
	}

	want := []string{"-sT", "-Pn", "-T3", "--top-ports", "100"}
	if len(profile.Args) != len(want) {
		t.Fatalf("len(profile.Args) = %d, want %d", len(profile.Args), len(want))
	}
	for index, value := range want {
		if profile.Args[index] != value {
			t.Fatalf("profile.Args[%d] = %q, want %q", index, profile.Args[index], value)
		}
	}
}

func TestFindProfileReturnsCopy(t *testing.T) {
	profile, err := FindProfile("ping")
	if err != nil {
		t.Fatalf("FindProfile returned error: %v", err)
	}

	profile.Args[0] = "-A"
	again, err := FindProfile("ping")
	if err != nil {
		t.Fatalf("FindProfile returned error: %v", err)
	}
	if again.Args[0] == "-A" {
		t.Fatal("profile args should not expose shared mutable state")
	}
}
