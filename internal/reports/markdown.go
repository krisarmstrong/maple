package reports

import (
	"fmt"
	"strings"
	"time"

	"github.com/krisarmstrong/maple/internal/scanner"
)

type MarkdownInput struct {
	RunID       string
	StartedAt   time.Time
	FinishedAt  time.Time
	Preview     scanner.CommandPreview
	Summary     Summary
	ExitCode    int
	Diagnostics string
	Error       string
}

func Markdown(input MarkdownInput) string {
	var builder strings.Builder
	builder.WriteString("# Maple Scan Report\n\n")
	writeLine(&builder, "Run ID", input.RunID)
	writeLine(&builder, "Started", formatTime(input.StartedAt))
	writeLine(&builder, "Finished", formatTime(input.FinishedAt))
	writeLine(&builder, "Profile", input.Preview.Profile.Name)
	writeLine(&builder, "Exit code", fmt.Sprintf("%d", input.ExitCode))
	if input.Error != "" {
		writeLine(&builder, "Error", input.Error)
	}
	if input.Diagnostics != "" {
		writeLine(&builder, "Diagnostics", input.Diagnostics)
	}

	builder.WriteString("\n## Command\n\n")
	builder.WriteString("```text\n")
	builder.WriteString(commandLine(input.Preview))
	builder.WriteString("\n```\n")

	builder.WriteString("\n## Summary\n\n")
	writeLine(&builder, "Targets", fmt.Sprintf("%d", len(input.Preview.Targets)))
	writeLine(&builder, "Hosts found", fmt.Sprintf("%d", input.Summary.HostCount))
	writeLine(&builder, "Hosts up", fmt.Sprintf("%d", input.Summary.HostsUp))
	writeLine(&builder, "Hosts down", fmt.Sprintf("%d", input.Summary.HostsDown))
	writeLine(&builder, "Open ports", fmt.Sprintf("%d", openPortCount(input.Summary.Hosts)))
	if input.Summary.ElapsedTime != "" {
		writeLine(&builder, "Elapsed", input.Summary.ElapsedTime+"s")
	}
	writeHosts(&builder, input.Summary.Hosts)
	return strings.TrimRight(builder.String(), "\n") + "\n"
}

func writeLine(builder *strings.Builder, label string, value string) {
	if value == "" {
		return
	}
	builder.WriteString("- ")
	builder.WriteString(label)
	builder.WriteString(": ")
	builder.WriteString(value)
	builder.WriteString("\n")
}

func formatTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func commandLine(preview scanner.CommandPreview) string {
	parts := make([]string, 0, 1+len(preview.Args))
	parts = append(parts, preview.Executable)
	parts = append(parts, preview.Args...)
	return strings.Join(parts, " ")
}

func writeHosts(builder *strings.Builder, hosts []Host) {
	if len(hosts) == 0 {
		builder.WriteString("\n## Hosts\n\n")
		builder.WriteString("No parsed hosts were reported.\n")
		return
	}
	builder.WriteString("\n## Hosts\n\n")
	builder.WriteString("| Address | Hostname | State |\n")
	builder.WriteString("| --- | --- | --- |\n")
	for _, host := range hosts {
		builder.WriteString("| ")
		builder.WriteString(markdownCell(host.Address))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(host.Hostname))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(host.State))
		builder.WriteString(" |\n")
	}
	for _, host := range hosts {
		writeHostDetails(builder, host)
		writeScripts(builder, "Host scripts for "+hostLabel(host), host.Scripts)
		writePorts(builder, host)
	}
}

func writeHostDetails(builder *strings.Builder, host Host) {
	if len(host.OSMatches) == 0 && len(host.ExtraPorts) == 0 && len(host.Trace) == 0 {
		return
	}
	builder.WriteString("\n### Host details for ")
	builder.WriteString(hostLabel(host))
	builder.WriteString("\n\n")
	for _, match := range host.OSMatches {
		builder.WriteString("- OS: ")
		builder.WriteString(markdownCell(match.Name))
		if match.Accuracy != "" {
			builder.WriteString(" (")
			builder.WriteString(markdownCell(match.Accuracy))
			builder.WriteString("%)")
		}
		builder.WriteString("\n")
	}
	for _, extra := range host.ExtraPorts {
		builder.WriteString("- Other ports: ")
		builder.WriteString(fmt.Sprintf("%d", extra.Count))
		builder.WriteString(" ")
		builder.WriteString(markdownCell(extra.State))
		if extra.Reason != "" {
			builder.WriteString(" (")
			builder.WriteString(markdownCell(extra.Reason))
			builder.WriteString(")")
		}
		builder.WriteString("\n")
	}
	writeTrace(builder, host)
}

