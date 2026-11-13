import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./isolated-app.js";
import {
  answerCorrectly,
  completeScreen,
  essayText,
  expectNoSidewaysScroll,
  fillAnswer,
  forwardButton,
  lessonPath,
  loadBundle,
  openAtStep,
  playLesson,
  playScreens,
  questionIn,
  questionOnScreen,
  readLessonJourney,
  runnableLanguages,
  screenIds,
  watchPage,
} from "./lesson-player.js";

/**
 * What a learner can do inside a lesson besides answering it right the first time: go back, miss
 * a question and meet it again the next day, write and revise, read the sources, keep trying a
 * program, read a quoted extract, use only the keyboard, and use a phone.
 *
 * Lessons are named by id and steps are found by what they hold, never by their wording.
 */

const progressBar = (page: Page) => page.getByRole("progressbar", { name: "Lesson progress" });

test("Back returns to an answered screen and Continue goes forward without asking again", async ({
  page,
  request,
}) => {
  const courseId = "maths-foundations";
  const lessonId = "keeping-the-balance";
  const bundle = loadBundle(courseId);
  const journey = await readLessonJourney(request, courseId, lessonId);
  const ids = screenIds(journey);
  // The first step after the opener that asks a question of its own.
  const asked = journey.explainer.steps.findIndex((step) => step.question && !step.workedSteps);
  expect(asked).toBeGreaterThanOrEqual(0);
  const step = journey.explainer.steps[asked]!;
  const at = ids.indexOf(step.id);
  const watch = watchPage(page);

  await page.goto(lessonPath(courseId, lessonId));
  await playScreens(page, bundle, { ...journey }, { stopAtStep: step.id });
  await completeScreen(page, bundle, journey, step.id);
  const answered = questionOnScreen(page, step.question!.id);
  await forwardButton(page).click();
  await expect(answered.form).toHaveCount(0);
  const after = await progressBar(page).getAttribute("aria-valuenow");

  const back = page.getByRole("button", { name: "Back", exact: true });
  await back.click();
  // The answered screen is back, and the way forward is already open.
  await expect(answered.form).toBeVisible();
  await expect(forwardButton(page)).toBeVisible();
  expect(Number(await progressBar(page).getAttribute("aria-valuenow"))).toBeLessThan(Number(after));
  // Back and the way forward are side by side, never drawn over each other.
  if (at > 0) {
    const left = (await back.boundingBox())!;
    const right = (await forwardButton(page).boundingBox())!;
    expect(left.x + left.width).toBeLessThanOrEqual(right.x);
  }

  await forwardButton(page).click();
  await expect(answered.form).toHaveCount(0);
  await expect(progressBar(page)).toHaveAttribute("aria-valuenow", after!);

  // The place after going back and forward is the one a reload opens.
  await page.reload();
  await expect(page.locator(".step-screen")).toBeVisible();
  await expect(progressBar(page)).toHaveAttribute("aria-valuenow", after!);
  await playScreens(page, bundle, journey, {}, at + 1);
  await expect(page).not.toHaveURL(new RegExp(`${encodeURIComponent(journey.explainer.id)}$`));
  watch.expectClean();
});

