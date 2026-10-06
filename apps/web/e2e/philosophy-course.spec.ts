import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page, APIRequestContext } from "@playwright/test";
import { CourseBundleSchema, type Question, type CourseCheckDefinition } from "@discere/contracts";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { test, expect } from "./fixtures.js";
const root = resolve(import.meta.dirname, "../../.."),
  courseId = "philosophy-knowledge-mind-and-ethics";
const candidate = process.env["DISCERE_PHILOSOPHY_CANDIDATE"] === "1";
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
const output = join(root, "docs/library-expansion/screens/philosophy");
let directory: string,
  address: string,
  server: DiscereApp,
  now = new Date("2026-10-06T00:00:00Z");
test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-philosophy-browser-"));
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
    dbPath: join(directory, "philosophy.sqlite"),
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
  }
}
/** Choice buttons are named with their letter, so match the label at the end of the name. */
const ending = (label: string) =>
  new RegExp("(^|\\s)" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$");
async function answer(page: Page, q: Question, wrong = false) {
  const a = q.answerAuthority;
  if (a.kind === "numeric")
    await page.getByLabel("Value", { exact: true }).fill(String(wrong ? a.value + 1000 : a.value));
  else if (q.choices)
    await page
      .getByRole("group", { name: "Answer choices" })
      .getByRole("button", { name: ending(a.acceptedIdeas[0]!) })
      .click();
  else
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(wrong ? "I am not sure" : a.acceptedIdeas[0]!);
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
    const label = wrong
      ? item.question.choices!.find((c) => c.label !== a.acceptedIdeas[0])!.label
      : a.acceptedIdeas[0]!;
    await page.getByRole("button", { name: ending(label) }).click();
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
        { data: { stageId: stage.id, state: "completed", interactionState: {} } },
      );
      expect(r.ok(), await r.text()).toBe(true);
    }
  }
}
const explainer = (lessonId: string) =>
  address +
  "/courses/" +
  courseId +
  "/lessons/" +
  lessonId +
  "/stages/" +
  lessonId +
  "%3Aexplainer";

test("Philosophy roadmap, original artwork and every lesson explorer work at three sizes", async ({
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
    if (spec.type !== "philosophy_explorer") throw Error("Missing philosophy explorer");
    for (const size of sizes) {
      await page.setViewportSize(size);
      const cases = page.getByRole("group", { name: "Compare cases" });
      await cases.getByRole("button", { name: spec.cases[1]!.label, exact: true }).click();
      await expect(
        cases.getByRole("button", { name: spec.cases[1]!.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".phil-measures")).toHaveCount(0);
      await expect(page.locator(".philosophy-diagram")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await cases.getByRole("button", { name: spec.cases[0]!.label, exact: true }).click();
    }
    await capture(page, lesson.id);
  }
});

test("Philosophy explains a mistake, opens results after an answer, recalls fresh problems and saves completion", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const lesson = bundle.lessons.find((l) => l.id === "validity-and-soundness")!;
  await page.goto(address + "/courses/" + courseId + "/lessons/" + lesson.id);
  for (let i = 0; i < 4; i++) {
    const q = bundle.questions.find((q) => q.id === lesson.steps[i]!.checkQuestionId)!;
    if (i === 0)
      await expect(page.getByRole("table", { name: "Complete truth table" })).toHaveCount(0);
    await answer(page, q, i === 0);
    if (i === 0) {
      // A first miss no longer reveals the answer (audit B3); ask for it.
      await page.getByRole("button", { name: "Show the answer", exact: true }).click();
      await expect(page.locator(".beat-explanation")).toContainText("burst water main");
      await capture(page, "correction");
    }
    if (i === 1) {
      await expect(page.getByRole("table", { name: "Complete truth table" })).toBeVisible();
      await expect(page.locator(".phil-measures")).toContainText("Invalid");
      await capture(page, "truth-table");
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
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ready for the next idea", exact: true }),
  ).toBeVisible();
});

test("Philosophy explorers respond to keyboard, gate filtering and stop motion when reduced", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(explainer("validity-and-soundness"));
  const p = page.getByRole("button", { name: /^p, it rained overnight: true$/ });
  await p.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".phil-broken-note")).toContainText("The link breaks here");
  await capture(page, "counterexample");

  await page.goto(explainer("bayesian-evidence"));
  await expect(page.getByRole("button", { name: "Keep only them", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Mark who test positive", exact: true }).click();
  await expect(page.locator("circle.phil-dot")).toHaveCount(1000);
  await capture(page, "bayes-grid");

  await page.goto(explainer("functionalism-and-the-chinese-room"));
  for (const coin of ["10p", "10p", "10p"])
    await page.getByRole("button", { name: "Input " + coin, exact: true }).click();
  await expect(
    page.getByRole("list", { name: "Outputs so far" }).getByRole("listitem"),
  ).toHaveCount(3);
  await capture(page, "machine-table");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(explainer("kant-and-the-footbridge"));
  await page.getByRole("button", { name: "Push", exact: true }).click();
  await page.getByRole("button", { name: "Duty lens", exact: true }).click();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(page.getByText("1 struck on this run.", { exact: true })).toBeVisible();
  await capture(page, "footbridge");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.goto(explainer("virtue-and-the-mean"));
  const slider = page.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("End");
  await expect(page.locator(".phil-slider strong")).toHaveText("irascibility");
  await capture(page, "mean");
});

test("Philosophy placement keeps answers private until thirteen responses and preserves progress", async ({
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
      const resume = page.getByRole("button", { name: "Continue check", exact: true });
      await expect(
        page.getByRole("heading", { name: item.question.prompt, exact: true }).or(resume),
      ).toBeVisible();
      if (await resume.isVisible()) await resume.click();
    }
    if (i === 5) await capture(page, "placement-bayes");
    await expect(page.locator(".phil-measures")).toHaveCount(0);
    await checkAnswer(page, item, i === 0);
  }
  await expect(page.locator(".check-result-score")).toHaveText("12 / 13 correct");
  await capture(page, "placement-result");
});

test("Philosophy requires all lessons before the mixed check and a real seven-day delay for transfer", async ({
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
  await expect(page.locator(".check-result-score")).toHaveText("13 / 13 correct");
  await page.goto(address + "/courses/" + courseId + "/checks/" + transfer.id);
  await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
  now = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await page.goto(address + "/review");
  await page.getByRole("link", { name: /Use it a week later/ }).click();
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const [i, item] of transfer.items.entries()) {
    if (i === 12) await capture(page, "transfer-veil");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("13 / 13 correct");
  await capture(page, "transfer-result");
});
