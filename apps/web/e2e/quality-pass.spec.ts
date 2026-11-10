import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { captureDir, expect, test } from "./fixtures.js";
const output = captureDir("quality-pass/screens");
const sizes = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
function contrast(foreground: string, background: string) {
  const luminance = (colour: string) => {
    const rgb = colour
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map((v) => Number(v) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  };
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
let server: DiscereApp, address: string, directory: string;
test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-quality-browser-"));
  server = await createApp({
    dbPath: join(directory, "quality.sqlite"),
    migrate: true,
    tutor: { providerId: "mock" },
    webRoot: join(import.meta.dirname, "../dist"),
  });
  address = await server.app.listen({ host: "127.0.0.1", port: 0 });
});
test.afterAll(async () => {
  await server?.app.close();
  if (directory && directory.startsWith(join(tmpdir(), "discere-quality-browser-")))
    rmSync(directory, { recursive: true, force: true });
});
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("discere:welcomed", "1"));
});
async function capture(page: Page, name: string) {
  mkdirSync(output, { recursive: true });
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: join(output, name + "-" + size.width + ".png"),
      fullPage: true,
      animations: "disabled",
    });
  }
}
test("Settings failures remain recoverable and practice preferences keep working", async ({
  page,
}) => {
  await page.route("**/api/tutor/status", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Temporary tutor status failure" }),
    }),
  );
  await page.route("**/api/capabilities", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Temporary availability failure" }),
    }),
  );
  await page.goto(address + "/settings");
  await expect(page.getByText("Tutor status unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("Availability could not be checked", { exact: true })).toBeVisible();
  const goal = page.getByRole("radio", { name: "10 responses a day, Focused" });
  const goalSaved = page.waitForResponse(
    (r) => r.url().endsWith("/api/study/preferences") && r.request().method() === "PUT",
  );
  await goal.click();
  expect((await goalSaved).ok()).toBe(true);
  await expect(goal).toBeChecked();
  await page.reload();
  await expect(goal).toBeChecked();
  await expect(page.getByText("Tutor status unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("Availability could not be checked", { exact: true })).toBeVisible();
  await page.unroute("**/api/tutor/status");
  await page.unroute("**/api/capabilities");
  await page.getByRole("button", { name: "Retry tutor status", exact: true }).click();
  await page.getByRole("button", { name: "Check availability again", exact: true }).click();
  await expect(page.getByText("Offline practice", { exact: true })).toBeVisible();
  await expect(page.getByText("Availability could not be checked", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Send a live test request" })).toHaveCount(0);
  // The offline tutor makes no model request, so there is no test control to offer.
  await expect(page.getByRole("button", { name: /test/i })).toHaveCount(0);
  const colours = await page
    .getByRole("combobox", { name: "Motion", exact: true })
    .evaluate((select) => ({
      foreground: getComputedStyle(select).color,
      background: getComputedStyle(select).backgroundColor,
    }));
  expect(contrast(colours.foreground, colours.background)).toBeGreaterThanOrEqual(4.5);
  await capture(page, "settings");
});
