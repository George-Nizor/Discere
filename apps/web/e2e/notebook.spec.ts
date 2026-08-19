import type { APIRequestContext } from "@playwright/test";
import { expect, test, type JourneyMap, notebookPath, readJourney } from "./fixtures.js";

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

  test("is reachable from any stage of the lesson", async ({ page, request }) => {
    const journey = await readJourney(request);
    await page.goto(
      `/courses/${encodeURIComponent(journey.courseId)}/lessons/${encodeURIComponent(journey.lessonId)}/stages/${encodeURIComponent(journey.stageIdByType["explainer"] ?? "")}`,
    );
    await page.getByRole("link", { name: "Notebook" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Show your working" })).toBeVisible();
    // The way back leads to whichever stage the journey is on, so the lesson shell is what is
    // asserted rather than one particular stage.
    await page.getByRole("link", { name: "Back to the lesson" }).click();
    await expect(page.getByRole("navigation", { name: "Lesson stages" })).toBeVisible();
  });
});

test.describe("the review queue", () => {
  test("names every course that has cards waiting", async ({ page }) => {
    await page.goto("/review");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Review");
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Due" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Cards" })).toBeVisible();
    // Two courses ship, so a queue that is fair between them must list both.
    await expect(table.locator("tbody tr")).toHaveCount(2);
    await expect(page.getByRole("rowheader", { name: "Electronics Foundations" })).toBeVisible();
    await expect(
      page.getByRole("rowheader", { name: "The Rise of the Roman Empire" }),
    ).toBeVisible();
  });

  test("takes turns between courses rather than clearing one first", async ({ page }) => {
    const seen: string[] = [];
    for (let card = 0; card < 4; card += 1) {
      await page.goto("/review");
      await page.getByRole("button", { name: /Start review|Review the earliest card/ }).click();
      await expect(page.getByText("Front")).toBeVisible();
      const concepts = await page.locator(".flashcard-concepts").innerText();
      seen.push(concepts);
      await page.getByRole("button", { name: "Reveal answer" }).click();
      await expect(page.getByText("Back", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: /Good/ }).click();
      await expect(page.getByText(/Recorded as/)).toBeVisible();
    }
    // The two courses name different concepts, so a repeated queue would show one set only.
    expect(new Set(seen).size).toBeGreaterThan(1);
  });
});
