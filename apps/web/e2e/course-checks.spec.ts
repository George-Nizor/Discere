import { mkdtempSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import { CourseBundleSchema, type CourseCheckDefinition } from "@discere/contracts";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { test, expect } from "./fixtures.js";
const bundle = CourseBundleSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, "../../../content/maths-foundations/bundle.json"),
      "utf8",
    ),
  ),
);
const checks = bundle.courseChecks!;
const sizes = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
const output = resolve(import.meta.dirname, "../../../docs/course-checks/screens");
let server: DiscereApp,
  address: string,
  directory: string,
  now = new Date("2026-10-02T00:00:00Z");
test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-check-browser-"));
  server = await createApp({
    dbPath: join(directory, "checks.sqlite"),
    migrate: true,
    clock: () => now,
    webRoot: resolve(import.meta.dirname, "../dist"),
  });
  address = await server.app.listen({ port: 0, host: "127.0.0.1" });
  mkdirSync(output, { recursive: true });
});
test.afterAll(async () => {
  await server?.app.close();
  if (directory) rmSync(directory, { recursive: true, force: true });
});
function solution(item: CourseCheckDefinition["items"][number]) {
  const q = item.question,
    a = q.answerAuthority;
  return a.kind === "numeric"
    ? String(a.value)
    : q.choices!.find((c) => a.acceptedIdeas.includes(c.label))!.label;
}
async function capture(page: Page, name: string) {
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: join(output, name + "-" + size.width + ".png"),
      fullPage: false,
    });
  }
}
async function answer(page: Page, item: CourseCheckDefinition["items"][number], wrong = false) {
  if (item.question.choices)
    await page.getByRole("button", { name: solution(item), exact: false }).click();
  else await page.getByLabel("Value", { exact: true }).fill(wrong ? "999" : solution(item));
  await page.getByRole("radio", { name: "Very sure", exact: true }).check();
  await page.getByRole("button", { name: /^(Save and continue|Finish check)$/ }).click();
}
async function completeLessons(request: APIRequestContext) {
  async function post(url: string, data: unknown = {}) {
    const response = await request.post(address + url, { data });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  }
  for (const lesson of bundle.lessons) {
    for (const id of [...lesson.steps.map((s) => s.checkQuestionId), ...lesson.questionIds].filter(
      Boolean,
    )) {
      const q = bundle.questions.find((q) => q.id === id)!,
        a = q.answerAuthority;
      const result = await post("/api/attempts", {
        questionId: q.id,
        response:
          a.kind === "numeric" ? String(a.value) : q.choices ? a.acceptedIdeas[0] : a.exampleAnswer,
        mode: "coach",
      });
      expect(result.correct).toBe(true);
    }
    for (const cardId of lesson.flashcardIds) {
      const card = bundle.flashcards.find((c) => c.id === cardId)!,
        a = card.answerAuthority!;
      const session = await post("/api/review/sessions", {
        lessonId: lesson.id,
        cardId,
        mode: "coach",
      });
      await post("/api/review/sessions/" + session.sessionId + "/respond", {
        response: a.kind === "numeric" ? String(a.value) : a.acceptedIdeas[0],
      });
      await post("/api/review/sessions/" + session.sessionId + "/reveal");
      await post("/api/review/sessions/" + session.sessionId + "/rate", {
        rating: "easy",
        recalled: true,
      });
    }
    const journey = await (
      await request.get(
        address + "/api/courses/maths-foundations/lessons/" + lesson.id + "/journey",
      )
    ).json();
    for (const stage of journey.stages) {
      const saved = await request.put(
        address + "/api/courses/maths-foundations/lessons/" + lesson.id + "/progress",
        { data: { stageId: stage.id, state: "completed", interactionState: {} } },
      );
      expect(saved.ok(), await saved.text()).toBe(true);
    }
  }
}
test("placement preserves drafts and first responses, hides feedback, and shows targeted results at three sizes", async ({
  page,
}) => {
  await page.goto(address + "/courses/maths-foundations");
  await page.getByRole("link", { name: "Find your starting point" }).click();
  await capture(page, "placement-intro");
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: checks[0]!.items[0]!.question.prompt }),
  ).toBeFocused();
  await page.getByLabel("Value", { exact: true }).fill("999");
  await page.getByRole("radio", { name: "Very sure", exact: true }).check();
  await page.reload();
  await expect(page.getByLabel("Value", { exact: true })).toHaveValue("999");
  await expect(page.getByRole("radio", { name: "Very sure", exact: true })).toBeChecked();
  await capture(page, "placement-question");
  await page.getByRole("button", { name: "Save and continue", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: checks[0]!.items[1]!.question.prompt }),
  ).toBeVisible();
  await expect(page.getByText("Look through your answers")).toHaveCount(0);
  await page.getByRole("link", { name: "Return to course", exact: true }).click();
  await expect(page.getByText("Continue where you left off")).toBeVisible();
  await page.getByRole("link", { name: "Find your starting point", exact: true }).click();
  await page.getByRole("button", { name: "Continue check", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: checks[0]!.items[1]!.question.prompt }),
  ).toBeVisible();
  for (const [i, item] of checks[0]!.items.entries()) {
    if (i === 0) continue;
    if (i === 1) await capture(page, "placement-choice");
    if (i === 4) await capture(page, "placement-graph");
    await answer(page, item);
  }
  await expect(
    page.getByRole("heading", { name: "You already know much of this course", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".check-result-score")).toHaveText("5 / 6 correct");
  await expect(page.getByText(/Your roadmap now marks \d+ lessons? as known/)).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Recommended lessons" })
      .getByRole("link", { name: "What a letter stands for" }),
  ).toBeVisible();
  await capture(page, "placement-result");
  await page.locator(".check-explanations summary").first().click();
  await expect(page.getByText("Replace x with -3:", { exact: false })).toBeVisible();
  const url = page.url();
  await page.reload();
  await expect(page.locator(".check-result-score")).toHaveText("5 / 6 correct");
  await expect(page.locator(".check-player")).not.toHaveClass(/is-fresh-finish/);
  // The roadmap adapts: placed-out lessons are optional, and the start moves to the gap.
  await page.goto(address + "/courses/maths-foundations");
  await expect(
    page.getByRole("button", { name: "What a letter stands for, next lesson" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /known from your placement, optional/ }).first(),
  ).toBeVisible();
  await page.goto(address + "/courses/maths-foundations/checks/starting-point");
  await page.getByRole("button", { name: "See your results", exact: true }).click();
  await expect(page).toHaveURL(url);
});
test("the mixed challenge earns saved results and fresh delayed problems appear in Review after seven days", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await page.goto(address + "/courses/maths-foundations/checks/mixed-challenge");
  await expect(page.getByText(/Finish the 6 remaining lessons/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
  await completeLessons(request);
  await page.reload();
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const item of checks[1]!.items) {
    if (item.visual.type === "table") await capture(page, "mixed-table");
    await answer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("8 / 8 correct");
  await expect(page.getByText(/Fresh applications return on/)).toBeVisible();
  await capture(page, "mixed-result");
  await page.goto(address + "/review");
  await expect(page.getByRole("region", { name: "Later course checks" })).toHaveCount(0);
  now = new Date("2026-10-09T00:00:00Z");
  await page.reload();
  await page
    .getByRole("region", { name: "Later course checks" })
    .getByRole("link", { name: "Use it a week later" })
    .click();
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const item of checks[2]!.items) await answer(page, item);
  await expect(
    page.getByRole("heading", { name: "What stayed with you", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".check-result-score")).toHaveText("6 / 6 correct");
  await capture(page, "transfer-result");
  await page.goto(address + "/review");
  await expect(page.getByRole("region", { name: "Later course checks" })).toHaveCount(0);
});
