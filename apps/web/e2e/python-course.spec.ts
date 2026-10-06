import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { CourseBundleSchema, type Question } from "@discere/contracts";
import { expect, test } from "./fixtures.js";
const bundle = CourseBundleSchema.parse(
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../content/python-for-data-analysis/bundle.json"),
      "utf8",
    ),
  ),
);
const output = join(import.meta.dirname, "../../../docs/library-expansion/screens");
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
const captured = new Set([
  "run-and-bind",
  "arrays-and-shape",
  "labels-and-positions",
  "combine-tables",
  "audit-a-sales-report",
]);
async function capture(page: Page, name: string, width: number) {
  mkdirSync(output, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.screenshot({ path: join(output, name + "-" + width + ".png"), fullPage: false });
}
async function answer(page: Page, question: Question, wrong = false) {
  if (question.answerAuthority.kind === "numeric")
    await page
      .getByLabel("Value", { exact: true })
      .fill(String(wrong ? question.answerAuthority.value + 1000 : question.answerAuthority.value));
  else
    await page
      .getByRole("group", { name: "Answer choices" })
      .getByRole("button", { name: question.answerAuthority.acceptedIdeas[0]!, exact: false })
      .click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".question-beat")).toHaveAttribute(
    "data-result",
    wrong ? "incorrect" : "correct",
  );
}
test("all Python lessons play actual examples at three viewport sizes", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  for (const lesson of bundle.lessons) {
    const response = await request.get(
      "/api/courses/" + bundle.course.id + "/lessons/" + lesson.id + "/journey",
    );
    const payload = await response.text();
    expect(payload).not.toMatch(/answerAuthority|acceptedIdeas|workedAnswer|"probe"/);
    await page.goto("/courses/" + bundle.course.id + "/lessons/" + lesson.id);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const spec = lesson.steps[0]!.diagram!;
      if (spec.type !== "python_execution") throw Error("Missing Python visual");
      const selected = spec.cases[1]!;
      await page.getByRole("button", { name: selected.label, exact: true }).click();
      await expect(page.getByRole("button", { name: selected.label, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.locator(".python-state")).toHaveCount(0);
      await page.getByRole("button", { name: "Play example", exact: true }).click();
      await expect(page.locator(".python-step-count")).toHaveText(
        "Step " + selected.steps.length + " of " + selected.steps.length,
      );
      await expect(page.locator(".python-state")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      if (captured.has(lesson.id)) await capture(page, "python-" + lesson.id, viewport.width);
      await page.getByRole("button", { name: "Reset example", exact: true }).click();
    }
  }
});
test("Python learning, fresh recall and saved completion work end to end", async ({ page }) => {
  test.setTimeout(90_000);
  const lesson = bundle.lessons[0]!;
  await page.goto("/courses/" + bundle.course.id + "/lessons/" + lesson.id);
  for (let index = 0; index < 4; index++) {
    await answer(
      page,
      bundle.questions.find((q) => q.id === lesson.steps[index]!.checkQuestionId)!,
    );
    if (index === 0) {
      await page.getByRole("button", { name: "Why?", exact: true }).click();
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await capture(page, "python-correct", viewport.width);
      }
    }
    await page
      .getByRole("button", { name: index === 3 ? "Finish" : "Continue", exact: true })
      .click();
    if (index === 0) {
      await page.reload();
      await expect(
        page.getByText(lesson.steps[1]!.blocks.find(block => block.kind === "heading")!.text, { exact: false }).first(),
      ).toBeVisible();
    }
  }
  for (const id of lesson.questionIds) {
    await answer(page, bundle.questions.find((q) => q.id === id)!);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.getByRole("button", { name: "Start the review", exact: true }).click();
  for (const [index, response] of ["9", "kernel"].entries()) {
    await page.getByLabel("Your answer", { exact: true }).fill(response);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reveal answer", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /^Good/ }).click();
    await page
      .getByRole("button", { name: index === 0 ? "Next card" : "Continue", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Ready for the next idea", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "6 / 6" })).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await capture(page, "python-completion", viewport.width);
  }
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ready for the next idea", exact: true }),
  ).toBeVisible();
});
test("the applied report explains mistakes and permits a changed-case check", async ({ page }) => {
  test.setTimeout(90_000);
  const lesson = bundle.lessons.at(-1)!;
  await page.goto("/courses/" + bundle.course.id + "/lessons/" + lesson.id);
  for (let index = 0; index < 4; index++) {
    const spec = lesson.steps[index]!.diagram!;
    if (spec.type !== "python_execution") throw Error("Missing Python visual");
    await page.getByRole("button", { name: spec.cases[1]!.label, exact: true }).click();
    await page.getByRole("button", { name: "Play example", exact: true }).click();
    await answer(
      page,
      bundle.questions.find((q) => q.id === lesson.steps[index]!.checkQuestionId)!,
      index === 0,
    );
    if (index === 0) {
      // A first miss no longer reveals the answer (audit B3); ask for it.
      await page.getByRole("button", { name: "Show the answer", exact: true }).click();
      await expect(page.locator(".beat-explanation")).toContainText(
        "Only the second occurrence",
      );
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await capture(page, "python-correction", viewport.width);
      }
    }
    await page
      .getByRole("button", { name: index === 3 ? "Finish" : "Continue", exact: true })
      .click();
  }
  for (const id of lesson.questionIds) {
    await answer(page, bundle.questions.find((q) => q.id === id)!);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(page.getByRole("button", { name: "Start the review", exact: true })).toBeVisible();
});
test("Python playback supports motion, keyboard case selection and pause", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/courses/" + bundle.course.id + "/lessons/arrays-and-shape");
  const button = page.getByRole("button", { name: "NumPy array", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Play example", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play example", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Play example", exact: true }).click();
  await expect(page.locator(".python-step-count")).toHaveText("Step 2 of 2");
});
