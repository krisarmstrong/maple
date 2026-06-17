package reports

import (
	"encoding/xml"
	"io"
	"strings"

	"github.com/krisarmstrong/maple/internal/scanner"
)

func SummarizeNmapXML(input string) (scanner.Summary, error) {
	if strings.TrimSpace(input) == "" {
		return scanner.Summary{}, nil
	}

	var document nmapRun
	if err := xml.Unmarshal([]byte(input), &document); err != nil {
		return scanner.Summary{}, err
	}

	summary := scanner.Summary{
		Args:        document.Args,
		StartedAt:   document.Started,
		FinishedAt:  document.RunStats.Finished.Time,
		ElapsedTime: document.RunStats.Finished.Elapsed,
		HostCount:   document.hostCount(),
		HostsUp:     document.RunStats.Hosts.Up,
		HostsDown:   document.RunStats.Hosts.Down,
	}
	for _, host := range document.Hosts {
		if document.RunStats.Hosts.Total == 0 {
			countHostState(host.Status.State, &summary)
		}
		summary.Hosts = append(summary.Hosts, scanner.Host{
			Address:    host.primaryAddress(),
			Hostname:   host.primaryHostname(),
			State:      host.Status.State,
			OSMatches:  host.OS.matches(),
			ExtraPorts: host.Ports.extraPorts(),
			Trace:      host.Trace.hops(),
			Scripts:    host.HostScripts.scripts(),
			Ports:      host.ports(),
		})
	}
	return summary, nil
}

func countHostState(state string, summary *scanner.Summary) {
	switch state {
	case "up":
		summary.HostsUp++
	case "down":
		summary.HostsDown++
	}
}

type nmapRun struct {
	XMLName  xml.Name   `xml:"nmaprun"`
	Args     string     `xml:"args,attr"`
	Started  string     `xml:"startstr,attr"`
	Hosts    []nmapHost `xml:"host"`
	RunStats runStats   `xml:"runstats"`
}

func (n nmapRun) hostCount() int {
	if n.RunStats.Hosts.Total != 0 {
		return n.RunStats.Hosts.Total
	}
	return len(n.Hosts)
}

type nmapHost struct {
	Status      nmapStatus    `xml:"status"`
	Addresses   []nmapAddress `xml:"address"`
	Hostnames   nmapHostnames `xml:"hostnames"`
	Ports       nmapPorts     `xml:"ports"`
	OS          nmapOS        `xml:"os"`
	Trace       nmapTrace     `xml:"trace"`
	HostScripts nmapScripts   `xml:"hostscript"`
}

func (h nmapHost) primaryAddress() string {
	for _, address := range h.Addresses {
		if address.Value != "" {
			return address.Value
		}
	}
	return ""
}

func (h nmapHost) primaryHostname() string {
	for _, hostname := range h.Hostnames.Names {
		if hostname.Name != "" {
			return hostname.Name
		}
	}
	return ""
}

func (h nmapHost) ports() []scanner.Port {
	ports := make([]scanner.Port, 0, len(h.Ports.Ports))
	for _, port := range h.Ports.Ports {
		ports = append(ports, scanner.Port{
			Protocol:  port.Protocol,
			ID:        port.ID,
			State:     port.State.State,
			Reason:    port.State.Reason,
			Service:   port.Service.Name,
			Product:   port.Service.Product,
			Version:   port.Service.Version,
			ExtraInfo: port.Service.ExtraInfo,
			CPEs:      port.Service.CPEs,
			Scripts:   scriptOutputs(port.Scripts),
		})
	}
	return ports
}

type nmapStatus struct {
	State string `xml:"state,attr"`
}

type nmapAddress struct {
	Value string `xml:"addr,attr"`
}

type nmapHostnames struct {
	Names []nmapHostname `xml:"hostname"`
}

type nmapHostname struct {
	Name string `xml:"name,attr"`
}

type nmapPorts struct {
	Ports      []nmapPort      `xml:"port"`
	ExtraPorts []nmapExtraPort `xml:"extraports"`
}

func (p nmapPorts) extraPorts() []scanner.ExtraPorts {
	extraPorts := make([]scanner.ExtraPorts, 0, len(p.ExtraPorts))
	for _, extra := range p.ExtraPorts {
		extraPorts = append(extraPorts, scanner.ExtraPorts{
			State:  extra.State,
			Count:  extra.Count,
			Reason: extra.primaryReason(),
		})
	}
	return extraPorts
}

type nmapExtraPort struct {
	State   string            `xml:"state,attr"`
	Count   int               `xml:"count,attr"`
	Reasons []nmapExtraReason `xml:"extrareasons"`
}

func (p nmapExtraPort) primaryReason() string {
	for _, reason := range p.Reasons {
		if reason.Reason != "" {
			return reason.Reason
		}
	}
	return ""
}

type nmapExtraReason struct {
	Reason string `xml:"reason,attr"`
}

type nmapPort struct {
	Protocol string       `xml:"protocol,attr"`
	ID       string       `xml:"portid,attr"`
	State    nmapState    `xml:"state"`
	Service  nmapService  `xml:"service"`
	Scripts  []nmapScript `xml:"script"`
}

