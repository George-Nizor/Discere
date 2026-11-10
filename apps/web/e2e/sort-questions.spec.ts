import { sortAnswerItems } from "@discere/contracts";
import { expect, test } from "./isolated-app.js";
import {
  arrangement,
  forwardButton,
  loadBundle,
  openAtStep,
  placeSort,
  questionIn,
  questionOnScreen,
  readLessonJourney,
  rightSort,
  watchPage,
  wrongSort,
} from "./lesson-player.js";
import { capture, expectTouchSized, openDueCard, WINDOWS } from "./question-shots.js";

/**
 * A sort question played in the browser: History's bread riot, sorted into conditions, causes
 * and the trigger. Items are placed with the keyboard and by choosing, a placed item is moved
 * back, a wrong sorting is told how many items are in the right group, the second miss shows
 * where each belongs with its explanation, and the question comes back the next day as a card.
 */
const courseId = "history";
const lessonId = "causes-conditions-triggers";
const bundle = loadBundle(courseId);

for (const window of WINDOWS)
  test(`a sort question is placed, checked, closed and reviewed at ${window.width} pixels`, async ({
    page,
    request,
    lab,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(window);
    const watch = watchPage(page);
    const journey = await readLessonJourney(request, courseId, lessonId);
    const step = journey.explainer.steps.find((item) => item.question?.responseType === "sort");
    expect(step, "a step that asks a sort question").toBeTruthy();
    const authored = questionIn(bundle, step!.question!.id);
    const items = sortAnswerItems(authored);
    const bins = authored.sort!.bins;
    const on = questionOnScreen(page, authored.id);
    const sort = arrangement(on.form);

    await openAtStep(page, request, journey, step!.id);
    const pool = on.form.getByRole("group", { name: "Items to sort" });
    await expect(pool.getByRole("button")).toHaveCount(items.length);
    // Nothing can be checked until every item is in a group.
    await expect(on.check).toBeDisabled();
    await expectTouchSized(on.form.locator(".sort-item"), "items");
    await expectTouchSized(on.form.locator(".sort-bin-target"), "groups");
    await capture(page, "sort-1-unanswered");

    // The keyboard alone: Enter chooses the item with focus, and Enter on a group places it.
    const first = items[0]!;
    await sort.sortItem(first.id).focus();
    await page.keyboard.press("Enter");
    await expect(sort.sortItem(first.id)).toHaveAttribute("aria-pressed", "true");
    await sort.sortTarget(bins[1]!.id).focus();
    await page.keyboard.press("Enter");
    await expect(sort.sortBin(bins[1]!.id).getByRole("button", { name: first.label })).toBeVisible();
    await expect(sort.announcement).toHaveText(`${first.label} is in ${bins[1]!.label}.`);
    await expect(pool.getByRole("button")).toHaveCount(items.length - 1);
    // Focus has gone on to an item that is still waiting.
    await expect(pool.getByRole("button").and(page.locator(":focus"))).toHaveCount(1);

    // A placed item is chosen again and moved back to the list.
    await sort.sortItem(first.id).click();
    await capture(page, "sort-2-item-chosen");
    await on.form.getByRole("button", { name: "Move it back to the list", exact: true }).click();
    await expect(pool.getByRole("button")).toHaveCount(items.length);
    await expect(sort.announcement).toHaveText(`${first.label} is back in the list.`);

    // A wrong sorting: how many are in the right group, and nothing that shows which.
    await placeSort(on.form, wrongSort(authored));
    await expect(on.form.getByText("Every item is in a group.")).toBeVisible();
    await on.check.click();
    await expect(on.beat).toHaveAttribute("data-result", "incorrect");
    const inFirst = items.filter((item) => item.bin === bins[0]!.id).length;
    await expect(page.locator(".question-feedback")).toContainText(
      `${inFirst} of ${items.length} are in the right group.`,
    );
    await expect(on.form.locator(".sort-result")).toHaveCount(0);
    await expect(on.check).toHaveAttribute("aria-disabled", "true");
    await capture(page, "sort-3-wrong");

    // One item moved to another wrong group is a new answer, and the second miss closes it.
    const stray = items.find((item) => item.bin === bins[0]!.id)!;
    await placeSort(on.form, { [stray.id]: bins[1]!.id });
    await on.check.click();
    await expect(on.form.locator(".sort-result")).toHaveCount(items.length);
    for (const item of items) {
      const group = on.form.getByRole("region", { name: authored.sort!.bins.find((bin) => bin.id === item.bin)!.label, exact: true });
      await expect(group.locator(".sort-result").filter({ hasText: item.label })).toContainText(
        item.explanation!,
      );
    }
    await expect(on.form.getByText(`You put this in ${bins[1]!.label}.`)).toBeVisible();
    await expect(on.form.locator(".sort-item")).toHaveCount(0);
    await expect(forwardButton(page)).toBeVisible();
    await capture(page, "sort-4-closed");

    // The next day the question is a review card, answered by sorting its items.
    lab.advanceDays(1);
    const due = (await (await request.get("/api/review")).json()).dueCount as number;
    const card = page.locator(".flashcard");
    await openDueCard(page, due, card.locator(".sort-bins"));
    await expect(page.getByRole("button", { name: "Check", exact: true })).toBeDisabled();
    await capture(page, "sort-5-review-card");
    await placeSort(card, rightSort(authored));
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(card.locator(".sort-result.is-right")).toHaveCount(items.length);
    await capture(page, "sort-6-review-checked");
    await page.getByRole("button", { name: /^Good/ }).click();
    await expect(page.getByText(/This card comes back /)).toBeVisible();
    watch.expectClean();
  });

test("the right sorting at the first check is marked correct and shows each item's explanation", async ({
  page,
  request,
}) => {
  const journey = await readLessonJourney(request, courseId, lessonId);
  const step = journey.explainer.steps.find((item) => item.question?.responseType === "sort")!;
  const authored = questionIn(bundle, step.question!.id);
  const on = questionOnScreen(page, authored.id);
  await openAtStep(page, request, journey, step.id);
  await placeSort(on.form, rightSort(authored));
  await on.check.click();
  await expect(on.beat).toHaveAttribute("data-result", "correct");
  await expect(on.form.locator(".sort-result.is-right")).toHaveCount(authored.sort!.items.length);
  await expect(on.form.getByText(authored.sort!.items[0]!.explanation!)).toBeVisible();
});
