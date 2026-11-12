import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { LearnerStage } from "@discere/contracts";
import { captureDir, expect, test } from "./fixtures.js";
import { test as labTest } from "./isolated-app.js";
import { playLesson } from "./lesson-player.js";

const OUTPUT = captureDir("ui-ux/screenshots");

const VIEWPORTS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "1024", width: 1024, height: 768 },
  { label: "390", width: 390, height: 844 },
];

test.describe("learner workspace screens", () => {
  test.beforeAll(() => {
    mkdirSync(OUTPUT, { recursive: true });
  });

  /*
   * The welcome plays once per launch and then removes itself, so it is captured in isolation:
   * the clock is frozen to stop it dismissing itself mid-capture, and motion is re-enabled
   * because reduced motion skips the moment entirely — correct behaviour, and unphotographable.
   * Freezing time breaks anything that waits, so this must not share a test with other screens.
   */
  for (const viewport of VIEWPORTS) {
    test(`captures the welcome at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.clock.install();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Skip the welcome" })).toBeVisible();
      await page.screenshot({
        path: join(OUTPUT, `welcome-${viewport.label}.png`),
        fullPage: false,
        // Freezes the draw-in at its finished state rather than catching it part-way.
        animations: "disabled",
      });
    });
  }
});

/**
 * Every screen a learner sees, in one pass through a lesson that has each kind of stage. It runs
 * on a server of its own, so the pictures do not depend on what other tests did first.
 */
labTest.describe("learner workspace screens, through one lesson", () => {
  const COURSE = "electronics-foundations";
  const LESSON = "current-in-one-loop";
  // One picture for each kind of stage, named as the documents name them.
  const STAGE_SHOTS: Partial<Record<LearnerStage["type"], string>> = {
    explainer: "explainer",
    interactive_visual: "interactive-visual",
    quiz: "quiz",
    essay: "essay",
    review: "lesson-review",
    completion: "completion",
  };

  for (const viewport of VIEWPORTS) {
    labTest(`captures every screen at ${viewport.width}x${viewport.height}`, async ({
      page,
      request,
    }) => {
      labTest.setTimeout(120_000);
      mkdirSync(OUTPUT, { recursive: true });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      async function capture(name: string): Promise<void> {
        await page.evaluate(async () => {
          await document.fonts.ready;
          window.scrollTo(0, 0);
        });
        // A viewport capture, not a full-page stitch: the sticky header and the fixed footer
        // paint where the learner sees them, and animations are settled first.
        await page.screenshot({
          path: join(OUTPUT, `${name}-${viewport.label}.png`),
          fullPage: false,
          animations: "disabled",
        });
      }

      await page.goto("/");
      await expect(page.locator(".home-resume")).toBeVisible();
      await capture("home");
      await page.goto("/courses");
      await expect(page.locator(".course-card").first()).toBeVisible();
      await capture("courses");
      await page.goto(`/courses/${COURSE}`);
      await expect(page.locator(".roadmap-stop").first()).toBeVisible();
      await capture("course");

      const taken = new Set<string>();
      await playLesson(page, request, COURSE, LESSON, {
        onStage: async (stage) => {
          const name = STAGE_SHOTS[stage.type];
          if (!name || taken.has(name)) return;
          taken.add(name);
          if (stage.type === "completion") await expect(page.locator(".finish-stats")).toBeVisible();
          await capture(name);
        },
      });
      // The lesson holds every kind of stage the pictures are for.
      expect([...taken].sort()).toEqual(Object.values(STAGE_SHOTS).sort());

      // The working notebook, with a drawn page so the capture shows real handwriting.
      await page.goto(`/courses/${COURSE}/lessons/${LESSON}/notebook`);
      const canvas = page.getByRole("application", { name: "Working canvas" });
      await expect(canvas).toBeVisible();
      const box = (await canvas.boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.22);
      await page.mouse.down();
      for (const step of [0.2, 0.3, 0.42, 0.5])
        await page.mouse.move(box.x + box.width * step, box.y + box.height * (0.22 + step / 5));
      await page.mouse.up();
      await expect(page.locator("polyline[data-stroke-id]")).toHaveCount(1);
      const note = page.getByLabel("Typed working");
      await note.fill("I = V / R, so 5 / 100.");
      // A focused textarea paints a blinking caret, which differs between runs.
      await note.blur();
      await capture("notebook");

      await page.goto("/review");
      const start = page.getByRole("button", { name: /^(Start review|Practise early)$/ });
      await expect(start).toBeVisible();
      await capture("review-home");
      await start.click();
      await expect(page.getByRole("button", { name: "Reveal answer", exact: true })).toBeVisible();
      await capture("flashcard");

      await page.goto("/progress");
      await expect(page.getByRole("heading", { level: 1, name: "Your progress" })).toBeVisible();
      await capture("progress");
      await page.goto("/settings");
      await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
      await capture("settings");

      // The tutor is the docked workbench's Tutor tab, opened from the lesson toolbar.
      await page.goto(`/courses/${COURSE}/lessons/${LESSON}`);
      await page
        .getByRole("toolbar", { name: "Lesson tools" })
        .getByRole("button", { name: "Tutor", exact: true })
        .click();
      await expect(page.getByRole("complementary", { name: "Lesson workbench" })).toBeVisible();
      await capture("tutor-panel");
    });
  }
});
