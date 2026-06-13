export namespace platform {
	
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

}

export namespace reports {
	
	export class Port {
	    protocol?: string;
	    id?: string;
	    state?: string;
	    service?: string;
	    product?: string;
	    version?: string;
	
	    static createFrom(source: any = {}) {
	        return new Port(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.protocol = source["protocol"];
	        this.id = source["id"];
	        this.state = source["state"];
	        this.service = source["service"];
	        this.product = source["product"];
	        this.version = source["version"];
	    }
	}
	export class Host {
	    address?: string;
	    hostname?: string;
	    state?: string;
	    ports?: Port[];
	
	    static createFrom(source: any = {}) {
	        return new Host(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.address = source["address"];
	        this.hostname = source["hostname"];
	        this.state = source["state"];
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
	
	export class ScanRequest {
	    profileId: string;
	    targets: string;
	    nmapPath: string;
	    options?: ScanOptions;
	    scripts?: Script[];
	    scriptArgsFile?: string;
	
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
	        this.scriptArgsFile = source["scriptArgsFile"];
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
	    timingTemplate?: string;
	    ports?: string;
	    topPorts?: number;
	    allPorts?: boolean;
	    ipv6?: boolean;
	    osDetection?: boolean;
	    traceroute?: boolean;
	    dnsMode?: string;
	
	    static createFrom(source: any = {}) {
	        return new ScanOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timingTemplate = source["timingTemplate"];
	        this.ports = source["ports"];
	        this.topPorts = source["topPorts"];
	        this.allPorts = source["allPorts"];
	        this.ipv6 = source["ipv6"];
	        this.osDetection = source["osDetection"];
	        this.traceroute = source["traceroute"];
	        this.dnsMode = source["dnsMode"];
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
