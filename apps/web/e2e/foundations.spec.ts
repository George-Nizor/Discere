import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./fixtures.js";
const OUTPUT = join(import.meta.dirname, "../../../docs/foundations/implementation-screens");
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];

async function shoot(page: import("@playwright/test").Page, name: string) {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: join(OUTPUT, `${name}-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
}

/** Maths Foundations 1.2.0 lesson 1, the v2 gold lesson (docs/learning-experience §8). */
test("Maths lesson 1 opens, teaches before asking, follows the attempt policy and resumes", async ({
  page,
}) => {
  mkdirSync(OUTPUT, { recursive: true });
  const check = () =>
    page
      .getByRole("button", { name: /^(Check answer|Check again)$/ })
      .first()
      .click();
  const next = () => page.getByRole("button", { name: /^(Continue|Finish)$/ }).click();
  await page.goto("/courses/maths-foundations/lessons/what-a-letter-stands-for");
  // Opener: the lesson title is the one h1; the hook is something a beginner can already do.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What a letter stands for");
  await expect(page.getByText("I'm thinking of a number. I add 5 to it and get 12.")).toBeVisible();
  await expect(page.getByText("About 10 minutes · 7 steps")).toBeVisible();
  await shoot(page, "maths-opener");
  // A predictable slip gets specific feedback and the answer stays open (audit B3, M5).
  await page.getByLabel("Value", { exact: true }).fill("17");
  await check();
  await expect(page.getByText("Not right, try again.")).toBeVisible();
  await expect(page.getByText(/That's 12 \+ 5/)).toBeVisible();
  await page.getByRole("button", { name: "Get a hint", exact: true }).click();
  await expect(page.getByText("What number, plus 5, makes 12?")).toBeVisible();
  await page.getByLabel("Value", { exact: true }).fill("7");
  await check();
  await expect(page.getByText(/You worked back from 12/)).toBeVisible();
  await next();
  // Explain: the key idea is the headline; the term arrives before any question uses it.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A letter stands for a number you haven't been told yet.",
  );
  await page
    .getByRole("button", { name: /x \+ 5 = 12/ })
    .first()
    .click();
  await check();
  await next();
  // Explore: the slider is the answer; there is no second input.
  await expect(page.getByLabel("Value", { exact: true })).toHaveCount(0);
  await page.getByRole("slider", { name: /Choose x/ }).fill("7");
  await check();
  await next();
  await page.reload();
  // Progress is saved by step id, so a reload resumes on the prediction.
  await expect(page.getByRole("heading", { name: "If x = 6, what comes out?" })).toBeVisible();
  // Before the response the machine shows its givens only.
  await expect(page.getByRole("img", { name: /output is hidden until you answer/ })).toBeVisible();
  await shoot(page, "maths-predict");
  await page.getByLabel("Value", { exact: true }).fill("6");
  await check();
  // A prediction gets one try, then the outcome and the teaching.
  await expect(page.getByText("Not right. Here is the answer.")).toBeVisible();
  await expect(page.locator(".beat-explanation")).toContainText("18");
  await next();
  await page.getByRole("button", { name: /Inside one expression/ }).click();
  await check();
  await page.getByRole("button", { name: /Show the next line/ }).click();
  await next();
  await page.getByLabel("Left side", { exact: true }).fill("9");
  await check();
  await page.getByRole("button", { name: /Yes/ }).click();
  await check();
  await next();
  await page.getByLabel("Value", { exact: true }).fill("13");
  await check();
  await next();
  await page.getByLabel("Value", { exact: true }).fill("17");
  await check();
  await next();
  // Skill check: three items, no hints.
  await expect(page.getByText("Skill check · 1 of 3")).toBeVisible();
  await page.getByLabel("Value", { exact: true }).fill("14");
  await check();
  await next();
  await page.getByRole("button", { name: /Yes/ }).click();
  await check();
  await next();
  await page.getByRole("button", { name: /One letter has one value/ }).click();
  await check();
  await next();
  await page.getByRole("button", { name: "Start the review", exact: true }).click();
  await expect(page.getByText("For x = −2, what is 4x + 3?", { exact: true })).toBeVisible();
  await page.getByLabel("Your answer", { exact: true }).fill("-5");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
  await page.getByRole("button", { name: "Next card", exact: true }).click();
  await page.getByLabel("Your answer", { exact: true }).fill("The sides must be equal.");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Close: the key idea, the cards added, and the bridge to lesson 2.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A letter stands for a number.",
  );
  await expect(page.getByText("2 cards added to your review")).toBeVisible();
  await shoot(page, "maths-close");
  await next();
  // The finish screen shows the saved result; waiting for it also lets the completion save land
  // before the page closes (later specs rely on this lesson being finished).
  await expect(page.getByRole("heading", { level: 1, name: "Lesson complete" })).toBeVisible();
  await expect(page.locator(".finish-stats")).toBeVisible();
});

test("coordinate grids and fractional answers fit each viewport", async ({ page }) => {
  mkdirSync(OUTPUT, { recursive: true });
  await page.goto("/courses/maths-foundations/lessons/how-steep-is-it");
  await expect(page.getByText("Measure the change", { exact: false }).first()).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: join(OUTPUT, `maths-grid-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
  await page.goto(
    "/courses/maths-foundations/lessons/undoing-in-the-right-order/stages/undoing-in-the-right-order:check:maths-undoing-in-the-right-order-practice-2",
  );
  await page.getByLabel("Value", { exact: true }).fill("3/4");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
  await expect(page.getByLabel("Unit", { exact: true })).toHaveCount(0);
});

