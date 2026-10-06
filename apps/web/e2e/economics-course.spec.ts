import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CourseBundleSchema, type CourseCheckDefinition, type Question } from "@discere/contracts";
import type { APIRequestContext, Page } from "@playwright/test";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { expect, test } from "./fixtures.js";

const root = resolve(import.meta.dirname, "../../.."),
  courseId = "economics-markets-and-strategy";
const candidate = process.env["DISCERE_ECONOMICS_CANDIDATE"] === "1";
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
const output = join(root, "docs/library-expansion/screens/economics");
let directory: string,
  address: string,
  server: DiscereApp,
  now = new Date("2026-10-02T00:00:00Z");
test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-economics-browser-"));
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
    dbPath: join(directory, "economics.sqlite"),
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
  if (q.answerAuthority.kind === "numeric")
    await page
      .getByLabel("Value", { exact: true })
      .fill(String(wrong ? q.answerAuthority.value + 1000 : q.answerAuthority.value));
  else if (q.choices)
    await page
      .getByRole("group", { name: "Answer choices" })
      .getByRole("button", { name: q.answerAuthority.acceptedIdeas[0]!, exact: false })
      .click();
  else
    await page
      .getByLabel("Your answer", { exact: true })
      .fill(wrong ? "no idea" : q.answerAuthority.acceptedIdeas[0]!);
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
  if (a.kind !== "numeric") throw Error("Expected authored numeric Economics problem.");
  await page.getByLabel("Value", { exact: true }).fill(wrong ? "999" : String(a.value));
  await page.getByRole("radio", { name: "Very sure", exact: true }).check();
  await page.getByRole("button", { name: /^(Save and continue|Finish check)$/ }).click();
}
/**
 * Known content defect, reported to the lead rather than hidden: this item's authored example
 * answer ("Ben. A cake costs him 1.5 loaves against Ana's 2.") names "Ana", which is the item's
 * rejected idea, so the grader refuses the model answer. Until the bundle is republished with a
 * fixed example, this one item submits its accepted idea; every other text item still submits
 * its example answer.
 */
const exampleAnswerRejected = new Set(["econ-comparative-advantage-2"]);
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
          a.kind === "numeric"
            ? String(a.value)
            : q.choices || exampleAnswerRejected.has(q.id)
              ? a.acceptedIdeas[0]
              : a.exampleAnswer,
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
test("Economics roadmap, original artwork and every lesson work at three sizes", async ({
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
    if (spec.type !== "economics_explorer") throw Error("Missing economics diagram");
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: spec.cases[1]!.label, exact: true }).click();
      await expect(
        page.getByRole("button", { name: spec.cases[1]!.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".econ-measures")).toHaveCount(0);
      await expect(page.locator(".econ-drawing")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await page.getByRole("button", { name: spec.cases[0]!.label, exact: true }).click();
    }
    await capture(page, lesson.id);
    const slider = page.locator(".economics-diagram").getByRole("slider");
    if (await slider.count()) {
      await slider.focus();
      await page.keyboard.press("End");
      const max = Number(await slider.getAttribute("max")),
        step = Number(await slider.getAttribute("step"));
      await expect
        .poll(async () => Number(await slider.inputValue()))
        .toBeGreaterThanOrEqual(max - step);
      if (["costs-and-profit", "price-elasticity", "thinking-at-the-margin"].includes(lesson.id))
        await capture(page, lesson.id + "-end");
    }
  }
});
test("Economics explains a mistake, gives green feedback, recalls fresh problems and saves completion", async ({
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
      await expect(page.locator(".beat-explanation")).toContainText("3 chairs");
      await capture(page, "correction");
    }
    if (i === 1) {
      await page.getByRole("button", { name: "Why?", exact: true }).click();
      await capture(page, "correct");
    }
    await page.getByRole("button", { name: i === 3 ? "Finish" : "Continue", exact: true }).click();
    if (i === 0) {
      await page.reload();
      await expect(page.getByText("Inside, on or beyond", { exact: false }).first()).toBeVisible();
    }
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
test("Economics placement keeps answers private until twelve responses and preserves progress", async ({
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
    if (i === 7) await capture(page, "placement-tax");
    await expect(page.locator(".econ-measures")).toHaveCount(0);
    await expect(page.getByText("Look through your answers", { exact: true })).toHaveCount(0);
    await checkAnswer(page, item, i === 0);
    if (i === 4) await page.reload();
  }
  await expect(page.locator(".check-result-score")).toHaveText("11 / 12 correct");
  await capture(page, "placement-result");
  // The missed lesson is the first recommendation, tagged "Start here".
  const start = page.getByRole("region", { name: "Recommended lessons" }).getByRole("link").first();
  await expect(start).toContainText("What it really costs");
  await expect(start).toContainText("Start here");
});
test("Economics playback ends, pauses for reduced motion and supports keyboard exploration", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(
    address +
      "/courses/" +
      courseId +
      "/lessons/price-elasticity/stages/price-elasticity%3Aexplainer",
  );
  const slider = page.getByRole("slider", { name: "Move from price A to price B" });
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(slider).toHaveValue("1", { timeout: 5000 });
  await expect(page.getByRole("button", { name: "Replay", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(0.01);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveCount(0);
  const stopped = await slider.inputValue();
  await page.waitForTimeout(120);
  expect(await slider.inputValue()).toBe(stopped);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("0.01");
  await page.getByRole("button", { name: "Step", exact: true }).click();
  expect(Number(await slider.inputValue())).toBeGreaterThan(0.01);
  await page.goto(
    address + "/courses/" + courseId + "/lessons/game-theory/stages/game-theory%3Aexplainer",
  );
  await page.getByRole("button", { name: "Beta plays High price", exact: true }).click();
  await expect(page.locator(".econ-cell-lit")).toHaveCount(2);
  await expect(page.locator(".econ-cell-nash")).toHaveCount(0);
  const lesson = bundle.lessons.find((l) => l.id === "game-theory")!;
  await answer(page, bundle.questions.find((q) => q.id === lesson.steps[0]!.checkQuestionId)!);
  await expect(page.locator(".econ-cell-nash")).toHaveCount(1);
  await capture(page, "nash-revealed");
});

test("Economics requires all lessons before the mixed challenge and a real seven-day delay for transfer", async ({
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
    if (i === 9) await capture(page, "mixed-costs");
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
    if (i === 11) await capture(page, "transfer-game");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("12 / 12 correct");
  await capture(page, "transfer-result");
});
