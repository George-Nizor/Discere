import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { CourseBundleSchema } from "@discere/contracts";
import { expect, test } from "./isolated-app.js";
import { playScreens, readLessonJourney } from "./lesson-player.js";

/**
 * Two Python exercises played in the browser: one in plain Python (Run, wrong programs, an error,
 * then the right one) and one that filters a pandas table. They need the sandboxed Python runtime (pnpm python:setup), like python-projects.spec.ts.
 * `DISCERE_SHOTS` names a folder for screenshots at 1440 and 390 pixels wide.
 */
const bundle = CourseBundleSchema.parse(
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../content/python-for-data-analysis/bundle.json"),
      "utf8",
    ),
  ),
);
const lesson = bundle.lessons.find((item) => item.id === "run-and-bind")!;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const shots = process.env["DISCERE_SHOTS"];
const runtime =
  process.env["DISCERE_PYTHON_RUNTIME_DIR"] ??
  join(import.meta.dirname, "../../../data/python-runtime");

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

test("a Python exercise runs, fails a test with both values shown, then passes", async ({
  page,
  request,
}) => {
  test.skip(!existsSync(join(runtime, "lib/python3.12/site-packages/pandas")), "No Python runtime");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/courses/${bundle.course.id}/lessons/${lesson.id}`);
  const editor = page.getByLabel("Your Python code");
  // Play the lesson up to the exercise, answering each question on the way.
  const journey = await readLessonJourney(request, bundle.course.id, lesson.id);
  await playScreens(page, bundle, journey, { stopAtStep: "write-the-total" });
  const check = page.getByRole("button", { name: "Check answer", exact: true });
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue(/# price and quantity are already set\./);
  await expect(page.getByText("price = 4, quantity = 3")).toBeVisible();
  await capture(page, "python-exercise-1-start");
  await expect(page.getByRole("button", { name: "Show the worked program" })).toHaveCount(0);

  // Run shows what the starter leaves in each name.
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Ran successfully")).toBeVisible();
  await expect(page.getByLabel("Values after the run")).toContainText("to_pay = 0");

  // A program that adds where it should multiply fails the first test.
  await editor.fill("total = price + quantity\ndelivery = 5\nto_pay = total + delivery\n");
  await check.click();
  await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "incorrect");
  await expect(page.getByText("A test failed: 0 of 4 tests passed")).toBeVisible();
  await expect(page.locator(".rust-console-failed")).toContainText("total = 12");
  await expect(page.locator(".rust-console-failed")).toContainText("total = 7");
  await capture(page, "python-exercise-2-wrong");

  // Wrong results never close the exercise: it can be checked again and again, and the worked
  // program is there to ask for from the first wrong result on.
  const showProgram = page.getByRole("button", { name: "Show the worked program", exact: true });
  await expect(showProgram).toBeVisible();
  for (const guess of [8, 9, 10]) {
    await editor.fill(`total = ${guess}\ndelivery = 5\nto_pay = total + delivery\n`);
    await page.getByRole("button", { name: "Check again", exact: true }).click();
    await expect(page.locator(".rust-console-failed")).toContainText(`total = ${guess}`);
    await expect(page.getByText("Not quite", { exact: true })).toBeVisible();
    await expect(showProgram).toBeVisible();
  }

  // An error is shown as Python reported it and is not counted as a miss.
  await editor.fill("total = cost * quantity\n");
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(page.getByText("The program did not finish")).toBeVisible();
  await expect(page.getByText(/NameError on line 1/).first()).toBeVisible();
  await capture(page, "python-exercise-3-error");

  await editor.fill("total = price * quantity\ndelivery = 5\nto_pay = total + delivery\n");
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "correct");
  await expect(page.getByText("Ran successfully: 4 of 4 tests passed")).toBeVisible();
  await capture(page, "python-exercise-4-right");
});

test("a pandas exercise fails on its starter and passes once the filter is repaired", async ({
  page,
  request,
}) => {
  test.skip(!existsSync(join(runtime, "lib/python3.12/site-packages/pandas")), "No Python runtime");
  test.setTimeout(180_000);
  const filters = bundle.lessons.find((item) => item.id === "filters-and-columns")!;
  const exercise = questions.get("python-filters-and-columns-code-mask")!;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/courses/${bundle.course.id}/lessons/${filters.id}`);
  const editor = page.getByLabel("Your Python code");
  // Play the lesson up to the exercise, answering each question on the way.
  const journey = await readLessonJourney(request, bundle.course.id, filters.id);
  await playScreens(page, bundle, journey, { stopAtStep: "keep-the-busy-rows" });
  const check = page.getByRole("button", { name: "Check answer", exact: true });
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue(/import pandas as pd/);
  await expect(editor).toHaveValue(/mask = df\['units'\] > minimum/);
  await capture(page, "pandas-exercise-1-start");

  // Run shows the starter's values for the example: a Series is shown as the list of its values.
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Ran successfully")).toBeVisible();
  await expect(page.getByLabel("Values after the run")).toContainText(
    "kept_shops = ['Bay', 'Hill', 'Bay', 'Hill']",
  );
  await expect(page.getByLabel("Values after the run")).toContainText("kept_count = 4");

  // The starter still describes the whole table, so the first test fails with both values.
  await check.click();
  await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "incorrect");
  await expect(page.getByText("A test failed: 1 of 4 tests passed")).toBeVisible();
  await expect(page.locator(".rust-console-failed")).toContainText("kept_shops = ['Bay', 'Hill']");
  await capture(page, "pandas-exercise-2-wrong");

  // A column that does not exist is reported as pandas reports it, and is not a miss.
  await editor.fill("import pandas as pd\n\ndf = pd.DataFrame({'shop': shops})\nkept = df[df['sold'] >= minimum]\n");
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(page.getByText("The program did not finish")).toBeVisible();
  await expect(page.getByText(/KeyError on line 4/).first()).toBeVisible();

  if (exercise.answerAuthority.kind !== "text") throw new Error("Expected a worked program");
  await editor.fill(exercise.answerAuthority.exampleAnswer);
  await page.getByRole("button", { name: "Check again", exact: true }).click();
  await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "correct");
  await expect(page.getByText("Ran successfully: 4 of 4 tests passed")).toBeVisible();
  await capture(page, "pandas-exercise-3-right");
});
