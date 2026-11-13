import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./isolated-app.js";
import {
  answerCorrectly,
  expectFiguresDrawn,
  expectNoSidewaysScroll,
  loadBundle,
  openAtStep,
  playLesson,
  questionIn,
  readLessonJourney,
  watchPage,
} from "./lesson-player.js";

/**
 * How the Body Works at a phone's width: one lesson is played from its opener to its finish
 * screen, and every figure of the course is drawn in the light and the dark theme with each of
 * its buttons pressed. Set `BODY_SHOTS` to a folder to keep a screenshot of every view.
 */
const COURSE = "how-the-body-works";
const shots = process.env["BODY_SHOTS"];
test.use({ viewport: { width: 390, height: 844 } });

test("a lesson of How the Body Works plays from its opener to its finish screen at 390 px", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const watch = watchPage(page);
  await playLesson(page, request, COURSE, "hormones-and-blood-sugar");
  await expect(page.getByRole("progressbar", { name: "Lesson progress" })).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expectNoSidewaysScroll(page);
  await expectFiguresDrawn(page);
  watch.expectClean();
});

test("every figure of the course is drawn in both themes and each of its views", async ({
  page,
  request,
}) => {
  test.setTimeout(600_000);
  const bundle = loadBundle(COURSE);
  const watch = watchPage(page);
  if (shots) mkdirSync(shots, { recursive: true });
  let drawn = 0;
  for (const lesson of bundle.lessons) {
    const journey = await readLessonJourney(request, COURSE, lesson.id);
    for (const step of lesson.steps) {
      if (!step.diagram) continue;
      const where = `${lesson.id}/${step.id}`;
      await openAtStep(page, request, journey, step.id);
      const screen = journey.explainer.steps.find((item) => item.id === step.id);
      if (screen?.question)
        await answerCorrectly(page, questionIn(bundle, screen.question.id), screen.question);
      const figure = page.locator(".step-screen .learning-diagram").first();
      await expect(figure, where).toBeVisible();
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => {
          document.documentElement.dataset["theme"] = value;
        }, theme);
        const views = figure.locator("button:enabled");
        const count = Math.max(1, await views.count());
        for (let index = 0; index < count; index += 1) {
          if ((await views.count()) > index) await views.nth(index).click();
          await expectFiguresDrawn(page);
          await expectNoSidewaysScroll(page);
          if (shots)
            await figure.screenshot({
              path: join(shots, `${lesson.id}--${step.id}--${theme}-${index}.png`),
            });
        }
      }
      drawn += 1;
    }
  }
  expect(drawn).toBeGreaterThan(20);
  watch.expectClean();
});

test("keeps screenshots of three lessons at 390 px when asked to", async ({ page, request }) => {
  test.skip(!shots, "set BODY_SHOTS to a folder to keep screenshots");
  test.setTimeout(120_000);
  mkdirSync(shots as string, { recursive: true });
  const bundle = loadBundle(COURSE);
  for (const lessonId of ["cells-and-tissues", "the-heart", "nerves-and-senses"]) {
    const lesson = bundle.lessons.find((item) => item.id === lessonId);
    const journey = await readLessonJourney(request, COURSE, lessonId);
    await page.goto(`/courses/${COURSE}/lessons/${lessonId}`);
    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({ path: join(shots as string, `lesson-${lessonId}-opener.png`) });
    const steps = lesson?.steps ?? [];
    const picks = [
      steps.find((step) => step.diagram),
      steps.find((step) => step.checkQuestionId || step.workedSteps),
    ];
    for (const [index, step] of picks.entries()) {
      if (!step) continue;
      await openAtStep(page, request, journey, step.id);
      await page.screenshot({
        path: join(shots as string, `lesson-${lessonId}-step-${index + 1}-${step.id}.png`),
        fullPage: true,
      });
    }
  }
});
