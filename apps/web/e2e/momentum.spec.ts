import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";

const OUTPUT = join(import.meta.dirname, "../../../docs/gamification/implementation-screens");
const sizes = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
test.use({ video: { mode: "on", size: { width: 1440, height: 900 } } });
async function capture(page: Page, name: string) {
  mkdirSync(OUTPUT, { recursive: true });
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
      path: join(OUTPUT, `${name}-${size.width}x${size.height}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
}
async function numeric(page: Page, value: string) {
  await expect(page.getByLabel("Value", { exact: true })).toHaveValue("");
  await page.getByLabel("Value", { exact: true }).fill(value);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
}

test("earned rewards animate, stay responsive, and survive a completion reload", async ({
  page,
  request,
}) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => sessionStorage.setItem("discere:welcomed", "1"));
  await request.put("/api/study/preferences", {
    data: { motion: "system", celebrations: true, sound: false },
  });
  await page.setViewportSize(sizes[0]!);
  await page.goto("/courses/maths-foundations/lessons/keeping-the-balance");
  await expect(page.getByText("Two sides change together", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Lesson progress" })).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await page.getByRole("button", { name: /Subtract 6 only from the left side/ }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".answer-feedback.is-retry")).toBeVisible();
  await capture(page, "answer-retry");
  // A first miss keeps the answer open (audit B3); the worked answer is on request.
  await page.getByRole("button", { name: "Show the answer", exact: true }).click();
  await expect(page.locator(".beat-explanation")).toBeVisible();
  await expect(page.getByRole("button", { name: /Subtract 6 from both sides/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("progressbar", { name: "Lesson progress" })).toHaveAttribute(
    "aria-valuenow",
    "13",
  );
  for (const [index, value] of ["6", "5", "-2"].entries()) {
    await numeric(page, value);
    if (index === 0) {
      await expect(page.locator(".answer-feedback.is-correct")).toBeVisible();
      await expect
        .poll(() =>
          page.locator(".answer-feedback").evaluate((el) => getComputedStyle(el).animationDuration),
        )
        .toBe("0.45s"); // The game layer's rising, glowing frame (styles/game.css).
      await capture(page, "answer-earned");
    }
    await page
      .getByRole("button", { name: index === 2 ? "Finish" : "Continue", exact: true })
      .click();
  }
  await numeric(page, "5");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Your answer", { exact: true })
    .fill("The two equal sides have the same amount removed.");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Start the review", exact: true }).click();
  for (const [index, response] of ["3", "0"].entries()) {
    await page.getByLabel("Your answer", { exact: true }).fill(response);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reveal answer", exact: true })).toHaveCount(0);
    if (index === 0) await capture(page, "recall-reveal");
    await page.getByRole("button", { name: /^Good/ }).click();
    await page
      .getByRole("button", { name: index === 0 ? "Next card" : "Continue", exact: true })
      .click();
  }
  await expect(page.locator(".lesson-award.is-celebrating")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Start Undoing/ })).toBeEnabled();
  await expect(page.locator(".award-particles i")).toHaveCount(14);
  await expect(page.getByRole("progressbar", { name: "Lesson progress" })).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  const result = await (
    await request.get("/api/courses/maths-foundations/lessons/keeping-the-balance/result")
  ).json();
  expect(result).toMatchObject({
    completed: true,
    answered: 6,
    independent: 5,
    assisted: 1,
    reviews: 2,
  });
  // "Lesson XP" in the finish stats counts up to the server's total.
  await expect(
    page.locator(".finish-stats > div").filter({ hasText: "Lesson XP" }).locator("dd"),
  ).toHaveText(String(result.xp));
  await capture(page, "lesson-finish");
  const xpBefore = (await (await request.get("/api/home")).json()).xp;
  await page.reload();
  // The finish screen's static award (the medallion now gives way to the mascot) and verdict.
  await expect(page.locator(".lesson-award")).toBeAttached();
  await expect(page.locator(".finish-verdict")).toBeVisible();
  await expect(page.locator(".is-celebrating")).toHaveCount(0);
  // "Lesson XP" in the finish stats counts up to the server's total.
  await expect(
    page.locator(".finish-stats > div").filter({ hasText: "Lesson XP" }).locator("dd"),
  ).toHaveText(String(result.xp));
  expect((await (await request.get("/api/home")).json()).xp).toBe(xpBefore);
});

test("practice preferences persist and reduced motion stops every learner animation", async ({
  page,
  request,
}) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: /^3 responses/ }).click();
  await expect(page.getByRole("radio", { name: /^3 responses/ })).toBeChecked();
  await expect(page.getByRole("status", { name: "" }).filter({ hasText: "Saved" })).toBeVisible();
  await page.getByRole("combobox", { name: "Motion" }).selectOption("reduced");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset["motion"]))
    .toBe("reduced");
  await page.reload();
  await expect(page.getByRole("radio", { name: /^3 responses/ })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Motion" })).toHaveValue("reduced");
  await capture(page, "practice-settings");
  await page.goto(
    "/courses/maths-foundations/lessons/keeping-the-balance/stages/keeping-the-balance:completion",
  );
  await expect(page.locator(".lesson-award")).toBeAttached();
  await expect(page.locator(".finish-verdict")).toBeVisible();
  const moving = await page
    .locator("main")
    .evaluate(
      (main) =>
        [...main.querySelectorAll("*")].filter(
          (element) => getComputedStyle(element).animationName !== "none",
        ).length,
    );
  expect(moving).toBe(0);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today’s goal reached" })).toBeVisible();
  await capture(page, "home-rhythm");
  await page.goto("/courses/maths-foundations");
  await expect(page.locator(".roadmap-node.is-selected")).toHaveCount(1);
  const course = await (await request.get("/api/courses/maths-foundations")).json();
  await expect(page.locator(".roadmap-node.is-complete")).toHaveCount(
    course.lessons.filter((lesson: { completed: boolean }) => lesson.completed).length,
  );
  await capture(page, "course-path");
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Achievements" })).toBeVisible();
  // Milestones became the first ranks of achievements; a finished lesson earns Scholar rank I.
  await expect(page.locator(".badge:not(.badge--tier-0)")).not.toHaveCount(0);
  await expect(page.getByText(/^Rank I of V$/).first()).toBeVisible();
  await capture(page, "progress-milestones");
  await request.put("/api/study/preferences", {
    data: { dailyGoal: 5, motion: "system", celebrations: true, sound: false },
  });
});

test("sound respects saved mute and plays for each new correct response after opt-in", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    const trace = { oscillators: 0, contexts: [] as AudioContext[] };
    (window as Window & { discereAudioTest?: typeof trace }).discereAudioTest = trace;
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor() {
        super();
        trace.contexts.push(this);
      }
      override createOscillator() {
        trace.oscillators += 1;
        return super.createOscillator();
      }
    };
  });
  await page.goto("/settings");
  const sound = page.getByRole("switch", { name: /^Sound/ });
  await expect(sound).not.toBeChecked();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { discereAudioTest?: { contexts: unknown[] } }).discereAudioTest
          ?.contexts.length,
    ),
  ).toBe(0);
  await sound.click();
  await expect(sound).toBeChecked();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  const lesson = "/courses/maths-foundations/lessons/undoing-in-the-right-order";
  await page.goto(lesson);
  await page.getByRole("button", { name: /Subtract 3, then divide by 2/ }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".answer-feedback.is-correct")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { discereAudioTest?: { oscillators: number } }).discereAudioTest
            ?.oscillators,
      ),
    )
    .toBe(2);
  await page.reload();
  await page.getByRole("button", { name: /Subtract 3, then divide by 2/ }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".answer-feedback.is-correct")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { discereAudioTest?: { oscillators: number } }).discereAudioTest
          ?.oscillators,
    ),
  ).toBe(2);
  await request.put("/api/study/preferences", { data: { sound: false } });
});