func markdownCell(value string) string {
	if value == "" {
		return "-"
	}
	return strings.ReplaceAll(value, "|", "\\|")
}

func writePorts(builder *strings.Builder, host Host) {
	if len(host.Ports) == 0 {
		return
	}
	builder.WriteString("\n### Ports for ")
	builder.WriteString(hostLabel(host))
	builder.WriteString("\n\n")
	builder.WriteString("| Port | State | Reason | Service | Version | Extra |\n")
	builder.WriteString("| --- | --- | --- | --- | --- | --- |\n")
	for _, port := range host.Ports {
		builder.WriteString("| ")
		builder.WriteString(markdownCell(port.Protocol + "/" + port.ID))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(port.State))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(port.Reason))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(port.Service))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(serviceVersion(port)))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(port.ExtraInfo))
		builder.WriteString(" |\n")
	}
	for _, port := range host.Ports {
		portLabel := port.Protocol + "/" + port.ID
		writeList(builder, "CPEs for "+portLabel, port.CPEs)
		writeScripts(builder, "Scripts for "+portLabel, port.Scripts)
	}
}

func writeTrace(builder *strings.Builder, host Host) {
	if len(host.Trace) == 0 {
		return
	}
	builder.WriteString("\n#### Trace for ")
	builder.WriteString(hostLabel(host))
	builder.WriteString("\n\n")
	builder.WriteString("| TTL | Address | Hostname | RTT |\n")
	builder.WriteString("| --- | --- | --- | --- |\n")
	for _, hop := range host.Trace {
		builder.WriteString("| ")
		builder.WriteString(markdownCell(hop.TTL))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(hop.Address))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(hop.Hostname))
		builder.WriteString(" | ")
		builder.WriteString(markdownCell(hop.RTT))
		builder.WriteString(" |\n")
	}
}

func writeList(builder *strings.Builder, heading string, values []string) {
	if len(values) == 0 {
		return
	}
	builder.WriteString("\n#### ")
	builder.WriteString(heading)
	builder.WriteString("\n\n")
	for _, value := range values {
		builder.WriteString("- ")
		builder.WriteString(markdownCell(value))
		builder.WriteString("\n")
	}
}

func writeScripts(builder *strings.Builder, heading string, scripts []ScriptOutput) {
	if len(scripts) == 0 {
		return
	}
	builder.WriteString("\n#### ")
	builder.WriteString(heading)
	builder.WriteString("\n\n")
	for _, script := range scripts {
		builder.WriteString("- ")
		builder.WriteString(markdownCell(script.ID))
		if script.Output != "" {
			fence := markdownFence(script.Output)
			builder.WriteString("\n\n")
			builder.WriteString(fence)
			builder.WriteString("text\n")
			builder.WriteString(script.Output)
			builder.WriteString("\n")
			builder.WriteString(fence)
			builder.WriteString("\n")
		} else {
			builder.WriteString("\n")
		}
	}
}

func markdownFence(value string) string {
	longestRun := 0
	currentRun := 0
	for _, char := range value {
		if char == '`' {
			currentRun++
			if currentRun > longestRun {
				longestRun = currentRun
			}
			continue
		}
		currentRun = 0
	}
	if longestRun < 3 {
		return "```"
	}
	return strings.Repeat("`", longestRun+1)
}

func hostLabel(host Host) string {
	if host.Hostname != "" {
		return host.Hostname
	}
	if host.Address != "" {
		return host.Address
	}
	return "unknown host"
}

func serviceVersion(port Port) string {
	parts := make([]string, 0, 2)
	if port.Product != "" {
		parts = append(parts, port.Product)
	}
	if port.Version != "" {
		parts = append(parts, port.Version)
	}
	return strings.Join(parts, " ")
}

func openPortCount(hosts []Host) int {
	count := 0
	for _, host := range hosts {
		for _, port := range host.Ports {
			if port.State == "open" {
				count++
			}
		}
	}
	return count
}
