import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolStatusList } from "./ToolStatusList";

describe("ToolStatusList", () => {
  it("renders detected tool details", () => {
    render(
      <ToolStatusList
        tools={[
          {
            name: "nmap",
            displayName: "Nmap",
            required: true,
            installed: true,
            version: "Nmap version 7.95",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Nmap" })).toBeInTheDocument();
    expect(screen.getByText("Nmap version 7.95")).toBeInTheDocument();
    expect(screen.getByText("Detected")).toBeInTheDocument();
  });

  it("shows install guidance for missing required tools", () => {
    render(
      <ToolStatusList
        tools={[
          {
            name: "nmap",
            displayName: "Nmap",
            required: true,
            installed: false,
            error: "executable file not found in PATH",
            installHint: "Install Nmap separately and make sure it is available on PATH.",
          },
        ]}
      />,
    );

    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText("executable file not found in PATH")).toBeInTheDocument();
    expect(
      screen.getByText("Install Nmap separately and make sure it is available on PATH."),
    ).toBeInTheDocument();
  });

  it("does not show install guidance for detected tools", () => {
    render(
      <ToolStatusList
        tools={[
          {
            name: "nmap",
            displayName: "Nmap",
            required: true,
            installed: true,
            version: "Nmap version 7.95",
            installHint: "Install Nmap separately and make sure it is available on PATH.",
          },
        ]}
      />,
    );

    expect(
      screen.queryByText("Install Nmap separately and make sure it is available on PATH."),
    ).not.toBeInTheDocument();
  });
});
