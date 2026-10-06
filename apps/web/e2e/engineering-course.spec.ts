import { mkdirSync, readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import { CourseBundleSchema, type CourseCheckDefinition, type Question } from "@discere/contracts";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { expect, test } from "./fixtures.js";

const root = resolve(import.meta.dirname, "../../.."),
  courseId = "engineering-structures-and-machines";
const bundle = CourseBundleSchema.parse(
  JSON.parse(readFileSync(join(root, "content", courseId, "bundle.json"), "utf8")),
);
const sizes = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
const output = join(root, "docs/library-expansion/screens/engineering");
let directory: string,
  address: string,
  server: DiscereApp,
  now = new Date("2026-10-06T00:00:00Z");

test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-engineering-browser-"));
  server = await createApp({
    dbPath: join(directory, "engineering.sqlite"),
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
async function answer(page: Page, q: Question, wrong = false) {
  const a = q.answerAuthority;
  if (a.kind === "numeric")
    await page.getByLabel("Value", { exact: true }).fill(String(wrong ? a.value + 1000 : a.value));
  else if (q.choices?.length)
    await page
      .getByRole("group", { name: "Answer choices" })
      .getByRole("button", { name: a.acceptedIdeas[0]!, exact: false })
      .click();
  else
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(wrong ? "not sure" : a.acceptedIdeas[0]!);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.locator(".question-beat")).toHaveAttribute(
    "data-result",
    wrong ? "incorrect" : "correct",
  );
}
async function checkAnswer(
  page: Page,
  item: CourseCheckDefinition["items"][number],
  wrong = false,
) {
  const a = item.question.answerAuthority;
  if (a.kind !== "numeric") throw Error("Expected an authored numeric Engineering problem.");
  await page.getByLabel("Value", { exact: true }).fill(wrong ? "999" : String(a.value));
  await page.getByRole("radio", { name: "Very sure", exact: true }).check();
  await page.getByRole("button", { name: /^(Save and continue|Finish check)$/ }).click();
}
async function completeLessons(request: APIRequestContext) {
  const post = async (url: string, data: unknown = {}) => {
    const r = await request.post(address + url, { data });
    expect(r.ok(), await r.text()).toBe(true);
    return r.json();
  };
  for (const lesson of bundle.lessons) {
    for (const id of [...lesson.steps.map((s) => s.checkQuestionId), ...lesson.questionIds].filter(
      Boolean,
    )) {
      const q = bundle.questions.find((q) => q.id === id)!,
        a = q.answerAuthority;
      const result = await post("/api/attempts", {
        questionId: q.id,
        response: a.kind === "numeric" ? String(a.value) : a.acceptedIdeas[0],
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
      await request.get(address + "/api/courses/" + courseId + "/lessons/" + lesson.id + "/journey")
    ).json();
    for (const stage of journey.stages) {
      const r = await request.put(
        address + "/api/courses/" + courseId + "/lessons/" + lesson.id + "/progress",
        {
          data: { stageId: stage.id, state: "completed", interactionState: {} },
        },
      );
      expect(r.ok(), await r.text()).toBe(true);
    }
  }
}

test("Engineering roadmap, cover and every lesson's explorer work at three sizes without leaking results", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  await page.goto(address + "/courses/" + courseId);
  await capture(page, "roadmap");
  await expect(page.locator(".course-overview img")).toBeVisible();
  for (const lesson of bundle.lessons) {
    const payload = await (
      await request.get(address + "/api/courses/" + courseId + "/lessons/" + lesson.id + "/journey")
    ).text();
    expect(payload).not.toMatch(/answerAuthority|acceptedIdeas|workedAnswer/);
    await page.goto(address + "/courses/" + courseId + "/lessons/" + lesson.id);
    const spec = lesson.steps[0]!.diagram!;
    if (spec.type !== "engineering_explorer") throw Error("Missing engineering diagram");
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: spec.cases[1]!.label, exact: true }).click();
      await expect(
        page.getByRole("button", { name: spec.cases[1]!.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".engr-measures")).toHaveCount(0);
      await expect(page.locator(".engineering-drawing")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await page.getByRole("button", { name: spec.cases[0]!.label, exact: true }).click();
    }
    await capture(page, lesson.id);
    const slider = page.locator(".engr-slider input").first();
    await slider.focus();
    await page.keyboard.press("End");
    await expect(slider).toHaveValue("100");
    if (
      ["trusses-by-joints", "stress-and-strain", "gear-trains", "levers-and-pulleys"].includes(
        lesson.id,
      )
    )
      await capture(page, lesson.id + "-end");
    await page.getByRole("button", { name: "Reset", exact: true }).click();
  }
});

test("Engineering corrects a mistake, reveals worked results after answering and saves completion", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const lesson = bundle.lessons.find((l) => l.id === "trusses-by-joints")!;
  await page.goto(address + "/courses/" + courseId + "/lessons/" + lesson.id);
  for (let i = 0; i < 4; i++) {
    const q = bundle.questions.find((q) => q.id === lesson.steps[i]!.checkQuestionId)!;
    if (i === 0) {
      // Member colours and forces stay hidden until the learner commits to an answer.
      await expect(page.locator(".engr-member-tension, .engr-member-compression")).toHaveCount(0);
    }
    await answer(page, q, i === 0);
    if (i === 0) {
      // A first miss leaves the question open for a retry (audit B3), so the worked forces stay
      // hidden until the learner asks for the answer.
      await expect(page.locator(".engr-member-tension, .engr-member-compression")).toHaveCount(0);
      await page.getByRole("button", { name: "Show the answer", exact: true }).click();
      await expect(page.locator(".engr-member-compression").first()).toBeVisible();
      await expect(page.locator(".engr-measures")).toContainText("compression");
      await capture(page, "truss-revealed");
    }
    await page.getByRole("button", { name: i === 3 ? "Finish" : "Continue", exact: true }).click();
  }
  for (const id of lesson.questionIds) {
    await answer(page, bundle.questions.find((q) => q.id === id)!);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.getByRole("button", { name: "Start the review", exact: true }).click();
  for (const [i, id] of lesson.flashcardIds.entries()) {
    const c = bundle.flashcards.find((c) => c.id === id)!;
    if (c.answerAuthority?.kind !== "numeric") throw Error("Expected numeric recall");
    await page.getByLabel("Your answer", { exact: true }).fill(String(c.answerAuthority.value));
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reveal answer", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /^Good/ }).click();
    await page
      .getByRole("button", { name: i === 0 ? "Next card" : "Continue", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Ready for the next idea", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ready for the next idea", exact: true }),
  ).toBeVisible();
});

test("Engineering playback is finite, stops for reduced motion and keeps keyboard stepping", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(
    address + "/courses/" + courseId + "/lessons/gear-trains/stages/gear-trains%3Aexplainer",
  );
  const slider = page.getByRole("slider", { name: "Running time" });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(slider).toHaveValue("100", { timeout: 9000 });
  await expect(page.getByRole("button", { name: "Replay", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);
  const stopped = await slider.inputValue();
  await page.waitForTimeout(150);
  expect(await slider.inputValue()).toBe(stopped);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await page.getByRole("button", { name: "Next step", exact: true }).click();
  expect(Number(await slider.inputValue())).toBeGreaterThan(1);
  await page.goto(
    address +
      "/courses/" +
      courseId +
      "/lessons/shear-and-moment/stages/shear-and-moment%3Aexplainer",
  );
  const probe = page.getByRole("slider", { name: "Section position along the beam" });
  await probe.focus();
  await page.keyboard.press("Home");
  await expect(probe).toHaveValue("0");
  await expect(page.locator(".engr-probe-readout")).toHaveCount(0);
});

test("Engineering placement keeps answers private until twelve responses", async ({ page }) => {
  test.setTimeout(90_000);
  const check = bundle.courseChecks![0]!;
  await page.goto(address + "/courses/" + courseId + "/checks/" + check.id);
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const [i, item] of check.items.entries()) {
    await expect(
      page.getByRole("heading", { name: item.question.prompt, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".engineering-check .engineering-drawing")).toBeVisible();
    if (i === 3) await capture(page, "placement-truss");
    if (i === 11) await capture(page, "placement-hoist");
    await expect(page.locator(".engr-measures")).toHaveCount(0);
    await checkAnswer(page, item, i === 0);
    if (i === 4) await page.reload();
  }
  await expect(page.locator(".check-result-score")).toHaveText("11 / 12 correct");
  await capture(page, "placement-result");
});

test("Engineering requires every lesson before the mixed check and a real seven-day delay for transfer", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const mixed = bundle.courseChecks![1]!,
    transfer = bundle.courseChecks![2]!;
  await page.goto(address + "/courses/" + courseId + "/checks/" + mixed.id);
  await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
  await completeLessons(request);
  await page.reload();
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const item of mixed.items) await checkAnswer(page, item);
  await expect(page.locator(".check-result-score")).toHaveText("12 / 12 correct");
  await page.goto(address + "/courses/" + courseId + "/checks/" + transfer.id);
  await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
  now = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await page.goto(address + "/review");
  await page.getByRole("link", { name: /Use it a week later/ }).click();
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const [i, item] of transfer.items.entries()) {
    if (i === 3) await capture(page, "transfer-warren");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("12 / 12 correct");
});
