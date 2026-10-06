import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page, APIRequestContext } from "@playwright/test";
import { CourseBundleSchema, type Question, type CourseCheckDefinition } from "@discere/contracts";
import { createApp, type DiscereApp } from "../../server/src/app.js";
import { test, expect } from "./fixtures.js";
const root = resolve(import.meta.dirname, "../../.."),
  courseId = "biology-cells-to-ecosystems";
const candidate = process.env["DISCERE_BIOLOGY_CANDIDATE"] === "1";
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
const output = join(root, "docs/library-expansion/screens/biology");
let directory: string,
  address: string,
  server: DiscereApp,
  now = new Date("2026-10-02T00:00:00Z");
test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "discere-biology-browser-"));
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
    dbPath: join(directory, "biology.sqlite"),
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
      .fill(wrong ? "chloroplast" : authority.acceptedIdeas[0]!);
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
test("Biology roadmap, original artwork and every lesson work at three sizes", async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);
  await page.goto(address + "/courses/" + courseId);
  await capture(page, "roadmap");
  await expect(page.locator(".course-overview img")).toBeVisible();
  for (const lesson of bundle.lessons) {
    const payload = await (
      await request.get(address + "/api/courses/" + courseId + "/lessons/" + lesson.id + "/journey")
    ).text();
    expect(payload).not.toMatch(/answerAuthority|acceptedIdeas|acceptedAlternatives|workedAnswer/);
    await page.goto(address + "/courses/" + courseId + "/lessons/" + lesson.id);
    const spec = lesson.steps[0]!.diagram!;
    if (spec.type !== "biology_explorer") throw Error("Missing mechanics diagram");
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: spec.cases[1]!.label, exact: true }).click();
      await expect(
        page.getByRole("button", { name: spec.cases[1]!.label, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".bio-results")).toHaveCount(0);
      await expect(page.locator(".biology-drawing")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(1);
      await page.getByRole("button", { name: spec.cases[0]!.label, exact: true }).click();
    }
    await capture(page, lesson.id);
    for (const size of sizes) {
      await page.setViewportSize(size);
      const q = bundle.questions.find((q) => q.id === lesson.steps[0]!.checkQuestionId)!;
      const field = q.choices
        ? page.getByRole("group", { name: "Answer choices" }).getByRole("button").last()
        : page.getByLabel(q.responseType === "numeric" ? "Value" : "Your answer", { exact: true });
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
      await page.getByRole("button", { name: "Reset biology model", exact: true }).click();
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
      if (later.type !== "biology_explorer") throw Error("Expected biology diagram");
      const q = bundle.questions.find((q) => q.id === lesson.steps[j]!.checkQuestionId)!;
      for (const size of sizes) {
        await page.setViewportSize(size);
        await expect(page.locator(".step-question")).toContainText(q.prompt);
        await page.getByRole("button", { name: later.cases[1]!.label, exact: true }).click();
        await expect(page.locator(".biology-drawing")).toBeVisible();
        await page.getByRole("button", { name: later.cases[0]!.label, exact: true }).click();
        const input = q.choices
          ? page.getByRole("group", { name: "Answer choices" }).getByRole("button").last()
          : page.getByLabel(q.responseType === "numeric" ? "Value" : "Your answer", {
              exact: true,
            });
        await input.scrollIntoViewIfNeeded();
        const field = await input.boundingBox(),
          footer = await page.locator(".player-footer").boundingBox();
        expect(field!.y + field!.height).toBeLessThanOrEqual(footer!.y + 1);
        await expect(page.locator(".bio-results")).toHaveCount(0);
      }
      if (
        [
          "meiosis-and-gametes",
          "ecological-evidence",
          "predicting-inheritance",
          "light-to-sugar",
        ].includes(lesson.id)
      )
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
test("Biology explains a mistake, gives green feedback, recalls fresh problems and saves completion", async ({
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
      await expect(page.locator(".beat-explanation")).toContainText("plasma membrane");
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
      await expect(page.locator(".step-eyebrow")).toContainText("Where is the DNA?");
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
test("Biology placement keeps answers private until sixteen responses and preserves progress", async ({
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
    if (i === 8) await capture(page, "placement-meiosis");
    await expect(page.locator(".bio-results")).toHaveCount(0);
    await expect(page.getByText("Look through your answers", { exact: true })).toHaveCount(0);
    await checkAnswer(page, item, i === 0);
    if (i === 4) await page.reload();
  }
  await expect(page.locator(".check-result-score")).toHaveText("15 / 16 correct");
  await capture(page, "placement-result");
  // The missed lesson is the first recommendation, tagged "Start here".
  const start = page.getByRole("region", { name: "Recommended lessons" }).getByRole("link").first();
  await expect(start).toContainText("A world inside a cell");
  await expect(start).toContainText("Start here");
});

test("Biology supports keyboard exploration, reset, equivalent answers and reduced motion", async ({
  page,
  request,
}) => {
  await page.goto(address + "/courses/" + courseId + "/lessons/water-across-a-membrane");
  const slider = page.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("End");
  await expect(page.locator('line[stroke="#e3c77b"]')).toHaveAttribute("x1", "175");
  await capture(page, "osmosis-progress");
  await page.getByRole("button", { name: "Reset biology model" }).click();
  await expect(page.locator('line[stroke="#e3c77b"]')).toHaveAttribute("x1", "280");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(address + "/settings");
  const savedMotion = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/study/preferences") && response.request().method() === "PUT",
  );
  await page.getByRole("combobox", { name: "Motion", exact: true }).selectOption("reduced");
  expect((await savedMotion).ok()).toBe(true);
  await page.goto(address + "/courses/" + courseId + "/lessons/water-across-a-membrane");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await expect
    .poll(() => page.locator(".biology-drawing").evaluate((e) => getComputedStyle(e).animationName))
    .toBe("none");
  await page.goto(address + "/courses/" + courseId + "/lessons/copying-dna");
  await page.getByRole("slider").focus();
  await page.keyboard.press("End");
  await expect(page.locator(".biology-drawing").getByText("?", { exact: true })).toHaveCount(0);
  await capture(page, "dna-completed");
  const result = await request.post(address + "/api/attempts", {
    data: { questionId: "bio-inside-a-cell-1", response: "cell membrane", mode: "coach" },
  });
  expect(result.ok()).toBe(true);
  expect((await result.json()).correct).toBe(true);
});
test("Biology requires all lessons before the mixed challenge and a real seven-day delay for transfer", async ({
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
    if (i === 2) await capture(page, "mixed-osmosis");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("16 / 16 correct");
  await page.goto(address + "/courses/" + courseId + "/checks/" + transfer.id);
  await expect(page.getByRole("button", { name: "Start check", exact: true })).toHaveCount(0);
  now = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await page.goto(address + "/review");
  await expect(page.getByRole("link", { name: /Use it a week later/ })).toBeVisible();
  await page.getByRole("link", { name: /Use it a week later/ }).click();
  await page.getByRole("button", { name: "Start check", exact: true }).click();
  for (const [i, item] of transfer.items.entries()) {
    if (i === 10) await capture(page, "transfer-selection");
    await checkAnswer(page, item);
  }
  await expect(page.locator(".check-result-score")).toHaveText("16 / 16 correct");
  await capture(page, "transfer-result");
});
