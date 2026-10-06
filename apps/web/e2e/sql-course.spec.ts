import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";
const output = join(import.meta.dirname, "../../../docs/library-expansion/screens");
const bundle = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "../../../content/sql-from-rows-to-reports/bundle.json"),
    "utf8",
  ),
);
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
const captured = new Set([
  "rows-and-keys",
  "filter-the-rows",
  "preserve-either-side",
  "rank-with-ties",
  "running-totals-and-neighbours",
]);
async function capture(page: Page, name: string, viewport: { width: number; height: number }) {
  mkdirSync(output, { recursive: true });
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: join(output, name + "-" + viewport.width + "x" + viewport.height + ".png"),
    fullPage: true,
  });
}
async function respond(
  page: Page,
  question: {
    answerAuthority: { kind: string; value?: number; acceptedIdeas?: string[] };
    choices?: unknown[];
  },
) {
  if (question.answerAuthority.kind === "numeric")
    await page.getByLabel("Value", { exact: true }).fill(String(question.answerAuthority.value));
  else if (question.choices)
    await page.getByRole("button", { name: question.answerAuthority.acceptedIdeas![0]! }).click();
  else
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(question.answerAuthority.acceptedIdeas![0]!);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".answer-feedback.is-correct")).toBeVisible();
}

test("all SQL lessons compare true query results at desktop, tablet and mobile widths", async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (const lesson of bundle.lessons) {
    await page.goto("/courses/sql-from-rows-to-reports/lessons/" + lesson.id);
    await expect(
      page.getByText(lesson.steps[0].blocks[0].text, { exact: false }).first(),
    ).toBeVisible();
    const spec = lesson.steps[0].diagram;
    // The result table is what the question asks for, so it is masked until the answer is in
    // (audit M1); the query and its input data stay readable.
    await expect(page.getByRole("region", { name: "Result table" })).toHaveCount(0);
    await expect(page.getByText("It appears once you have answered.")).toBeVisible();
    await respond(
      page,
      bundle.questions.find((item: { id: string }) => item.id === lesson.steps[0].checkQuestionId),
    );
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const comparison = spec.queries[1];
      await page.getByRole("button", { name: comparison.label, exact: true }).click();
      await expect(page.locator(".query-code")).toHaveText(comparison.sql);
      await expect(
        page.getByRole("button", { name: comparison.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("region", { name: "Result table" }).getByRole("row")).toHaveCount(
        comparison.result.rows.length + 1,
      );
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      if (captured.has(lesson.id)) await capture(page, "sql-" + lesson.id, viewport);
      await page.getByRole("button", { name: spec.queries[0].label, exact: true }).click();
    }
  }
});

test("SQL typed answers, practice and recall earn one saved lesson completion", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const lesson = bundle.lessons.find((item: { id: string }) => item.id === "rows-and-keys");
  await page.goto("/courses/sql-from-rows-to-reports/lessons/rows-and-keys");
  for (let index = 0; index < 4; index++) {
    const question = bundle.questions.find(
      (item: { id: string }) => item.id === lesson.steps[index].checkQuestionId,
    );
    await respond(page, question);
    await page
      .getByRole("button", { name: index === 3 ? "Finish" : "Continue", exact: true })
      .click();
    if (index === 0) {
      await page.reload();
      await expect(
        page.getByText(lesson.steps[1].blocks[0].text, { exact: false }).first(),
      ).toBeVisible();
    }
  }
  for (const questionId of lesson.questionIds) {
    await respond(
      page,
      bundle.questions.find((item: { id: string }) => item.id === questionId),
    );
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.getByRole("button", { name: "Start the review", exact: true }).click();
  for (const [index, response] of ["6", "primary key"].entries()) {
    await page.getByLabel("Your answer", { exact: true }).fill(response);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reveal answer", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /^Good/ }).click();
    await page
      .getByRole("button", { name: index === 0 ? "Next card" : "Continue", exact: true })
      .click();
  }
  await expect(page.getByRole("heading", { name: "Ready for the next idea" })).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "6 / 6" })).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    await capture(page, "sql-completion", viewport);
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ready for the next idea" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start Choose the columns you need/ })).toBeVisible();
});
