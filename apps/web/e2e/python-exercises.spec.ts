import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { CourseBundleSchema } from "@discere/contracts";
import { expect, test } from "./fixtures.js";

/**
 * One Python exercise played in the browser: Run, a wrong program, then the right one. It needs
 * the sandboxed Python runtime (pnpm python:setup), like python-projects.spec.ts.
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
}) => {
  test.skip(!existsSync(join(runtime, "lib/python3.12/site-packages/pandas")), "No Python runtime");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/courses/${bundle.course.id}/lessons/${lesson.id}`);
  const editor = page.getByLabel("Your Python code");
  // Play the lesson up to its first exercise, answering each question on the way.
  const earlier = lesson.steps
    .slice(0, lesson.steps.findIndex((step) => step.id === "write-the-total"))
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
  await expect(editor).toHaveValue(/# price and quantity are already set\./);
  await expect(page.getByText("price = 4, quantity = 3")).toBeVisible();
  await capture(page, "python-exercise-1-start");

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
