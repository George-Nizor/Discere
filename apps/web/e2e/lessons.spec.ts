import { expect, test } from "./isolated-app.js";
import {
  lessonLanguages,
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
  // Electronics also has an explorer with a prediction and a writing task between its stages.
  ["electronics-foundations", "current-in-one-loop"],
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
