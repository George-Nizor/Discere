import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { captureDir, expect, test } from "./fixtures.js";

const output = captureDir("library-expansion/screens");
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];

async function capture(page: Page, name: string) {
  mkdirSync(output, { recursive: true });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.allSettled(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished),
      );
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: join(output, name + "-" + viewport.width + "x" + viewport.height + ".png"),
      fullPage: true,
    });
  }
}
test("the library filters, survives refresh and respects both motion settings", async ({
  page,
}) => {
  await page.goto("/courses");
  await expect(page.getByRole("searchbox")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".course-card")
        .first()
        .evaluate((card) => getComputedStyle(card).animationName),
    )
    .toBe("none");
  await capture(page, "library-reduced");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(page.getByRole("searchbox")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".course-card")
        .first()
        .evaluate((card) => getComputedStyle(card).animationName),
    )
    .toBe("discere-rise");
  await capture(page, "library-motion");
  // capture() ends at phone width, where the subject chips become one Subject select (app
  // audit m3); the chips are the desktop control.
  await expect(page.getByRole("combobox", { name: "Subject" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Filter by subject" })).toBeHidden();
  await page.setViewportSize(viewports[0]!);
  await page.getByRole("button", { name: "Mathematics", exact: true }).click();
  await page.getByRole("searchbox").fill("probability");
  await expect(
    page.locator(".course-card").filter({ hasText: "Probability and Statistics" }),
  ).toBeVisible();
  await expect(page.locator(".course-card")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue("probability");
  await expect(page.getByRole("button", { name: "Mathematics", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.setViewportSize(viewports[2]!);
  await expect(page.getByRole("combobox", { name: "Subject" })).toHaveValue("Mathematics");
  await page.setViewportSize(viewports[0]!);
  await page.getByRole("searchbox").fill("zzqqx");
  await expect(page.getByRole("heading", { name: "Nothing matches that search" })).toBeVisible();
  await page.getByRole("button", { name: "Show all courses" }).click();
  await expect(
    page.locator(".course-card").filter({ hasText: "Probability and Statistics" }),
  ).toBeVisible();
});
