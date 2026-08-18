import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { gotoStage, readJourney } from "./fixtures.js";

const OUTPUT = join(import.meta.dirname, "../../../docs/ui-ux/screenshots");

const VIEWPORTS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "390", width: 390, height: 844 },
];

test.describe("approved reference screens", () => {
  test.beforeAll(() => {
    mkdirSync(OUTPUT, { recursive: true });
  });

  for (const viewport of VIEWPORTS) {
    test(`captures every screen at ${viewport.width}x${viewport.height}`, async ({
      page,
      request,
    }) => {
      test.slow();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const journey = await readJourney(request);

      async function capture(name: string): Promise<void> {
        await page.waitForLoadState("networkidle");
        // Interacting with a control scrolls it into view; a reference screen starts at the top.
        await page.evaluate(() => window.scrollTo(0, 0));
        // A viewport capture, not a full-page stitch: the sticky header and the fixed drawer
        // paint where the learner actually sees them, and animations are settled first.
        await page.screenshot({
          path: join(OUTPUT, `${name}-${viewport.label}.png`),
          fullPage: false,
          animations: "disabled",
        });
      }

      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await capture("home");

      await page.goto("/courses");
      await capture("courses");

      await page.goto(`/courses/${encodeURIComponent(journey.courseId)}`);
      await capture("course");

      await gotoStage(page, journey, "explainer");
      await capture("explainer");

      await gotoStage(page, journey, "interactive_visual");
      // Change the circuit before predicting, so the captured feedback shows a real comparison
      // rather than a circuit that never moved.
      await page.getByRole("slider", { name: "Resistance" }).fill("400");
      await page.getByRole("button", { name: "Decreases" }).click();
      await page.getByRole("button", { name: "Check prediction" }).click();
      await capture("interactive-visual");

      await gotoStage(page, journey, "quiz");
      await capture("quiz");

      await gotoStage(page, journey, "essay");
      await capture("essay");

      await gotoStage(page, journey, "review");
      await capture("lesson-review");

      await gotoStage(page, journey, "completion");
      await capture("completion");

      await page.goto("/review");
      await capture("review-home");

      await page.getByRole("button", { name: /Start review|Review the earliest card/ }).click();
      await expect(page.getByText("Front")).toBeVisible();
      await capture("flashcard");

      await page.goto("/progress");
      await capture("progress");

      await gotoStage(page, journey, "explainer");
      await page.getByRole("button", { name: "Ask the tutor" }).click();
      await capture("tutor-panel");
    });
  }
});
