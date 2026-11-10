import type { Locator } from "@playwright/test";
import { expect, test } from "./isolated-app.js";
import {
  answerCorrectly,
  expectFiguresDrawn,
  figureSteps,
  loadBundle,
  openAtStep,
  questionIn,
  questionOnScreen,
  readLessonJourney,
  runnableLanguages,
  watchPage,
} from "./lesson-player.js";

/**
 * The figures inside lessons. Every kind is drawn once and its controls are used. The kinds
 * that would give an answer away are checked before the answer and after it.
 */
const figures = figureSteps();

test("every kind of figure is drawn in a lesson, and its controls work after the answer", async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  // A Rust figure runs its program on the server. Where Rust is not installed that is refused.
  const rust = (await runnableLanguages(request)).has("rust");
  const watch = watchPage(page, rust ? [] : [/\/api\/rust\/run$/, /status of 503/]);
  expect(figures.size).toBeGreaterThan(20);
  for (const [type, at] of figures) {
    await test.step(type, async () => {
      const where = `${at.courseId}/${at.lessonId}/${at.stepId}`;
      const journey = await readLessonJourney(request, at.courseId, at.lessonId);
      await openAtStep(page, request, journey, at.stepId);
      const figure = page.locator(".step-screen .learning-diagram").first();
      await expect(figure, where).toBeVisible();
      await expectFiguresDrawn(page);
      const box = (await figure.boundingBox())!;
      expect(box.width, where).toBeGreaterThan(100);
      expect(box.height, where).toBeGreaterThan(40);

      const step = journey.explainer.steps.find((item) => item.id === at.stepId)!;
      if (at.asks && step.question)
        await answerCorrectly(
          page,
          questionIn(loadBundle(at.courseId), step.question.id),
          step.question,
        );
      // Use what the figure offers: press its buttons and move its sliders with the keyboard.
      const sliders = figure.locator('input[type="range"]:enabled');
      for (let index = 0; index < Math.min(4, await sliders.count()); index += 1) {
        await sliders.nth(index).focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowLeft");
      }
      for (let index = 0; index < 6; index += 1) {
        const buttons = figure.locator("button:enabled");
        if (index >= (await buttons.count())) break;
        await buttons.nth(index).click();
      }
      await expectFiguresDrawn(page);
      await expect(figure, where).toBeVisible();
    });
  }
  watch.expectClean();
});

/** Opens the step that holds a kind of figure, with the question it asks. */
async function openFigure(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
  type: string,
) {
  const at = figures.get(type);
  test.skip(!at?.asks, `no lesson asks a question beside a ${type} figure`);
  const journey = await readLessonJourney(request, at!.courseId, at!.lessonId);
  const step = journey.explainer.steps.find((item) => item.id === at!.stepId)!;
  await openAtStep(page, request, journey, step.id);
  const figure = page.locator(".step-screen .learning-diagram").first();
  await expect(figure).toBeVisible();
  const answer = () =>
    answerCorrectly(page, questionIn(loadBundle(at!.courseId), step.question!.id), step.question!);
  return { figure, answer, on: questionOnScreen(page, step.question!.id) };
}

/** WCAG contrast between two CSS colours. */
function contrast(foreground: string, background: string): number {
  const luminance = (colour: string) => {
    const rgb = (colour.match(/[\d.]+/g) ?? [])
      .slice(0, 3)
      .map((value) => Number(value) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return (rgb[0] ?? 0) * 0.2126 + (rgb[1] ?? 0) * 0.7152 + (rgb[2] ?? 0) * 0.0722;
  };
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("a truth table masks its result column until the question is answered", async ({
  page,
  request,
}) => {
  const { figure, answer } = await openFigure(page, request, "truth_table");
  const results: Locator = figure.locator("tbody tr td:last-child");
  const rows = await results.count();
  expect(rows).toBeGreaterThan(0);
  // The result column is the question, so every cell is masked and no row can be picked.
  await expect(results).toHaveText(Array.from({ length: rows }, () => "?"));
  await expect(figure.locator(".truth-controls")).toHaveCount(0);
  await expect(figure.locator("tr.is-selected")).toHaveCount(0);

  await answer();
  await expect(results).toHaveText(Array.from({ length: rows }, () => /^(True|False)$/));
  // The row the switches name is marked, and stays readable against its highlight.
  const selected = figure.locator("tbody tr.is-selected");
  if (await selected.count()) {
    const colours = await selected.first().evaluate((row) => ({
      background: getComputedStyle(row).backgroundColor,
      foreground: getComputedStyle(row.querySelector("td") ?? row).color,
    }));
    expect(contrast(colours.foreground, colours.background)).toBeGreaterThanOrEqual(4.5);
    const toggle = figure.locator(".truth-controls button").first();
    const before = await toggle.getAttribute("aria-pressed");
    await toggle.click();
    await expect(toggle).not.toHaveAttribute("aria-pressed", before ?? "");
    await expect(selected).toHaveCount(1);
  }
});

test("a program trace runs only once the prediction is in", async ({ page, request }) => {
  const { figure, answer } = await openFigure(page, request, "program_trace");
  const run = figure.getByRole("button", { name: "Run code", exact: true });
  // Running the program prints the answer.
  await expect(run).toBeDisabled();
  await answer();
  await expect(run).toBeEnabled();
  await run.click();
  await expect(page.locator(".figure-failed")).toHaveCount(0);
  await expect(figure).toBeVisible();
});

test("a search trace can be stepped through only after the answer", async ({ page, request }) => {
  const { figure, answer } = await openFigure(page, request, "search_array");
  const start = figure.getByRole("button", { name: "Start search", exact: true });
  // Stepping through the search shows the comparisons the question asks about.
  await expect(start).toHaveCount(0);
  await answer();
  await start.click();
  await expect(figure.getByRole("button", { name: "Restart", exact: true }))
    .toBeVisible();
});

test("a number machine hides what comes out until the question is answered", async ({
  page,
  request,
}) => {
  const { figure, answer } = await openFigure(page, request, "number_machine");
  const drawing = figure.getByRole("img");
  await expect(drawing).toHaveAttribute("aria-label", /hidden until you answer/);
  await answer();
  await expect(drawing).not.toHaveAttribute("aria-label", /hidden until you answer/);
});
