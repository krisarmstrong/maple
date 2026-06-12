import { describe, expect, it } from "vitest";
import { targetModeHelp, targetModePlaceholder, validateTargetsForMode } from "./target-modes";

describe("target modes", () => {
  it("validates a single host or IP target", () => {
    expect(validateTargetsForMode("single", "scanme.nmap.org")).toEqual({ ok: true });
    expect(validateTargetsForMode("single", "192.168.1.10")).toEqual({ ok: true });
    expect(validateTargetsForMode("single", "192.168.1.1-20")).toEqual({
      ok: false,
      message: "Single target mode accepts one hostname or IP address.",
    });
  });

  it("validates an IPv4 last-octet range", () => {
    expect(validateTargetsForMode("range", "192.168.1.1-20")).toEqual({ ok: true });
    expect(validateTargetsForMode("range", "192.168.1.0/24")).toEqual({
      ok: false,
      message: "IPv4 range mode expects one range like 192.168.1.1-20.",
    });
  });

  it("validates a CIDR subnet", () => {
    expect(validateTargetsForMode("subnet", "192.168.1.0/24")).toEqual({ ok: true });
    expect(validateTargetsForMode("subnet", "scanme.nmap.org")).toEqual({
      ok: false,
      message: "Subnet mode expects one CIDR target like 192.168.1.0/24.",
    });
  });

  it("allows mixed target lists only in list mode", () => {
    const mixed = "scanme.nmap.org, 192.168.1.1-20, 10.0.0.0/24";

    expect(validateTargetsForMode("list", mixed)).toEqual({ ok: true });
    expect(validateTargetsForMode("single", mixed)).toEqual({
      ok: false,
      message: "Single target mode accepts exactly one target.",
    });
  });

  it("provides mode-specific help and placeholders", () => {
    expect(targetModeHelp("range")).toBe("Scan an inclusive IPv4 last-octet range.");
    expect(targetModePlaceholder("subnet")).toBe("192.168.1.0/24");
  });
});
