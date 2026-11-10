import { expect, gotoStage, readJourney, test } from "./fixtures.js";
import { test as labTest } from "./isolated-app.js";
import { forwardButton, playLesson } from "./lesson-player.js";

/**
 * The lesson as a place: its stages have addresses, a reload and the browser's Back keep the
 * learner's place, and the tutor opens beside the lesson. Playing a lesson from start to finish
 * is in lessons.spec.ts.
 */
labTest(
  "a stage keeps its address through a reload, and the browser's Back returns to the lesson",
  async ({ page, request }) => {
    // Electronics has an explorer between its screens and its questions.
    const journey = await playLesson(page, request, "electronics-foundations", "current-in-one-loop", {
      stopAtStage: "interactive_visual",
    });
    await expect(page.getByRole("slider").first()).toBeVisible();
    const stageUrl = page.url();

    await page.reload();
    await expect(page).toHaveURL(stageUrl);
    await expect(page.getByRole("slider").first()).toBeVisible();

    // Back goes to the lesson's screens. They are finished, so the way forward is open.
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${encodeURIComponent(journey.explainer.id)}$`));
    await expect(page.locator(".story")).toBeVisible();
    await expect(forwardButton(page)).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(stageUrl);
  },
);

test.describe("the lesson journey", () => {
  test("answers a tutor question inside the lesson", async ({ page, request }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    // The tutor is a tab of the docked workbench, opened from the lesson toolbar.
    await page
      .getByRole("toolbar", { name: "Lesson tools" })
      .getByRole("button", { name: "Tutor", exact: true })
      .click();
    const bench = page.getByRole("complementary", { name: "Lesson workbench" });
    await expect(bench.getByRole("tab", { name: "Tutor", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await bench.getByLabel("Your question").fill("How do I begin this calculation?");
    await bench.getByRole("button", { name: "Ask the tutor", exact: true }).click();
    await expect(bench.getByText("Back to you.")).toBeVisible({ timeout: 60_000 });
    await bench.getByRole("button", { exact: true, name: "Close the workbench" }).click();
    await expect(bench).toHaveCount(0);
  });

  test("docks the tutor beside the lesson and above the lesson navigator", async ({
    page,
    request,
  }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    await page
      .getByRole("toolbar", { name: "Lesson tools" })
      .getByRole("button", { name: "Tutor", exact: true })
      .click();
    const bench = page.getByRole("complementary", { name: "Lesson workbench" });
    await expect(bench).toBeVisible();
    // Docked, not modal: the lesson stays usable beside it.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // The send control appears once there is a question. An earlier test's conversation may be
    // restored, which turns it into a follow-up; either way it is the tutor's own send control.
    await bench.getByLabel("Your question").fill("Where do I start?");
    const ask = bench.getByRole("button", { name: /^(Ask the tutor|Ask a follow-up)$/ });
    await expect(ask).toBeVisible();
    const surface = await bench.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const send = [...element.querySelectorAll("button")].find((button) =>
        /^(Ask the tutor|Ask a follow-up)$/.test(button.textContent?.trim() ?? ""),
      )!;
      const box = send.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        opacity: Number(style.opacity),
        alpha: Number(style.backgroundColor.match(/[\d.]+/g)?.[3] ?? 1),
        // Whatever sits over the tutor's own send button must belong to the bench, not to the
        // lesson navigator underneath it.
        sendInsideBench: element.contains(hit),
      };
    });
    expect(surface.opacity).toBe(1);
    expect(surface.alpha).toBeGreaterThanOrEqual(0.9);
    expect(surface.sendInsideBench).toBe(true);
  });

  test("shows review and progress from real data", async ({ page, request }) => {
    const profile = (await (await request.get("/api/home")).json()) as {
      progress: Array<{ mastery: number; independentAttempts: number; assistedAttempts: number }>;
    };
    const practised = profile.progress.filter(
      (row) => row.mastery > 0 || row.independentAttempts + row.assistedAttempts > 0,
    );
    await page.goto("/review");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Review");
    await expect(page.getByText(/cards? due/)).toBeVisible();

    await page.goto("/progress");
    await expect(page.getByRole("heading", { level: 1, name: "Your progress" })).toBeVisible();
    await expect(page.locator(".you-ideas > summary")).toBeVisible();
    await page.locator(".you-ideas > summary").click();
    await expect(page.getByRole("heading", { name: "Practice activity" })).toBeVisible();
    await expect(page.locator(".you-ideas .concept-card")).toHaveCount(practised.length);
    if (practised.length > 0) await expect(page.getByText(/without hints ·/).first()).toBeVisible();
    else await expect(page.getByText("Your ideas appear here as you practise.")).toBeVisible();
  });

});
