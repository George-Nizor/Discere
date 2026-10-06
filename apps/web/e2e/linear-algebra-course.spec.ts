import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page, APIRequestContext } from "@playwright/test";
import { CourseBundleSchema, type Question, type CourseCheckDefinition } from "@discere/contracts";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { test, expect } from "./fixtures.js";
const root = resolve(import.meta.dirname, "../../.."),
  courseId = "linear-algebra-vectors-and-maps";
const candidate = process.env["DISCERE_LINEAR_ALGEBRA_CANDIDATE"] === "1";
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
const output = join(root, "docs/library-expansion/screens/linear-algebra");
let directory: string,
  address: string,
  server: DiscereApp,
  now = new Date("2026-10-02T00:00:00Z");
test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-linear-algebra-browser-"));
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
    dbPath: join(directory, "linear-algebra.sqlite"),
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
    const pane = page.locator(".learning-player--question:has(.la-diagram) .stage-canvas");
    if (await pane.count()) {
      await pane.evaluate((element) => {
        element.scrollTop = 0;
      });
      const box = await pane.boundingBox();
      const frameTop = await page
        .locator(".learning-player")
        .evaluate((element) => Number.parseFloat(getComputedStyle(element, "::after").top));
      expect(box!.y).toBeGreaterThanOrEqual(frameTop + 8);
    }
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
  else
    await page
      .getByRole("group", { name: "Answer choices" })
      .getByRole("button", { name: q.answerAuthority.acceptedIdeas[0]!, exact: false })
      .click();
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
  if (a.kind !== "numeric") throw Error("Expected authored numeric linear algebra problem.");
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
test("Linear algebra roadmap and every lesson work at three sizes", async ({ page, request }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(address + "/courses/" + courseId);
  await capture(page, "roadmap");
  await expect(page.locator(".course-overview img")).toBeVisible();
  for (const lesson of bundle.lessons) {
    const payload = await (
      await request.get(address + "/api/courses/" + courseId + "/lessons/" + lesson.id + "/journey")
    ).text();
    expect(payload).not.toMatch(
      /answerAuthority|acceptedIdeas|workedAnswer|numericProbes|numeric-verification/,
    );
    await page.goto(address + "/courses/" + courseId + "/lessons/" + lesson.id);
    const spec = lesson.steps[0]!.diagram!;
    if (spec.type !== "linear_algebra_explorer") throw Error("Missing linear algebra visual");
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: spec.cases[1]!.label, exact: true }).click();
      await expect(
        page.getByRole("button", { name: spec.cases[1]!.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".la-results")).toHaveCount(0);
      await expect(page.locator(".la-diagram [data-result]")).toHaveCount(0);
      await expect(page.locator(".la-diagram")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await page.getByRole("button", { name: spec.cases[0]!.label, exact: true }).click();
    }
    await capture(page, lesson.id);
    const q = bundle.questions.find((q) => q.id === lesson.steps[0]!.checkQuestionId)!;
    for (const size of sizes) {
      await page.setViewportSize(size);
      const field =
        q.responseType === "numeric"
          ? page.getByLabel("Value", { exact: true })
          : page.getByRole("group", { name: "Answer choices" });
      // Teaching now sits above the question (audit B1), so the field may be below the fold;
      // once scrolled to, it must clear the reserved footer rather than sit behind it.
      await field.scrollIntoViewIfNeeded();
      const box = await field.boundingBox(),
        footer = await page.locator(".player-footer").boundingBox();
      expect(box!.y + box!.height, lesson.id + " at " + size.width).toBeLessThanOrEqual(
        footer!.y + 1,
      );
    }
  }
  expect(errors).toEqual([]);
});
test("Linear algebra explains mistakes, recalls fresh problems and saves completion", async ({
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
      await expect(page.locator(".beat-explanation")).toContainText("first coordinate");
      await capture(page, "correction");
    }
    if (i === 1) {
      await page.getByRole("button", { name: "Why?", exact: true }).click();
      await capture(page, "correct");
    }
    await page.getByRole("button", { name: i === 3 ? "Finish" : "Continue", exact: true }).click();
    if (i === 0) {
      await page.reload();
      // The reload resumes on step 2; a legacy step's old title is now its eyebrow (spec M2).
      await expect(page.locator(".step-eyebrow")).toContainText("Step 2 of");
      await expect(page.locator(".step-eyebrow")).toContainText("Keep the order");
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
test("Linear algebra placement withholds marking until all twenty responses", async ({ page }) => {
  test.setTimeout(90_000);
  const check = bundle.courseChecks![0]!;
  await page.goto(address + "/courses/" + courseId + "/checks/" + check.id);
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const [i, item] of check.items.entries()) {
    await expect(
      page.getByRole("heading", { name: item.question.prompt, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".la-check [data-result]")).toHaveCount(0);
    await expect(page.locator(".la-results")).toHaveCount(0);
    await expect(page.getByText("Look through your answers", { exact: true })).toHaveCount(0);
    if (i === 0) {
      await capture(page, "placement");
      await page.reload();
    }
    if (i === 15) await capture(page, "placement-fit");
    await checkAnswer(page, item, i === 0);
    if (i === 8) await page.reload();
  }
  await expect(page.locator(".check-result-score")).toHaveText("19 / 20 correct");
  // The missed lesson is the first recommendation, tagged "Start here".
  const start = page.getByRole("region", { name: "Recommended lessons" }).getByRole("link").first();
  await expect(start).toContainText("Read a vector");
  await expect(start).toContainText("Start here");
  await capture(page, "placement-result");
});
test("Linear algebra reveals real transformation and row-operation controls after feedback", async ({
  page,
}) => {
  const lesson = bundle.lessons.find((l) => l.id === "linear-transformations")!;
  await page.goto(address + "/courses/" + courseId + "/lessons/" + lesson.id);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await answer(page, bundle.questions.find((q) => q.id === lesson.steps[0]!.checkQuestionId)!);
  await expect(page.locator(".la-transformed")).toBeVisible();
  const full = await page.locator(".la-transformed").getAttribute("d"),
    slider = page.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");
  expect(await page.locator(".la-transformed").getAttribute("d")).not.toBe(full);
  await page.getByRole("button", { name: "Reset transformation", exact: true }).click();
  await expect(slider).toHaveValue("100");
  await capture(page, "transformation");
  const rowLesson = bundle.lessons.find((l) => l.id === "solve-by-row-reduction")!;
  await page.goto(address + "/courses/" + courseId + "/lessons/" + rowLesson.id);
  await page.getByRole("button", { name: "Row 2", exact: true }).click();
  await expect(page.getByRole("button", { name: "Next row operation", exact: true })).toHaveCount(
    0,
  );
  await answer(page, bundle.questions.find((q) => q.id === rowLesson.steps[0]!.checkQuestionId)!);
  await page.getByRole("button", { name: "Next row operation", exact: true }).click();
  await expect(page.locator(".la-elimination")).toContainText("Swap rows 1 and 2");
  await capture(page, "row-reduction");
  await page.getByRole("button", { name: "Reset row operations", exact: true }).click();
  await expect(page.locator(".la-elimination")).toContainText("Given rows");
});
test("Linear algebra SVD phases and least-squares diagrams preserve feedback and reduced motion", async ({
  page,
}) => {
  await page.goto(address + "/settings");
  await page.getByRole("combobox", { name: "Motion", exact: true }).selectOption("system");
  await expect(page.getByRole("combobox", { name: "Motion", exact: true })).toBeEnabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset["motion"]))
    .toBe("reduced");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset["motion"]))
    .toBe("system");
  await page.getByRole("combobox", { name: "Motion", exact: true }).selectOption("reduced");
  await expect
    .poll(
      async () =>
        (await (await page.request.get(address + "/api/study/preferences")).json()).motion,
    )
    .toBe("reduced");
  const lesson = bundle.lessons.find((l) => l.id === "singular-value-decomposition")!;
  await page.goto(address + "/courses/" + courseId + "/lessons/" + lesson.id);
  for (let i = 0; i < 4; i++) {
    await expect(page.locator(".la-results")).toHaveCount(0);
    if (i === 1) await capture(page, "svd-rectangular-givens");
    await answer(page, bundle.questions.find((q) => q.id === lesson.steps[i]!.checkQuestionId)!);
    if (i === 1) await capture(page, "svd-rectangular-feedback");
    if (i < 3) await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  const full = await page.locator(".la-transformed").getAttribute("d");
  await page.getByRole("button", { name: "Input", exact: true }).click();
  expect(await page.locator(".la-transformed").getAttribute("d")).not.toBe(full);
  const unitDirections = await page
    .locator(".la-svd-axis path")
    .evaluateAll((paths) => paths.map((path) => path.getAttribute("d")));
  await page.getByRole("button", { name: "Change input axes", exact: true }).click();
  expect(
    await page
      .locator(".la-svd-axis path")
      .evaluateAll((paths) => paths.map((path) => path.getAttribute("d"))),
  ).not.toEqual(unitDirections);
  await capture(page, "svd-input-axes");
  await page.getByRole("button", { name: "Change output axes", exact: true }).click();
  expect(await page.locator(".la-transformed").getAttribute("d")).toBe(full);
  await capture(page, "svd");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset["motion"]))
    .toBe("reduced");
  await expect
    .poll(() => page.locator(".la-results").evaluate((e) => getComputedStyle(e).animationName))
    .toBe("none");
  const fitLesson = bundle.lessons.find((l) => l.id === "fit-with-least-squares")!;
  await page.goto(address + "/courses/" + courseId + "/lessons/" + fitLesson.id);
  await expect(page.locator('[data-result="fit"]')).toHaveCount(0);
  await answer(page, bundle.questions.find((q) => q.id === fitLesson.steps[0]!.checkQuestionId)!);
  await expect(page.locator('[data-result="fit"]')).toHaveCount(3);
  await capture(page, "least-squares");
});
test("Linear algebra mixed and transfer checks require completion and the seven-day interval", async ({
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
    if (i === 12) await capture(page, "mixed-rank");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("20 / 20 correct");
  await page.goto(address + "/courses/" + courseId + "/checks/" + transfer.id);
  await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
  now = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await page.goto(address + "/review");
  await expect(page.getByRole("link", { name: /Use it a week later/ })).toBeVisible();
  await page.getByRole("link", { name: /Use it a week later/ }).click();
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const [i, item] of transfer.items.entries()) {
    if (i === 19) await capture(page, "transfer-svd");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("20 / 20 correct");
  await capture(page, "transfer-result");
});
