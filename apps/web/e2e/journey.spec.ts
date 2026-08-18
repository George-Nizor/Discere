import { expect, test } from "@playwright/test";
import { gotoStage, readJourney } from "./fixtures.js";

const TEACH_BACK =
  "Voltage pushes charge around the loop and resistance limits how quickly that charge moves. " +
  "Current is voltage divided by resistance, so five volts across one hundred ohms gives fifty " +
  "milliamps in this circuit.";

test.describe("the lesson journey", () => {
  test("carries a learner from home to lesson completion", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /Start lesson|Resume lesson/ }).click();

    // Explainer
    await expect(page.getByText("Explainer")).toBeVisible();
    await expect(page.getByText("Key takeaway")).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Interactive visual
    await expect(page.getByText("Diagram / visual")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Resistance" })).toBeVisible();
    await page.getByRole("slider", { name: "Resistance" }).fill("400");
    await page.getByRole("button", { name: "Decreases" }).click();
    await page.getByRole("button", { name: "Check prediction" }).click();
    await expect(page.getByText("Matched")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Quiz: a wrong answer, a hint, then the right answer
    await expect(page.getByText("Check understanding")).toBeVisible();
    await page.getByLabel("Value").fill("0.5");
    await page.getByLabel("Unit").fill("A");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Not correct yet")).toBeVisible();

    await page.getByRole("button", { name: "Ask for a hint" }).click();
    await expect(page.getByText(/Hint 1 of 3/)).toBeVisible();

    await page.getByLabel("Value").fill("0.05");
    await page.getByRole("button", { name: "Check again" }).click();
    await expect(page.getByText("Correct", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Essay studio
    await expect(page.getByText("Essay / write & submit")).toBeVisible();
    await page.getByLabel("Your teach-back").fill(TEACH_BACK);
    await expect(page.getByText("Saved just now")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Submit teach-back" }).click();
    await expect(page.getByText("Submitted. The draft is now read-only.")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Review
    await expect(page.getByText("Flash cards / spaced review")).toBeVisible();
    await page.getByRole("button", { name: "Start the review" }).click();
    await expect(page.getByText("Front")).toBeVisible();
    await page.getByRole("button", { name: "Reveal answer" }).click();
    await expect(page.getByText("Back", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Good/ }).click();
    await expect(page.getByText(/Recorded as/)).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Completion
    await expect(page.getByRole("heading", { level: 1, name: /Lesson complete/ })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("restores the active stage after a refresh and answers browser navigation", async ({
    page,
    request,
  }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page).toHaveURL(/stages\//);
    const stageUrl = page.url();

    await page.reload();
    await expect(page).toHaveURL(stageUrl);
    await expect(page.getByText("Diagram / visual")).toBeVisible();

    await page.goBack();
    await expect(page.getByText("Explainer")).toBeVisible();
  });

  test("jumps to the question from the explainer and comes back", async ({ page, request }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    await page.getByRole("button", { name: /Try a question first/ }).click();
    await expect(page.getByText("Check understanding")).toBeVisible();
    await page.getByRole("button", { name: "Back to the explanation" }).click();
    await expect(page.getByText("Explainer")).toBeVisible();
  });

  test("answers a tutor question inside the lesson", async ({ page, request }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    await page.getByRole("button", { name: "Ask the tutor" }).click();
    await page.getByLabel("Your question").fill("How do I begin this calculation?");
    await page.getByRole("button", { name: "Ask the tutor", exact: true }).last().click();
    await expect(page.getByText("Back to you.")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Close the tutor" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("closes the tutor and the hints in Exam mode", async ({ page, request }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "quiz");
    await page.getByRole("button", { name: "Exam" }).click();
    await expect(page.getByText("Tutor closed in Exam mode")).toBeVisible();
    await expect(
      page.getByText(/hints, the worked answer, and the tutor stay closed/),
    ).toBeVisible();
  });

  test("shows review and progress from real data", async ({ page }) => {
    await page.goto("/review");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Return to what you learned",
    );
    await expect(page.getByText(/cards? due/)).toBeVisible();

    await page.goto("/progress");
    await expect(page.getByRole("heading", { level: 1, name: "Concept mastery" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Independent" })).toBeVisible();
  });

  test("keeps the mobile layout usable without horizontal scrolling", async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole("navigation", { name: "Lesson stages" })).toBeVisible();
  });
});
