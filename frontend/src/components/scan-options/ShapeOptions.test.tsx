import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { defaultScanOptions, type ScanOptions } from "../../core/scan-options";
import { ShapeOptions } from "./ShapeOptions";

function Wrapper({ initial = defaultScanOptions }: { initial?: ScanOptions }): React.JSX.Element {
  const [options, setOptions] = useState<ScanOptions>(initial);
  return (
    <ShapeOptions
      scanOptions={options}
      onChange={(updater) => setOptions((current) => updater(current))}
    />
  );
}

describe("ShapeOptions", () => {
  it("renders scan technique selector with default value", () => {
    render(<Wrapper />);

    const select = screen.getByLabelText("Scan technique");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue(defaultScanOptions.scanTechnique);
  });

  it("updates scanTechnique when user selects a new technique", () => {
    render(<Wrapper />);

    fireEvent.change(screen.getByLabelText("Scan technique"), { target: { value: "udp" } });

    expect(screen.getByLabelText("Scan technique")).toHaveValue("udp");
  });

  it("disables discovery probe fields when discoveryMode is skip", () => {
    render(<Wrapper initial={{ ...defaultScanOptions, discoveryMode: "skip" }} />);

    expect(screen.getByLabelText("TCP SYN probe ports")).toBeDisabled();
    expect(screen.getByLabelText("TCP ACK probe ports")).toBeDisabled();
    expect(screen.getByLabelText("UDP probe ports")).toBeDisabled();
    expect(screen.getByLabelText("SCTP INIT probe ports")).toBeDisabled();
  });

  it("clears discovery probe values when host discovery changes to skip", () => {
    render(<Wrapper initial={{ ...defaultScanOptions, tcpSynProbes: "22,80" }} />);

    expect(screen.getByLabelText("TCP SYN probe ports")).toHaveValue("22,80");

    fireEvent.change(screen.getByLabelText("Host discovery"), { target: { value: "skip" } });

    expect(screen.getByLabelText("TCP SYN probe ports")).toHaveValue("");
    expect(screen.getByLabelText("TCP SYN probe ports")).toBeDisabled();
  });

  it("disables DNS servers field when dnsMode is skip", () => {
    render(<Wrapper initial={{ ...defaultScanOptions, dnsMode: "skip" }} />);

    expect(screen.getByLabelText("DNS servers")).toBeDisabled();
  });

  it("renders target scope inputs", () => {
    render(<Wrapper />);

    expect(screen.getByLabelText("Target input file")).toBeInTheDocument();
    expect(screen.getByLabelText("Exclude targets")).toBeInTheDocument();
    expect(screen.getByLabelText("Exclude file")).toBeInTheDocument();
  });

  it("updates targetInputFile when user types a value", () => {
    render(<Wrapper />);

    fireEvent.change(screen.getByLabelText("Target input file"), {
      target: { value: "/Users/me/targets.txt" },
    });

    expect(screen.getByLabelText("Target input file")).toHaveValue("/Users/me/targets.txt");
  });
});
