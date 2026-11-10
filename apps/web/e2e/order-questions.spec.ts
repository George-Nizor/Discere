import { orderAnswerIds } from "@discere/contracts";
import { expect, test } from "./isolated-app.js";
import {
  arrangement,
  arrangeOrder,
  expectNoSidewaysScroll,
  forwardButton,
  loadBundle,
  openAtStep,
  orderOnScreen,
  questionIn,
  questionOnScreen,
  readLessonJourney,
  watchPage,
  wrongOrder,
} from "./lesson-player.js";
import { capture, expectTouchSized, openDueCard, WINDOWS } from "./question-shots.js";

/**
 * An order question played in the browser: History's July crisis. The items are moved with the
 * keyboard and with the buttons, a wrong order is told how many items are in place and not
 * which, the second miss shows the right order, and the question comes back the next day as a
 * card that is answered the same way. `DISCERE_SHOTS` names a folder for screenshots.
 */
const courseId = "history";
const lessonId = "one-war-many-causes";
const bundle = loadBundle(courseId);

for (const window of WINDOWS)
  test(`an order question is arranged, checked, closed and reviewed at ${window.width} pixels`, async ({
    page,
    request,
    lab,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(window);
    const watch = watchPage(page);
    const journey = await readLessonJourney(request, courseId, lessonId);
    const step = journey.explainer.steps.find((item) => item.question?.responseType === "order");
    expect(step, "a step that asks an order question").toBeTruthy();
    const authored = questionIn(bundle, step!.question!.id);
    const right = orderAnswerIds(authored);
    const on = questionOnScreen(page, authored.id);
    const list = arrangement(on.form);

    await openAtStep(page, request, journey, step!.id);
    await expect(list.orderItems).toHaveCount(right.length);
    // The lesson's payload gives the items in an arrangement that is not the answer.
    expect([...(await orderOnScreen(on.form))].sort()).toEqual([...right].sort());
    await expectTouchSized(on.form.locator(".order-move"), "move buttons");
    await capture(page, "order-1-unanswered");

    // Leaving the screen and coming back shows the items where they were.
    const dealt = await orderOnScreen(on.form);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(on.form).toHaveCount(0);
    await forwardButton(page).click();
    await expect(on.form).toBeVisible();
    expect(await orderOnScreen(on.form)).toEqual(dealt);

    // The keyboard alone: an arrow key moves the item whose button has focus, and says where to.
    const second = dealt[1]!;
    await list.move(second, "up").focus();
    await page.keyboard.press("ArrowUp");
    await expect(list.orderItems.first()).toHaveAttribute("data-item", second);
    await expect(list.announcement).toHaveText(new RegExp(` is now 1 of ${right.length}\\.$`));
    await expect(list.move(second, "up")).toBeFocused();
    await expect(list.move(second, "up")).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("ArrowDown");
    await expect(list.orderItems.nth(1)).toHaveAttribute("data-item", second);
    await expect(list.announcement).toHaveText(new RegExp(` is now 2 of ${right.length}\\.$`));

    // A wrong order: how many are in place, and nothing that shows which.
    await arrangeOrder(on.form, wrongOrder(authored));
    await on.check.click();
    await expect(on.beat).toHaveAttribute("data-result", "incorrect");
    await expect(page.locator(".question-feedback")).toContainText(
      `${right.length - 2} of ${right.length} are in the right place.`,
    );
    await expect(on.form.locator(".order-item.is-placed")).toHaveCount(0);
    await expect(on.check).toHaveText("Check again");
    await expect(on.check).toHaveAttribute("aria-disabled", "true");
    await capture(page, "order-2-wrong");

    // The second miss closes the question and shows the right order.
    await arrangeOrder(on.form, [...right].reverse());
    await on.check.click();
    await expect(on.form.getByRole("list", { name: "The right order" })).toBeVisible();
    expect(await orderOnScreen(on.form)).toEqual(right);
    await expect(on.form.locator(".order-move")).toHaveCount(0);
    await expect(page.locator(".beat-explanation")).toBeVisible();
    await expect(forwardButton(page)).toBeVisible();
    await expectNoSidewaysScroll(page);
    await capture(page, "order-3-closed");

    // The next day the question is a review card, answered by arranging its items.
    lab.advanceDays(1);
    const due = (await (await request.get("/api/review")).json()).dueCount as number;
    expect(due).toBeGreaterThan(0);
    const card = page.locator(".flashcard");
    await openDueCard(page, due, card.locator(".order-list"));
    await expect(page.getByLabel("Your answer", { exact: true })).toHaveCount(0);
    await expectTouchSized(card.locator(".order-move"), "move buttons on the card");
    await capture(page, "order-4-review-card");
    await arrangeOrder(card, right);
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(card.getByRole("list", { name: "The right order" })).toBeVisible();
    await expect(card.locator(".order-item.is-placed")).toHaveCount(right.length);
    await expect(page.getByRole("button", { name: /^Good/ })).toBeVisible();
    await capture(page, "order-5-review-checked");
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText(/This card comes back /)).toBeVisible();
    watch.expectClean();
  });

test("the right order at the first check is marked correct and every item is marked in place", async ({
  page,
  request,
}) => {
  const journey = await readLessonJourney(request, courseId, lessonId);
  const step = journey.explainer.steps.find((item) => item.question?.responseType === "order")!;
  const authored = questionIn(bundle, step.question!.id);
  const on = questionOnScreen(page, authored.id);
  await openAtStep(page, request, journey, step.id);
  await arrangeOrder(on.form, orderAnswerIds(authored));
  await on.check.click();
  await expect(on.beat).toHaveAttribute("data-result", "correct");
  await expect(on.form.locator(".order-item.is-placed")).toHaveCount(authored.order!.items.length);
  await expect(page.locator(".question-feedback")).toContainText(authored.onCorrect!);
  // Answering introduced the lesson's own cards, and a question answered right adds none.
  const review = (await (await request.get("/api/review")).json()) as {
    courses: Array<{ courseId: string; cardCount: number }>;
  };
  expect(review.courses.find((course) => course.courseId === courseId)?.cardCount).toBe(
    bundle.lessons.find((lesson) => lesson.id === lessonId)!.flashcardIds.length,
  );
});
