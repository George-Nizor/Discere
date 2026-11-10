import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRequestContext, Locator, Page } from "@playwright/test";
import {
  type CourseBundle,
  CourseBundleSchema,
  type ExplainerStage,
  type LearnerQuestion,
  type LearnerStage,
} from "@discere/contracts";
import { expect } from "./fixtures.js";

/**
 * Plays a lesson the way a learner does, from what the lesson holds and not from its wording.
 *
 * The screens come from the journey the server sends (so the order of steps and of answer
 * choices is the one on screen) and the answers from the course bundle. Nothing here names a
 * sentence of a lesson, so rewording a lesson cannot break a test that uses it. What it relies on
 * is the interface: the roles, the labels of the answer inputs and the names of the buttons.
 */

const root = join(import.meta.dirname, "../../..");
const bundles = new Map<string, CourseBundle>();

export function loadBundle(courseId: string): CourseBundle {
  let bundle = bundles.get(courseId);
  if (!bundle) {
    bundle = CourseBundleSchema.parse(
      JSON.parse(readFileSync(join(root, "content", courseId, "bundle.json"), "utf8")),
    );
    bundles.set(courseId, bundle);
  }
  return bundle;
}

type Question = CourseBundle["questions"][number];
type Flashcard = CourseBundle["flashcards"][number];
export type CodeLanguage = NonNullable<Question["code"]>["language"];

export function questionIn(bundle: CourseBundle, id: string): Question {
  const question = bundle.questions.find((item) => item.id === id);
  if (!question) throw new Error(`${bundle.course.id} has no question ${id}.`);
  return question;
}

/** The languages this computer can run. A lesson that needs another one is skipped, not failed. */
export async function runnableLanguages(
  request: APIRequestContext,
  base = "",
): Promise<Set<CodeLanguage>> {
  const ready = new Set<CodeLanguage>();
  const ask = async (path: string) => {
    const response = await request.get(base + path);
    return response.ok() ? ((await response.json()) as Record<string, unknown>) : {};
  };
  if ((await ask("/api/typescript-runtime"))["ready"] === true) ready.add("typescript");
  if ((await ask("/api/sql-runtime"))["ready"] === true) ready.add("sql");
  const runtimes = (await ask("/api/code-runtimes"))["runtimes"];
  if (Array.isArray(runtimes))
    for (const runtime of runtimes as Array<{ id?: string; state?: string }>)
      if (runtime.state === "ready" && (runtime.id === "python" || runtime.id === "rust"))
        ready.add(runtime.id);
  return ready;
}

/** The languages a lesson's code questions are written in. */
export function lessonLanguages(bundle: CourseBundle, lessonId: string): CodeLanguage[] {
  const lesson = bundle.lessons.find((item) => item.id === lessonId);
  if (!lesson) throw new Error(`${bundle.course.id} has no lesson ${lessonId}.`);
  const ids = [
    lesson.intro?.hook.questionId,
    ...lesson.steps.flatMap((step) => [
      step.checkQuestionId,
      ...(step.workedSteps ?? []).flatMap((line) => [
        line.blank?.questionId,
        line.selfExplain?.questionId,
      ]),
    ]),
  ].filter((id): id is string => Boolean(id));
  return [...new Set(ids.flatMap((id) => questionIn(bundle, id).code?.language ?? []))];
}

/**
 * What went wrong in the page while a test ran: console errors, uncaught exceptions, requests
 * that never completed and responses the server refused. A test adds the ones it causes on
 * purpose to `allow`.
 */
export interface PageWatch {
  problems: string[];
  /** Fails the test if the page reported anything. */
  expectClean(): void;
}