test("a question missed twice is shown its answer and comes back as a review card the next day", async ({
  page,
  request,
  lab,
}) => {
  const courseId = "history";
  const lessonId = "silences-and-survival";
  const bundle = loadBundle(courseId);
  const journey = await readLessonJourney(request, courseId, lessonId);
  const rehearsed = new Set(bundle.flashcards.map((card) => card.questionId));
  // A choice question with a retry, which no authored card already rehearses.
  const step = journey.explainer.steps.find(
    (item) =>
      item.kind !== "predict" &&
      !item.workedSteps &&
      (item.question?.choices?.length ?? 0) > 2 &&
      !rehearsed.has(item.question!.id),
  );
  expect(step, "a step whose question can be missed twice").toBeTruthy();
  const authored = questionIn(bundle, step!.question!.id);
  const shown = step!.question!;
  const on = questionOnScreen(page, authored.id);
  expect((await (await request.get("/api/review")).json()).dueCount).toBe(0);

  await openAtStep(page, request, journey, step!.id);
  await fillAnswer(page, authored, shown, true);
  await on.check.click();
  await expect(on.beat).toHaveAttribute("data-result", "incorrect");
  // The first miss keeps the question open, and the same answer cannot be checked again.
  await expect(on.check).toHaveText("Check again");
  await expect(on.check).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(".beat-explanation")).toHaveCount(0);

  // A different wrong answer is the second miss: the answer is shown and the lesson goes on.
  const wrongAgain = (shown.choices!.findIndex(
    (choice) =>
      choice.id ===
      authored.choices!.find((item) =>
        authored.answerAuthority.kind === "text"
          ? authored.answerAuthority.acceptedIdeas.includes(item.label)
          : false,
      )!.id,
  ) +
    2) %
    shown.choices!.length;
  await on.choices.nth(wrongAgain).click();
  await on.check.click();
  await expect(page.locator(".beat-explanation")).toBeVisible();
  await expect(on.choices.first()).toHaveAttribute("aria-disabled", "true");
  await expect(on.form.locator(".choice-card-correct")).toHaveCount(1);
  await expect(forwardButton(page)).toBeVisible();

  // Answering introduced the lesson's own cards. The missed question is a card too, not due yet.
  const today = await (await request.get("/api/review")).json();
  const inCourse = (review: { courses: Array<{ courseId: string; cardCount: number }> }) =>
    review.courses.find((course) => course.courseId === courseId)?.cardCount ?? 0;
  const lesson = bundle.lessons.find((item) => item.id === lessonId)!;
  expect(inCourse(today)).toBe(lesson.flashcardIds.length + 1);

  lab.advanceDays(1);
  const tomorrow = await (await request.get("/api/review")).json();
  expect(tomorrow.dueCount).toBe(today.dueCount + 1);
  expect(inCourse(tomorrow)).toBe(inCourse(today));

  // The card shows the question and its options, is recalled in the head, and is self-rated.
  await page.goto("/review");
  await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeVisible();
  const options = page.getByRole("list", { name: "Options" });
  let found = false;
  for (let card = 0; card < tomorrow.dueCount && !found; card += 1) {
    if (card === 0) await page.getByRole("button", { name: "Start review", exact: true }).click();
    await expect(page.getByRole("progressbar", { name: "Review progress" })).toBeVisible();
    const reveal = page.getByRole("button", { name: "Reveal answer", exact: true });
    await expect(reveal).toBeVisible();
    if (await options.isVisible()) {
      found = true;
      await expect(options.getByRole("listitem")).toHaveCount(shown.choices!.length);
      await expect(page.getByLabel("Your answer", { exact: true })).toHaveCount(0);
    }
    await reveal.click();
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText(/This card comes back /)).toBeVisible();
    if (!found) await page.getByRole("button", { name: "Next card", exact: true }).click();
  }
  expect(found, "the missed question is among tomorrow's cards").toBe(true);
});

test("a question missed once and then answered right comes back in review the next day", async ({
  page,
  request,
  lab,
}) => {
  const courseId = "history";
  const lessonId = "silences-and-survival";
  const bundle = loadBundle(courseId);
  const journey = await readLessonJourney(request, courseId, lessonId);
  const rehearsed = new Set(bundle.flashcards.map((card) => card.questionId));
  const step = journey.explainer.steps.find(
    (item) =>
      item.kind !== "predict" &&
      !item.workedSteps &&
      (item.question?.choices?.length ?? 0) > 2 &&
      !rehearsed.has(item.question!.id),
  )!;
  const authored = questionIn(bundle, step.question!.id);
  const on = questionOnScreen(page, authored.id);

  await openAtStep(page, request, journey, step.id);
  await fillAnswer(page, authored, step.question!, true);
  await on.check.click();
  await expect(on.beat).toHaveAttribute("data-result", "incorrect");
  await fillAnswer(page, authored, step.question!);
  await on.check.click();
  await expect(on.beat).toHaveAttribute("data-result", "correct");

  // Right in the end, but only after a miss, so it is asked again tomorrow.
  const today = await (await request.get("/api/review")).json();
  lab.advanceDays(1);
  const tomorrow = await (await request.get("/api/review")).json();
  expect(tomorrow.dueCount).toBe(today.dueCount + 1);

  await page.goto("/review");
  await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeVisible();
  const options = page.getByRole("list", { name: "Options" });
  let found = false;
  for (let card = 0; card < tomorrow.dueCount && !found; card += 1) {
    if (card === 0) await page.getByRole("button", { name: "Start review", exact: true }).click();
    const reveal = page.getByRole("button", { name: "Reveal answer", exact: true });
    await expect(reveal).toBeVisible();
    if (await options.isVisible()) found = true;
    await reveal.click();
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText(/This card comes back /)).toBeVisible();
    if (!found) await page.getByRole("button", { name: "Next card", exact: true }).click();
  }
  expect(found, "the question answered after a miss is among tomorrow's cards").toBe(true);
});

