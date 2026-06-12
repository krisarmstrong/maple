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
});