type nmapState struct {
	State  string `xml:"state,attr"`
	Reason string `xml:"reason,attr"`
}

type nmapService struct {
	Name      string   `xml:"name,attr"`
	Product   string   `xml:"product,attr"`
	Version   string   `xml:"version,attr"`
	ExtraInfo string   `xml:"extrainfo,attr"`
	CPEs      []string `xml:"cpe"`
}

type nmapOS struct {
	Matches []nmapOSMatch `xml:"osmatch"`
}

func (o nmapOS) matches() []scanner.OSMatch {
	matches := make([]scanner.OSMatch, 0, len(o.Matches))
	for _, match := range o.Matches {
		matches = append(matches, scanner.OSMatch(match))
	}
	return matches
}

type nmapOSMatch struct {
	Name     string `xml:"name,attr"`
	Accuracy string `xml:"accuracy,attr"`
}

type nmapTrace struct {
	Hops []nmapHop `xml:"hop"`
}

func (t nmapTrace) hops() []scanner.TraceHop {
	hops := make([]scanner.TraceHop, 0, len(t.Hops))
	for _, hop := range t.Hops {
		hops = append(hops, scanner.TraceHop(hop))
	}
	return hops
}

type nmapHop struct {
	TTL      string `xml:"ttl,attr"`
	Address  string `xml:"ipaddr,attr"`
	Hostname string `xml:"host,attr"`
	RTT      string `xml:"rtt,attr"`
}

type nmapScripts struct {
	Scripts []nmapScript `xml:"script"`
}

func (s nmapScripts) scripts() []scanner.ScriptOutput {
	return scriptOutputs(s.Scripts)
}

func scriptOutputs(scripts []nmapScript) []scanner.ScriptOutput {
	outputs := make([]scanner.ScriptOutput, 0, len(scripts))
	for _, script := range scripts {
		outputs = append(outputs, scanner.ScriptOutput{
			ID:      script.ID,
			Output:  script.Output,
			Details: script.details(),
		})
	}
	return outputs
}

type nmapScript struct {
	ID      string
	Output  string
	Details []scanner.ScriptElement
}

func (s *nmapScript) UnmarshalXML(decoder *xml.Decoder, start xml.StartElement) error {
	s.ID = attrValue(start, "id")
	s.Output = attrValue(start, "output")
	details, err := decodeScriptChildren(decoder, start)
	if err != nil {
		return err
	}
	s.Details = details
	return nil
}

func (s nmapScript) details() []scanner.ScriptElement {
	return s.Details
}

type nmapScriptElement struct {
	Key   string `xml:"key,attr"`
	Value string `xml:",chardata"`
}

func (e nmapScriptElement) detail() scanner.ScriptElement {
	return scanner.ScriptElement{
		Kind:  "elem",
		Key:   e.Key,
		Value: strings.TrimSpace(e.Value),
	}
}

type nmapScriptTable struct {
	Key      string
	Children []scanner.ScriptElement
}

func (t *nmapScriptTable) UnmarshalXML(decoder *xml.Decoder, start xml.StartElement) error {
	t.Key = attrValue(start, "key")
	children, err := decodeScriptChildren(decoder, start)
	if err != nil {
		return err
	}
	t.Children = children
	return nil
}

func (t nmapScriptTable) detail() scanner.ScriptElement {
	return scanner.ScriptElement{
		Kind:     "table",
		Key:      t.Key,
		Children: t.Children,
	}
}

func decodeScriptChildren(decoder *xml.Decoder, start xml.StartElement) ([]scanner.ScriptElement, error) {
	var details []scanner.ScriptElement
	for {
		token, err := decoder.Token()
		if err != nil {
			if err == io.EOF {
				return nil, io.ErrUnexpectedEOF
			}
			return nil, err
		}
		switch value := token.(type) {
		case xml.StartElement:
			switch value.Name.Local {
			case "elem":
				var element nmapScriptElement
				if err := decoder.DecodeElement(&element, &value); err != nil {
					return nil, err
				}
				details = append(details, element.detail())
			case "table":
				var table nmapScriptTable
				if err := decoder.DecodeElement(&table, &value); err != nil {
					return nil, err
				}
				details = append(details, table.detail())
			default:
				if err := decoder.Skip(); err != nil {
					return nil, err
				}
			}
		case xml.EndElement:
			if value.Name == start.Name {
				return details, nil
			}
		}
	}
}

func attrValue(start xml.StartElement, name string) string {
	for _, attr := range start.Attr {
		if attr.Name.Local == name {
			return attr.Value
		}
	}
	return ""
}

type runStats struct {
	Finished finishedStats `xml:"finished"`
	Hosts    hostStats     `xml:"hosts"`
}

type finishedStats struct {
	Time    string `xml:"timestr,attr"`
	Elapsed string `xml:"elapsed,attr"`
}

type hostStats struct {
	Up    int `xml:"up,attr"`
	Down  int `xml:"down,attr"`
	Total int `xml:"total,attr"`
}