test("a miss offers a hint, and a prediction gets one try", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  const courseId = "maths-foundations";
  const lessonId = "keeping-the-balance";
  const bundle = loadBundle(courseId);
  const journey = await readLessonJourney(request, courseId, lessonId);
  const hint = page.getByRole("button", { name: "Get a hint", exact: true });
  const showAnswer = page.getByRole("button", { name: "Show the answer", exact: true });
  const explanation = page.locator(".beat-explanation");

  // A step with a retry: the first miss says so, leaves the answer open and offers a hint.
  const retry = journey.explainer.steps.find(
    (step) =>
      step.kind !== "predict" &&
      !step.workedSteps &&
      step.question &&
      step.question.hintCount > 0 &&
      (step.question.choices === undefined || step.question.choices.length > 2),
  )!;
  expect(retry, "a step with a retry and a hint").toBeTruthy();
  await openAtStep(page, request, journey, retry.id);
  let authored = questionIn(bundle, retry.question!.id);
  let on = questionOnScreen(page, authored.id);
  await fillAnswer(page, authored, retry.question!, true);
  await on.check.click();
  await expect(on.beat).toHaveAttribute("data-result", "incorrect");
  await expect(explanation).toHaveCount(0);
  await expect(showAnswer).toBeVisible();
  await hint.click();
  await expect(page.getByRole("list", { name: "Hints used" }).getByRole("listitem")).toHaveCount(1);
  await fillAnswer(page, authored, retry.question!);
  await on.check.click();
  await expect(on.beat).toHaveAttribute("data-result", "correct");

  // A prediction is one honest try: a miss goes straight to the outcome and the teaching.
  const predict = journey.explainer.steps.find((step) => step.kind === "predict" && step.question);
  expect(predict, "a prediction step").toBeTruthy();
  await openAtStep(page, request, journey, predict!.id);
  authored = questionIn(bundle, predict!.question!.id);
  on = questionOnScreen(page, authored.id);
  await fillAnswer(page, authored, predict!.question!, true);
  await on.check.click();
  await expect(explanation).toBeVisible();
  await expect(on.check).toHaveCount(0);
  await expect(hint).toHaveCount(0);
  await expect(forwardButton(page)).toBeVisible();

});

