package reports

import (
	"encoding/xml"
	"strings"
)

type Summary struct {
	Args        string `json:"args,omitempty"`
	StartedAt   string `json:"startedAt,omitempty"`
	FinishedAt  string `json:"finishedAt,omitempty"`
	ElapsedTime string `json:"elapsedTime,omitempty"`
	HostCount   int    `json:"hostCount"`
	HostsUp     int    `json:"hostsUp"`
	HostsDown   int    `json:"hostsDown"`
	Hosts       []Host `json:"hosts,omitempty"`
}

type Host struct {
	Address  string         `json:"address,omitempty"`
	Hostname string         `json:"hostname,omitempty"`
	State    string         `json:"state,omitempty"`
	Scripts  []ScriptOutput `json:"scripts,omitempty"`
	Ports    []Port         `json:"ports,omitempty"`
}

type Port struct {
	Protocol  string         `json:"protocol,omitempty"`
	ID        string         `json:"id,omitempty"`
	State     string         `json:"state,omitempty"`
	Reason    string         `json:"reason,omitempty"`
	Service   string         `json:"service,omitempty"`
	Product   string         `json:"product,omitempty"`
	Version   string         `json:"version,omitempty"`
	ExtraInfo string         `json:"extraInfo,omitempty"`
	Scripts   []ScriptOutput `json:"scripts,omitempty"`
}

type ScriptOutput struct {
	ID     string `json:"id,omitempty"`
	Output string `json:"output,omitempty"`
}

func SummarizeNmapXML(input string) (Summary, error) {
	if strings.TrimSpace(input) == "" {
		return Summary{}, nil
	}

	var document nmapRun
	if err := xml.Unmarshal([]byte(input), &document); err != nil {
		return Summary{}, err
	}

	summary := Summary{
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
		summary.Hosts = append(summary.Hosts, Host{
			Address:  host.primaryAddress(),
			Hostname: host.primaryHostname(),
			State:    host.Status.State,
			Scripts:  host.HostScripts.scripts(),
			Ports:    host.ports(),
		})
	}
	return summary, nil
}

func countHostState(state string, summary *Summary) {
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

func (h nmapHost) ports() []Port {
	ports := make([]Port, 0, len(h.Ports.Ports))
	for _, port := range h.Ports.Ports {
		ports = append(ports, Port{
			Protocol:  port.Protocol,
			ID:        port.ID,
			State:     port.State.State,
			Reason:    port.State.Reason,
			Service:   port.Service.Name,
			Product:   port.Service.Product,
			Version:   port.Service.Version,
			ExtraInfo: port.Service.ExtraInfo,
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
	Ports []nmapPort `xml:"port"`
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
	Name      string `xml:"name,attr"`
	Product   string `xml:"product,attr"`
	Version   string `xml:"version,attr"`
	ExtraInfo string `xml:"extrainfo,attr"`
}

type nmapScripts struct {
	Scripts []nmapScript `xml:"script"`
}

func (s nmapScripts) scripts() []ScriptOutput {
	return scriptOutputs(s.Scripts)
}

func scriptOutputs(scripts []nmapScript) []ScriptOutput {
	outputs := make([]ScriptOutput, 0, len(scripts))
	for _, script := range scripts {
		outputs = append(outputs, ScriptOutput{ID: script.ID, Output: script.Output})
	}
	return outputs
}

type nmapScript struct {
	ID     string `xml:"id,attr"`
	Output string `xml:"output,attr"`
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
