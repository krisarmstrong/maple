import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseNmapPath, detectNmapPath } from "../services/tool-service";
import { NmapPathControl } from "./NmapPathControl";

vi.mock("../services/tool-service", () => ({
  chooseNmapPath: vi.fn(),
  detectNmapPath: vi.fn(),
}));

const chooseNmapPathMock = vi.mocked(chooseNmapPath);
const detectNmapPathMock = vi.mocked(detectNmapPath);

describe("NmapPathControl", () => {
  beforeEach(() => {
    chooseNmapPathMock.mockReset();
    detectNmapPathMock.mockReset();
  });

  it("validates and saves an explicit Nmap path", async () => {
    const onPathChange = vi.fn();
    detectNmapPathMock.mockResolvedValue({
      name: "nmap",
      displayName: "Nmap",
      required: true,
      installed: true,
      path: "/custom/nmap",
      version: "Nmap version 7.99",
    });

    render(<NmapPathControl nmapPath="" onPathChange={onPathChange} />);

    await userEvent.type(screen.getByLabelText("Custom Nmap binary"), "/custom/nmap");
    await userEvent.click(screen.getByRole("button", { name: "Validate and use" }));

    expect(detectNmapPathMock).toHaveBeenCalledWith("/custom/nmap");
    expect(onPathChange).toHaveBeenCalledWith("/custom/nmap");
    expect(await screen.findByText("Nmap version 7.99")).toBeInTheDocument();
  });

  it("chooses a path before validation", async () => {
    chooseNmapPathMock.mockResolvedValue("/picked/nmap");
    detectNmapPathMock.mockResolvedValue({
      name: "nmap",
      displayName: "Nmap",
      required: true,
      installed: true,
      path: "/picked/nmap",
    });

    render(<NmapPathControl nmapPath="" onPathChange={() => undefined} />);

    await userEvent.click(screen.getByRole("button", { name: "Browse" }));

    expect(await screen.findByDisplayValue("/picked/nmap")).toBeInTheDocument();
  });

  it("does not save invalid paths", async () => {
    const onPathChange = vi.fn();
    detectNmapPathMock.mockResolvedValue({
      name: "nmap",
      displayName: "Nmap",
      required: true,
      installed: false,
      error: "unable to run Nmap at the selected path",
    });

    render(<NmapPathControl nmapPath="" onPathChange={onPathChange} />);

    await userEvent.type(screen.getByLabelText("Custom Nmap binary"), "/bad/nmap");
    await userEvent.click(screen.getByRole("button", { name: "Validate and use" }));

    expect(onPathChange).not.toHaveBeenCalled();
    expect(await screen.findByText("unable to run Nmap at the selected path")).toBeInTheDocument();
  });

  it("clears the explicit path", async () => {
    const onPathChange = vi.fn();

    render(<NmapPathControl nmapPath="/custom/nmap" onPathChange={onPathChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Use PATH detection" }));

    expect(onPathChange).toHaveBeenCalledWith("");
  });
});
