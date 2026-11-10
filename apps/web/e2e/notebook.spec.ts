import type { APIRequestContext } from "@playwright/test";
import { expect, type JourneyMap, notebookPath, readJourney, test } from "./fixtures.js";
import { test as labTest } from "./isolated-app.js";
import { loadBundle, playLesson } from "./lesson-player.js";

/**
 * The suite shares one database, and a notebook page is per lesson rather than per test, so
 * each test starts from a blank page instead of inheriting the previous one's strokes.
 */
async function clearNotebook(request: APIRequestContext, journey: JourneyMap): Promise<void> {
  const response = await request.put(`/api/notebook/${encodeURIComponent(journey.lessonId)}`, {
    data: { pageType: "blank", strokes: [], note: "" },
  });
  expect(response.ok()).toBe(true);
}

/** Draws a short line across the working page with real pointer events. */
async function drawOnCanvas(page: import("@playwright/test").Page): Promise<void> {
  const canvas = page.getByRole("application", { name: "Working canvas" });
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("The working canvas has no box to draw on.");
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  for (const step of [0.3, 0.4, 0.5, 0.6]) {
    await page.mouse.move(box.x + box.width * step, box.y + box.height * (0.3 + step / 4));
  }
  await page.mouse.up();
}

async function openNotebook(
  page: import("@playwright/test").Page,
  request: APIRequestContext,
  journey: JourneyMap,
): Promise<void> {
  await clearNotebook(request, journey);
  await page.goto(notebookPath(journey));
  await page.waitForLoadState("networkidle");
}

test.describe("the working notebook", () => {
  test("draws, saves, and gets a review of the workings", async ({ page, request }) => {
    const journey = await readJourney(request);
    await openNotebook(page, request, journey);
    await expect(page.getByRole("heading", { level: 2, name: "Show your working" })).toBeVisible();

    // Nothing has been drawn, so neither export nor review is offered yet.
    await expect(page.getByText("Draw or write something to export the page.")).toBeVisible();
    await expect(page.getByText("Draw or write your working first.")).toBeVisible();

    await drawOnCanvas(page);
    await expect(page.locator("polyline[data-stroke-id]")).toHaveCount(1);
    await page.getByLabel("Typed working").fill("I divided 5 by 100.");
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    await page.getByRole("button", { name: "Save workings" }).click();
    await expect(page.getByText("Workings saved on this machine.")).toBeVisible();

    await page.getByRole("button", { name: "Review my workings" }).click();
    // The offline provider only claims to have read an image because one was attached.
    await expect(page.getByText("Partly correct")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("What the tutor read from your page")).toBeVisible();
    await expect(page.getByText(/confidence/)).toBeVisible();
    await expect(page.getByText(/Next step:/)).toBeVisible();
  });

  test("keeps the saved page after a reload", async ({ page, request }) => {
    const journey = await readJourney(request);
    await openNotebook(page, request, journey);
    await drawOnCanvas(page);
    await page.getByRole("button", { name: "Save workings" }).click();
    await expect(page.getByText("Workings saved on this machine.")).toBeVisible();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("polyline[data-stroke-id]")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Save workings" })).toHaveCount(0);
  });

  test("undoes and clears the page", async ({ page, request }) => {
    const journey = await readJourney(request);
    await openNotebook(page, request, journey);
    await expect(page.getByText("Undo appears once you have drawn something.")).toBeVisible();

    await drawOnCanvas(page);
    await expect(page.locator("polyline[data-stroke-id]")).toHaveCount(1);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.locator("polyline[data-stroke-id]")).toHaveCount(0);

    await drawOnCanvas(page);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.locator("polyline[data-stroke-id]")).toHaveCount(0);
  });

  test("opens beside the lesson from its toolbar, and the full page leads back", async ({
    page,
    request,
  }) => {
    const journey = await readJourney(request);
    const tools = page.getByRole("toolbar", { name: "Lesson tools" });
    const bench = page.getByRole("complementary", { name: "Lesson workbench" });
    // The working page is the Working tab of the docked workbench.
    await page.goto(
      `/courses/${encodeURIComponent(journey.courseId)}/lessons/${encodeURIComponent(journey.lessonId)}`,
    );
    const lesson = page.locator("main#stage");
    await expect(lesson).toBeVisible();
    await tools.getByRole("button", { name: "Working", exact: true }).click();
    await expect(bench.getByRole("heading", { level: 2, name: "Show your working" })).toBeVisible();
    // The lesson stays where it was beside the bench, and closing the bench returns to it.
    await expect(lesson).toBeVisible();
    await bench.getByRole("button", { name: "Close the workbench", exact: true }).click();
    await expect(bench).toHaveCount(0);
    // The full-page notebook still has its way back to the lesson.
    await page.goto(notebookPath(journey));
    await page.getByRole("link", { name: "Back to the lesson" }).click();
    await expect(page).toHaveURL(new RegExp(`/lessons/${encodeURIComponent(journey.lessonId)}(/|$)`));
    await expect(tools).toBeVisible();
  });
});

