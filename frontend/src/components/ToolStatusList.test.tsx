import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openNmapDownloads } from "../services/tool-service";
import { ToolStatusList } from "./ToolStatusList";

vi.mock("../services/tool-service", () => ({
  openNmapDownloads: vi.fn(),
}));

const openNmapDownloadsMock = vi.mocked(openNmapDownloads);

describe("ToolStatusList", () => {
  beforeEach(() => {
    openNmapDownloadsMock.mockReset();
    openNmapDownloadsMock.mockResolvedValue(undefined);
  });

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
    expect(
      screen.getByRole("button", { name: "Open official Nmap downloads" }),
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
    expect(
      screen.queryByRole("button", { name: "Open official Nmap downloads" }),
    ).not.toBeInTheDocument();
  });

  it("opens the official Nmap downloads page for missing Nmap", async () => {
    render(
      <ToolStatusList
        tools={[
          {
            name: "nmap",
            displayName: "Nmap",
            required: true,
            installed: false,
          },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open official Nmap downloads" }));

    expect(openNmapDownloadsMock).toHaveBeenCalledTimes(1);
  });

  it("reports download page open failures", async () => {
    const onError = vi.fn();
    openNmapDownloadsMock.mockRejectedValue(new Error("Maple desktop bridge is unavailable."));
    render(
      <ToolStatusList
        onError={onError}
        tools={[
          {
            name: "nmap",
            displayName: "Nmap",
            required: true,
            installed: false,
          },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open official Nmap downloads" }));

    expect(onError).toHaveBeenCalledWith("Maple desktop bridge is unavailable.");
  });

  it("shows a version warning when nmap is older than the minimum", () => {
    render(
      <ToolStatusList
        tools={[
          {
            name: "nmap",
            displayName: "Nmap",
            required: true,
            installed: true,
            version: "Nmap version 7.70 ( https://nmap.org )",
            belowMinVersion: true,
            minVersion: "7.80",
          },
        ]}
      />,
    );

    const warning = screen.getByTestId("nmap-version-warning");
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent(
      "Nmap version 7.70 ( https://nmap.org ) is older than the recommended minimum 7.80; some scan options or scripts may not work.",
    );
  });

  it("does not show a version warning when nmap meets the minimum", () => {
    render(
      <ToolStatusList
        tools={[
          {
            name: "nmap",
            displayName: "Nmap",
            required: true,
            installed: true,
            version: "Nmap version 7.95 ( https://nmap.org )",
            belowMinVersion: false,
            minVersion: "7.80",
          },
        ]}
      />,
    );

    expect(screen.queryByTestId("nmap-version-warning")).not.toBeInTheDocument();
  });

  it("does not show a version warning when version intel fields are absent", () => {
    render(
      <ToolStatusList
        tools={[
          {
            name: "nmap",
            displayName: "Nmap",
            required: true,
            installed: true,
            version: "Nmap version 7.95 ( https://nmap.org )",
          },
        ]}
      />,
    );

    expect(screen.queryByTestId("nmap-version-warning")).not.toBeInTheDocument();
  });
});
