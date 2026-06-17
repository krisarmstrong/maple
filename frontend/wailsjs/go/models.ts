export namespace platform {

	export class ToolDetection {
	    name: string;
	    displayName: string;
	    required: boolean;
	    installed: boolean;
	    path?: string;
	    version?: string;
	    error?: string;
	    installHint?: string;

	    static createFrom(source: any = {}) {
	        return new ToolDetection(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.displayName = source["displayName"];
	        this.required = source["required"];
	        this.installed = source["installed"];
	        this.path = source["path"];
	        this.version = source["version"];
	        this.error = source["error"];
	        this.installHint = source["installHint"];
	    }
	}
	export class ToolHelp {
	    path: string;
	    output: string;

	    static createFrom(source: any = {}) {
	        return new ToolHelp(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.output = source["output"];
	    }
	}

}

export namespace version {

	export class Info {
	    version: string;
	    commit: string;
	    buildTime: string;
	    uiBuildHash: string;

	    static createFrom(source: any = {}) {
	        return new Info(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.commit = source["commit"];
	        this.buildTime = source["buildTime"];
	        this.uiBuildHash = source["uiBuildHash"];
	    }
	}

}

export namespace reports {

	export class ExtraPorts {
	    state?: string;
	    count?: number;
	    reason?: string;

	    static createFrom(source: any = {}) {
	        return new ExtraPorts(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.state = source["state"];
	        this.count = source["count"];
	        this.reason = source["reason"];
	    }
	}
	export class Port {
	    protocol?: string;
	    id?: string;
	    state?: string;
	    reason?: string;
	    service?: string;
	    product?: string;
	    version?: string;
	    extraInfo?: string;
	    cpes?: string[];
	    scripts?: ScriptOutput[];

	    static createFrom(source: any = {}) {
	        return new Port(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.protocol = source["protocol"];
	        this.id = source["id"];
	        this.state = source["state"];
	        this.reason = source["reason"];
	        this.service = source["service"];
	        this.product = source["product"];
	        this.version = source["version"];
	        this.extraInfo = source["extraInfo"];
	        this.cpes = source["cpes"];
	        this.scripts = this.convertValues(source["scripts"], ScriptOutput);
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ScriptElement {
	    kind?: string;
	    key?: string;
	    value?: string;
	    children?: ScriptElement[];

	    static createFrom(source: any = {}) {
	        return new ScriptElement(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.key = source["key"];
	        this.value = source["value"];
	        this.children = this.convertValues(source["children"], ScriptElement);
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ScriptOutput {
	    id?: string;
	    output?: string;
	    details?: ScriptElement[];

	    static createFrom(source: any = {}) {
	        return new ScriptOutput(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.output = source["output"];
	        this.details = this.convertValues(source["details"], ScriptElement);
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TraceHop {
	    ttl?: string;
	    address?: string;
	    hostname?: string;
	    rtt?: string;

	    static createFrom(source: any = {}) {
	        return new TraceHop(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ttl = source["ttl"];
	        this.address = source["address"];
	        this.hostname = source["hostname"];
	        this.rtt = source["rtt"];
	    }
	}
	export class OSMatch {
	    name?: string;
	    accuracy?: string;

	    static createFrom(source: any = {}) {
	        return new OSMatch(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.accuracy = source["accuracy"];
	    }
	}
	export class Host {
	    address?: string;
	    hostname?: string;
	    state?: string;
	    osMatches?: OSMatch[];
	    extraPorts?: ExtraPorts[];
	    trace?: TraceHop[];
	    scripts?: ScriptOutput[];
	    ports?: Port[];

	    static createFrom(source: any = {}) {
	        return new Host(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.address = source["address"];
	        this.hostname = source["hostname"];
	        this.state = source["state"];
	        this.osMatches = this.convertValues(source["osMatches"], OSMatch);
	        this.extraPorts = this.convertValues(source["extraPorts"], ExtraPorts);
	        this.trace = this.convertValues(source["trace"], TraceHop);
	        this.scripts = this.convertValues(source["scripts"], ScriptOutput);
	        this.ports = this.convertValues(source["ports"], Port);
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}




	export class Summary {
	    args?: string;
	    startedAt?: string;
	    finishedAt?: string;
	    elapsedTime?: string;
	    hostCount: number;
	    hostsUp: number;
	    hostsDown: number;
	    hosts?: Host[];

	    static createFrom(source: any = {}) {
	        return new Summary(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.args = source["args"];
	        this.startedAt = source["startedAt"];
	        this.finishedAt = source["finishedAt"];
	        this.elapsedTime = source["elapsedTime"];
	        this.hostCount = source["hostCount"];
	        this.hostsUp = source["hostsUp"];
	        this.hostsDown = source["hostsDown"];
	        this.hosts = this.convertValues(source["hosts"], Host);
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace scanner {

	export class Profile {
	    id: string;
	    name: string;
	    description: string;
	    args: string[];

	    static createFrom(source: any = {}) {
	        return new Profile(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.args = source["args"];
	    }
	}
	export class Target {
	    value: string;
	    kind: string;

	    static createFrom(source: any = {}) {
	        return new Target(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.value = source["value"];
	        this.kind = source["kind"];
	    }
	}
	export class CommandPreview {
	    executable: string;
	    args: string[];
	    targets: Target[];
	    profile: Profile;

	    static createFrom(source: any = {}) {
	        return new CommandPreview(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.executable = source["executable"];
	        this.args = source["args"];
	        this.targets = this.convertValues(source["targets"], Target);
	        this.profile = this.convertValues(source["profile"], Profile);
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

	export class ScanOptions {
	    scanTechnique?: string;
	    discoveryMode?: string;
	    tcpSynProbes?: string;
	    tcpAckProbes?: string;
	    udpProbes?: string;
	    sctpInitProbes?: string;
	    icmpEchoProbe?: boolean;
	    icmpTimestamp?: boolean;
	    icmpNetmask?: boolean;
	    targetInputFile?: string;
	    excludeTargets?: string;
	    excludeFile?: string;
	    timingTemplate?: string;
	    ports?: string;
	    topPorts?: number;
	    allPorts?: boolean;
	    serviceDetection?: boolean;
	    versionMode?: string;
	    versionIntensity?: string;
	    ipv6?: boolean;
	    osDetection?: boolean;
	    traceroute?: boolean;
	    dnsMode?: string;
	    dnsServers?: string;
	    verbosityMode?: string;
	    reason?: boolean;
	    openOnly?: boolean;
	    minRate?: number;
	    maxRate?: number;
	    maxRetries?: string;
	    hostTimeout?: string;
	    maxRttTimeout?: string;
	    statsEvery?: string;
	    scanDelay?: string;
	    maxScanDelay?: string;
	    minHostGroup?: number;
	    maxHostGroup?: number;
	    minParallelism?: number;
	    maxParallelism?: number;
	    fragmentPackets?: boolean;
	    mtu?: number;
	    dataLength?: number;
	    sourcePort?: string;
	    decoys?: string;
	    sourceAddress?: string;
	    networkInterface?: string;
	    spoofMac?: string;
	    packetTrace?: boolean;

	    static createFrom(source: any = {}) {
	        return new ScanOptions(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.scanTechnique = source["scanTechnique"];
	        this.discoveryMode = source["discoveryMode"];
	        this.tcpSynProbes = source["tcpSynProbes"];
	        this.tcpAckProbes = source["tcpAckProbes"];
	        this.udpProbes = source["udpProbes"];
	        this.sctpInitProbes = source["sctpInitProbes"];
	        this.icmpEchoProbe = source["icmpEchoProbe"];
	        this.icmpTimestamp = source["icmpTimestamp"];
	        this.icmpNetmask = source["icmpNetmask"];
	        this.targetInputFile = source["targetInputFile"];
	        this.excludeTargets = source["excludeTargets"];
	        this.excludeFile = source["excludeFile"];
	        this.timingTemplate = source["timingTemplate"];
	        this.ports = source["ports"];
	        this.topPorts = source["topPorts"];
	        this.allPorts = source["allPorts"];
	        this.serviceDetection = source["serviceDetection"];
	        this.versionMode = source["versionMode"];
	        this.versionIntensity = source["versionIntensity"];
	        this.ipv6 = source["ipv6"];
	        this.osDetection = source["osDetection"];
	        this.traceroute = source["traceroute"];
	        this.dnsMode = source["dnsMode"];
	        this.dnsServers = source["dnsServers"];
	        this.verbosityMode = source["verbosityMode"];
	        this.reason = source["reason"];
	        this.openOnly = source["openOnly"];
	        this.minRate = source["minRate"];
	        this.maxRate = source["maxRate"];
	        this.maxRetries = source["maxRetries"];
	        this.hostTimeout = source["hostTimeout"];
	        this.maxRttTimeout = source["maxRttTimeout"];
	        this.statsEvery = source["statsEvery"];
	        this.scanDelay = source["scanDelay"];
	        this.maxScanDelay = source["maxScanDelay"];
	        this.minHostGroup = source["minHostGroup"];
	        this.maxHostGroup = source["maxHostGroup"];
	        this.minParallelism = source["minParallelism"];
	        this.maxParallelism = source["maxParallelism"];
	        this.fragmentPackets = source["fragmentPackets"];
	        this.mtu = source["mtu"];
	        this.dataLength = source["dataLength"];
	        this.sourcePort = source["sourcePort"];
	        this.decoys = source["decoys"];
	        this.sourceAddress = source["sourceAddress"];
	        this.networkInterface = source["networkInterface"];
	        this.spoofMac = source["spoofMac"];
	        this.packetTrace = source["packetTrace"];
	    }
	}
	export class Script {
	    kind: string;
	    value: string;

	    static createFrom(source: any = {}) {
	        return new Script(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.value = source["value"];
	    }
	}
	export class ScanRequest {
	    profileId: string;
	    targets: string;
	    nmapPath: string;
	    options?: ScanOptions;
	    scripts?: Script[];
	    scriptArgs?: string;
	    scriptArgsFile?: string;
	    elevated?: boolean;

	    static createFrom(source: any = {}) {
	        return new ScanRequest(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.profileId = source["profileId"];
	        this.targets = source["targets"];
	        this.nmapPath = source["nmapPath"];
	        this.options = this.convertValues(source["options"], ScanOptions);
	        this.scripts = this.convertValues(source["scripts"], Script);
	        this.scriptArgs = source["scriptArgs"];
	        this.scriptArgsFile = source["scriptArgsFile"];
	        this.elevated = source["elevated"];
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ScanStarted {
	    runId: string;
	    preview: CommandPreview;

	    static createFrom(source: any = {}) {
	        return new ScanStarted(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.runId = source["runId"];
	        this.preview = this.convertValues(source["preview"], CommandPreview);
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}


}

export namespace store {

	export class ScanRecord {
	    runId: string;
	    // Go type: time
	    startedAt: any;
	    // Go type: time
	    finishedAt: any;
	    preview: scanner.CommandPreview;
	    summary: reports.Summary;
	    exitCode: number;
	    xml: string;
	    xmlPath?: string;
	    diagnostics?: string;
	    error?: string;

	    static createFrom(source: any = {}) {
	        return new ScanRecord(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.runId = source["runId"];
	        this.startedAt = this.convertValues(source["startedAt"], null);
	        this.finishedAt = this.convertValues(source["finishedAt"], null);
	        this.preview = this.convertValues(source["preview"], scanner.CommandPreview);
	        this.summary = this.convertValues(source["summary"], reports.Summary);
	        this.exitCode = source["exitCode"];
	        this.xml = source["xml"];
	        this.xmlPath = source["xmlPath"];
	        this.diagnostics = source["diagnostics"];
	        this.error = source["error"];
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}
