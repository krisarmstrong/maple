import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { defaultScanOptions, type ScanOptions } from "../../core/scan-options";
import { PortsOptions } from "./PortsOptions";

function Wrapper({ initial = defaultScanOptions }: { initial?: ScanOptions }): React.JSX.Element {
  const [options, setOptions] = useState<ScanOptions>(initial);
  return (
    <PortsOptions
      scanOptions={options}
      onChange={(updater) => setOptions((current) => updater(current))}
    />
  );
}

describe("PortsOptions", () => {
  it("renders version detail selector with default value", () => {
    render(<Wrapper />);

    const select = screen.getByLabelText("Version detail");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue(defaultScanOptions.versionMode);
  });

  it("updates versionMode when user picks a detail level", () => {
    render(<Wrapper />);

    fireEvent.change(screen.getByLabelText("Version detail"), { target: { value: "light" } });

    expect(screen.getByLabelText("Version detail")).toHaveValue("light");
  });

  it("disables version intensity when versionMode is set", () => {
    render(<Wrapper initial={{ ...defaultScanOptions, versionMode: "all" }} />);

    expect(screen.getByLabelText("Version intensity")).toBeDisabled();
  });

  it("updates ports field when user types a value", () => {
    render(<Wrapper />);

    fireEvent.change(screen.getByRole("textbox", { name: "Ports" }), {
      target: { value: "22,80,443" },
    });

    expect(screen.getByRole("textbox", { name: "Ports" })).toHaveValue("22,80,443");
  });

  it("disables ports and top ports inputs when allPorts is checked", () => {
    render(<Wrapper initial={{ ...defaultScanOptions, allPorts: true }} />);

    expect(screen.getByRole("textbox", { name: "Ports" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Top ports" })).toBeDisabled();
  });

  it("enables allPorts and clears ports when All ports checkbox is clicked", () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByRole("checkbox", { name: "All ports" }));

    expect(screen.getByRole("checkbox", { name: "All ports" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Ports" })).toBeDisabled();
  });

  it("enables fast scan, disables port inputs, and is mutually exclusive with All ports", () => {
    render(<Wrapper initial={{ ...defaultScanOptions, allPorts: true }} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Fast scan/u }));

    expect(screen.getByRole("checkbox", { name: /Fast scan/u })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "All ports" })).not.toBeChecked();
    expect(screen.getByRole("textbox", { name: "Ports" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Top ports" })).toBeDisabled();
  });
});
