package reports

import "testing"

func TestSummarizeNmapXMLCountsHostStatuses(t *testing.T) {
	summary, err := SummarizeNmapXML(`<nmaprun args="nmap -sn -- 192.0.2.1" startstr="Fri Jun 12 10:00:00 2026">
  <host>
    <status state="up" reason="echo-reply"/>
    <address addr="192.0.2.1" addrtype="ipv4"/>
    <hostnames><hostname name="router.example" type="PTR"/></hostnames>
    <ports>
      <port protocol="tcp" portid="22">
        <state state="open"/>
        <service name="ssh" product="OpenSSH" version="9.6" extrainfo="protocol 2.0"/>
        <script id="ssh-hostkey" output="2048 SHA256:abc (RSA)"/>
      </port>
      <port protocol="tcp" portid="80">
        <state state="closed" reason="conn-refused"/>
        <service name="http"/>
      </port>
    </ports>
    <hostscript>
      <script id="nbstat" output="NetBIOS name: ROUTER"/>
    </hostscript>
  </host>
  <host>
    <status state="down" reason="no-response"/>
    <address addr="192.0.2.2" addrtype="ipv4"/>
  </host>
  <runstats><finished timestr="Fri Jun 12 10:00:05 2026" elapsed="5.00"/></runstats>
</nmaprun>`)
	if err != nil {
		t.Fatalf("SummarizeNmapXML returned error: %v", err)
	}

	if summary.HostCount != 2 {
		t.Fatalf("HostCount = %d, want 2", summary.HostCount)
	}
	if summary.HostsUp != 1 {
		t.Fatalf("HostsUp = %d, want 1", summary.HostsUp)
	}
	if summary.HostsDown != 1 {
		t.Fatalf("HostsDown = %d, want 1", summary.HostsDown)
	}
	if summary.Args != "nmap -sn -- 192.0.2.1" {
		t.Fatalf("Args = %q", summary.Args)
	}
	if summary.ElapsedTime != "5.00" {
		t.Fatalf("ElapsedTime = %q", summary.ElapsedTime)
	}
	if len(summary.Hosts) != 2 {
		t.Fatalf("len(Hosts) = %d, want 2", len(summary.Hosts))
	}
	if summary.Hosts[0].Address != "192.0.2.1" {
		t.Fatalf("first host address = %q", summary.Hosts[0].Address)
	}
	if summary.Hosts[0].Hostname != "router.example" {
		t.Fatalf("first host hostname = %q", summary.Hosts[0].Hostname)
	}
	if summary.Hosts[1].State != "down" {
		t.Fatalf("second host state = %q", summary.Hosts[1].State)
	}
	if len(summary.Hosts[0].Ports) != 2 {
		t.Fatalf("len(first host ports) = %d, want 2", len(summary.Hosts[0].Ports))
	}
	if summary.Hosts[0].Ports[0].ID != "22" {
		t.Fatalf("first port ID = %q", summary.Hosts[0].Ports[0].ID)
	}
	if summary.Hosts[0].Ports[0].Service != "ssh" {
		t.Fatalf("first port service = %q", summary.Hosts[0].Ports[0].Service)
	}
	if summary.Hosts[0].Ports[0].Product != "OpenSSH" {
		t.Fatalf("first port product = %q", summary.Hosts[0].Ports[0].Product)
	}
	if summary.Hosts[0].Ports[0].ExtraInfo != "protocol 2.0" {
		t.Fatalf("first port extra info = %q", summary.Hosts[0].Ports[0].ExtraInfo)
	}
	if len(summary.Hosts[0].Scripts) != 1 {
		t.Fatalf("len(first host scripts) = %d, want 1", len(summary.Hosts[0].Scripts))
	}
	if summary.Hosts[0].Scripts[0].ID != "nbstat" {
		t.Fatalf("first host script ID = %q", summary.Hosts[0].Scripts[0].ID)
	}
	if summary.Hosts[0].Scripts[0].Output != "NetBIOS name: ROUTER" {
		t.Fatalf("first host script output = %q", summary.Hosts[0].Scripts[0].Output)
	}
	if len(summary.Hosts[0].Ports[0].Scripts) != 1 {
		t.Fatalf("len(first port scripts) = %d, want 1", len(summary.Hosts[0].Ports[0].Scripts))
	}
	if summary.Hosts[0].Ports[0].Scripts[0].ID != "ssh-hostkey" {
		t.Fatalf("first port script ID = %q", summary.Hosts[0].Ports[0].Scripts[0].ID)
	}
	if summary.Hosts[0].Ports[1].Reason != "conn-refused" {
		t.Fatalf("second port reason = %q", summary.Hosts[0].Ports[1].Reason)
	}
}

func TestSummarizeNmapXMLAllowsEmptyInput(t *testing.T) {
	summary, err := SummarizeNmapXML("  ")
	if err != nil {
		t.Fatalf("SummarizeNmapXML returned error: %v", err)
	}
	if summary.HostCount != 0 || summary.HostsUp != 0 || summary.HostsDown != 0 || len(summary.Hosts) != 0 {
		t.Fatalf("summary = %#v, want empty counts", summary)
	}
}

func TestSummarizeNmapXMLUsesRunStatsWhenHostsAreOmitted(t *testing.T) {
	summary, err := SummarizeNmapXML(`<nmaprun args="nmap -sn -- 127.0.0.1">
  <runstats>
    <finished timestr="Fri Jun 12 10:00:05 2026" elapsed="0.02"/>
    <hosts up="0" down="1" total="1"/>
  </runstats>
</nmaprun>`)
	if err != nil {
		t.Fatalf("SummarizeNmapXML returned error: %v", err)
	}

	if summary.HostCount != 1 {
		t.Fatalf("HostCount = %d, want 1", summary.HostCount)
	}
	if summary.HostsUp != 0 {
		t.Fatalf("HostsUp = %d, want 0", summary.HostsUp)
	}
	if summary.HostsDown != 1 {
		t.Fatalf("HostsDown = %d, want 1", summary.HostsDown)
	}
	if len(summary.Hosts) != 0 {
		t.Fatalf("len(Hosts) = %d, want 0", len(summary.Hosts))
	}
}

func TestSummarizeNmapXMLRejectsMalformedXML(t *testing.T) {
	_, err := SummarizeNmapXML("<nmaprun>")
	if err == nil {
		t.Fatal("expected error")
	}
}
