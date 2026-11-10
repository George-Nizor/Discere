import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { CourseBundleSchema } from "@discere/contracts";
import { expect, test } from "./fixtures.js";

/**
 * Two TypeScript exercises played in the browser. The first is run, refused by the compiler,
 * checked with a wrong value and then with the right one. The second compiles and returns the
 * right values while its types are still too loose, which only a type test can see. They need
 * the sandbox (Bubblewrap) and the TypeScript compiler the workspace installs.
 * `DISCERE_SHOTS` names a folder for screenshots at 1440 and 390 pixels wide.
 */
const bundle = CourseBundleSchema.parse(
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, "../../../content/typescript-and-node/bundle.json"),
      "utf8",
    ),
  ),
);
const lesson = bundle.lessons.find((item) => item.id === "what-types-are-for")!;
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

test("a TypeScript exercise shows a type error, fails a test, then passes", async ({
  page,
  request,
}) => {
  const runtime = await (await request.get("/api/typescript-runtime")).json();
  test.skip(!runtime.ready, "TypeScript cannot run here");
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/courses/${bundle.course.id}/lessons/${lesson.id}`);
  const editor = page.getByLabel("Your TypeScript code");
  const forward = page.getByRole("button", { name: /^(Continue|Start|Begin|Next)/ });
  const check = page.getByRole("button", { name: "Check answer", exact: true });
  const again = page.getByRole("button", { name: "Check again", exact: true });
  const beat = page.locator(".question-beat");

  /** Plays the lesson up to a step, answering each question on the way. */
  async function playTo(stepId: string, from: number) {
    const end = lesson.steps.findIndex((step) => step.id === stepId);
    const earlier = lesson.steps
      .slice(from, end)
      .flatMap((step) => (step.checkQuestionId ? [questions.get(step.checkQuestionId)!] : []));
    for (let turn = 0; turn < 40; turn += 1) {
      if (earlier.length === 0 && (await editor.isVisible())) break;
      if (await check.isVisible()) {
        const question = earlier.shift()!;
        if (question.answerAuthority.kind === "numeric")
          await page.getByLabel("Value", { exact: true }).fill(String(question.answerAuthority.value));
        else
          await page
            .getByRole("radio", { name: question.answerAuthority.exampleAnswer, exact: false })
            .click();
        await check.click();
        await expect(beat).toHaveAttribute("data-result", "correct");
      }
      await forward.first().click();
      await page.waitForTimeout(150);
    }
    await expect(editor).toBeVisible();
    return end;
  }

  const first = await playTo("fix-the-values", 0);
  await expect(editor).toHaveValue(/let count: number = "3";/);
  await expect(page.getByText('count = 3, label = "3", total = 4')).toBeVisible();
  await expect(page.getByText("Checked by the compiler before anything runs")).toBeVisible();
  await expect(page.getByText(/can't run on this computer/)).toHaveCount(0);
  await capture(page, "typescript-exercise-1-start");

  // Run compiles the starter first, and the compiler's errors come back by line.
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Did not compile")).toBeVisible();
  const diagnostics = page.locator(".rust-console-diagnostics");
  await expect(diagnostics).toContainText("Line 1: A value is being stored where its type does not fit.");
  await expect(diagnostics).toContainText("Type 'string' is not assignable to type 'number'.");
  await expect(diagnostics).toContainText("Line 2:");
  await capture(page, "typescript-exercise-2-type-error");

  // Checking a program that does not compile is not a wrong answer: no worked program is offered.
  await check.click();
  await expect(page.getByText("The program does not compile yet")).toBeVisible();
  await expect(page.getByText(/A type error is not counted as a wrong answer/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Show the worked program" })).toHaveCount(0);

  // Run on a program that compiles shows what it printed and what each name holds.
  await editor.fill('let count: number = 4;\nlet label: string = "3";\nconst total: number = count + 1;\nconsole.log("total is", total);\n');
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("Ran successfully")).toBeVisible();
  await expect(page.getByLabel("Printed output")).toHaveText("total is 5\n");
  await expect(page.getByLabel("Values after the run")).toContainText("total = 5");

  // It compiles, and its values are wrong: the failed test names both.
  await again.or(check).click();
  await expect(beat).toHaveAttribute("data-result", "incorrect");
  await expect(page.locator(".rust-console-failed")).toContainText("count = 3");
  await expect(page.locator(".rust-console-failed")).toContainText("count = 4");
  await expect(page.getByRole("button", { name: "Show the worked program", exact: true })).toBeVisible();
  await capture(page, "typescript-exercise-3-wrong");

  await editor.fill('let count: number = 3;\nlet label: string = "3";\nconst total: number = count + 1;\n');
  await again.click();
  await expect(beat).toHaveAttribute("data-result", "correct");
  await expect(page.getByText("Ran successfully")).toBeVisible();
  await capture(page, "typescript-exercise-4-right");

  // The next exercise: any is refused, and a function that also takes a string is caught by a type test.
  await forward.first().click();
  await expect(editor).toBeHidden();
  await playTo("annotate-a-function", first + 1);
  await expect(editor).toHaveValue(/function add\(a, b\)/);
  await expect(page.getByText("add(2, 3)")).toBeVisible();
  await editor.fill("function add(a: any, b: any): number {\n  return a + b;\n}\n");
  await check.click();
  await expect(page.locator(".rust-console-diagnostics")).toContainText("Line 1: This exercise does not allow 'any'");
  await editor.fill("function add(a: number | string, b: number): number {\n  return Number(a) + b;\n}\n");
  await again.or(check).click();
  await expect(beat).toHaveAttribute("data-result", "incorrect");
  await expect(page.getByText("A test failed: 5 of 6 tests passed")).toBeVisible();
  await expect(page.locator(".rust-console-message")).toContainText("add still accepts a string");
  await capture(page, "typescript-exercise-5-type-test");
  await editor.fill("function add(a: number, b: number): number {\n  return a + b;\n}\n");
  await again.click();
  await expect(beat).toHaveAttribute("data-result", "correct");
  await expect(page.getByText("Ran successfully: 6 of 6 tests passed")).toBeVisible();
});