test("Logic truth tables respond to cases and preserve server marking", async ({ page }) => {
  await page.goto("/courses/logic-and-reasoning/lessons/if-then-claims");
  await expect(page.getByText("Find the broken rule", { exact: false }).first()).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: join(OUTPUT, `logic-conditional-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
  // Before the answer the result column is the question: masked, with no row switches (M1, M7).
  await expect(page.getByRole("button", { name: "p: True", exact: true })).toHaveCount(0);
  await expect(page.locator(".truth-diagram tbody tr td:last-child").first()).toHaveText("?");
  await page.getByRole("button", { name: /p true, q false/ }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "correct");
  // Once graded, the switches read any row of the table.
  await page.getByRole("button", { name: "p: True", exact: true }).click();
  await expect(page.getByText("For these inputs, p → q is")).toContainText("true");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Only one row fails", { exact: false }).first()).toBeVisible();
  await page.getByLabel("Value", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("A false starting condition", { exact: false }).first(),
  ).toBeVisible();
  await page.getByLabel("Your answer", { exact: true }).fill("true");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Try another subject", { exact: false }).first()).toBeVisible();
});

test("Computer Science runs edited code and traces a sorted search", async ({ page }) => {
  await page.goto("/courses/cs-basics/lessons/steps-a-machine-could-follow");
  await expect(page.getByText("Follow the value", { exact: false }).first()).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: join(OUTPUT, `cs-program-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
  // Running the program prints the answer, so it opens once the prediction is in (audit M1).
  await expect(page.getByRole("button", { name: "Run code", exact: true })).toBeDisabled();
  await page.getByLabel("Value", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "correct");
  await page.getByLabel("Edit code", { exact: true }).fill("x = 2\nx = x * 4");
  await page.getByRole("button", { name: "Run code", exact: true }).click();
  await expect(page.getByText("Final x =")).toContainText("8");
  await expect(page.getByText(/Answer for the lesson’s original example/)).toBeVisible();
  await page.getByRole("button", { name: "Restore example", exact: true }).click();
  await expect(page.getByLabel("Edit code", { exact: true })).toHaveValue(
    "x = 3\nx = x + 2\nx = x * 4",
  );
  await page.getByRole("button", { name: "Run code", exact: true }).click();
  await expect(page.getByText("Final x =")).toContainText("20");
  await page.getByRole("slider", { name: /Trace step/ }).fill("3");
  await expect(page.getByText("Line 3 · Update x")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Order changes the result", { exact: false }).first()).toBeVisible();
  await page.goto("/courses/cs-basics/lessons/halving-the-problem");
  await expect(page.getByText("Discard a sorted half", { exact: false }).first()).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: join(OUTPUT, `cs-search-${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }
  // Stepping through the search shows the comparisons the question asks for, so it opens after
  // the answer (audit M1).
  await expect(page.getByRole("button", { name: "Start search", exact: true })).toHaveCount(0);
  await page.getByLabel("Value", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".question-beat")).toHaveAttribute("data-result", "correct");
  await page.getByRole("button", { name: "Start search", exact: true }).click();
  await expect(page.getByText("Check 1:")).toContainText("11");
  await page.getByRole("button", { name: "Next check", exact: true }).click();
  await expect(page.getByText("Check 2:")).toContainText("17 matches the target");
});
