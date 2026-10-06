import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page, APIRequestContext } from "@playwright/test";
import { CourseBundleSchema, type Question, type CourseCheckDefinition } from "@discere/contracts";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { test, expect } from "./fixtures.js";
const root = resolve(import.meta.dirname, "../../.."),
  courseId = "chemistry-atoms-to-reactions";
const candidate = process.env["DISCERE_CHEMISTRY_CANDIDATE"] === "1";
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
const output = join(root, "docs/library-expansion/screens/chemistry");
let directory: string,
  address: string,
  server: DiscereApp,
  now = new Date("2026-10-02T00:00:00Z");
test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-chemistry-browser-"));
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
    dbPath: join(directory, "chemistry.sqlite"),
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
  if (a.kind !== "numeric") throw Error("Expected authored numeric Chemistry problem.");
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
test("Chemistry roadmap, original artwork and every lesson work at three sizes", async ({
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
    if (spec.type !== "chemistry_explorer") throw Error("Missing mechanics diagram");
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: spec.cases[1]!.label, exact: true }).click();
      await expect(
        page.getByRole("button", { name: spec.cases[1]!.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".chem-results")).toHaveCount(0);
      await expect(page.locator(".chemistry-drawing")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await page.getByRole("button", { name: spec.cases[0]!.label, exact: true }).click();
    }
    await capture(page, lesson.id);
    for (const size of sizes) {
      await page.setViewportSize(size);
      const field = page.getByLabel("Value", { exact: true });
      // Teaching now sits above the question (audit B1), so the field may be below the fold;
      // once scrolled to, it must clear the reserved footer rather than sit behind it.
      await field.scrollIntoViewIfNeeded();
      const box = await field.boundingBox(),
        footer = await page.locator(".player-footer").boundingBox();
      expect(box!.y + box!.height, lesson.id + " at " + size.width).toBeLessThanOrEqual(
        footer!.y + 1,
      );
    }

    const slider = page.getByRole("slider");
    if (await slider.count()) {
      await slider.focus();
      await page.keyboard.press("End");
      await expect(slider).toHaveValue((await slider.getAttribute("max"))!);
      await page.getByRole("button", { name: "Reset chemistry model", exact: true }).click();
      await expect(slider).toHaveValue("0");
    }
    // Read later teaching beats without submitting answers; restore the learner position afterwards.
    for (let j = 1; j < lesson.steps.length; j++) {
      const stageId = lesson.id + ":explainer";
      const response = await request.put(
        address + "/api/courses/" + courseId + "/lessons/" + lesson.id + "/progress",
        {
          data: { stageId, state: "active", interactionState: { stepIndex: j } },
        },
      );
      expect(response.ok()).toBe(true);
      await page.goto(
        address +
          "/courses/" +
          courseId +
          "/lessons/" +
          lesson.id +
          "/stages/" +
          encodeURIComponent(stageId),
      );
      const later = lesson.steps[j]!.diagram!;
      if (later.type !== "chemistry_explorer") throw Error("Expected chemistry diagram");
      const q = bundle.questions.find((q) => q.id === lesson.steps[j]!.checkQuestionId)!;
      for (const size of sizes) {
        await page.setViewportSize(size);
        await expect(page.locator(".step-question")).toContainText(q.prompt);
        await page.getByRole("button", { name: later.cases[1]!.label, exact: true }).click();
        await expect(page.locator(".chemistry-drawing")).toBeVisible();
        await page.getByRole("button", { name: later.cases[0]!.label, exact: true }).click();
        const input = q.choices
          ? page.getByRole("group", { name: "Answer choices" }).getByRole("button").last()
          : page.getByLabel("Value", { exact: true });
        await input.scrollIntoViewIfNeeded();
        const field = await input.boundingBox(),
          footer = await page.locator(".player-footer").boundingBox();
        expect(field!.y + field!.height).toBeLessThanOrEqual(footer!.y + 1);
        await expect(page.locator(".chem-results")).toHaveCount(0);
      }
      if (lesson.id === "sharing-electron-pairs" || lesson.id === "balancing-reactions")
        await capture(page, lesson.id + "-beat-" + (j + 1));
    }
    const reset = await request.put(
      address + "/api/courses/" + courseId + "/lessons/" + lesson.id + "/progress",
      {
        data: {
          stageId: lesson.id + ":explainer",
          state: "active",
          interactionState: { stepIndex: 0 },
        },
      },
    );
    expect(reset.ok()).toBe(true);
  }
});
test("Chemistry explains a mistake, gives green feedback, recalls fresh problems and saves completion", async ({
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
      await expect(page.locator(".beat-explanation")).toContainText(
        "Atomic number counts protons, so Z = 8.",
      );
      await capture(page, "correction");
    }
    if (i === 1) {
      await page.getByRole("button", { name: "Why?", exact: true }).click();
      await capture(page, "correct");
    }
    await page.getByRole("button", { name: i === 3 ? "Finish" : "Continue", exact: true }).click();
    if (i === 0) {
      await page.reload();
      await expect(page.getByText("Keep the identity", { exact: false }).first()).toBeVisible();
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
test("Chemistry placement keeps answers private until twelve responses and preserves progress", async ({
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
    if (i === 8) await capture(page, "placement-amount");
    await expect(page.locator(".chem-results")).toHaveCount(0);
    await expect(page.getByText("Look through your answers", { exact: true })).toHaveCount(0);
    await checkAnswer(page, item, i === 0);
    if (i === 4) await page.reload();
  }
  await expect(page.locator(".check-result-score")).toHaveText("11 / 12 correct");
  await capture(page, "placement-result");
  // The missed lesson is the first recommendation, tagged "Start here".
  const start = page.getByRole("region", { name: "Recommended lessons" }).getByRole("link").first();
  await expect(start).toContainText("What makes an element?");
  await expect(start).toContainText("Start here");
});

test("Chemistry keeps edited coefficients, supports keyboard controls and honours reduced motion", async ({
  page,
}) => {
  await page.goto(address + "/courses/" + courseId + "/lessons/balancing-reactions");
  const coefficients = page.getByRole("group", { name: "Choose a coefficient" });
  await coefficients.getByRole("button", { name: "O₂", exact: true }).click();
  const slider = page.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(page.locator(".chem-givens")).toHaveText("2 H₂ + O₂ → 2 H₂O");
  await coefficients.getByRole("button", { name: "H₂O", exact: true }).click();
  await slider.focus();
  await page.keyboard.press("End");
  await expect(page.locator(".chem-givens")).toHaveText("2 H₂ + O₂ → 6 H₂O");
  await page.getByRole("button", { name: "Reset chemistry model" }).click();
  await expect(page.locator(".chem-givens")).toHaveText("2 H₂ + 2 O₂ → 2 H₂O");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // Wait for the app to see the media change, or its own "system" write can land after ours.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset["motion"]))
    .toBe("system");
  await expect
    .poll(() =>
      page.locator(".chemistry-drawing").evaluate((e) => getComputedStyle(e).animationName),
    )
    .toBe("chem-appear");
  await page.evaluate(() => (document.documentElement.dataset["motion"] = "reduced"));
  await expect
    .poll(() =>
      page.locator(".chemistry-drawing").evaluate((e) => getComputedStyle(e).animationName),
    )
    .toBe("none");
  await page.goto(address + "/courses/" + courseId + "/lessons/the-reactant-that-runs-out");
  await page.getByRole("slider").focus();
  await page.keyboard.press("End");
  await expect(page.locator('rect[fill="#73dca6"]')).toHaveAttribute("height", "22.5");
  await capture(page, "reaction-progress");
  await page.getByRole("button", { name: "Reset chemistry model" }).click();
  await expect(page.locator('rect[fill="#73dca6"]')).toHaveAttribute("height", "0");
  await page.goto(address + "/courses/" + courseId + "/lessons/sharing-electron-pairs");
  await page.getByRole("button", { name: "Show shared electron dots" }).click();
  await expect(page.locator('circle[fill="#ffd269"]')).toHaveCount(2);
  await capture(page, "bond-dots");
});
test("Chemistry requires all lessons before the mixed challenge and a real seven-day delay for transfer", async ({
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
    if (i === 2) await capture(page, "mixed-charge");
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
    if (i === 10) await capture(page, "transfer-ratio");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("12 / 12 correct");
  await capture(page, "transfer-result");
});
