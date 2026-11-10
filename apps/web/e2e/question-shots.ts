import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect } from "./fixtures.js";

/** The two windows every question type is played in: a desk and a phone. */
export const WINDOWS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const;

/**
 * Checks that the page is no wider than its window, and saves a screenshot when `DISCERE_SHOTS`
 * names a folder: `<name>-<width>.png`, the whole page.
 */
export async function capture(page: Page, name: string): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    `${name} scrolls sideways`,
  ).toBeLessThanOrEqual(1);
  const shots = process.env["DISCERE_SHOTS"];
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({ path: join(shots, `${name}-${width}.png`), fullPage: true });
}

/** Every control a finger has to hit is at least 44 pixels each way. */
export async function expectTouchSized(
  controls: import("@playwright/test").Locator,
  what: string,
): Promise<void> {
  const sizes = await controls.evaluateAll((items) =>
    items.map((item) => {
      const box = item.getBoundingClientRect();
      return [Math.round(box.width), Math.round(box.height)];
    }),
  );
  expect(sizes.length, what).toBeGreaterThan(0);
  for (const [width, height] of sizes) {
    expect(width, `${what} width`).toBeGreaterThanOrEqual(44);
    expect(height, `${what} height`).toBeGreaterThanOrEqual(44);
  }
}

/** Starts the review and goes through the due cards until `wanted` is on screen. */
export async function openDueCard(
  page: Page,
  dueCount: number,
  wanted: import("@playwright/test").Locator,
): Promise<void> {
  await page.goto("/review");
  await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeVisible();
  await page.getByRole("button", { name: "Start review", exact: true }).click();
  for (let card = 0; card < dueCount; card += 1) {
    const reveal = page.getByRole("button", { name: "Reveal answer", exact: true });
    await expect(reveal).toBeVisible();
    if (await wanted.isVisible()) return;
    await reveal.click();
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText(/This card comes back /)).toBeVisible();
    await page.getByRole("button", { name: "Next card", exact: true }).click();
  }
  throw new Error("The card was not among those due.");
}
