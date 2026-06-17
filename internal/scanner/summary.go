package scanner

// Summary holds the parsed result of an nmap XML output document. JSON field
// tags are preserved as-is so that history.json records written by earlier
// releases (when these types lived in internal/reports) remain decodable.
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

// Host is a single host entry within a Summary.
type Host struct {
	Address    string         `json:"address,omitempty"`
	Hostname   string         `json:"hostname,omitempty"`
	State      string         `json:"state,omitempty"`
	OSMatches  []OSMatch      `json:"osMatches,omitempty"`
	ExtraPorts []ExtraPorts   `json:"extraPorts,omitempty"`
	Trace      []TraceHop     `json:"trace,omitempty"`
	Scripts    []ScriptOutput `json:"scripts,omitempty"`
	Ports      []Port         `json:"ports,omitempty"`
}

// Port is a single port entry within a Host.
type Port struct {
	Protocol  string         `json:"protocol,omitempty"`
	ID        string         `json:"id,omitempty"`
	State     string         `json:"state,omitempty"`
	Reason    string         `json:"reason,omitempty"`
	Service   string         `json:"service,omitempty"`
	Product   string         `json:"product,omitempty"`
	Version   string         `json:"version,omitempty"`
	ExtraInfo string         `json:"extraInfo,omitempty"`
	CPEs      []string       `json:"cpes,omitempty"`
	Scripts   []ScriptOutput `json:"scripts,omitempty"`
}

// ScriptOutput holds the parsed output of an nmap script.
type ScriptOutput struct {
	ID      string          `json:"id,omitempty"`
	Output  string          `json:"output,omitempty"`
	Details []ScriptElement `json:"details,omitempty"`
}

// ScriptElement is a single element or table node within a ScriptOutput.
type ScriptElement struct {
	Kind     string          `json:"kind,omitempty"`
	Key      string          `json:"key,omitempty"`
	Value    string          `json:"value,omitempty"`
	Children []ScriptElement `json:"children,omitempty"`
}

// OSMatch is a single OS detection match within a Host.
type OSMatch struct {
	Name     string `json:"name,omitempty"`
	Accuracy string `json:"accuracy,omitempty"`
}

// ExtraPorts summarises a group of ports that nmap collapsed into a single
// "extra ports" entry.
type ExtraPorts struct {
	State  string `json:"state,omitempty"`
	Count  int    `json:"count,omitempty"`
	Reason string `json:"reason,omitempty"`
}

// TraceHop is a single hop in a traceroute recorded for a Host.
type TraceHop struct {
	TTL      string `json:"ttl,omitempty"`
	Address  string `json:"address,omitempty"`
	Hostname string `json:"hostname,omitempty"`
	RTT      string `json:"rtt,omitempty"`
}
