import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIRequestContext, Locator, Page } from "@playwright/test";
import {
  type CourseBundle,
  CourseBundleSchema,
  type ExplainerStage,
  type LearnerQuestion,
  type LearnerStage,
  orderAnswerIds,
  sortAnswerItems,
  structuredAnswerResponse,
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

/** The ids of every course the content holds, with whether the catalogue lists it. */
export function contentCourses(): Array<{ id: string; listed: boolean }> {
  const content = join(root, "content");
  return readdirSync(content)
    .sort()
    .flatMap((id) => {
      const file = join(content, id, "bundle.json");
      if (!existsSync(file)) return [];
      const course = JSON.parse(readFileSync(file, "utf8")).course as {
        catalogueVisibility?: string;
      };
      return [{ id, listed: course.catalogueVisibility !== "archived" }];
    });
}

export interface FigureStep {
  courseId: string;
  lessonId: string;
  stepId: string;
  /** Whether the step asks a question of its own, so the figure opens once it is answered. */
  asks: boolean;
}

/**
 * One step for every kind of figure a lesson can hold, found by reading the bundles. A new kind
 * is covered as soon as a lesson uses it. A step that asks a question is preferred, because its
 * figure has two states: before the answer and after it.
 */
export function figureSteps(): Map<string, FigureStep> {
  const found = new Map<string, FigureStep>();
  for (const course of contentCourses()) {
    if (!course.listed) continue;
    const bundle = JSON.parse(
      readFileSync(join(root, "content", course.id, "bundle.json"), "utf8"),
    ) as {
      lessons: Array<{
        id: string;
        steps: Array<{
          id: string;
          checkQuestionId?: string;
          workedSteps?: unknown[];
          diagram?: { type: string };
        }>;
      }>;
      questions: Array<{ id: string; code?: unknown }>;
    };
    const code = new Set(bundle.questions.filter((item) => item.code).map((item) => item.id));
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps) {
        if (!step.diagram) continue;
        // A program needs a runtime to be marked, so a step that asks for one is not used here.
        const asks =
          Boolean(step.checkQuestionId) && !step.workedSteps && !code.has(step.checkQuestionId!);
        const had = found.get(step.diagram.type);
        if (!had || (asks && !had.asks))
          found.set(step.diagram.type, {
            courseId: course.id,
            lessonId: lesson.id,
            stepId: step.id,
            asks,
          });
      }
  }
  return found;
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

/**
 * The parts of an order or sort answer inside `scope`: a lesson question's form, or a review
 * card that asks the question again.
 */
export function arrangement(scope: Locator) {
  return {
    /** The rows of an order question, in the sequence they are in now. */
    orderItems: scope.locator(".order-list > li"),
    move: (itemId: string, direction: "up" | "down") =>
      scope.locator(`[data-move=${attr(`${itemId}:${direction}`)}]`),
    /** The live region that says where an item moved to, or which group it went in. */
    announcement: scope.locator("p.sr-only[aria-live=polite]"),
    /** One item of a sort question, wherever it is: waiting in the list or placed in a group. */
    sortItem: (itemId: string) => scope.locator(`[data-focus=${attr(`item:${itemId}`)}]`),
    /** The button that places the chosen item in a group. */
    sortTarget: (binId: string) => scope.locator(`[data-focus=${attr(`bin:${binId}`)}]`),
    /** A group of a sort question, with whatever has been placed in it. */
    sortBin: (binId: string) =>
      scope
        .locator(".sort-bin")
        .filter({ has: scope.page().locator(`[data-focus=${attr(`bin:${binId}`)}]`) }),
  };
}

/** The ids of an order question's items in the sequence they are on screen. */
export async function orderOnScreen(scope: Locator): Promise<string[]> {
  return arrangement(scope).orderItems.evaluateAll((items) =>
    items.map((item) => item.getAttribute("data-item") ?? ""),
  );
}

/**
 * Arranges an order question into a given sequence the way a learner does, with the move
 * buttons: each item in turn is moved up until it is in its place.
 */
export async function arrangeOrder(scope: Locator, ids: string[]): Promise<void> {
  const on = arrangement(scope);
  await expect(on.orderItems).toHaveCount(ids.length);
  for (const [place, id] of ids.entries()) {
    let at = (await orderOnScreen(scope)).indexOf(id);
    if (at < 0) throw new Error(`No item ${id} is on screen.`);
    for (; at > place; at -= 1) {
      await on.move(id, "up").click();
      await expect(on.orderItems.nth(at - 1)).toHaveAttribute("data-item", id);
    }
  }
  expect(await orderOnScreen(scope)).toEqual(ids);
}

/** Places every item of a sort question: each is chosen, and then its group is chosen. */
export async function placeSort(scope: Locator, placed: Record<string, string>): Promise<void> {
  const on = arrangement(scope);
  for (const [itemId, binId] of Object.entries(placed)) {
    await on.sortItem(itemId).click();
    await expect(on.sortItem(itemId)).toHaveAttribute("aria-pressed", "true");
    await on.sortTarget(binId).click();
    await expect(on.sortBin(binId).locator(`[data-focus=${attr(`item:${itemId}`)}]`)).toBeVisible();
  }
}

/** A wrong arrangement of an order question: the right one with its first two items changed over. */
export function wrongOrder(authored: Question): string[] {
  const [first, second, ...rest] = orderAnswerIds(authored);
  return [second!, first!, ...rest];
}

/** The right sorting of a sort question: each item's id with the id of its group. */
export function rightSort(authored: Question): Record<string, string> {
  return Object.fromEntries(sortAnswerItems(authored).map((item) => [item.id, item.bin]));
}

/** A wrong sorting: every item in the first group. */
export function wrongSort(authored: Question): Record<string, string> {
  const first = authored.sort?.bins[0]?.id ?? "";
  return Object.fromEntries(sortAnswerItems(authored).map((item) => [item.id, first]));
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
 * choice, a number far from the value, a sentence that says nothing, the unchanged starter, an
 * order with its first two items changed over, or a sorting with every item in the first group.
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
  if (authored.order) {
    await arrangeOrder(on.form, wrong ? wrongOrder(authored) : orderAnswerIds(authored));
    return;
  }
  if (authored.sort) {
    await placeSort(
      on.form,
      wrong
        ? wrongSort(authored)
        : rightSort(authored),
    );
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
  // A test may have settled the question its own way first (a miss and the shown answer, say).
  if ((await on.beat.getAttribute("data-result")) && (await on.check.count()) === 0) return;
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
  /** Stop when the first stage of this type is on screen, before doing anything on it. */
  stopAtStage?: LearnerStage["type"];
  /** Called when a stage is on screen, before anything is done on it. */
  onStage?: (stage: LearnerStage) => Promise<void>;
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
    if (options.stopAtStage === stage.type || options.onStage) {
      await expect(page).toHaveURL(new RegExp(`/stages/${encodeURIComponent(stage.id)}$`));
      await expect(page.locator("main#stage")).toBeVisible();
      if (options.stopAtStage === stage.type) return journey;
      await options.onStage?.(stage);
    }
    if (stage.type === "explainer") {
      await playScreens(page, bundle, journey, options);
      if (options.stopAtStep) return journey;
    } else if (stage.type === "quiz") {
      // A question after the lesson's screens, asked on a screen of its own.
      await answerCorrectly(page, questionIn(bundle, stage.questionId), stage.question);
      await forwardButton(page).click();
    } else if (stage.type === "interactive_visual") {
      // An explorer with a prediction. Any prediction can be checked against what it shows.
      await page.locator(".prediction-choices button").first().click();
      await page.getByRole("button", { name: "Check prediction", exact: true }).click();
      await expect(page.locator(".prediction .notice, .prediction [role=status]").first()).toBeVisible();
      await page.locator(".prediction").getByRole("button", { name: "Continue" }).click();
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
    }
  }
  return journey;
}

/**
 * Opens a lesson at one of its steps. The player opens where the learner left off, so the saved
 * place is the way in: nothing before the step has to be answered first.
 */
export async function openAtStep(
  page: Page,
  request: APIRequestContext,
  journey: LessonJourney,
  stepId: string,
): Promise<void> {
  const route = `/api/courses/${encodeURIComponent(journey.courseId)}/lessons/${encodeURIComponent(journey.lessonId)}`;
  const saved = await request.put(`${route}/progress`, {
    data: { stageId: journey.explainer.id, state: "active", interactionState: { stepId } },
  });
  expect(saved.ok(), await saved.text()).toBe(true);
  await page.goto(lessonPath(journey.courseId, journey.lessonId));
  await expect(page.locator(".step-screen")).toBeVisible();
}

/** Whether the sandboxed Python the code lessons need is installed for this run. */
export function pythonRuntimeInstalled(): boolean {
  const runtime = process.env["DISCERE_PYTHON_RUNTIME_DIR"] ?? join(root, "data/python-runtime");
  return existsSync(join(runtime, "lib/python3.12/site-packages/pandas"));
}

/**
 * Finishes every lesson of a course through the API, for a test that is about what opens once
 * the lessons are done (a course check) and not about the lessons themselves.
 *
 * Lessons do not depend on each other, so four are done at a time. A program is run in the
 * sandbox each time it is marked, and the sandbox takes one at a time, so those answers wait
 * their turn. On a computer where a language cannot run, the server does not ask for its
 * exercises, and they are left out here too.
 */
export async function completeLessonsThroughApi(
  request: APIRequestContext,
  base: string,
  bundle: CourseBundle,
): Promise<void> {
  const runnable = await runnableLanguages(request, base);
  const post = async (url: string, data: unknown = {}) => {
    const response = await request.post(base + url, { data });
    expect(response.ok(), `${url}: ${await response.text()}`).toBe(true);
    return response.json();
  };
  let sandbox: Promise<unknown> = Promise.resolve();
  const inTurn = <T>(run: () => Promise<T>): Promise<T> => {
    const result = sandbox.then(run);
    sandbox = result.catch(() => undefined);
    return result;
  };
  const completeLesson = async (lesson: CourseBundle["lessons"][number]) => {
    const questionIds = [
      ...lesson.steps.map((step) => step.checkQuestionId),
      ...lesson.questionIds,
    ].filter(Boolean);
    for (const id of questionIds) {
      const question = questionIn(bundle, id);
      const authority = question.answerAuthority;
      if (question.code && !runnable.has(question.code.language)) continue;
      const answer = () =>
        post("/api/attempts", {
          questionId: question.id,
          response:
            authority.kind === "numeric"
              ? String(authority.value)
              : question.code
                ? authority.exampleAnswer
                : // An order or a sorting is sent as the arrangement of its items.
                  (structuredAnswerResponse(question) ?? authority.acceptedIdeas[0]),
          mode: "coach",
        });
      const result = await (question.code ? inTurn(answer) : answer());
      expect(result.correct, question.id).toBe(true);
    }
    for (const cardId of lesson.flashcardIds) {
      const card = bundle.flashcards.find((item) => item.id === cardId);
      const session = await post("/api/review/sessions", {
        lessonId: lesson.id,
        cardId,
        mode: "coach",
      });
      // A card that asks for an explanation is recalled and rated, with no typed response.
      if (card && card.recall !== "self" && card.answerAuthority)
        await post(`/api/review/sessions/${session.sessionId}/respond`, {
          response: cardAnswer(card),
        });
      await post(`/api/review/sessions/${session.sessionId}/reveal`);
      await post(`/api/review/sessions/${session.sessionId}/rate`, {
        rating: "easy",
        recalled: true,
      });
    }
    const route = `/api/courses/${bundle.course.id}/lessons/${lesson.id}`;
    const journey = (await (await request.get(`${base}${route}/journey`)).json()) as {
      stages: Array<{ id: string }>;
    };
    for (const stage of journey.stages) {
      const saved = await request.put(`${base}${route}/progress`, {
        data: { stageId: stage.id, state: "completed", interactionState: {} },
      });
      expect(saved.ok(), `${stage.id}: ${await saved.text()}`).toBe(true);
    }
  };
  const waiting = [...bundle.lessons];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let lesson = waiting.shift(); lesson; lesson = waiting.shift())
        await completeLesson(lesson);
    }),
  );
}
