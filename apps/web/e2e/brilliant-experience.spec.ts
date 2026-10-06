import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CourseBundle, Question } from "@discere/contracts";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";

const root = join(import.meta.dirname, "../../..");
const output = join(root, "docs/brilliant-experience/screens");
const stats = JSON.parse(
  readFileSync(join(root, "content/probability-statistics/bundle.json"), "utf8"),
) as CourseBundle;
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
async function capture(page: Page, name: string, viewport: { width: number; height: number }) {
  mkdirSync(output, { recursive: true });
  await page.setViewportSize(viewport);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.allSettled(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    );
  });
  if (name.startsWith("roadmap-") && !name.startsWith("roadmap-motion")) {
    await page
      .locator(".roadmap-node.is-selected .roadmap-stop")
      .evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    const stop = await page.locator(".roadmap-node.is-selected .roadmap-stop").boundingBox();
    const launch = await page.locator(".roadmap-launch").boundingBox();
    expect(stop!.y + stop!.height).toBeLessThan(launch!.y);
  } else await page.evaluate(() => window.scrollTo(0, 0));
  if (name === "correct-feedback" || name === "incorrect-explanation") {
    await page.locator(".choice-card-selected").scrollIntoViewIfNeeded();
  }
  await page.screenshot({
    path: join(output, name + "-" + viewport.width + "x" + viewport.height + ".png"),
    fullPage: !name.startsWith("roadmap-"),
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(1);
}
async function expectReservedFooter(page: Page) {
  const canvas = await page.locator(".stage-canvas").boundingBox();
  const footer = await page.getByRole("contentinfo", { name: "Lesson actions" }).boundingBox();
  expect(canvas!.y + canvas!.height).toBeLessThanOrEqual(footer!.y + 1);
  const explanation = page.locator(".beat-explanation");
  if (await explanation.count()) {
    const box = await explanation.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(footer!.y);
  }
}
async function respond(page: Page, question: Question) {
  if (question.answerAuthority.kind === "numeric")
    await page.getByLabel("Value", { exact: true }).fill(String(question.answerAuthority.value));
  else if (question.choices)
    await page
      .getByRole("button", { name: question.answerAuthority.acceptedIdeas[0]!, exact: false })
      .click();
  else
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(question.answerAuthority.acceptedIdeas[0]!);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".question-beat[data-result=correct]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Why?", exact: true })).toBeVisible();
}
test("the catalogue contains eighteen real courses in illustrated learning paths", async ({
  page,
  request,
}) => {
  const list = (await (await request.get("/api/courses")).json()).courses;
  expect(list).toHaveLength(18);
  expect(list.map((course: { id: string }) => course.id)).toContain(
    "linear-algebra-vectors-and-maps",
  );
  expect(list.map((course: { id: string }) => course.id)).toContain("chemistry-atoms-to-reactions");
  expect(list.map((course: { id: string }) => course.id)).toContain("biology-cells-to-ecosystems");
  // The six courses added on 6 October 2026.
  for (const id of [
    "engineering-structures-and-machines",
    "economics-markets-and-strategy",
    "english-reading-writing-and-rhetoric",
    "astronomy-sky-to-cosmos",
    "philosophy-knowledge-mind-and-ethics",
    "psychology-how-minds-work",
  ])
    expect(list.map((course: { id: string }) => course.id)).toContain(id);
  await page.goto("/courses");
  await expect(page.getByRole("heading", { name: "Learning paths", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Roman|Electronics/ })).toHaveCount(0);
  for (const viewport of viewports) await capture(page, "catalogue", viewport);
  await page.setViewportSize({ width: 1024, height: 768 });
  const path = page.getByRole("region", { name: "Foundations for thinking" });
  const lastCourse = path.locator(".course-card").last();
  await lastCourse.focus();
  const bounds = await lastCourse.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1024);
  // Below 1360 px a path wraps into a grid instead of scrolling sideways (app audit m2), so
  // no card is cut off and none needs a horizontal scroll to reach.
  expect(
    await path.locator(".learning-path-courses").evaluate((e) => e.scrollWidth - e.clientWidth),
  ).toBeLessThanOrEqual(1);
  expect(
    await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(13, 15, 16)"); // The game layer's ink beneath the aurora (styles/game.css).
});
test("all active courses have real pedestal stops and keyboard-operable lesson previews", async ({
  page,
  request,
}) => {
  const courses = (await (await request.get("/api/courses")).json()).courses;
  for (const course of courses) {
    await page.goto("/courses/" + course.id);
    await expect(
      page.getByRole("heading", { name: course.title, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.locator(".roadmap-stop")).toHaveCount(course.lessonCount);
    const target = page.locator(".roadmap-stop").nth(1);
    await target.focus();
    await page.keyboard.press("Enter");
    await expect(target).toHaveAttribute("aria-pressed", "true");
    const href = await page.locator(".roadmap-launch a").getAttribute("href");
    expect(href).toContain("/courses/" + course.id + "/lessons/");
    for (const viewport of viewports) await capture(page, "roadmap-" + course.id, viewport);
  }
});
test("a mistake opens its correction, preserves the failed result and allows the next question", async ({
  page,
  request,
}) => {
  const lesson = stats.lessons.find((item) => item.id === "same-centre-different-spread")!;
  await page.goto("/courses/probability-statistics/lessons/" + lesson.id);
  // The old step title is an eyebrow now; the question is the headline (audit M2).
  await expect(page.locator(".step-eyebrow")).toContainText(
    lesson.steps[0]!.blocks[0]!.kind === "heading" ? lesson.steps[0]!.blocks[0]!.text : "",
  );
  await expect(page.locator(".stat-probability")).toHaveCount(0);
  const first = stats.questions.find((item) => item.id === lesson.steps[0]!.checkQuestionId)!;
  if (first.answerAuthority.kind === "numeric")
    await page.getByLabel("Value", { exact: true }).fill("999");
  else {
    const accepted = first.answerAuthority.acceptedIdeas;
    const wrong = first.choices!.find((choice) => !accepted.includes(choice.label))!;
    await page.getByRole("button", { name: wrong.label, exact: false }).click();
  }
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".question-beat[data-result=incorrect]")).toBeVisible();
  // One attempt policy (audit B3): a plain verdict and a retry first; the answer on request.
  const reveal = page.getByRole("button", { name: "Show the answer", exact: true });
  if (await reveal.count()) {
    await expect(page.getByText("Not right, try again.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Check again", exact: true })).toBeVisible();
    await reveal.click();
  }
  await expect(page.locator(".beat-explanation")).toBeVisible();
  await expect(page.getByRole("button", { name: "Check again", exact: true })).toHaveCount(0);
  for (const viewport of viewports) {
    await capture(page, "incorrect-explanation", viewport);
    await expectReservedFooter(page);
    const button = await page.getByRole("button", { name: "Continue", exact: true }).boundingBox();
    expect(button!.y + button!.height).toBeLessThan(viewport.height - 8);
  }
  const result = await request.get(
    "/api/courses/probability-statistics/lessons/" + lesson.id + "/result",
  );
  expect(result.status()).toBe(409);
  expect((await result.json()).code).toBe("LESSON_NOT_FINISHED");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // The step count leads the eyebrow on a question-led screen (audit M2).
  await expect(page.locator(".step-eyebrow")).toContainText("Step 2 of 4");
  expect(
    (await (await request.get("/api/review")).json()).courses.map(
      (item: { courseId: string }) => item.courseId,
    ),
  ).toEqual(["probability-statistics"]);
});
test("correctness earns a green frame and original sound; muting stops later cues", async ({
  page,
  request,
}) => {
  await request.put("/api/study/preferences", { data: { sound: true, motion: "system" } });
  await page.addInitScript(() => {
    const runtime = window as unknown as {
      AudioContext: typeof AudioContext;
      __discereNotes: number;
    };
    const Native = runtime.AudioContext;
    runtime.__discereNotes = 0;
    runtime.AudioContext = class extends Native {
      override createOscillator() {
        runtime.__discereNotes++;
        return super.createOscillator();
      }
    };
  });
  const lesson = stats.lessons.find((item) => item.id === "centre-and-outliers")!;
  await page.goto("/courses/probability-statistics/lessons/" + lesson.id);
  await expect(page.locator(".stat-measures")).toHaveCount(0);
  for (const viewport of viewports) await capture(page, "question", viewport);
  const first = stats.questions.find((item) => item.id === lesson.steps[0]!.checkQuestionId)!;
  await respond(page, first);
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __discereNotes: number }).__discereNotes),
    )
    .toBeGreaterThanOrEqual(2);
  expect(
    await page
      .locator(".learning-player")
      .evaluate((element) => getComputedStyle(element, "::after").borderTopColor),
  ).toBe("rgb(55, 207, 97)");
  for (const viewport of viewports) {
    await capture(page, "correct-feedback", viewport);
    await expectReservedFooter(page);
    const why = await page.getByRole("button", { name: "Why?", exact: true }).boundingBox();
    expect(why?.width).toBeLessThan(100);
    expect(why?.height).toBeLessThan(60);
    const next = await page.getByRole("button", { name: "Continue", exact: true }).boundingBox();
    expect(next!.y + next!.height).toBeLessThan(viewport.height - 8);
  }
  await page.getByRole("button", { name: "Why?", exact: true }).click();
  await expect(page.locator(".beat-explanation")).toBeVisible();
  // Sound is a toggle in the lesson toolbar; pressed means on.
  const sound = page
    .getByRole("toolbar", { name: "Lesson tools" })
    .getByRole("button", { name: "Sound", exact: true });
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  const before = await page.evaluate(
    () => (window as unknown as { __discereNotes: number }).__discereNotes,
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const second = stats.questions.find((item) => item.id === lesson.steps[1]!.checkQuestionId)!;
  await respond(page, second);
  expect(
    await page.evaluate(() => (window as unknown as { __discereNotes: number }).__discereNotes),
  ).toBe(before);
  await request.put("/api/study/preferences", { data: { sound: true } });
});
test("a question-led lesson ends with independent recall and a saved completion", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  const lesson = stats.lessons.find((item) => item.id === "independent-repetitions")!;
  await page.goto("/courses/probability-statistics/lessons/" + lesson.id);
  for (const step of lesson.steps) {
    await respond(page, stats.questions.find((item) => item.id === step.checkQuestionId)!);
    await page.getByRole("button", { name: /^(Continue|Finish)$/ }).click();
  }
  const ids = new Set(lesson.steps.map((step) => step.checkQuestionId));
  for (const id of lesson.questionIds.filter((id) => !ids.has(id))) {
    await expect(page.getByText("Skills check", { exact: false })).toBeVisible();
    await respond(page, stats.questions.find((item) => item.id === id)!);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.getByRole("button", { name: "Start the review", exact: true }).click();
  for (let index = 0; index < lesson.flashcardIds.length; index++) {
    const card = stats.flashcards.find((item) => item.id === lesson.flashcardIds[index])!;
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(
        card.answerAuthority!.kind === "numeric"
          ? String(card.answerAuthority!.value)
          : card.answerAuthority!.acceptedIdeas[0]!,
      );
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reveal answer", exact: true })).toHaveCount(0);
    for (const viewport of viewports) if (index === 0) await capture(page, "review", viewport);
    await page.getByRole("button", { name: /^Good/, exact: false }).first().click();
    await page
      .getByRole("button", {
        name: index + 1 < lesson.flashcardIds.length ? "Next card" : "Continue",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Ready for the next idea", exact: true }),
  ).toBeVisible();
  const before = await (
    await request.get("/api/courses/probability-statistics/lessons/" + lesson.id + "/result")
  ).json();
  expect(before.completedAt).not.toBeNull();
  expect(before.reviews).toBe(2);
  expect(before.independent).toBe(6);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ready for the next idea", exact: true }),
  ).toBeVisible();
  const after = await (
    await request.get("/api/courses/probability-statistics/lessons/" + lesson.id + "/result")
  ).json();
  expect(after.xp).toBe(before.xp);
  expect(after.completedAt).toBe(before.completedAt);
  for (const viewport of viewports) await capture(page, "completion", viewport);
  await page.goto("/courses/probability-statistics");
  await expect(
    page.getByRole("button", { name: lesson.title + ", completed", exact: true }),
  ).toBeVisible();
  for (const viewport of viewports) await capture(page, "earned-roadmap", viewport);
});

test("roadmap motion follows the system and the saved reduced-motion preference", async ({
  page,
  request,
}) => {
  await request.put("/api/study/preferences", { data: { motion: "system" } });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/courses/maths-foundations");
  await expect
    .poll(() =>
      page.locator(".roadmap-companion").evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("companion-arrive");
  for (const viewport of viewports) await capture(page, "roadmap-motion", viewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page.locator(".roadmap-companion").evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("none");
  await request.put("/api/study/preferences", { data: { motion: "reduced" } });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect
    .poll(() =>
      page.locator(".roadmap-companion").evaluate((el) => getComputedStyle(el).animationName),
    )
    .toBe("none");
  await request.put("/api/study/preferences", { data: { motion: "system" } });
});
