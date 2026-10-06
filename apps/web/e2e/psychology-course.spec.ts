import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page, APIRequestContext } from "@playwright/test";
import { CourseBundleSchema, type Question, type CourseCheckDefinition } from "@discere/contracts";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { test, expect } from "./fixtures.js";
const root = resolve(import.meta.dirname, "../../.."),
  courseId = "psychology-how-minds-work";
const candidate = process.env["DISCERE_PSYCHOLOGY_CANDIDATE"] === "1";
const courseRoot = join(root, "content", courseId);
const bundle = CourseBundleSchema.parse(
  JSON.parse(
    readFileSync(join(courseRoot, candidate ? ".authoring/candidate.json" : "bundle.json"), "utf8"),
  ),
);
const sizes = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];
const output = join(root, "docs/library-expansion/screens/psychology");
let directory: string,
  address: string,
  server: DiscereApp,
  now = new Date("2026-10-06T00:00:00Z");
test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-psychology-browser-"));
  const contentRoot = join(directory, "content");
  if (candidate) {
    const target = join(contentRoot, courseId);
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, "bundle.json"), JSON.stringify(bundle));
    cpSync(join(courseRoot, "assets"), join(target, "assets"), { recursive: true });
    // A disposable review fixture only. Publication requires the real reviewed provenance.
    writeFileSync(
      join(target, "assets/provenance.json"),
      JSON.stringify({
        file: "cover.svg",
        sha256: createHash("sha256")
          .update(readFileSync(join(target, "assets/cover.svg")))
          .digest("hex"),
        creator: "Discere",
        licence: "CC0",
        licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        reviewer: "Unpublished preview under visual review",
      }),
    );
  }
  server = await createApp({
    dbPath: join(directory, "psychology.sqlite"),
    migrate: true,
    clock: () => now,
    webRoot: resolve(import.meta.dirname, "../dist"),
    ...(candidate ? { contentRoot } : {}),
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
    if (name === "roadmap" && size.width <= 600) {
      const action = await page.locator(".roadmap-launch a").boundingBox();
      const navigation = await page.locator(".site-nav .nav-rail-list").boundingBox();
      expect(action!.y).toBeGreaterThanOrEqual(0);
      expect(action!.y + action!.height).toBeLessThan(navigation!.y);
    }
  }
}
async function answer(page: Page, q: Question, wrong = false) {
  const authority = q.answerAuthority;
  if (authority.kind === "numeric")
    await page
      .getByLabel("Value", { exact: true })
      .fill(String(wrong ? authority.value + 1000 : authority.value));
  else if (q.choices) {
    const chosen = wrong
      ? q.choices.find((c) => c.label !== authority.acceptedIdeas[0])!.label
      : authority.acceptedIdeas[0]!;
    await page
      .getByRole("group", { name: "Answer choices" })
      .getByRole("button", { name: chosen, exact: false })
      .click();
  } else
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(wrong ? "placebo" : authority.acceptedIdeas[0]!);
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
  if (a.kind === "numeric")
    await page.getByLabel("Value", { exact: true }).fill(wrong ? "999" : String(a.value));
  else {
    const choices = item.question.choices!;
    const selected = wrong
      ? choices.find((c) => c.label !== a.acceptedIdeas[0])!.label
      : a.acceptedIdeas[0]!;
    await page
      .getByRole("group", { name: "Answer choices" })
      .getByRole("button", { name: selected, exact: false })
      .click();
  }
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
      await request.get(address + "/api/courses/" + courseId + "/lessons/" + lesson.id + "/journey")
    ).json();
    for (const stage of journey.stages) {
      const r = await request.put(
        address + "/api/courses/" + courseId + "/lessons/" + lesson.id + "/progress",
        { data: { stageId: stage.id, state: "completed", interactionState: {} } },
      );
      expect(r.ok(), await r.text()).toBe(true);
    }
  }
}
test("Psychology roadmap, original artwork and every lesson work at three sizes", async ({
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
    if (spec.type !== "psychology_explorer") throw Error("Missing psychology diagram");
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: spec.cases[1]!.label, exact: true }).click();
      await expect(
        page.getByRole("button", { name: spec.cases[1]!.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".psych-measures")).toHaveCount(0);
      await expect(page.locator(".psychology-drawing")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await page.getByRole("button", { name: spec.cases[0]!.label, exact: true }).click();
    }
    await capture(page, lesson.id);
    const slider = page.getByRole("slider");
    if (await slider.count()) {
      const start = await slider.inputValue();
      await slider.focus();
      await page.keyboard.press("End");
      await expect(slider).toHaveValue((await slider.getAttribute("max"))!);
      if (
        [
          "forgetting-and-spacing",
          "conditioning",
          "working-memory",
          "attention-and-multitasking",
        ].includes(lesson.id)
      )
        await capture(page, lesson.id + "-end");
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      // A playback scrubber rewinds to its beginning; a model control (a criterion, a shift)
      // returns to its authored value.
      const playback = (await page.locator(".psych-playback").getByRole("slider").count()) > 0;
      await expect(slider, lesson.id).toHaveValue(playback ? "0" : start);
    }
  }
});
test("Psychology explains a mistake, gives green feedback, recalls fresh problems and saves completion", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const lesson = bundle.lessons[0]!;
  await page.goto(address + "/courses/" + courseId + "/lessons/" + lesson.id);
  for (let i = 0; i < 4; i++) {
    await answer(
      page,
      bundle.questions.find((q) => q.id === lesson.steps[i]!.checkQuestionId)!,
      i === 0,
    );
    if (i === 0) {
      // A first miss no longer reveals the answer (audit B3); ask for it.
      await page.getByRole("button", { name: "Show the answer", exact: true }).click();
      await expect(page.locator(".beat-explanation")).toContainText("36%");
      await capture(page, "correction");
    }
    if (i === 1) {
      await page.getByRole("button", { name: "Why?", exact: true }).click();
      await capture(page, "correct");
    }
    await page.getByRole("button", { name: i === 3 ? "Finish" : "Continue", exact: true }).click();
    if (i === 0) {
      await page.reload();
      await expect(
        page.getByText("Look for a third variable", { exact: false }).first(),
      ).toBeVisible();
    }
  }
  for (const id of lesson.questionIds) {
    await answer(page, bundle.questions.find((q) => q.id === id)!);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.getByRole("button", { name: "Start the review", exact: true }).click();
  for (const [i, id] of lesson.flashcardIds.entries()) {
    const c = bundle.flashcards.find((c) => c.id === id)!;
    const a = c.answerAuthority!;
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(a.kind === "numeric" ? String(a.value) : a.acceptedIdeas[0]!);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    if (i === 0) await capture(page, "recall");
    await expect(page.getByRole("button", { name: "Reveal answer", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /^Good/ }).click();
    await page
      .getByRole("button", { name: i === 0 ? "Next card" : "Continue", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Ready for the next idea", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "5 / 6" })).toBeVisible();
  await capture(page, "completion");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ready for the next idea", exact: true }),
  ).toBeVisible();
});
test("Psychology placement keeps answers private until twelve responses and preserves progress", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const check = bundle.courseChecks![0]!;
  await page.goto(address + "/courses/" + courseId + "/checks/" + check.id);
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const [i, item] of check.items.entries()) {
    await expect(
      page.getByRole("heading", { name: item.question.prompt, exact: true }),
    ).toBeVisible();
    if (i === 0) {
      await capture(page, "placement");
      await page.reload();
    }
    if (i === 8) await capture(page, "placement-support");
    await expect(page.locator(".psych-measures")).toHaveCount(0);
    await expect(page.getByText("Look through your answers", { exact: true })).toHaveCount(0);
    await checkAnswer(page, item, i === 0);
    if (i === 4) await page.reload();
  }
  await expect(page.locator(".check-result-score")).toHaveText("11 / 12 correct");
  await capture(page, "placement-result");
  // The missed lesson is the first recommendation, tagged "Start here".
  const start = page.getByRole("region", { name: "Recommended lessons" }).getByRole("link").first();
  await expect(start).toContainText("Correlation is not a cause");
  await expect(start).toContainText("Start here");
});
test("Psychology playback ends, pauses for reduced motion and supports keyboard controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(
    address +
      "/courses/" +
      courseId +
      "/lessons/forgetting-and-spacing/stages/forgetting-and-spacing%3Aexplainer",
  );
  const slider = page.getByRole("slider", { name: "Day" });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(slider).toHaveValue("0");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(slider).toHaveValue("100", { timeout: 8000 });
  await expect(page.getByRole("button", { name: "Replay", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);
  const stopped = await slider.inputValue();
  await page.waitForTimeout(120);
  expect(await slider.inputValue()).toBe(stopped);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await page.getByRole("button", { name: "Next stretch", exact: true }).click();
  expect(Number(await slider.inputValue())).toBeGreaterThan(1);
  await page.goto(
    address +
      "/courses/" +
      courseId +
      "/lessons/signal-detection/stages/signal-detection%3Aexplainer",
  );
  const criterion = page.getByRole("slider", { name: "Criterion position" });
  await expect(criterion).toHaveValue("0.84");
  await criterion.focus();
  await page.keyboard.press("End");
  await expect(criterion).toHaveValue("5");
  await expect(page.locator(".psych-measures")).toHaveCount(0);
  await capture(page, "criterion-moved");
});

test("Psychology requires all lessons before the mixed challenge and a real seven-day delay for transfer", async ({
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
  for (const [i, item] of mixed.items.entries()) {
    if (i === 2) await capture(page, "mixed-support");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("12 / 12 correct");
  await page.goto(address + "/courses/" + courseId + "/checks/" + transfer.id);
  await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
  now = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await page.goto(address + "/review");
  await expect(page.getByRole("link", { name: /Use it a week later/ })).toBeVisible();
  await page.getByRole("link", { name: /Use it a week later/ }).click();
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const [i, item] of transfer.items.entries()) {
    if (i === 8) await capture(page, "transfer-schedule");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("12 / 12 correct");
  await capture(page, "transfer-result");
});