test("a question after the lesson's screens gets one try and no hint", async ({ page, request }) => {
  const courseId = "maths-foundations";
  const lessonId = "keeping-the-balance";
  const bundle = loadBundle(courseId);
  const journey = await playLesson(page, request, courseId, lessonId, { stopAtStage: "quiz" });
  const quiz = journey.stages.find((stage) => stage.type === "quiz");
  if (quiz?.type !== "quiz") throw new Error("The lesson has no question after its screens.");
  const authored = questionIn(bundle, quiz.questionId);
  const on = questionOnScreen(page, authored.id);
  await fillAnswer(page, authored, quiz.question, true);
  await on.check.click();
  // The skill is being checked: the miss stands, the answer is shown and the lesson goes on.
  await expect(on.beat).toHaveAttribute("data-result", "incorrect");
  await expect(page.getByRole("button", { name: "Get a hint", exact: true })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Hints used" })).toHaveCount(0);
  await expect(on.check).toHaveCount(0);
  await expect(forwardButton(page)).toBeVisible();
});

const WRITING: [courseId: string, lessonId: string] = [
  "english-reading-writing-and-rhetoric",
  "sound-and-image",
];

test("an optional writing task can be skipped and the lesson still completes", async ({
  page,
  request,
}) => {
  const journey = await playLesson(page, request, ...WRITING, { stopAtStage: "essay" });
  const essay = journey.stages.find((stage) => stage.type === "essay")!;
  await expect(
    page.getByText("This task is optional. The lesson is complete whether or not you write it."),
  ).toBeVisible();
  // Nothing is written, so there is nothing to submit yet.
  await expect(page.getByRole("button", { name: "Submit", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Skip this task", exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(`${encodeURIComponent(essay.id)}$`));
  const progress = await (
    await request.get(`/api/courses/${WRITING[0]}/lessons/${WRITING[1]}/progress`)
  ).json();
  expect(
    progress.stages.find((entry: { stageId: string }) => entry.stageId === essay.id)?.state,
  ).toBe("skipped_optional");
});

test("writing is submitted, assessed against each criterion, revised and kept as an earlier version", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  // Until an assessment is asked for, the server answers 404 for it, and the page reads that as
  // "none yet". The browser still logs the refused request.
  const watch = watchPage(page, [/\/assessment$/, /status of 404/]);
  const journey = await playLesson(page, request, ...WRITING, { stopAtStage: "essay" });
  const essay = journey.stages.find((stage) => stage.type === "essay")!;
  if (essay.type !== "essay") throw new Error("not a writing task");
  const editor = page.getByLabel("Your writing");
  const first = essayText(essay.minWords);

  // Too short to submit: the button is not offered until the minimum is met.
  await editor.fill("Three short words.");
  await expect(page.getByRole("button", { name: "Submit", exact: true })).toHaveCount(0);
  await editor.fill(first);
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText("Submitted. Choose Revise to change it.")).toBeVisible();
  await expect(editor).toHaveAttribute("readonly", "");

  // The offline tutor answers in process. Each criterion gets a result and the evidence for it.
  const assessment = page.getByRole("region", { name: "Assessment" });
  await assessment.getByRole("button", { name: "Ask for an assessment", exact: true }).click();
  const results = assessment.locator(".criteria-results > li");
  await expect(results).toHaveCount(essay.successCriteria.length, { timeout: 30_000 });
  for (let index = 0; index < essay.successCriteria.length; index += 1) {
    await expect(results.nth(index).locator(".criterion-result")).toHaveText(
      /^(Met|Partly met|Not met)$/,
    );
    await expect(results.nth(index).locator(".criterion-evidence")).not.toBeEmpty();
  }

  // Revise opens the text again and sets the submitted version aside with its feedback.
  await page.getByRole("button", { name: "Revise", exact: true }).click();
  await expect(editor).not.toHaveAttribute("readonly", "");
  await expect(editor).toHaveValue(first);
  const earlier = page.getByRole("region", { name: "Earlier versions" });
  await expect(earlier.getByRole("button", { name: "Close version 1", exact: true })).toBeVisible();
  await expect(earlier.locator(".essay-version-text")).toHaveText(first);
  await expect(earlier.locator(".criteria-results > li")).toHaveCount(essay.successCriteria.length);
  await expect(earlier.getByText(/assessed\.$/)).toBeVisible();

  const second = `${first} A second pass makes the reasoning plainer.`;
  await editor.fill(second);
  await page.getByRole("button", { name: "Submit version 2", exact: true }).click();
  await expect(page.getByText("Version 2, submitted. Choose Revise to change it.")).toBeVisible();

  // Both versions survive a reload, and the lesson goes on from the newer one.
  await page.reload();
  await expect(editor).toHaveValue(second);
  await page
    .getByRole("region", { name: "Earlier versions" })
    .getByRole("button", { name: "Open version 1", exact: true })
    .click();
  await expect(page.locator(".essay-version-text")).toHaveText(first);
  await page.locator(".essay").getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(`${encodeURIComponent(essay.id)}$`));
  watch.expectClean();
});

test("the sources a lesson draws on are listed on its finish screen and on the course page", async ({
  page,
  request,
}) => {
  const courseId = "history";
  const lessonId = "silences-and-survival";
  await playLesson(page, request, courseId, lessonId);
  const lesson = await (
    await request.get(`/api/courses/${courseId}/lessons/${lessonId}/journey`)
  ).json();
  expect(lesson.sources.length).toBeGreaterThan(0);

  async function expectSources(section: Locator, count: number) {
    await expect(section.getByRole("heading", { level: 2, name: "Sources" })).toBeVisible();
    // A long list is folded away under one line that says how many there are.
    const fold = section.locator("summary");
    if (await fold.count()) {
      await expect(fold).toHaveText(`Show all ${count} sources`);
      await fold.click();
      await expect(fold).toHaveText("Hide sources");
    }
    const items = section.locator(".source-list > li");
    await expect(items).toHaveCount(count);
    await expect(items.first().locator(".source-detail")).not.toBeEmpty();
    for (const link of await section.locator("a.source-title").all()) {
      await expect(link).toHaveAttribute("href", /^https?:\/\//);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  }

  await expectSources(page.locator(".finish-sources"), lesson.sources.length);

  const course = await (await request.get(`/api/courses/${courseId}`)).json();
  await page.goto(`/courses/${courseId}`);
  await expectSources(page.locator(".course-sources"), course.sources.length);
});

for (const language of ["python", "sql"] as const)
  test(`a ${language} exercise can be checked any number of times and shows its worked answer only when asked`, async ({
    page,
    request,
  }) => {
    test.skip(!(await runnableLanguages(request)).has(language), `${language} cannot run here`);
    test.setTimeout(180_000);
    const [courseId, lessonId] =
      language === "python"
        ? ["python-for-data-analysis", "run-and-bind"]
        : ["sql-from-rows-to-reports", "combine-result-sets"];
    const bundle = loadBundle(courseId);
    const journey = await readLessonJourney(request, courseId, lessonId);
    const step = journey.explainer.steps.find((item) => item.question?.code)!;
    const authored = questionIn(bundle, step.question!.id);
    const on = questionOnScreen(page, authored.id);
    const worked = page.getByRole("button", {
      name: language === "sql" ? "Show the worked query" : "Show the worked program",
      exact: true,
    });
    // Each try is a different program that runs and gives the wrong result.
    const attempt = (count: number) =>
      language === "sql" ? `SELECT ${count};` : `${authored.code!.starter}\n# try ${count}\n`;

    await openAtStep(page, request, journey, step.id);
    await expect(on.code).toBeVisible();
    for (let count = 1; count <= 4; count += 1) {
      await on.code.fill(attempt(count));
      await on.check.click();
      await expect(on.check).toHaveText("Check again", { timeout: 60_000 });
      await expect(on.check).toHaveAttribute("aria-busy", "false", { timeout: 60_000 });
      // Four tries in, nothing has closed the question or shown its answer.
      await expect(page.locator(".beat-explanation")).toHaveCount(0);
      await expect(on.code).toBeEditable();
      await expect(forwardButton(page)).toHaveCount(0);
    }
    await expect(worked).toBeVisible();
    await worked.click();
    await expect(page.locator(".beat-worked-code")).toBeVisible();
    await expect(page.locator(".beat-worked-code")).not.toBeEmpty();
    await expect(forwardButton(page)).toBeVisible();
  });

test("a History question sets its quoted extract apart from the question", async ({
  page,
  request,
}) => {
  const courseId = "history";
  const bundle = loadBundle(courseId);
  const quoted = new Set(
    bundle.questions.filter((question) => /^>\s/m.test(question.prompt)).map((item) => item.id),
  );
  const lesson = bundle.lessons.find((item) =>
    item.steps.some((step) => quoted.has(step.checkQuestionId)),
  )!;
  expect(lesson, "a History lesson with an extract question").toBeTruthy();
  const journey = await readLessonJourney(request, courseId, lesson.id);
  const step = journey.explainer.steps.find((item) => item.question && quoted.has(item.question.id))!;
  await openAtStep(page, request, journey, step.id);

  const on = questionOnScreen(page, step.question!.id);
  const prompt = on.beat.getByRole("heading").first();
  const quote = prompt.locator(".prompt-quote");
  await expect(quote.first()).toBeVisible();
  // The extract is a block of its own, without the "> " it is written with.
  expect(await quote.first().evaluate((node) => getComputedStyle(node).display)).toBe("block");
  await expect(quote.first()).not.toHaveText(/^>/);
  const ask = prompt.locator(".prompt-ask");
  await expect(ask).toBeVisible();
  await expect(ask).toHaveText(/\?$/);
  const quoteBox = (await quote.first().boundingBox())!;
  const askBox = (await ask.boundingBox())!;
  expect(askBox.y).toBeGreaterThanOrEqual(quoteBox.y + quoteBox.height - 1);
  // The question still answers as any other does.
  await answerCorrectly(page, questionIn(bundle, step.question!.id), step.question!);
});

test("a lesson can be completed with the keyboard alone", async ({ page, request }) => {
  test.setTimeout(120_000);
  const courseId = "logic-and-reasoning";
  const lessonId = "what-logic-operates-on";
  const bundle = loadBundle(courseId);
  const journey = await readLessonJourney(request, courseId, lessonId);

  const isFocused = (target: Locator) =>
    target.evaluate((node) => node === document.activeElement).catch(() => false);
  /** Tab until `target` has focus. Fails if the keyboard cannot reach it. */
  async function tabTo(target: Locator, what: string) {
    await expect(target, what).toBeVisible();
    for (let press = 0; press < 60; press += 1) {
      if (await isFocused(target)) return;
      await page.keyboard.press("Tab");
    }
    throw new Error(`Tab never reached ${what}.`);
  }
  async function answerByKeyboard(questionId: string) {
    const authored = questionIn(bundle, questionId);
    const shown =
      journey.explainer.intro?.hook.question?.id === questionId
        ? journey.explainer.intro.hook.question
        : (journey.explainer.steps
            .flatMap((step) => [
              step.question,
              ...(step.workedSteps ?? []).flatMap((line) => [line.blank, line.selfExplain]),
            ])
            .find((question) => question?.id === questionId) ??
          journey.stages.flatMap((stage) => (stage.type === "quiz" ? [stage.question] : []))
            .find((question) => question.id === questionId)!);
    const on = questionOnScreen(page, questionId);
    const authority = authored.answerAuthority;
    if (shown.choices?.length) {
      // The group is one Tab stop. Arrow keys move inside it and wrap at the ends.
      await expect(on.form.locator('[role="radio"][tabindex="0"]')).toHaveCount(1);
      await tabTo(on.choices.first(), "the first answer choice");
      const right = shown.choices.findIndex(
        (choice) =>
          choice.id ===
          authored.choices!.find(
            (item) => authority.kind === "text" && authority.acceptedIdeas.includes(item.label),
          )!.id,
      );
      await page.keyboard.press("ArrowUp");
      await expect(on.choices.last()).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(on.choices.first()).toBeFocused();
      for (let move = 0; move < right; move += 1) await page.keyboard.press("ArrowDown");
      await expect(on.choices.nth(right)).toBeFocused();
      await page.keyboard.press("Space");
      await expect(on.choices.nth(right)).toHaveAttribute("aria-checked", "true");
      await tabTo(on.check, "Check answer");
      await page.keyboard.press("Enter");
    } else if (authority.kind === "numeric") {
      await tabTo(on.value, "the value box");
      await page.keyboard.type(String(authority.value));
      if (await on.unit.count()) {
        await tabTo(on.unit, "the unit box");
        await page.keyboard.type(authority.unit);
      }
      // Enter in the box checks the answer.
      await page.keyboard.press("Enter");
    } else {
      await tabTo(on.text, "the answer box");
      await page.keyboard.type(authority.exampleAnswer);
      await tabTo(on.check, "Check answer");
      await page.keyboard.press("Enter");
    }
    await expect(on.beat).toHaveAttribute("data-result", "correct");
  }

  await page.goto(lessonPath(courseId, lessonId));
  for (const stage of journey.stages) {
    if (stage.type === "explainer") {
      for (const id of screenIds(journey)) {
        const step = stage.steps.find((item) => item.id === id);
        const questions =
          id === "opener"
            ? [stage.intro?.hook.question?.id]
            : [
                ...(step?.workedSteps ?? []).flatMap((line) => [
                  line.blank?.id,
                  line.selfExplain?.id,
                ]),
                step?.question?.id,
              ];
        expect(step?.workedSteps, "this test needs a lesson without worked lines").toBeUndefined();
        for (const questionId of questions) if (questionId) await answerByKeyboard(questionId);
        const forward = forwardButton(page);
        // Once the screen's question is settled, focus is already on the way forward.
        if (questions.some(Boolean)) await expect(forward).toBeFocused();
        else await tabTo(forward, "the way forward");
        await page.keyboard.press("Enter");
        // A new screen takes focus at its heading, so reading starts from the top.
        if (id !== screenIds(journey).at(-1))
          await expect(page.locator(".story h1").first()).toBeFocused();
      }
    } else if (stage.type === "quiz") {
      await answerByKeyboard(stage.questionId);
      await expect(forwardButton(page)).toBeFocused();
      await page.keyboard.press("Enter");
    } else if (stage.type === "essay") {
      await tabTo(page.getByRole("button", { name: "Skip this task", exact: true }), "Skip this task");
      await page.keyboard.press("Enter");
    } else if (stage.type === "review") {
      await tabTo(page.getByRole("button", { name: "Start the review", exact: true }), "Start the review");
      await page.keyboard.press("Enter");
      for (let card = 0; card < stage.itemCount; card += 1) {
        await tabTo(page.getByRole("button", { name: "Reveal answer", exact: true }), "Reveal answer");
        await page.keyboard.press("Enter");
        await tabTo(page.getByRole("button", { name: /^Good/ }), "the Good rating");
        await page.keyboard.press("Enter");
        const next = page.getByRole("button", {
          name: card + 1 < stage.itemCount ? "Next card" : "Continue",
          exact: true,
        });
        await tabTo(next, "the next card");
        await page.keyboard.press("Enter");
      }
    } else if (stage.type === "recap") {
      await tabTo(forwardButton(page), "Continue");
      await page.keyboard.press("Enter");
    } else if (stage.type === "completion") {
      await expect(page.locator(".lesson-finish")).toBeVisible();
    }
  }
  const result = await (
    await request.get(`/api/courses/${courseId}/lessons/${lessonId}/result`)
  ).json();
  expect(result.completed).toBe(true);
});

test.describe("at 390 pixels wide", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Home, Courses, a lesson, Review and Progress never scroll sideways", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const watch = watchPage(page);
    const settled = async (heading: Locator) => {
      await expect(heading).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expectNoSidewaysScroll(page);
    };

    await page.goto("/");
    await settled(page.getByRole("heading", { level: 1 }));
    await page.goto("/courses");
    await settled(page.getByRole("heading", { level: 1, name: "Courses" }));
    await page.goto("/courses/maths-foundations");
    await settled(page.getByRole("heading", { level: 1 }));

    // Every screen of a lesson, with its figure, its answer input and the verdict after it.
    await playLesson(page, request, "maths-foundations", "keeping-the-balance", {
      onScreen: async () => {
        await expectNoSidewaysScroll(page);
        // The way out of the screen is inside the window, not below or beside it.
        const action = page.locator(".footer-primary button, .story-actions button").first();
        if (await action.count()) {
          const box = (await action.boundingBox())!;
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(390);
          expect(box.y + box.height).toBeLessThanOrEqual(844);
        }
      },
    });
    await expectNoSidewaysScroll(page);

    await page.goto("/review");
    await settled(page.getByRole("heading", { level: 1, name: "Review" }));
    await page.goto("/you");
    await settled(page.getByRole("heading", { level: 1, name: "Your progress" }));
    watch.expectClean();
  });
});
