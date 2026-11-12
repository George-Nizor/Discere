import type { Page } from "@playwright/test";
import { expect, test } from "./isolated-app.js";
import {
  fillAnswer,
  loadBundle,
  playLesson,
  questionIn,
  questionOnScreen,
  readLessonJourney,
} from "./lesson-player.js";

/**
 * What a learner earns and how it is shown: the verdict on an answer, the finish screen and its
 * saved result, the practice settings, reduced motion, and the sound cue.
 */
const COURSE = "maths-foundations";
const LESSON = "keeping-the-balance";

const lessonXp = (page: Page) =>
  page.locator(".finish-stats > div").filter({ hasText: "Lesson XP" }).locator("dd");

test("a missed answer, an earned one and the finished lesson are saved as they happened", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await request.put("/api/study/preferences", {
    data: { motion: "system", celebrations: true, sound: false },
  });
  const bundle = loadBundle(COURSE);
  const journey = await readLessonJourney(request, COURSE, LESSON);
  // Two steps with a retry: the first is missed and shown, the second is answered right.
  const retryable = journey.explainer.steps.filter(
    (step) =>
      step.kind !== "predict" &&
      !step.workedSteps &&
      step.question &&
      !step.question.code &&
      (step.question.choices === undefined || step.question.choices.length > 2),
  );
  expect(retryable.length).toBeGreaterThanOrEqual(2);
  const [missed, earned] = retryable;

  await playLesson(page, request, COURSE, LESSON, {
    onScreen: async ({ id }) => {
      if (id === missed!.id) {
        const authored = questionIn(bundle, missed!.question!.id);
        const on = questionOnScreen(page, authored.id);
        await fillAnswer(page, authored, missed!.question!, true);
        await on.check.click();
        await expect(page.locator(".answer-feedback.is-retry")).toBeVisible();
        // A first miss keeps the answer open. The worked answer is there on request.
        await expect(page.locator(".beat-explanation")).toHaveCount(0);
        await page.getByRole("button", { name: "Show the answer", exact: true }).click();
        await expect(page.locator(".beat-explanation")).toBeVisible();
        await expect(on.check).toHaveCount(0);
      }
      if (id === earned!.id) {
        const authored = questionIn(bundle, earned!.question!.id);
        const on = questionOnScreen(page, authored.id);
        await fillAnswer(page, authored, earned!.question!);
        await on.check.click();
        const verdict = page.locator(".answer-feedback.is-correct");
        await expect(verdict).toBeVisible();
        // With motion allowed, the verdict arrives with the game layer's rising frame.
        expect(
          await verdict.evaluate((node) => getComputedStyle(node).animationName),
        ).not.toBe("none");
      }
    },
  });

  const result = await (
    await request.get(`/api/courses/${COURSE}/lessons/${LESSON}/result`)
  ).json();
  expect(result.completed).toBe(true);
  expect(result.assisted).toBe(1);
  expect(result.independent).toBe(result.answered - 1);
  // The count on screen runs up to the server's total.
  await expect(lessonXp(page)).toHaveText(String(result.xp));
  await expect(page.locator(".finish-verdict")).toBeVisible();

  // A reload shows the same result and earns nothing again.
  const xpBefore = (await (await request.get("/api/home")).json()).xp;
  await page.reload();
  await expect(page.locator(".finish-verdict")).toBeVisible();
  await expect(lessonXp(page)).toHaveText(String(result.xp));
  expect((await (await request.get("/api/home")).json()).xp).toBe(xpBefore);
});

