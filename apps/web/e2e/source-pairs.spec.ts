import { extractAttribution } from "@discere/contracts";
import { expect, test } from "./isolated-app.js";
import {
  answerCorrectly,
  fillAnswer,
  forwardButton,
  loadBundle,
  openAtStep,
  playLesson,
  questionIn,
  questionOnScreen,
  readLessonJourney,
  watchPage,
} from "./lesson-player.js";
import { capture, openDueCard, WINDOWS } from "./question-shots.js";

/**
 * Source extracts with attribution, played in the browser. History's lesson on who made a
 * source asks about the Res Gestae and about Tacitus one at a time, each under its attribution,
 * and its check sets the two side by side on a wide window and one above the other on a phone.
 */
const courseId = "history";
const lessonId = "who-made-it-and-why";
const bundle = loadBundle(courseId);
const pair = bundle.questions.find(
  (question) =>
    question.extracts?.length === 2 &&
    bundle.lessons.find((lesson) => lesson.id === lessonId)!.questionIds.includes(question.id),
)!;

for (const window of WINDOWS)
  test(`a single extract and a pair of sources read well at ${window.width} pixels`, async ({
    page,
    request,
    lab,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(window);
    const watch = watchPage(page);
    const journey = await readLessonJourney(request, courseId, lessonId);

    const step = journey.explainer.steps.find((item) => item.question?.extracts?.length === 1)!;
    const single = questionIn(bundle, step.question!.id);

    // The pair is the lesson's check. Play the lesson to it.
    await playLesson(page, request, courseId, lessonId, {
      // A single extract inside the lesson: the words, then one line saying whose they are.
      onScreen: async (screen) => {
        if (screen.id !== step.id) return;
        const on = questionOnScreen(page, single.id);
        const heading = on.beat.getByRole("heading").first();
        await expect(heading.locator(".prompt-quote")).toHaveText(single.extracts![0]!.text);
        await expect(heading.locator(".prompt-attribution")).toHaveText(
          extractAttribution(single.extracts![0]!),
        );
        await expect(heading.locator(".prompt-source-name")).toHaveCount(0);
        await expect(heading.locator(".prompt-ask")).toBeVisible();
        await capture(page, "source-1-single-unanswered");
      },
      onStage: async (stage) => {
        if (stage.type !== "quiz" || stage.questionId !== pair.id) return;
        const shown = questionOnScreen(page, pair.id);
        const prompt = shown.beat.getByRole("heading").first();
        const sources = prompt.locator(".prompt-source");
        await expect(sources).toHaveCount(2);
        await expect(sources.locator(".prompt-source-name")).toHaveText(["Source A", "Source B"]);
        for (const [index, extract] of pair.extracts!.entries()) {
          await expect(sources.nth(index).locator(".prompt-quote")).toHaveText(extract.text);
          await expect(sources.nth(index).locator(".prompt-attribution")).toHaveText(
            extractAttribution(extract),
          );
        }
        const [a, b] = await Promise.all([sources.nth(0).boundingBox(), sources.nth(1).boundingBox()]);
        if (window.width >= 760) {
          // Side by side: B starts to the right of A, level with it.
          expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
          expect(Math.abs(b!.y - a!.y)).toBeLessThan(2);
        } else {
          // One above the other, each the full width of the column.
          expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
          expect(Math.abs(b!.x - a!.x)).toBeLessThan(2);
        }
        // The question itself comes after both sources.
        const ask = await prompt.locator(".prompt-ask").boundingBox();
        expect(ask!.y).toBeGreaterThan(Math.max(a!.y + a!.height, b!.y + b!.height) - 1);
        await capture(page, "source-2-pair-unanswered");

        // A wrong choice closes a check question at once and shows the right one.
        await fillAnswer(page, pair, stage.question, true);
        await shown.check.click();
        await expect(shown.beat).toHaveAttribute("data-result", "incorrect");
        await expect(shown.form.locator(".choice-card-correct")).toHaveCount(1);
        await capture(page, "source-3-pair-closed");
      },
    });
    await expect(page.locator(".lesson-finish")).toBeVisible();

    // The missed pair comes back the next day with both sources on the card.
    lab.advanceDays(1);
    const due = (await (await request.get("/api/review")).json()).dueCount as number;
    const card = page.locator(".flashcard");
    await openDueCard(page, due, card.locator(".prompt-sources.is-pair"));
    await expect(card.locator(".prompt-attribution")).toHaveCount(2);
    await expect(card.getByRole("list", { name: "Options" })).toBeVisible();
    await capture(page, "source-4-pair-review-card");
    watch.expectClean();
  });

test("a single-extract question is answered and its screen goes on", async ({ page, request }) => {
  const journey = await readLessonJourney(request, courseId, lessonId);
  const step = journey.explainer.steps.find((item) => item.question?.extracts?.length === 1)!;
  await openAtStep(page, request, journey, step.id);
  await answerCorrectly(page, questionIn(bundle, step.question!.id), step.question!);
  await capture(page, "source-5-single-correct");
  await expect(forwardButton(page)).toBeVisible();
});
