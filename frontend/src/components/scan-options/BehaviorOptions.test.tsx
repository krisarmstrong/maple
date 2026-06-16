import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { defaultScanOptions, type ScanOptions } from "../../core/scan-options";
import { BehaviorOptions } from "./BehaviorOptions";

function Wrapper({ initial = defaultScanOptions }: { initial?: ScanOptions }): React.JSX.Element {
  const [options, setOptions] = useState<ScanOptions>(initial);
  return (
    <BehaviorOptions
      scanOptions={options}
      onChange={(updater) => setOptions((current) => updater(current))}
    />
  );
}

describe("BehaviorOptions", () => {
  it("renders all behavior checkboxes unchecked by default", () => {
    render(<Wrapper />);

    expect(screen.getByRole("checkbox", { name: "OS detection" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Traceroute" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "IPv6" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Service detection" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Packet trace" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Only open ports" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Show reasons" })).not.toBeChecked();
  });

  it("toggles osDetection on when checkbox is clicked", () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByRole("checkbox", { name: "OS detection" }));

    expect(screen.getByRole("checkbox", { name: "OS detection" })).toBeChecked();
  });

  it("toggles packetTrace on when checkbox is clicked", () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Packet trace" }));

    expect(screen.getByRole("checkbox", { name: "Packet trace" })).toBeChecked();
  });

  it("turns off serviceDetection when unchecked", () => {
    render(
      <Wrapper initial={{ ...defaultScanOptions, serviceDetection: true, versionMode: "light" }} />,
    );

    expect(screen.getByRole("checkbox", { name: "Service detection" })).toBeChecked();

    fireEvent.click(screen.getByRole("checkbox", { name: "Service detection" }));

    expect(screen.getByRole("checkbox", { name: "Service detection" })).not.toBeChecked();
  });

  it("disables ICMP probe checkboxes when discoveryMode is skip", () => {
    render(<Wrapper initial={{ ...defaultScanOptions, discoveryMode: "skip" }} />);

    expect(screen.getByRole("checkbox", { name: "ICMP echo probe" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "ICMP timestamp probe" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "ICMP netmask probe" })).toBeDisabled();
  });

  it("toggles IPv6 on when checkbox is clicked", () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByRole("checkbox", { name: "IPv6" }));

    expect(screen.getByRole("checkbox", { name: "IPv6" })).toBeChecked();
  });
});
