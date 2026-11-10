import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { CourseBundleSchema } from "@discere/contracts";
import { expect, test } from "./fixtures.js";

/**
 * One SQL exercise played in the browser: Run, a wrong result, a query written to the visible
 * rows, an error from SQLite, then the right query. It needs Python 3.12 with SQLite 3.39 on
 * the server, as sql-projects.spec.ts does. `DISCERE_SHOTS` names a folder for screenshots at
 * 1440 and 390 pixels wide.
 */
const bundle = CourseBundleSchema.parse(
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../content/sql-from-rows-to-reports/bundle.json"),
      "utf8",
    ),
  ),
);
const lesson = bundle.lessons.find((item) => item.id === "filter-the-rows")!;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const shots = process.env["DISCERE_SHOTS"];

async function capture(page: Page, name: string) {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({ path: join(shots, `${name}-${size.width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

test("an SQL exercise runs, returns the wrong rows, meets an error, then passes", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/courses/${bundle.course.id}/lessons/${lesson.id}`);
  const editor = page.getByLabel("Your SQL query");
  // Play the lesson up to its first exercise, answering each question on the way.
  const earlier = lesson.steps
    .slice(0, lesson.steps.findIndex((step) => step.id === "write-more-than-twenty"))
    .flatMap((step) => (step.checkQuestionId ? [questions.get(step.checkQuestionId)!] : []));
  const forward = page.getByRole("button", { name: /^(Continue|Start|Begin|Next)/ });
  const check = page.getByRole("button", { name: "Check answer", exact: true });
  for (let turn = 0; turn < 40 && !(await editor.isVisible()); turn += 1) {
    if (await check.isVisible()) {
      const question = earlier.shift()!;
      if (question.answerAuthority.kind === "numeric")
        await page.getByLabel("Value", { exact: true }).fill(String(question.answerAuthority.value));
      else
        await page
          .getByRole("radio", { name: question.answerAuthority.acceptedIdeas[0]!, exact: false })
          .click();
      await check.click();
      await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "correct");
    }
    await forward.first().click();
    await page.waitForTimeout(150);
  }
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue(/WHERE amount >= 20;/);
  // The table is shown with its column types and rows, so nothing has to be guessed.
  const orders = page.getByRole("region", { name: "orders input table" });
  await expect(orders.getByRole("columnheader", { name: /amount\s*integer/ })).toBeVisible();
  await expect(orders.getByRole("row")).toHaveCount(7);
  await expect(page.getByText("SQL can't run on this computer yet")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show the worked query" })).toHaveCount(0);
  await capture(page, "sql-exercise-1-start");

  // Run shows the rows the starter returns from the table on screen.
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Ran successfully")).toBeVisible();
  const result = page.getByRole("region", { name: "Query result" });
  await expect(result.getByRole("row")).toHaveCount(6);
  await capture(page, "sql-exercise-2-run");

  // Checking the starter: it keeps the two orders of exactly 20, so it returns too many rows.
  await check.click();
  await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "incorrect");
  // The second set of rows has no order of exactly 20, so the starter happens to pass there.
  await expect(page.getByText("A test failed: 1 of 3 tests passed")).toBeVisible();
  await expect(
    page.getByText("With the rows shown, your query returned 5 rows and 3 were expected.").first(),
  ).toBeVisible();
  await expect(page.getByText("Not quite", { exact: true })).toBeVisible();
  await capture(page, "sql-exercise-3-wrong");
  const showQuery = page.getByRole("button", { name: "Show the worked query", exact: true });
  await expect(showQuery).toBeVisible();

  // A query written to the rows on screen passes there and fails on rows it cannot see.
  const again = page.getByRole("button", { name: "Check again", exact: true });
  await editor.fill("SELECT id, amount\nFROM orders\nWHERE id IN (101, 103, 104);\n");
  await again.click();
  await expect(page.getByText("A test failed: 1 of 3 tests passed")).toBeVisible();
  await expect(page.getByText(/With other rows in the same tables \(test 2 of 3\)/).first()).toBeVisible();
  await expect(showQuery).toBeVisible();

  // SQLite's own message is shown, and an error is not counted as a wrong answer.
  await editor.fill("SELECT id, amount\nFROM orders\nWHERE amont > 20;\n");
  await again.click();
  await expect(page.getByText("The query did not run")).toBeVisible();
  await expect(page.getByText("no such column: amont").first()).toBeVisible();
  await expect(page.getByText("Not quite", { exact: true })).toHaveCount(0);
  await capture(page, "sql-exercise-4-error");

  // A statement that would change the table is refused.
  await editor.fill("DELETE FROM orders;\n");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("SQLite could not run the query")).toBeVisible();

  await editor.fill("SELECT id, amount\nFROM orders\nWHERE amount > 20;\n");
  await again.click();
  await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "correct");
  await expect(page.getByText("Ran successfully: 3 of 3 tests passed")).toBeVisible();
  await expect(page.getByRole("region", { name: "Query result" }).getByRole("row")).toHaveCount(4);
  await capture(page, "sql-exercise-5-right");
});