labTest.describe("the review queue", () => {
  // Two lessons from two courses, so cards from both are waiting.
  const PLAYED: Array<[courseId: string, lessonId: string]> = [
    ["maths-foundations", "keeping-the-balance"],
    ["logic-and-reasoning", "what-logic-operates-on"],
  ];

  labTest("names every course that has cards, with how many are due", async ({ page, request }) => {
    labTest.setTimeout(90_000);
    await page.goto("/review");
    await expect(page.getByRole("heading", { level: 1, name: "Review" })).toBeVisible();
    // Before any lesson there is nothing to review and no table to read.
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Explore courses" })).toBeVisible();

    for (const [courseId, lessonId] of PLAYED) await playLesson(page, request, courseId, lessonId);
    await page.goto("/review");
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    for (const name of ["Course", "Due", "Cards", "Next"])
      await expect(page.getByRole("columnheader", { name, exact: true })).toBeVisible();
    // Only the lessons that were played have put cards here.
    const courses = (await (await request.get("/api/review")).json()).courses as Array<{
      courseId: string;
      title: string;
      dueCount: number;
      cardCount: number;
    }>;
    expect(courses.map((course) => course.courseId).sort()).toEqual(
      PLAYED.map(([courseId]) => courseId).sort(),
    );
    await expect(table.locator("tbody tr")).toHaveCount(courses.length);
    for (const course of courses) {
      const row = table.getByRole("row").filter({
        has: page.getByRole("rowheader", { name: course.title, exact: true }),
      });
      await expect(row.getByRole("cell").nth(0)).toHaveText(String(course.dueCount));
      await expect(row.getByRole("cell").nth(1)).toHaveText(String(course.cardCount));
      expect(course.cardCount).toBe(
        loadBundle(course.courseId).lessons.find(
          (lesson) => lesson.id === PLAYED.find(([id]) => id === course.courseId)![1],
        )!.flashcardIds.length,
      );
    }
  });

  labTest("takes turns between courses instead of clearing one first", async ({
    page,
    request,
    lab,
  }) => {
    labTest.setTimeout(90_000);
    for (const [courseId, lessonId] of PLAYED) await playLesson(page, request, courseId, lessonId);
    // A week on, every card from both lessons is due again.
    lab.advanceDays(7);
    const due = (await (await request.get("/api/review")).json()).dueCount as number;
    expect(due).toBeGreaterThanOrEqual(3);
    const courseOfCard = new Map(
      PLAYED.flatMap(([courseId]) =>
        loadBundle(courseId).flashcards.map((card) => [card.id, courseId] as const),
      ),
    );

    await page.goto("/review");
    await page.getByRole("button", { name: "Start review", exact: true }).click();
    const seen: string[] = [];
    for (let card = 0; card < 3; card += 1) {
      await expect(page).toHaveURL(/\/review\/session\/[0-9a-f-]+$/);
      const sessionId = page.url().split("/").pop()!;
      const session = await (await request.get(`/api/review/sessions/${sessionId}`)).json();
      seen.push(courseOfCard.get(session.card.cardId) ?? "unknown");
      await page.getByRole("button", { name: "Reveal answer", exact: true }).click();
      await page.getByRole("button", { name: /^Good/ }).click();
      await expect(page.getByText(/This card comes back /)).toBeVisible();
      // Time passes between cards. The course just rated is the one reviewed most recently.
      lab.setNow(new Date(lab.now().getTime() + 60_000));
      if (card < 2) {
        const url = page.url();
        await page.getByRole("button", { name: "Next card", exact: true }).click();
        await expect(page).not.toHaveURL(url);
      }
    }
    // Consecutive cards come from different courses while both still have cards due.
    expect(seen).not.toContain("unknown");
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[1]).not.toBe(seen[2]);
  });
});