export function watchPage(page: Page, allow: RegExp[] = []): PageWatch {
  const problems: string[] = [];
  const note = (text: string) => {
    if (!allow.some((pattern) => pattern.test(text))) problems.push(text);
  };
  page.on("console", (message) => {
    if (message.type() === "error") note(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => note(`uncaught: ${error.message}`));
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "";
    // Leaving a screen cancels what it was still loading. That is not a failure.
    if (/ERR_ABORTED/.test(reason)) return;
    note(`request failed: ${request.method()} ${request.url()} ${reason}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      note(`${response.status()}: ${response.request().method()} ${response.url()}`);
  });
  return {
    problems,
    expectClean() {
      expect(problems, "the page reported errors").toEqual([]);
    },
  };
}

/** No figure on the screen fell back to its error boundary. */
export async function expectFiguresDrawn(page: Page): Promise<void> {
  await expect(page.locator(".figure-failed")).toHaveCount(0);
}

/** The page is no wider than the window. */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
}

function attr(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/** The parts of one lesson question on screen, found by the question's id. */
export function questionOnScreen(page: Page, questionId: string) {
  const form = page.locator(`form[id=${attr(`check-${questionId}`)}]`);
  return {
    form,
    /** The block that holds the prompt, the input and the verdict. */
    beat: page.locator(".question-beat").filter({ has: form }),
    /** Check answer, then Check again. In the footer, or beside an inline question. */
    check: page.locator(`button[type="submit"][form=${attr(`check-${questionId}`)}]`),
    choices: form.getByRole("radiogroup").getByRole("radio"),
    value: form.locator(`[id=${attr(`answer-${questionId}-value`)}]`),
    unit: form.locator(`[id=${attr(`answer-${questionId}-unit`)}]`),
    text: form.locator(`[id=${attr(`answer-${questionId}-text`)}]`),
    code: form.locator(`[id=${attr(`answer-${questionId}-code`)}]`),
  };
}

function rightChoiceIndex(authored: Question, shown: LearnerQuestion): number {
  const authority = authored.answerAuthority;
  if (authority.kind !== "text") throw new Error(`${authored.id} is numeric and has choices.`);
  const right = authored.choices?.find((choice) => authority.acceptedIdeas.includes(choice.label));
  const index = shown.choices?.findIndex((choice) => choice.id === right?.id) ?? -1;
  if (index < 0) throw new Error(`${authored.id} has no choice that its answer accepts.`);
  return index;
}

/**
 * Fills in an answer without checking it. `wrong` gives an answer the question rejects: another
 * choice, a number far from the value, a sentence that says nothing, or the unchanged starter.
 */
export async function fillAnswer(
  page: Page,
  authored: Question,
  shown: LearnerQuestion,
  wrong = false,
): Promise<void> {
  const on = questionOnScreen(page, authored.id);
  const authority = authored.answerAuthority;
  if (authored.code) {
    if (authority.kind !== "text") throw new Error(`${authored.id}: a code answer is text.`);
    await on.code.fill(wrong ? authored.code.starter : authority.exampleAnswer);
    return;
  }
  if (shown.choices?.length) {
    const right = rightChoiceIndex(authored, shown);
    const index = wrong ? (right + 1) % shown.choices.length : right;
    await on.choices.nth(index).click();
    await expect(on.choices.nth(index)).toHaveAttribute("aria-checked", "true");
    return;
  }
  if (authority.kind === "numeric") {
    await on.value.fill(String(wrong ? authority.value + 1000 : authority.value));
    if (await on.unit.count()) await on.unit.fill(authority.unit);
    return;
  }
  await on.text.fill(wrong ? "zzz" : authority.exampleAnswer);
}

/** Answers a question correctly and waits for the verdict. */
export async function answerCorrectly(
  page: Page,
  authored: Question,
  shown: LearnerQuestion,
): Promise<void> {
  const on = questionOnScreen(page, authored.id);
  await expect(on.form).toBeVisible();
  await fillAnswer(page, authored, shown);
  await on.check.click();
  // A program is compiled and run on the server before it is marked.
  await expect(on.beat).toHaveAttribute("data-result", "correct", {
    timeout: authored.code ? 90_000 : 15_000,
  });
}

/** The way forward out of a lesson screen: Start on an opener, Continue, then Finish. */
export function forwardButton(page: Page): Locator {
  return page
    .locator(".story-actions")
    .getByRole("button", { name: /^(Start|Continue|Finish)$/ });
}

export interface LessonJourney {
  courseId: string;
  lessonId: string;
  title: string;
  stages: LearnerStage[];
  explainer: ExplainerStage;
}

export async function readLessonJourney(
  request: APIRequestContext,
  courseId: string,
  lessonId: string,
  base = "",
): Promise<LessonJourney> {
  const response = await request.get(
    `${base}/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/journey`,
  );
  expect(response.ok(), `${courseId}/${lessonId} journey`).toBe(true);
  const body = (await response.json()) as { title: string; stages: LearnerStage[] };
  const explainer = body.stages.find((stage) => stage.type === "explainer");
  if (!explainer || explainer.type !== "explainer")
    throw new Error(`${courseId}/${lessonId} has no lesson screens.`);
  return { courseId, lessonId, title: body.title, stages: body.stages, explainer };
}

export function lessonPath(courseId: string, lessonId: string): string {
  return `/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`;
}

/** The heading a new screen puts first, which is also where focus goes. */
export function screenHeading(page: Page): Locator {
  return page.locator(".story h1, .lesson-close h1, .lesson-recall h1, .essay h1").first();
}

export interface PlayOptions {
  /** Prefix for addresses when the test runs its own server. */
  base?: string;
  /** What to do with an optional writing task. A required one is always written. */
  writing?: "skip" | "submit";
  /** Called on every lesson screen once it is on screen, before it is answered. */
  onScreen?: (screen: { id: string; index: number; kind: string }) => Promise<void>;
  /** Stop before this step's screen is answered, leaving the lesson there. */
  stopAtStep?: string;
}

/** Answers everything on the opener or on one step, then leaves the way forward ready. */
export async function completeScreen(
  page: Page,
  bundle: CourseBundle,
  journey: LessonJourney,
  screenId: string,
): Promise<void> {
  const stage = journey.explainer;
  if (screenId === "opener") {
    const question = stage.intro?.hook.question;
    if (question) await answerCorrectly(page, questionIn(bundle, question.id), question);
    return;
  }
  const step = stage.steps.find((item) => item.id === screenId);
  if (!step) throw new Error(`${journey.lessonId} has no step ${screenId}.`);
  const lines = step.workedSteps ?? [];
  const nextLine = page.getByRole("button", { name: "Show the next line", exact: true });
  for (const [index, line] of lines.entries()) {
    // A worked example shows a line per press. A faded one shows its lines up to the first
    // blank still to fill, so the line is there as soon as the one before it is done.
    if (step.kind !== "faded_example" && index > 0) await nextLine.click();
    await expect(page.locator(".worked-lines > ol > li")).not.toHaveCount(index);
    for (const question of [line.blank, line.selfExplain])
      if (question) await answerCorrectly(page, questionIn(bundle, question.id), question);
  }
  if (lines.length) await expect(nextLine).toHaveCount(0);
  if (step.question) await answerCorrectly(page, questionIn(bundle, step.question.id), step.question);
}

/** The screens of a lesson in order: the opener when it has one, then each step. */
export function screenIds(journey: LessonJourney): string[] {
  return [
    ...(journey.explainer.intro ? ["opener"] : []),
    ...journey.explainer.steps.map((step) => step.id),
  ];
}

async function expectScreen(page: Page, journey: LessonJourney, screenId: string): Promise<void> {
  if (screenId === "opener") {
    await expect(page.locator(".lesson-opener")).toBeVisible();
    return;
  }
  const step = journey.explainer.steps.find((item) => item.id === screenId);
  await expect(page.locator(`.step-screen[data-kind=${attr(step?.kind ?? "")}]`)).toBeVisible();
  // The step's own question is the surest sign that this screen, not its neighbour, is showing.
  if (step?.question) await expect(questionOnScreen(page, step.question.id).form).toBeVisible();
}

/** Plays the lesson's screens from wherever it is open to the end of its steps. */
export async function playScreens(
  page: Page,
  bundle: CourseBundle,
  journey: LessonJourney,
  options: PlayOptions = {},
  from = 0,
): Promise<void> {
  const ids = screenIds(journey);
  for (let index = from; index < ids.length; index += 1) {
    const id = ids[index]!;
    await expectScreen(page, journey, id);
    const step = journey.explainer.steps.find((item) => item.id === id);
    await options.onScreen?.({ id, index, kind: step?.kind ?? "opener" });
    if (options.stopAtStep === id) return;
    await completeScreen(page, bundle, journey, id);
    await expectFiguresDrawn(page);
    await forwardButton(page).click();
  }
}

function cardAnswer(card: Flashcard): string {
  const authority = card.answerAuthority;
  if (!authority) throw new Error(`Card ${card.id} is typed and has no answer.`);
  return authority.kind === "numeric" ? String(authority.value) : authority.acceptedIdeas[0]!;
}

/** Works through a lesson's recall cards: a typed card is answered, a worded one is self-rated. */
export async function playReview(
  page: Page,
  bundle: CourseBundle,
  stage: Extract<LearnerStage, { type: "review" }>,
): Promise<void> {
  await page.getByRole("button", { name: "Start the review", exact: true }).click();
  for (let index = 0; index < stage.itemCount; index += 1) {
    await expect(page.getByRole("progressbar", { name: "Review progress" })).toHaveAttribute(
      "aria-valuetext",
      `Card ${index + 1} of ${stage.itemCount}`,
    );
    const card = bundle.flashcards.find((item) => item.id === stage.cardIds?.[index]);
    const typed = page.getByLabel("Your answer", { exact: true });
    const reveal = page.getByRole("button", { name: "Reveal answer", exact: true });
    await expect(reveal).toBeVisible();
    if (await typed.isVisible()) {
      if (card?.answerAuthority) {
        await typed.fill(cardAnswer(card));
        await page.getByRole("button", { name: "Check", exact: true }).click();
      } else await reveal.click();
    } else await reveal.click();
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText(/This card comes back /)).toBeVisible();
    await page
      .getByRole("button", {
        name: index + 1 < stage.itemCount ? "Next card" : "Continue",
        exact: true,
      })
      .click();
  }
}

/** Enough ordinary words to pass a writing task's minimum length. */
export function essayText(words: number): string {
  const sentence = "The evidence supports the claim because each step follows from the one before. ";
  let text = "";
  while (text.trim().split(/\s+/).length < words + 5) text += sentence;
  return text.trim();
}

/**
 * Plays a whole lesson: every screen, the writing task, the recall cards and the close, ending
 * on the finish screen. Returns the journey it played.
 */
export async function playLesson(
  page: Page,
  request: APIRequestContext,
  courseId: string,
  lessonId: string,
  options: PlayOptions = {},
): Promise<LessonJourney> {
  const base = options.base ?? "";
  const bundle = loadBundle(courseId);
  const journey = await readLessonJourney(request, courseId, lessonId, base);
  await page.goto(base + lessonPath(courseId, lessonId));
  for (const stage of journey.stages) {
    if (stage.type === "explainer") {
      await playScreens(page, bundle, journey, options);
      if (options.stopAtStep) return journey;
    } else if (stage.type === "quiz") {
      // A question after the lesson's screens, asked on a screen of its own.
      await answerCorrectly(page, questionIn(bundle, stage.questionId), stage.question);
      await forwardButton(page).click();
    } else if (stage.type === "essay") {
      await expect(page.getByLabel("Your writing")).toBeVisible();
      const skip = page.getByRole("button", { name: "Skip this task", exact: true });
      if (options.writing !== "submit" && (await skip.isVisible())) await skip.click();
      else {
        await page.getByLabel("Your writing").fill(essayText(stage.minWords));
        await page.getByRole("button", { name: "Submit", exact: true }).click();
        await expect(page.getByText(/^Submitted\./)).toBeVisible();
        await page.locator(".essay").getByRole("button", { name: "Continue" }).click();
      }
    } else if (stage.type === "review") {
      await playReview(page, bundle, stage);
    } else if (stage.type === "recap") {
      await expect(page.locator(".lesson-close")).toBeVisible();
      await forwardButton(page).click();
    } else if (stage.type === "completion") {
      await expect(page.locator(".lesson-finish")).toBeVisible();
      await expect(page.locator(".finish-stats")).toBeVisible();
    } else {
      throw new Error(
        `${courseId}/${lessonId} has a ${stage.type} stage, which the lesson player cannot play.`,
      );
    }
  }
  return journey;
}

/** Whether the sandboxed Python the code lessons need is installed for this run. */
export function pythonRuntimeInstalled(): boolean {
  const runtime = process.env["DISCERE_PYTHON_RUNTIME_DIR"] ?? join(root, "data/python-runtime");
  return existsSync(join(runtime, "lib/python3.12/site-packages/pandas"));
}
