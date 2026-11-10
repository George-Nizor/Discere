import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./isolated-app.js";
import {
  expectFiguresDrawn,
  lessonLanguages,
  lessonPath,
  loadBundle,
  playLesson,
  runnableLanguages,
  watchPage,
} from "./lesson-player.js";

/**
 * One lesson from each of a dozen courses, played from its opener to its finish screen. Between
 * them they hold every kind of step, every way of answering (a choice, a number, a short text,
 * a program in each of the four languages), a faded example, a self-explanation, a writing task
 * and a quoted extract. Each test checks that the lesson completes, that no figure fell back to
 * its error message, and that the page logged no error and no request failed.
 *
 * The list names lessons by id only. Their wording is free to change.
 */
const SAMPLE: Array<[courseId: string, lessonId: string]> = [
  ["maths-foundations", "keeping-the-balance"],
  ["logic-and-reasoning", "what-logic-operates-on"],
  ["probability-statistics", "independent-repetitions"],
  ["physics-motion-and-forces", "reading-motion-graphs"],
  ["chemistry-atoms-to-reactions", "reading-chemical-formulas"],
  ["economics-markets-and-strategy", "opportunity-cost-and-the-frontier"],
  ["history", "silences-and-survival"],
  ["english-reading-writing-and-rhetoric", "sound-and-image"],
  ["cs-basics", "choosing-between-paths"],
  ["sql-from-rows-to-reports", "combine-result-sets"],
  ["python-for-data-analysis", "run-and-bind"],
  ["typescript-and-node", "shapes-and-structural-typing"],
  ["rust-foundations", "if-as-an-expression"],
];

for (const [courseId, lessonId] of SAMPLE)
  test(`${courseId}: ${lessonId} plays from its opener to its finish screen`, async ({
    page,
    request,
  }) => {
    const bundle = loadBundle(courseId);
    const needs = lessonLanguages(bundle, lessonId);
    const ready = await runnableLanguages(request);
    const missing = needs.filter((language) => !ready.has(language));
    test.skip(missing.length > 0, `${missing.join(", ")} cannot run on this computer`);
    // A program is compiled and run in the sandbox each time it is checked.
    test.setTimeout(needs.length ? 240_000 : 120_000);
    const watch = watchPage(page);

    const journey = await playLesson(page, request, courseId, lessonId);

    await expect(page.getByRole("progressbar", { name: "Lesson progress" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    const result = await (
      await request.get(`/api/courses/${courseId}/lessons/${lessonId}/result`)
    ).json();
    expect(result.completed).toBe(true);
    const progress = await (
      await request.get(`/api/courses/${courseId}/lessons/${lessonId}/progress`)
    ).json();
    for (const stage of journey.stages)
      expect(
        progress.stages.find((entry: { stageId: string }) => entry.stageId === stage.id)?.state,
        stage.id,
      ).toMatch(/^(completed|skipped_optional)$/);
    watch.expectClean();
  });

/**
 * Every kind of figure a lesson can hold, drawn once in the lesson player. The step is found by
 * reading the bundles, so a new kind of figure is covered as soon as one lesson uses it.
 */
interface FigureStep {
  courseId: string;
  lessonId: string;
  stepId: string;
}
function figureSteps(): Map<string, FigureStep> {
  const found = new Map<string, FigureStep>();
  const content = join(import.meta.dirname, "../../../content");
  for (const courseId of readdirSync(content).sort()) {
    let bundle: {
      lessons: Array<{ id: string; steps: Array<{ id: string; diagram?: { type: string } }> }>;
    };
    try {
      bundle = JSON.parse(readFileSync(join(content, courseId, "bundle.json"), "utf8"));
    } catch {
      continue;
    }
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps)
        if (step.diagram && !found.has(step.diagram.type))
          found.set(step.diagram.type, { courseId, lessonId: lesson.id, stepId: step.id });
  }
  return found;
}

test("every kind of figure is drawn in a lesson without its error message", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const watch = watchPage(page);
  const figures = figureSteps();
  expect(figures.size).toBeGreaterThan(20);
  for (const [type, at] of figures) {
    await test.step(type, async () => {
      const route = `/api/courses/${at.courseId}/lessons/${at.lessonId}`;
      const journey = await (await request.get(`${route}/journey`)).json();
      const stage = journey.stages.find((item: { type: string }) => item.type === "explainer");
      // The lesson player opens where the learner left off, so the saved place is the way in.
      const saved = await request.put(`${route}/progress`, {
        data: { stageId: stage.id, state: "active", interactionState: { stepId: at.stepId } },
      });
      expect(saved.ok(), await saved.text()).toBe(true);
      await page.goto(lessonPath(at.courseId, at.lessonId));
      const figure = page.locator(".step-screen .learning-diagram").first();
      await expect(figure, `${at.courseId}/${at.lessonId}/${at.stepId}`).toBeVisible();
      await expectFiguresDrawn(page);
      const box = await figure.boundingBox();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeGreaterThan(40);
    });
  }
  watch.expectClean();
});
