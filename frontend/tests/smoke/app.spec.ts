import { expect, type Page, test } from "@playwright/test";

test.describe("Maple browser smoke", () => {
  test("loads the workbench shell with system theme as default", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Modern Nmap workbench" })).toBeVisible();
    await expect(page.getByText("Local desktop", { exact: true })).toBeVisible();
    await expect(page.getByText("Release candidate")).toBeVisible();
    await expect(page.getByText("argv-only execution")).toBeVisible();
    await expect(page.getByRole("radio", { name: "System" })).toBeChecked();
  });

  test("renders primary workspaces without horizontal overflow", async ({ page }) => {
    await page.goto("/");

    await assertNoHorizontalOverflow(page);
    await page.getByRole("tab", { name: "Options" }).click();
    await expect(page.getByRole("heading", { name: "Nmap options" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.getByRole("tab", { name: "Scripts" }).click();
    await expect(page.getByRole("heading", { name: "NSE scripts" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.getByRole("tab", { name: "Output" }).click();
    await expect(page.getByRole("heading", { name: "Preview argv" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("keeps target setup usable at tablet width", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/");

    await assertNoHorizontalOverflow(page);
    await expect(page.getByRole("heading", { name: "Targets" })).toBeVisible();
    const targetWidth = await page
      .getByLabel("Targets")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(targetWidth).toBeGreaterThan(300);
  });

  test("shows target summaries for every target shape", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Targets" })).toBeVisible();
    await expect(page.getByText("One hostname, IPv4 address, or IPv6 address.")).toBeVisible();
    await page.getByLabel("Target shape").selectOption("range");
    await expect(page.getByText("One IPv4 last-octet range like 192.168.1.1-20.")).toBeVisible();
    await page.getByLabel("Target shape").selectOption("subnet");
    await expect(page.getByText("One IPv4 or IPv6 CIDR subnet.")).toBeVisible();
    await page.getByLabel("Target shape").selectOption("list");
    await expect(page.getByText(/Hostnames, IPs, CIDR subnets/u)).toBeVisible();
  });

  test("keeps no-bundled-tools guidance visible in environment and help", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Environment/u }).click();
    await expect(page.getByText("Maple uses locally installed Nmap tools")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Custom Nmap Binary" })).toBeVisible();
    await expect(page.getByLabel("Custom Nmap binary")).toBeVisible();
    await page.getByRole("button", { name: "Help" }).click();
    await expect(page.getByText(/Maple does not bundle or redistribute Nmap/u)).toBeVisible();
    await expect(page.getByText(/Windows packet scans may require Npcap/u)).toBeVisible();
  });
});

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
}
