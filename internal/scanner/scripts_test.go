package scanner

import (
	"errors"
	"testing"
)

func TestBuildScriptArgsAcceptsCategoriesNamedScriptsAndCustomScriptPaths(t *testing.T) {
	args, err := BuildScriptArgs([]Script{
		{Kind: ScriptCategory, Value: "safe"},
		{Kind: ScriptName, Value: "http-title"},
		{Kind: ScriptName, Value: "ssl-enum-ciphers"},
		{Kind: ScriptPath, Value: "/Users/krisarmstrong/Scripts/custom-check.nse"},
		{Kind: ScriptPath, Value: `C:\Users\Kris\Scripts\windows-check.nse`},
	})
	if err != nil {
		t.Fatalf("BuildScriptArgs returned error: %v", err)
	}

	want := []string{
		"--script", "safe",
		"--script", "http-title",
		"--script", "ssl-enum-ciphers",
		"--script", "/Users/krisarmstrong/Scripts/custom-check.nse",
		"--script", `C:\Users\Kris\Scripts\windows-check.nse`,
	}
	if !sameStringSlices(args, want) {
		t.Fatalf("args = %#v, want %#v", args, want)
	}
}

func TestBuildScriptArgsRejectsUnknownCategoriesAndScriptExpressions(t *testing.T) {
	tests := []Script{
		{Kind: ScriptCategory, Value: "unknown"},
		{Kind: ScriptCategory, Value: "safe,default"},
		{Kind: ScriptPath, Value: "relative/custom-check.nse"},
		{Kind: ScriptPath, Value: "/Users/krisarmstrong/Scripts/custom-check.lua"},
		{Kind: ScriptPath, Value: "/Users/krisarmstrong/Scripts/custom,check.nse"},
		{Kind: ScriptPath, Value: "/Users/krisarmstrong/Scripts/custom\ncheck.nse"},
		{Kind: ScriptName, Value: "http-title,ssl-cert"},
		{Kind: ScriptName, Value: "relative/custom-check"},
		{Kind: ScriptName, Value: "name with spaces"},
	}

	for _, test := range tests {
		t.Run(string(test.Kind)+":"+test.Value, func(t *testing.T) {
			_, err := BuildScriptArgs([]Script{test})
			if !errors.Is(err, ErrInvalidScript) {
				t.Fatalf("error = %v, want ErrInvalidScript", err)
			}
		})
	}
}

func TestNSECategoriesReturnsCopy(t *testing.T) {
	categories := NSECategories()
	categories[0] = "mutated"

	again := NSECategories()
	if again[0] == "mutated" {
		t.Fatal("NSECategories should not expose shared mutable state")
	}
}

func sameStringSlices(got []string, want []string) bool {
	if len(got) != len(want) {
		return false
	}
	for index := range got {
		if got[index] != want[index] {
			return false
		}
	}
	return true
}
