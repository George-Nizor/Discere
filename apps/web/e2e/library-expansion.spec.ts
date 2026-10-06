import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";

const output = join(import.meta.dirname, "../../../docs/library-expansion/screens");
const bundle = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "../../../content/probability-statistics/bundle.json"),
    "utf8",
  ),
);
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];

async function capture(page: Page, name: string) {
  mkdirSync(output, { recursive: true });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.allSettled(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
          .map((animation) => animation.finished),
      );
      window.scrollTo(0, 0);
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: join(output, name + "-" + viewport.width + "x" + viewport.height + ".png"),
      fullPage: true,
    });
  }
}
test("the library filters, survives refresh and respects both motion settings", async ({
  page,
}) => {
  await page.goto("/courses");
  await expect(page.getByRole("searchbox")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".course-card")
        .first()
        .evaluate((card) => getComputedStyle(card).animationName),
    )
    .toBe("none");
  await capture(page, "library-reduced");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(page.getByRole("searchbox")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".course-card")
        .first()
        .evaluate((card) => getComputedStyle(card).animationName),
    )
    .toBe("discere-rise");
  await capture(page, "library-motion");
  // capture() ends at phone width, where the subject chips become one Subject select (app
  // audit m3); the chips are the desktop control.
  await expect(page.getByRole("combobox", { name: "Subject" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Filter by subject" })).toBeHidden();
  await page.setViewportSize(viewports[0]!);
  await page.getByRole("button", { name: "Mathematics", exact: true }).click();
  await page.getByRole("searchbox").fill("probability");
  await expect(
    page.locator(".course-card").filter({ hasText: "Probability and Statistics" }),
  ).toBeVisible();
  await expect(page.locator(".course-card")).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue("probability");
  await expect(page.getByRole("button", { name: "Mathematics", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.setViewportSize(viewports[2]!);
  await expect(page.getByRole("combobox", { name: "Subject" })).toHaveValue("Mathematics");
  await page.setViewportSize(viewports[0]!);
  await page.getByRole("searchbox").fill("zzqqx");
  await expect(page.getByRole("heading", { name: "Nothing matches that search" })).toBeVisible();
  await page.getByRole("button", { name: "Show all courses" }).click();
  await expect(
    page.locator(".course-card").filter({ hasText: "Probability and Statistics" }),
  ).toBeVisible();
});

test("statistics diagrams teach at every viewport and the lesson earns its completion", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const before = (await (await page.request.get("/api/courses/probability-statistics")).json())
    .course.completedLessonCount;
  for (const [lesson, name] of [
    ["when-the-condition-changes", "conditional-grid"],
    ["centre-and-outliers", "outliers"],
    ["samples-and-populations", "sampling"],
  ]) {
    await page.goto("/courses/probability-statistics/lessons/" + lesson);
    await expect(page.getByRole("img").last()).toBeVisible();
    await capture(page, name!);
  }
  await page.getByRole("button", { name: "Both groups", exact: true }).click();
  await expect(page.getByRole("button", { name: "Both groups", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".stat-measures")).toHaveCount(0);
  await page.goto("/courses/probability-statistics/lessons/counting-outcomes");
  await page.getByRole("slider", { name: /Sum equals/ }).fill("12");
  await expect(page.getByRole("img", { name: /sum equals 12/ })).toBeVisible();
  await expect(page.locator(".stat-outcome-cell")).toHaveCount(36);
  const lesson = bundle.lessons.find((item: { id: string }) => item.id === "counting-outcomes");
  for (let index = 0; index < 4; index++) {
    const question = bundle.questions.find(
      (item: { id: string }) => item.id === lesson.steps[index].checkQuestionId,
    );
    if (question.answerAuthority.kind === "numeric")
      await page.getByLabel("Value", { exact: true }).fill(String(question.answerAuthority.value));
    else
      await page.getByRole("button", { name: question.answerAuthority.acceptedIdeas[0] }).click();
    await page.getByRole("button", { name: "Check answer", exact: true }).click();
    await page
      .getByRole("button", { name: index === 3 ? "Finish" : "Continue", exact: true })
      .click();
    if (index === 0) {
      await page.reload();
      // The reload resumes on step 2, whose old title is now its eyebrow (audit M2).
      await expect(page.locator(".step-eyebrow")).toContainText("Step 2 of");
      await expect(page.locator(".step-eyebrow")).toContainText(lesson.steps[1].blocks[0].text);
    }
  }
  await page.getByLabel("Value", { exact: true }).fill("1/4");
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const final = bundle.questions.find((item: { id: string }) => item.id === lesson.questionIds[1]);
  await page.getByRole("button", { name: final.answerAuthority.acceptedIdeas[0] }).click();
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Start the review", exact: true }).click();
  for (const [index, response] of ["1/18", "complement"].entries()) {
    await page.getByLabel("Your answer", { exact: true }).fill(response);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reveal answer", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /^Good/ }).click();
    await page
      .getByRole("button", { name: index === 0 ? "Next card" : "Continue", exact: true })
      .click();
  }
  await expect(page.getByRole("heading", { name: "Ready for the next idea" })).toBeVisible();
  await capture(page, "statistics-completion");
  const progress = await page.request.get("/api/courses/probability-statistics");
  expect((await progress.json()).course.completedLessonCount).toBe(before + 1);
});
