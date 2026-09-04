import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures.js";

const OUTPUT = join(import.meta.dirname, "../../../docs/recovery-v2/implementation-screens");
const COURSE_PATH = "/courses/roman-empire";
const LESSON_ROOT = "/courses/roman-empire/lessons/rise-of-the-roman-empire/reference";
const PROGRESS_API =
  "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/progress";

const VIEWPORTS = [
  { label: "1440x900", width: 1440, height: 900 },
  { label: "1024x768", width: 1024, height: 768 },
  { label: "390x844", width: 390, height: 844 },
];

const SCREENS = [
  { name: "00-course-home", path: COURSE_PATH },
  { name: "01-opening-challenge", path: `${LESSON_ROOT}/opening` },
  { name: "02-augustus-explainer", path: `${LESSON_ROOT}/augustus` },
  { name: "03-expansion-map", path: `${LESSON_ROOT}/expansion` },
];

const QUESTION_SCREENS = [
  {
    name: "04a-question-ordering",
    path: `${LESSON_ROOT}/questions/turning-points`,
  },
  {
    name: "04b-understanding-check",
    path: `${LESSON_ROOT}/questions/476-continuity`,
  },
  { name: "04c-question-map", path: `${LESSON_ROOT}/questions/map-117` },
  {
    name: "04d-question-response",
    path: `${LESSON_ROOT}/questions/two-sentence`,
  },
] as const;

const TURNING_POINTS = {
  augustus: { title: "Augustus", date: "27 BCE" },
  extent: { title: "Largest extent", date: "117 CE" },
  division: { title: "Empire divided", date: "395 CE" },
  deposition: { title: "Western emperor removed", date: "476 CE" },
} as const;

type TurningPointId = keyof typeof TURNING_POINTS;
type ReferenceQuestionId = "turning-points" | "476-continuity" | "map-117" | "two-sentence";

interface ReferenceQuestionView {
  content: {
    id: ReferenceQuestionId;
    ordinal: number;
    kind: "ordering" | "selection" | "multi_select" | "free_response";
    prompt: string;
    sourceIds: string[];
    mapDescription?: string;
    instruction?: string;
    options?: Array<{ id: string; label: string }>;
    choices?: Array<{ id: string; label: string }>;
  };
  progress: {
    id: ReferenceQuestionId;
    draft: unknown;
    submittedResponse: unknown;
    status: "editing" | "submitted" | "revealed";
    result: "correct" | "partly_correct" | "incorrect" | "ungradable" | null;
    feedback: string | null;
    mode: "coach" | "assisted" | "direct" | "exam" | null;
    hints: Array<{ level: number; text: string }>;
    revealedAnswer: unknown;
  };
}

type EssayEvidenceId =
  | "augustus-27-bce"
  | "extent-117-ce"
  | "third-century-crisis"
  | "tetrarchy-284-ce"
  | "constantinople-330-ce"
  | "western-deposition-476-ce";

interface ReferenceEssayView {
  content: {
    id: "transformation";
    prompt: string;
    instruction: string;
    minWords: number;
    maxWords: number;
    rubric: Array<{ id: string; label: string; description: string }>;
    evidence: Array<{ id: EssayEvidenceId; date: string; title: string; summary: string }>;
  };
  progress: {
    draft: string;
    claimPlan: string;
    evidencePlan: EssayEvidenceId[];
    complicationPlan: string;
    status: "editing" | "submitted";
    mode: "coach" | "assisted" | "direct" | "exam" | null;
    sourcesOpened: boolean;
    submissions: Array<{
      revision: number;
      wordCount: number;
      summary: string;
      nextStep: string;
      dimensions: Array<{
        id: string;
        label: string;
        status: "met" | "developing" | "missing";
        comment: string;
        excerpt: string | null;
      }>;
      usedEvidenceIds: EssayEvidenceId[];
    }>;
    finished: boolean;
  };
}

interface ReferenceProgress {
  version: 3;
  activeBeat: "opening" | "augustus" | "expansion" | "questions" | "essay";
  activeQuestionId: ReferenceQuestionId | null;
  assessmentFinished: boolean;
  updatedAt: string | null;
  opening: {
    order: TurningPointId[];
    submittedOrder: TurningPointId[] | null;
    status: "editing" | "checked" | "skipped";
    wasCorrect: boolean | null;
  };
  augustus: { completed: boolean };
  expansion: {
    milestoneId: "27-bce" | "117-ce" | "284-ce" | "476-ce";
    answerOpen: boolean;
    answer: string;
    saved: boolean;
    completed: boolean;
  };
  questions: ReferenceQuestionView[];
  essay: ReferenceEssayView;
}

async function readProgress(page: Page): Promise<ReferenceProgress> {
  const response = await page.request.get(PROGRESS_API);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ReferenceProgress;
}

async function requestReferenceAction(
  page: Page,
  data: Record<string, unknown>,
): Promise<ReferenceProgress> {
  const response = await page.request.put(PROGRESS_API, { data });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ReferenceProgress;
}

async function performReferenceAction(
  page: Page,
  action: string,
  perform: () => Promise<void>,
): Promise<ReferenceProgress> {
  const responsePromise = page.waitForResponse((response) => {
    if (new URL(response.url()).pathname !== PROGRESS_API) return false;
    if (response.request().method() !== "PUT") return false;
    try {
      const body = response.request().postDataJSON() as { action?: unknown };
      return body.action === action;
    } catch {
      return false;
    }
  });
  await perform();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ReferenceProgress;
}