test("practice settings are kept, and reduced motion stops every animation on the finish screen", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await page.goto("/settings");
  const practice = page.getByRole("region", { name: "Your practice" });
  const goal = practice.getByRole("radio", { name: "3 responses a day, Light", exact: true });
  // The whole card is the control. At this window size the companion sits over the card's
  // radio dot, so the click goes where the card is clear of it.
  await practice
    .locator("label")
    .filter({ has: page.getByRole("radio", { name: "3 responses a day, Light", exact: true }) })
    .click({ position: { x: 200, y: 40 } });
  await expect(goal).toBeChecked();
  await expect(practice.getByRole("status")).toHaveText("Saved");
  const motion = practice.getByRole("combobox", { name: "Motion", exact: true });
  await motion.selectOption("reduced");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset["motion"]))
    .toBe("reduced");
  await page.reload();
  await expect(goal).toBeChecked();
  await expect(motion).toHaveValue("reduced");

  // The browser itself asks for motion here. The saved setting is what stops it.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await playLesson(page, request, COURSE, LESSON);
  await expect(page.locator(".finish-verdict")).toBeVisible();
  await expect(lessonXp(page)).not.toBeEmpty();
  const moving = await page.locator("main").evaluate(
    (main) =>
      [...main.querySelectorAll("*")].filter(
        (element) => getComputedStyle(element).animationName !== "none",
      ).length,
  );
  expect(moving).toBe(0);

  // The finished lesson shows on the course's roadmap and earns the first rank of a badge.
  await page.goto(`/courses/${COURSE}`);
  await expect(page.locator(".roadmap-node.is-selected")).toHaveCount(1);
  await expect(page.locator(".roadmap-node.is-complete")).toHaveCount(1);
  await page.goto("/you");
  await expect(page.getByRole("heading", { name: "Achievements" })).toBeVisible();
  await expect(page.locator(".badge:not(.badge--tier-0)")).not.toHaveCount(0);
});

test("a right answer plays a cue when sound is on, and muting stops the next one", async ({
  page,
  request,
}) => {
  await request.put("/api/study/preferences", { data: { sound: false } });
  await page.addInitScript(() => {
    const trace = { oscillators: 0, contexts: 0 };
    (window as Window & { soundTrace?: typeof trace }).soundTrace = trace;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor() {
        super();
        trace.contexts += 1;
      }
      override createOscillator() {
        trace.oscillators += 1;
        return super.createOscillator();
      }
    };
  });
  const heard = () =>
    page.evaluate(
      () =>
        (window as Window & { soundTrace?: { oscillators: number; contexts: number } }).soundTrace!,
    );

  await page.goto("/settings");
  const sound = page.getByRole("switch", { name: /^Sound/ });
  await expect(sound).not.toBeChecked();
  // With sound off, nothing has opened the audio device.
  expect((await heard()).contexts).toBe(0);
  // The switch shows the saved setting, so it turns once the save has gone through.
  await sound.click();
  await expect(sound).toBeChecked();
  await expect(page.getByRole("region", { name: "Your practice" }).getByRole("status")).toHaveText(
    "Saved",
  );

  const bundle = loadBundle(COURSE);
  const journey = await readLessonJourney(request, COURSE, LESSON);
  const asked = journey.explainer.steps.filter((step) => step.question && !step.workedSteps);
  expect(asked.length).toBeGreaterThanOrEqual(2);
  let before = 0;
  await playLesson(page, request, COURSE, LESSON, {
    stopAtStep: asked[1]!.id,
    onScreen: async ({ id }) => {
      if (id !== asked[0]!.id) return;
      // The lesson page is a fresh document, so its count starts at nothing.
      before = (await heard()).oscillators;
    },
  });
  await expect.poll(async () => (await heard()).oscillators).toBeGreaterThan(before);

  // Muted from the lesson's own toolbar, the next right answer is silent.
  const toggle = page
    .getByRole("toolbar", { name: "Lesson tools" })
    .getByRole("button", { name: "Sound", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  const muted = (await heard()).oscillators;
  const authored = questionIn(bundle, asked[1]!.question!.id);
  const on = questionOnScreen(page, authored.id);
  await fillAnswer(page, authored, asked[1]!.question!);
  await on.check.click();
  await expect(on.beat).toHaveAttribute("data-result", "correct");
  expect((await heard()).oscillators).toBe(muted);
  expect((await (await request.get("/api/study/preferences")).json()).sound).toBe(false);
});