async function expectOpeningOrder(page: Page, order: readonly TurningPointId[]): Promise<void> {
  for (const [index, id] of order.entries()) {
    const point = TURNING_POINTS[id];
    await expect(
      page.getByRole("button", {
        name: `${point.title}, ${point.date}, position ${index + 1} of ${order.length}`,
      }),
    ).toBeVisible();
  }
}

function adjacentWrongMove(order: readonly TurningPointId[]): {
  movedId: TurningPointId;
  next: TurningPointId[];
} {
  const correct = ["augustus", "extent", "division", "deposition"];
  for (let index = 0; index < order.length - 1; index += 1) {
    const next = [...order];
    const left = next[index];
    const right = next[index + 1];
    if (!left || !right) continue;
    next[index] = right;
    next[index + 1] = left;
    if (next.join(",") !== correct.join(",")) return { movedId: right, next };
  }
  throw new Error("No adjacent wrong-order move was available.");
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectVisibleLessonImagesLoaded(page: Page): Promise<void> {
  const visibleImages = page.locator("#stage img:visible");
  await expect
    .poll(async () =>
      visibleImages.evaluateAll((images) =>
        images
          .filter((image) => !(image as HTMLImageElement).complete || image.clientWidth === 0)
          .map(
            (image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src,
          ),
      ),
    )
    .toEqual([]);
  const brokenImages = await visibleImages.evaluateAll((images) =>
    images
      .filter((image) => (image as HTMLImageElement).naturalWidth <= 0)
      .map((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src),
  );
  expect(brokenImages).toEqual([]);
}

async function expectMinimumTarget(control: Locator, size: number): Promise<void> {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(size);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(size);
}

async function captureQuestionScreen(
  page: Page,
  name: (typeof QUESTION_SCREENS)[number]["name"],
): Promise<void> {
  mkdirSync(OUTPUT, { recursive: true });
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator("#stage")).toBeVisible();
    await expectVisibleLessonImagesLoaded(page);
    await page.screenshot({
      animations: "disabled",
      fullPage: false,
      path: join(OUTPUT, `${name}-${viewport.label}.png`),
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

function questionById(
  progress: ReferenceProgress,
  questionId: ReferenceQuestionId,
): ReferenceQuestionView {
  const question = progress.questions.find((candidate) => candidate.content.id === questionId);
  if (!question) throw new Error(`Reference progress omitted ${questionId}.`);
  return question;
}

async function expectQuestionOrder(page: Page, labels: readonly string[]): Promise<void> {
  for (const [index, label] of labels.entries()) {
    await expect(
      page.getByRole("button", { name: `${label}, position ${index + 1} of ${labels.length}` }),
    ).toBeVisible();
  }
}

test.describe("Recovery v2 Gate 2", () => {
  for (const viewport of VIEWPORTS) {
    test(`captures the first four reference screens at ${viewport.label}`, async ({ page }) => {
      test.slow();
      mkdirSync(OUTPUT, { recursive: true });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const screen of SCREENS) {
        await page.goto(screen.path);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("#stage")).toBeVisible();
        await expectVisibleLessonImagesLoaded(page);
        await page.screenshot({
          animations: "disabled",
          fullPage: false,
          path: join(OUTPUT, `${screen.name}-${viewport.label}.png`),
        });
      }
    });
  }

  test("persists and restores the first-half journey without leaking opening authority", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const initial = await readProgress(page);
    await page.goto(COURSE_PATH);

    const expectedStart = `${LESSON_ROOT}/${initial.activeBeat}`;
    await expect(page.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      expectedStart,
    );
    await page.getByRole("link", { name: "Continue" }).click();

    let resolved = initial;
    if (initial.opening.status === "editing") {
      await expect(
        page.getByRole("heading", { level: 1, name: "Put these turning points in order" }),
      ).toBeVisible();
      if (initial.updatedAt === null) {
        expect(initial.opening.order).toEqual(["extent", "deposition", "augustus", "division"]);
      }
      await expectOpeningOrder(page, initial.opening.order);

      const move = adjacentWrongMove(initial.opening.order);
      const moved = TURNING_POINTS[move.movedId];
      const movedIndex = initial.opening.order.indexOf(move.movedId);
      const movedCard = page.getByRole("button", {
        name: `${moved.title}, ${moved.date}, position ${movedIndex + 1} of 4`,
      });
      await movedCard.focus();
      await performReferenceAction(page, "reorder_opening", async () => {
        await page.keyboard.press("ArrowLeft");
      });
      await expectOpeningOrder(page, move.next);

      await page.reload();
      await expectOpeningOrder(page, move.next);

      resolved = await performReferenceAction(page, "check_opening", async () => {
        await page.getByRole("button", { name: "Check order" }).click();
      });
      expect(resolved.opening).toEqual({
        order: ["augustus", "extent", "division", "deposition"],
        submittedOrder: move.next,
        status: "checked",
        wasCorrect: false,
      });
      await expect(page.getByText(/Compare your order with this sequence/)).toBeVisible();
      await expectOpeningOrder(page, resolved.opening.order);

      await page.reload();
      await expect(page.getByText(/Compare your order with this sequence/)).toBeVisible();
      expect((await readProgress(page)).opening.submittedOrder).toEqual(move.next);
    } else {
      await page.goto(`${LESSON_ROOT}/opening`);
      await expect(page.getByRole("button", { name: "Check order" })).toBeDisabled();
    }

    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "How Augustus changed Rome" }),
    ).toBeVisible();

    await performReferenceAction(page, "complete_augustus", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "How far did Rome spread?" }),
    ).toBeVisible();

    await performReferenceAction(page, "select_expansion_milestone", async () => {
      await page.getByRole("button", { name: "284 CE" }).click();
    });
    await expect(page.getByRole("button", { name: "284 CE" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText(/117 CE boundary remains on the map for comparison/)).toBeVisible();

    if (
      await page
        .getByRole("button", { name: "Answer" })
        .isVisible()
        .catch(() => false)
    ) {
      await performReferenceAction(page, "update_expansion_draft", async () => {
        await page.getByRole("button", { name: "Answer" }).click();
      });
    }
    const answer = `Rome expanded around the Mediterranean — ${Date.now()}.`;
    await performReferenceAction(page, "update_expansion_draft", async () => {
      await page.getByRole("textbox", { name: "Your answer" }).fill(answer);
    });
    await performReferenceAction(page, "save_expansion_response", async () => {
      await page.getByRole("button", { name: "Save answer" }).click();
    });
    await expect(page.getByText("Saved for the end-of-lesson comparison.")).toBeVisible();

    await page.goBack();
    await expect(
      page.getByRole("heading", { level: 1, name: "How Augustus changed Rome" }),
    ).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("button", { name: "284 CE" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("textbox", { name: "Your answer" })).toHaveValue(answer);
    await expect(page.getByText("Saved for the end-of-lesson comparison.")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "284 CE" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("textbox", { name: "Your answer" })).toHaveValue(answer);
    await expect(page.getByText("Saved for the end-of-lesson comparison.")).toBeVisible();

    await page.goto(COURSE_PATH);
    await expect(page.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      `${LESSON_ROOT}/expansion`,
    );
  });

  test("keeps sources and the persistent tutor accessible in place", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(COURSE_PATH);
    await expect(page.getByRole("link", { name: "Continue" })).toBeVisible();

    const sourceTrigger = page.getByRole("button", { name: "View sources" });
    await sourceTrigger.click();
    await expect(page.getByRole("dialog", { name: "Sources" })).toBeVisible();
    await expect(page.getByRole("button", { exact: true, name: "Close sources" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("link", { name: "Roman Empire at its greatest extent, 117 CE" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { exact: true, name: "Close sources" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Sources" })).toBeHidden();
    await expect(sourceTrigger).toBeFocused();

    const tutorTrigger = page.getByRole("button", {
      name: "Open the tutor in the current Roman lesson",
    });
    const locationBeforeTutor = page.url();
    await tutorTrigger.click();
    await expect(page.getByRole("dialog", { name: "Ask the tutor" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Your question" })).toBeFocused();
    expect(page.url()).toBe(locationBeforeTutor);
    await page.getByRole("button", { exact: true, name: "Close the tutor" }).click();
    await expect(page.getByRole("dialog", { name: "Ask the tutor" })).toBeHidden();
    await expect(tutorTrigger).toBeFocused();
  });

  test("restores a tutor exchange across reference beats and reload", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${LESSON_ROOT}/opening`);
    const question = "How did Augustus change the way Rome was governed?";

    await page.getByRole("button", { name: "Open the tutor in the current Roman lesson" }).click();
    await page.getByRole("textbox", { name: "Your question" }).fill(question);
    const replyPromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/tutor/ask" &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { exact: true, name: "Ask the tutor" }).click();
    expect((await replyPromise).ok()).toBeTruthy();
    await expect(page.locator(".tutor-exchange")).toHaveCount(1);
    await expect(page.getByText(question, { exact: true })).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Close the tutor" }).click();

    await page.goto(`${LESSON_ROOT}/augustus`);
    await page.getByRole("button", { name: "Open the tutor in the current Roman lesson" }).click();
    await expect(page.locator(".tutor-exchange")).toHaveCount(1);
    await expect(page.getByText(question, { exact: true })).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Close the tutor" }).click();

    await page.reload();
    await page.getByRole("button", { name: "Open the tutor in the current Roman lesson" }).click();
    await expect(page.locator(".tutor-exchange")).toHaveCount(1);
    await expect(page.getByText(question, { exact: true })).toBeVisible();
  });

  test("suppresses sources and tutoring throughout the reference journey in Exam mode", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("discere:tutoring-mode:rise-of-the-roman-empire", "exam");
    });

    for (const screen of SCREENS) {
      await page.goto(screen.path);
      await expect(page.locator("#stage")).toBeVisible();
      await expect(page.getByRole("button", { name: "View sources" })).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Open the tutor in the current Roman lesson" }),
      ).toHaveCount(0);
    }
  });

  test("keeps every mobile utility inside the viewport in reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const screen of SCREENS) {
      await page.goto(screen.path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#stage")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await page.goto(COURSE_PATH);
    const sourceTrigger = page.getByRole("button", { name: "View sources" });
    await expect(sourceTrigger).toBeVisible();
    await expectMinimumTarget(sourceTrigger, 40);
    await sourceTrigger.click();
    await expect(page.getByRole("dialog", { name: "Sources" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { exact: true, name: "Close sources" }).click();
    await expect(sourceTrigger).toBeFocused();

    await page.goto(`${LESSON_ROOT}/opening`);
    await expect(page.getByRole("navigation", { name: "Discere" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Notebook" })).toBeVisible();
    const tutorTrigger = page.getByRole("button", {
      name: "Open the tutor in the current Roman lesson",
    });
    await expect(tutorTrigger).toBeVisible();
    await expectMinimumTarget(tutorTrigger, 40);
    await expectNoHorizontalOverflow(page);

    await tutorTrigger.click();
    await expect(page.getByRole("dialog", { name: "Ask the tutor" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { exact: true, name: "Close the tutor" }).click();
    await expect(tutorTrigger).toBeFocused();
  });
});

test.describe("Recovery v2 Gate 3", () => {
  test("keeps every unanswered question learner-safe and makes Exam deep links read-only", async ({
    page,
  }) => {
    const before = await readProgress(page);
    expect(before.version).toBe(3);
    expect(before.assessmentFinished).toBe(false);

    const ordering = before.questions.find((question) => question.content.id === "turning-points");
    const map = before.questions.find((question) => question.content.id === "map-117");
    expect(ordering?.content.options?.map((option) => option.id)).toEqual([
      "extent",
      "deposition",
      "augustus",
      "division",
    ]);
    expect(ordering?.content.options?.map((option) => option.id)).not.toEqual([
      "augustus",
      "extent",
      "division",
      "deposition",
    ]);
    expect(map?.content.choices?.map((choice) => choice.id)).toEqual([
      "scandinavia",
      "britain",
      "india",
      "mesopotamia",
    ]);
    expect(questionById(before, "turning-points").content.sourceIds).toEqual([
      "wikipedia-augustus",
      "wikipedia-roman-empire",
      "wikipedia-fall-western-empire",
      "openstax-world-history-eastward-shift",
    ]);
    expect(questionById(before, "476-continuity").content.sourceIds).toEqual([
      "wikipedia-fall-western-empire",
      "wikipedia-roman-empire",
    ]);
    expect(questionById(before, "map-117").content.sourceIds).toEqual([
      "commons-roman-empire-extent-map",
      "wikipedia-roman-empire",
    ]);
    expect(questionById(before, "two-sentence").content.sourceIds).toEqual([
      "wikipedia-augustus",
      "wikipedia-roman-empire",
      "commons-roman-empire-extent-map",
    ]);
    expect(map?.content.mapDescription).toBe(
      "The shaded territory surrounds the Mediterranean. Its northwestern edge crosses the Channel beyond Gaul, while its far eastern edge reaches beyond Syria.",
    );
    for (const question of before.questions) {
      expect(question.progress.status).toBe("editing");
      expect(question.progress.result).toBeNull();
      expect(question.progress.feedback).toBeNull();
      expect(question.progress.mode).toBeNull();
      expect(question.progress.hints).toEqual([]);
      expect(question.progress.revealedAnswer).toBeNull();
    }
    const learnerPayload = JSON.stringify(before);
    expect(learnerPayload).not.toContain('"answerAuthority"');
    expect(learnerPayload).not.toContain('"correctOrder"');

    await page.addInitScript(() => {
      window.localStorage.setItem("discere:tutoring-mode:rise-of-the-roman-empire", "exam");
    });
    const writes: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "PUT" && new URL(request.url()).pathname === PROGRESS_API) {
        writes.push(request.postData() ?? "");
      }
    });

    for (const [index, screen] of QUESTION_SCREENS.entries()) {
      await page.goto(screen.path);
      await expect(page.locator("#stage")).toBeVisible();
      await expect(
        page.getByRole("progressbar", { name: `Question ${index + 1} of 4` }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "View sources" })).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Open the tutor in the current Roman lesson" }),
      ).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Ask for a hint" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: /show answer/i })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Reveal answer" })).toHaveCount(0);
    }

    expect(writes).toEqual([]);
    const after = await readProgress(page);
    expect(after.questions).toEqual(before.questions);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  test("keeps question controls usable at 390 px with reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
      true,
    );

    for (const screen of QUESTION_SCREENS) {
      await page.goto(screen.path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#stage")).toBeVisible();
      await expectVisibleLessonImagesLoaded(page);
      await expectNoHorizontalOverflow(page);

      await expectMinimumTarget(page.getByRole("button", { name: "View sources" }), 40);
      await expectMinimumTarget(page.getByRole("link", { name: "Back" }), 40);
      const modeButtons = page.getByRole("group", { name: "Learning mode" }).getByRole("button");
      await expect(modeButtons).toHaveCount(4);
      for (let index = 0; index < (await modeButtons.count()); index += 1) {
        await expectMinimumTarget(modeButtons.nth(index), 40);
      }

      if (screen.name === "04a-question-ordering") {
        const cards = page.locator(".reference-question-order button");
        await expect(cards).toHaveCount(4);
        for (let index = 0; index < (await cards.count()); index += 1) {
          await expectMinimumTarget(cards.nth(index), 40);
        }
      } else if (screen.name === "04b-understanding-check" || screen.name === "04c-question-map") {
        const choices = page.locator(".reference-question-choices label");
        await expect(choices).toHaveCount(4);
        for (let index = 0; index < (await choices.count()); index += 1) {
          await expectMinimumTarget(choices.nth(index), 40);
        }
      } else {
        await expectMinimumTarget(page.getByRole("textbox", { name: "Your two sentences" }), 40);
      }

      if (screen.name === "04c-question-map") {
        const mapText = page.locator("summary").filter({ hasText: "Read the map as text" });
        await expectMinimumTarget(mapText, 40);
        await mapText.click();
        await expect(
          page.getByText(
            "The shaded territory surrounds the Mediterranean. Its northwestern edge crosses the Channel beyond Gaul, while its far eastern edge reaches beyond Syria.",
            { exact: true },
          ),
        ).toBeVisible();
        await expectNoHorizontalOverflow(page);
      }
    }
  });

  test("persists the four-question journey, enforces mixed modes, and releases Exam feedback only on finish", async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      const key = "discere:tutoring-mode:rise-of-the-roman-empire";
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(key, "coach");
      }
    });
    let prerequisite = await readProgress(page);
    if (prerequisite.opening.status === "editing") {
      prerequisite = await requestReferenceAction(page, {
        action: "check_opening",
        order: prerequisite.opening.order,
      });
    }
    if (!prerequisite.augustus.completed) {
      prerequisite = await requestReferenceAction(page, { action: "complete_augustus" });
    }
    if (!prerequisite.expansion.saved) {
      prerequisite = await requestReferenceAction(page, {
        action: "save_expansion_response",
        answer: "Roman territory expanded between 27 BCE and 117 CE.",
      });
    }
    expect(prerequisite.activeBeat).toBe("expansion");
    expect(prerequisite.expansion.completed).toBe(false);

    await page.goto(COURSE_PATH);
    await expect(page.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      `${LESSON_ROOT}/expansion`,
    );
    await page.getByRole("link", { name: "Continue" }).click();
    await expect(page.getByRole("textbox", { name: "Your answer" })).not.toHaveValue("");
    await performReferenceAction(page, "complete_expansion", async () => {
      await page.getByRole("button", { name: "Next" }).click();
    });

    const q1Prompt = "Put these turning points in order";
    await expect(page.getByRole("heading", { level: 1, name: q1Prompt })).toBeVisible();
    await expectQuestionOrder(page, [
      "Roman territory reaches its greatest extent",
      "The last western emperor is removed",
      "Octavian receives the name Augustus",
      "The empire passes to separate eastern and western rulers",
    ]);

    const deposition = page
      .getByRole("button", {
        name: "The last western emperor is removed, position 2 of 4",
      })
      .locator("..");
    const division = page
      .getByRole("button", {
        name: "The empire passes to separate eastern and western rulers, position 4 of 4",
      })
      .locator("..");
    await performReferenceAction(page, "update_question_draft", async () => {
      await deposition.dragTo(division);
    });
    await expectQuestionOrder(page, [
      "Roman territory reaches its greatest extent",
      "Octavian receives the name Augustus",
      "The empire passes to separate eastern and western rulers",
      "The last western emperor is removed",
    ]);

    let saved = await performReferenceAction(page, "submit_question", async () => {
      await page.getByRole("button", { name: "Check order" }).click();
    });
    let q1 = questionById(saved, "turning-points");
    expect(q1.progress.mode).toBe("coach");
    expect(q1.progress.result).toBe("partly_correct");
    expect(q1.progress.feedback).toBe(
      "Two date relationships are in place. Octavian received the name Augustus in 27 BCE, before Rome reached its greatest extent in 117 CE. Move those cards and check the sequence again.",
    );
    await expect(
      page.getByText(q1.progress.feedback ?? "missing feedback", { exact: true }),
    ).toBeVisible();

    saved = await performReferenceAction(page, "request_question_hint", async () => {
      await page.getByRole("button", { name: "Ask for a hint" }).click();
    });
    q1 = questionById(saved, "turning-points");
    expect(q1.progress.hints).toEqual([
      {
        level: 1,
        text: "Anchor the sequence with Augustus at the beginning and the western deposition at the end.",
      },
    ]);
    await expect(page.getByRole("list", { name: "Hints" })).toContainText(
      "Anchor the sequence with Augustus at the beginning and the western deposition at the end.",
    );

    const augustus = page.getByRole("button", {
      name: "Octavian receives the name Augustus, position 2 of 4",
    });
    await augustus.focus();
    await performReferenceAction(page, "update_question_draft", async () => {
      await page.keyboard.press("ArrowUp");
    });
    await expectQuestionOrder(page, [
      "Octavian receives the name Augustus",
      "Roman territory reaches its greatest extent",
      "The empire passes to separate eastern and western rulers",
      "The last western emperor is removed",
    ]);
    await page.reload();
    await expectQuestionOrder(page, [
      "Octavian receives the name Augustus",
      "Roman territory reaches its greatest extent",
      "The empire passes to separate eastern and western rulers",
      "The last western emperor is removed",
    ]);
    await expect(
      page.getByText(q1.progress.feedback ?? "missing feedback", { exact: true }),
    ).toBeVisible();

    saved = await performReferenceAction(page, "submit_question", async () => {
      await page.getByRole("button", { name: "Check again" }).click();
    });
    q1 = questionById(saved, "turning-points");
    expect(q1.progress.result).toBe("correct");
    expect(q1.progress.feedback).toBe(
      "The order is 27 BCE, 117 CE, 395 CE, then 476 CE. Rome reached its territorial maximum before power passed to separate eastern and western rulers; the western deposition came later.",
    );
    await expect(
      page.getByText(q1.progress.feedback ?? "missing feedback", { exact: true }),
    ).toBeVisible();
    await performReferenceAction(page, "access_question_sources", async () => {
      await page.getByRole("button", { name: "View sources" }).click();
    });
    const sourceDialog = page.getByRole("dialog", { name: "Sources" });
    await expect(sourceDialog.getByRole("link", { name: "Augustus" })).toBeVisible();
    await expect(
      sourceDialog.getByRole("link", { exact: true, name: "Roman Empire" }),
    ).toBeVisible();
    await expect(
      sourceDialog.getByRole("link", { name: "Fall of the Western Roman Empire" }),
    ).toBeVisible();
    await expect(
      sourceDialog.getByRole("link", {
        name: "World History Volume 1: The Eastward Shift",
      }),
    ).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Close sources" }).click();
    await expect(sourceDialog).toBeHidden();
    await captureQuestionScreen(page, "04a-question-ordering");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Why is 476 CE an incomplete date for the end of Rome?",
      }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: q1Prompt })).toBeVisible();
    await page.goForward();

    await performReferenceAction(page, "update_question_draft", async () => {
      await page
        .getByRole("radio", {
          name: "It marks a western political change while Roman government continued in the east.",
        })
        .click();
    });
    saved = await performReferenceAction(page, "submit_question", async () => {
      await page.getByRole("button", { name: "Check answer" }).click();
    });
    const q2 = questionById(saved, "476-continuity");
    expect(q2.progress.mode).toBe("coach");
    expect(q2.progress.result).toBe("correct");
    expect(q2.progress.feedback).toBe(
      "476 CE is useful for the western court. The Eastern Roman Empire continued from Constantinople.",
    );
    await expect(
      page.getByText(q2.progress.feedback ?? "missing feedback", { exact: true }),
    ).toBeVisible();
    await captureQuestionScreen(page, "04b-understanding-check");

    await page.goto(COURSE_PATH);
    await expect(page.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      `${LESSON_ROOT}/questions/map-117`,
    );
    await page.getByRole("link", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Select the two regions that show Rome’s reach from northwest to east in 117 CE.",
      }),
    ).toBeVisible();
    const modeControl = page.getByRole("group", { name: "Learning mode" });
    await modeControl.getByRole("button", { name: "Direct" }).click();
    await expect(modeControl.getByRole("button", { name: "Direct" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    for (const choice of ["Scandinavia", "India"]) {
      await performReferenceAction(page, "update_question_draft", async () => {
        await page.getByRole("checkbox", { name: choice }).click();
      });
    }
    saved = await performReferenceAction(page, "submit_question", async () => {
      await page.getByRole("button", { name: "Check answer" }).click();
    });
    let q3 = questionById(saved, "map-117");
    expect(q3.progress.mode).toBe("direct");
    expect(q3.progress.result).toBe("incorrect");
    expect(q3.progress.feedback).toBe(
      "Both selected regions lie outside the shaded territory. Trace the shaded boundary from the northwest to its far eastern edge.",
    );
    await expect(
      page.getByText(q3.progress.feedback ?? "missing feedback", { exact: true }),
    ).toBeVisible();
    await expectVisibleLessonImagesLoaded(page);

    const mapText = page.locator("summary").filter({ hasText: "Read the map as text" });
    await mapText.click();
    await expect(
      page.getByText(
        "The shaded territory surrounds the Mediterranean. Its northwestern edge crosses the Channel beyond Gaul, while its far eastern edge reaches beyond Syria.",
        { exact: true },
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reveal answer" }).click();
    await page
      .getByRole("textbox", { name: "Why do you need the answer?" })
      .fill("I am stuck after tracing both edges of the shaded territory.");
    await page.getByRole("textbox", { name: "Type show answer to confirm" }).fill("show answer");
    saved = await performReferenceAction(page, "reveal_question", async () => {
      await page.getByRole("button", { name: "Show answer" }).click();
    });
    q3 = questionById(saved, "map-117");
    expect(q3.progress.status).toBe("revealed");
    expect(q3.progress.result).toBe("incorrect");
    expect(q3.progress.revealedAnswer).toEqual({
      kind: "multi_select",
      choiceIds: ["britain", "mesopotamia"],
    });
    await expect(page.getByRole("heading", { level: 2, name: "Answer" })).toBeVisible();
    await expect(page.getByText("Britain and Mesopotamia", { exact: true })).toBeVisible();
    await captureQuestionScreen(page, "04c-question-map");

    await page.getByRole("button", { name: "Next" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "How did Rome change by 117 CE?" }),
    ).toBeVisible();
    const q4ModeControl = page.getByRole("group", { name: "Learning mode" });
    const examButton = q4ModeControl.getByRole("button", { name: "Exam" });
    await examButton.click();
    await expect(examButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "View sources" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open the tutor in the current Roman lesson" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ask for a hint" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reveal answer" })).toHaveCount(0);

    const twoSentenceAnswer =
      "Roman territory expanded substantially after 27 BCE and reached its greatest extent under Trajan in 117 CE. Augustus kept republican offices in place, but he held the powers that made him the dominant ruler.";
    saved = await performReferenceAction(page, "update_question_draft", async () => {
      await page.getByRole("textbox", { name: "Your two sentences" }).fill(twoSentenceAnswer);
    });
    expect(questionById(saved, "two-sentence").progress.draft).toEqual({
      kind: "free_response",
      text: twoSentenceAnswer,
    });
    await expect(page.getByText("2 sentences", { exact: true })).toBeVisible();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Your two sentences" })).toHaveValue(
      twoSentenceAnswer,
    );
    await expect(examButton).toHaveAttribute("aria-pressed", "true");
    await page.goBack();
    await expect(
      page.getByRole("heading", { level: 1, name: /Select the two regions/ }),
    ).toBeVisible();
    await page.goForward();
    await expect(page.getByRole("textbox", { name: "Your two sentences" })).toHaveValue(
      twoSentenceAnswer,
    );
    await expect(examButton).toHaveAttribute("aria-pressed", "true");

    saved = await performReferenceAction(page, "submit_question", async () => {
      await page.getByRole("button", { name: "Check answer" }).click();
    });
    let q4 = questionById(saved, "two-sentence");
    expect(q4.progress.mode).toBe("exam");
    expect(q4.progress.status).toBe("submitted");
    expect(q4.progress.result).toBeNull();
    expect(q4.progress.feedback).toBeNull();
    await expect(page.getByText("Answer saved. Feedback opens after you finish.")).toBeVisible();
    await expect(page.locator(".reference-question-feedback")).toHaveCount(0);

    saved = await performReferenceAction(page, "finish_assessment", async () => {
      await page.getByRole("button", { name: "Finish", exact: true }).click();
    });
    expect(saved.assessmentFinished).toBe(true);
    q4 = questionById(saved, "two-sentence");
    expect(q4.progress.result).toBe("correct");
    expect(q4.progress.feedback).toBe(
      "One sentence identifies the territorial maximum in 117 CE. The other distinguishes republican offices from the powers Augustus held.",
    );

    await page.goto(`${LESSON_ROOT}/questions/two-sentence`);
    await expect(
      page.getByText(q4.progress.feedback ?? "missing feedback", { exact: true }),
    ).toBeVisible();
    await captureQuestionScreen(page, "04d-question-response");

    // Finishing the assessment moves the frontier past the questions: the next thing to do is
    // the essay, so that is where the course resumes.
    await page.goto(COURSE_PATH);
    await expect(page.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      `${LESSON_ROOT}/essay`,
    );
  });
});

const ESSAY_PATH = `${LESSON_ROOT}/essay`;

const ESSAY_DRAFT = [
  "Political conflict mattered more than size to Rome's transformation, because the state kept",
  "governing a large territory long after its politics stopped working. Augustus settled the",
  "succession problem in 27 BCE by keeping republican offices while holding the powers that",
  "decided things, which meant the constitution said one thing and practice another. Territory",
  "reached its greatest extent under Trajan in 117 CE, and the empire governed it for another",
  "century without breaking. The third-century crisis from 235 CE produced repeated claimants and",
  "civil wars, and that instability, not the size of the frontier, is what emptied the treasury.",
  "Diocletian answered it in 284 CE by dividing rule between four emperors, which shows the",
  "problem was understood as political rather than territorial. Although size made the succession",
  "problem harder to contain, because a distant army could raise its own emperor, the tetrarchy",
  "shows Rome could hold the territory once the political question was addressed.",
].join(" ");

/**
 * Drives the four questions through the API rather than the interface. Gate 3 already proves the
 * question screens work; repeating that here would only make a Gate 4 failure slower to find.
 */
async function reachEssayBeat(page: Page, mode = "coach"): Promise<ReferenceProgress> {
  let progress = await readProgress(page);
  if (progress.opening.status === "editing") {
    progress = await requestReferenceAction(page, {
      action: "skip_opening",
      order: progress.opening.order,
    });
  }
  if (!progress.augustus.completed) {
    progress = await requestReferenceAction(page, { action: "complete_augustus" });
  }
  if (!progress.expansion.saved) {
    progress = await requestReferenceAction(page, {
      action: "save_expansion_response",
      answer: "Roman territory expanded between 27 BCE and 117 CE.",
    });
  }
  if (!progress.expansion.completed) {
    progress = await requestReferenceAction(page, { action: "complete_expansion" });
  }
  const responses: Array<{ questionId: ReferenceQuestionId; response: unknown }> = [
    {
      questionId: "turning-points",
      response: { kind: "ordering", order: ["augustus", "extent", "division", "deposition"] },
    },
    { questionId: "476-continuity", response: { kind: "selection", choiceId: "western-change" } },
    {
      questionId: "map-117",
      response: { kind: "multi_select", choiceIds: ["britain", "mesopotamia"] },
    },
    {
      questionId: "two-sentence",
      response: {
        kind: "free_response",
        text: "Roman territory expanded substantially after 27 BCE and reached its greatest extent under Trajan in 117 CE. Augustus kept republican offices in place, but he held the powers that made him the dominant ruler.",
      },
    },
  ];
  for (const { questionId, response } of responses) {
    if (questionById(progress, questionId).progress.status !== "editing") continue;
    progress = await requestReferenceAction(page, {
      action: "submit_question",
      questionId,
      response,
      mode,
    });
  }
  if (!progress.assessmentFinished) {
    progress = await requestReferenceAction(page, { action: "finish_assessment" });
  }
  expect(progress.activeBeat).toBe("essay");
  return progress;
}

/**
 * The essay page is taller than any of the viewports, so a capture pinned to the top shows the
 * draft box and nothing else. `focus` names the part being reviewed and is scrolled into frame
 * first — a screenshot of the feedback design that does not contain the feedback is not evidence
 * of anything.
 */
async function captureEssayScreen(page: Page, name: string, focus?: Locator): Promise<void> {
  mkdirSync(OUTPUT, { recursive: true });
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForLoadState("networkidle");
    if (focus) {
      await focus.scrollIntoViewIfNeeded();
      await expect(focus).toBeInViewport();
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    }
    await expect(page.locator("#stage")).toBeVisible();
    await expectVisibleLessonImagesLoaded(page);
    await page.screenshot({
      animations: "disabled",
      fullPage: false,
      path: join(OUTPUT, `${name}-${viewport.label}.png`),
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

/**
 * These run against one shared database in declaration order, so the test that finishes the essay
 * — which makes it permanently read-only — has to come last. Reading tests first, the writing test
 * afterwards.
 */
test.describe("Recovery v2 Gate 4", () => {
  test("keeps the essay closed to assistance in Exam mode", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.setItem("discere:tutoring-mode:rise-of-the-roman-empire", "exam");
    });
    await reachEssayBeat(page, "exam");
    await page.goto(ESSAY_PATH);

    const evidence = page.getByRole("complementary", { name: "Evidence" });
    await expect(evidence.getByRole("heading", { name: "Closed in Exam mode" })).toBeVisible();
    await expect(evidence.getByRole("button", { name: "Open evidence" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "View sources" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open the tutor in the current Roman lesson" }),
    ).toHaveCount(0);

    const refused = await page.request.put(PROGRESS_API, {
      data: { action: "access_essay_tutor", mode: "exam" },
    });
    expect(refused.status()).toBe(403);
  });

  test("keeps the essay usable at 390 px without horizontal overflow", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("discere:tutoring-mode:rise-of-the-roman-empire", "coach");
    });
    await reachEssayBeat(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(ESSAY_PATH);

    await expect(page.getByRole("textbox", { name: "Draft" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectMinimumTarget(page.getByRole("button", { name: "Submit" }), 44);
    // The pack is still closed at this point, so what has to fit is the control that opens it.
    const evidence = page.getByRole("complementary", { name: "Evidence" });
    await expectMinimumTarget(evidence.getByRole("button", { name: "Open evidence" }), 44);
    await page.getByRole("textbox", { name: "Draft" }).fill(ESSAY_DRAFT);
    await expectNoHorizontalOverflow(page);
  });
  test("writes, submits, revises, and finishes the essay against server-held authority", async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      window.localStorage.setItem("discere:tutoring-mode:rise-of-the-roman-empire", "coach");
    });
    await reachEssayBeat(page);

    await page.goto(COURSE_PATH);
    await expect(page.getByRole("link", { name: "Continue" })).toHaveAttribute("href", ESSAY_PATH);
    await page.getByRole("link", { name: "Continue" }).click();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "What mattered more to Rome's transformation: its size or its political conflicts?",
      }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Rubric" }).getByRole("listitem")).toHaveCount(5);
    await expect(page.getByRole("button", { name: "Submit" })).toBeDisabled();

    // The evidence pack is closed until the learner opens it, and opening it locks the mode.
    const evidence = page.getByRole("complementary", { name: "Evidence" });
    await expect(evidence.getByRole("heading", { name: "Choose your mode first" })).toBeVisible();
    let saved = await performReferenceAction(page, "access_essay_sources", async () => {
      await evidence.getByRole("button", { name: "Open evidence" }).click();
    });
    expect(saved.essay.progress.sourcesOpened).toBe(true);
    expect(saved.essay.progress.mode).toBe("coach");
    expect(saved.essay.content.evidence.length).toBeGreaterThanOrEqual(6);
    await expect(evidence.getByRole("checkbox")).toHaveCount(6);

    await captureEssayScreen(page, "05a-essay-studio");

    // The plan is a disclosure, so the fields only exist once it is open.
    await page.getByText("Plan the argument", { exact: true }).click();
    saved = await performReferenceAction(page, "update_essay_draft", async () => {
      await page
        .getByRole("textbox", { name: "Claim" })
        .fill("Political conflict outweighed size.");
    });
    expect(saved.essay.progress.claimPlan).toBe("Political conflict outweighed size.");

    saved = await performReferenceAction(page, "update_essay_draft", async () => {
      await evidence.getByRole("checkbox").nth(2).check();
    });
    expect(saved.essay.progress.evidencePlan).toContain("third-century-crisis");
    await expect(evidence.getByText("1 selected")).toBeVisible();

    saved = await performReferenceAction(page, "update_essay_draft", async () => {
      await page.getByRole("textbox", { name: "Draft" }).fill(ESSAY_DRAFT);
    });
    expect(saved.essay.progress.draft).toBe(ESSAY_DRAFT);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    // A reload restores the draft, the plan, and the selection from the server, not the browser.
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Draft" })).toHaveValue(ESSAY_DRAFT);
    await expect(evidence.getByText("1 selected")).toBeVisible();

    saved = await performReferenceAction(page, "submit_essay_revision", async () => {
      await page.getByRole("button", { name: "Submit" }).click();
    });
    expect(saved.essay.progress.status).toBe("submitted");
    expect(saved.essay.progress.submissions).toHaveLength(1);
    const first = saved.essay.progress.submissions[0];
    if (!first) throw new Error("The submission produced no feedback.");
    expect(first.dimensions).toHaveLength(5);
    expect(first.usedEvidenceIds.length).toBeGreaterThanOrEqual(3);

    const feedback = page.getByRole("region", { name: "Essay feedback" });
    await expect(feedback.getByText(`Revision ${first.revision}`)).toBeVisible();
    await expect(feedback.getByText(first.summary, { exact: true })).toBeVisible();
    for (const dimension of first.dimensions) {
      await expect(feedback.getByText(dimension.comment, { exact: true })).toBeVisible();
      if (dimension.excerpt === null) continue;
      // The quoted excerpt has to be the learner's own text.
      expect(ESSAY_DRAFT).toContain(dimension.excerpt.replace(/\.\.\.$/, ""));
    }
    await expect(page.getByRole("button", { name: "Submit" })).toHaveCount(0);
    await captureEssayScreen(page, "05b-essay-feedback", feedback);

    saved = await performReferenceAction(page, "start_essay_revision", async () => {
      await feedback.getByRole("button", { name: "Revise" }).click();
    });
    expect(saved.essay.progress.status).toBe("editing");
    await expect(page.getByRole("button", { name: "Submit" })).toBeEnabled();
    // The previous feedback stays visible so the revision has something to answer.
    await expect(feedback).toBeVisible();

    const revised = `${ESSAY_DRAFT} Constantine dedicated Constantinople in 330 CE, nearer the frontiers that mattered.`;
    await performReferenceAction(page, "update_essay_draft", async () => {
      await page.getByRole("textbox", { name: "Draft" }).fill(revised);
    });
    saved = await performReferenceAction(page, "submit_essay_revision", async () => {
      await page.getByRole("button", { name: "Submit" }).click();
    });
    expect(saved.essay.progress.submissions.map((item) => item.revision)).toEqual([1, 2]);

    saved = await performReferenceAction(page, "finish_essay", async () => {
      await page.getByRole("button", { name: "Finish", exact: true }).click();
    });
    expect(saved.essay.progress.finished).toBe(true);
    await expect(page).toHaveURL(new RegExp(`${COURSE_PATH}$`));

    // The finished essay is read-only, and the course no longer offers anything after it.
    await page.goto(ESSAY_PATH);
    await expect(page.getByRole("textbox", { name: "Draft" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Submit" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Course home" })).toBeVisible();
  });
});
