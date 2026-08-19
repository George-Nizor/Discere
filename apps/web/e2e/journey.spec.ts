import { expect, test, gotoStage, readJourney, stageIdPath } from "./fixtures.js";

const TEACH_BACK =
  "Voltage pushes charge around the loop and resistance limits how quickly that charge moves. " +
  "Current is voltage divided by resistance, so five volts across one hundred ohms gives fifty " +
  "milliamps in this circuit.";

test.describe("the lesson journey", () => {
  test("carries a learner from home to lesson completion", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("link", { name: /Resume|Begin/ }).first().click();

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

    // First question: a wrong answer, a hint, then the right answer
    await expect(page.getByText("Check understanding")).toBeVisible();
    await expect(page.getByText("Question 1 of 4")).toBeVisible();
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

    // Second question: the same numeric surface with different values
    await expect(page.getByText("Question 2 of 4")).toBeVisible();
    await page.getByLabel("Value").fill("0.04");
    await page.getByLabel("Unit").fill("A");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Third question: a written response marked against the accepted ideas
    await expect(page.getByText("Question 3 of 4")).toBeVisible();
    await page
      .getByLabel("Your answer")
      .fill(
        "There is only one path, so the same current passes every point. The charge is not used up by the resistor.",
      );
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Fourth question: a selection
    await expect(page.getByText("Question 4 of 4")).toBeVisible();
    await page.getByRole("button", { name: "Raising the supply voltage" }).click();
    await page.getByRole("button", { name: "Check answer" }).click();
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
    await expect(page.getByRole("heading", { level: 1, name: /done/ })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("restores the active stage after a refresh and answers browser navigation", async ({
    page,
    request,
  }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Wait for the next stage itself, not merely for a stage-shaped address: the explainer
    // address already matches that pattern.
    await expect(page.getByText("Diagram / visual")).toBeVisible();
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
    await page.getByRole("button", { name: /^Back to / }).click();
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

  test("draws the tutor drawer opaquely and above the lesson navigator", async ({
    page,
    request,
  }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    await page.getByRole("button", { name: "Ask the tutor" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    const surface = await drawer.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const footer = document.elementFromPoint(box.left + box.width / 2, window.innerHeight - 24);
      return {
        background: style.backgroundColor,
        opacity: Number(style.opacity),
        // Whatever sits at the drawer's own footer line must belong to the drawer, not to the
        // navigator underneath it.
        footerInsideDrawer: element.contains(footer),
      };
    });
    expect(surface.opacity).toBe(1);
    expect(surface.background).toBe("rgb(255, 255, 255)");
    expect(surface.footerInsideDrawer).toBe(true);
  });

  test("keeps a stage's last action clear of the bottom navigator", async ({ page, request }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "essay");
    const clearance = await page.evaluate(() => {
      const canvas = document.querySelector(".stage-canvas");
      const navigator_ = document.querySelector(".lesson-navigator");
      if (!canvas || !navigator_) return null;
      return {
        padding: Number.parseFloat(window.getComputedStyle(canvas).paddingBottom),
        navigatorHeight: navigator_.getBoundingClientRect().height,
      };
    });
    expect(clearance).not.toBeNull();
    expect(clearance?.padding ?? 0).toBeGreaterThanOrEqual(clearance?.navigatorHeight ?? 0);
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
    await expect(page.getByRole("heading", { level: 1, name: "Your learning" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Concept mastery" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Study calendar" })).toBeVisible();
    await expect(page.getByText(/independent ·/).first()).toBeVisible();
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
  test("walks a Roman Empire lesson from its retrieved map to completion", async ({
    page,
    request,
  }) => {
    const journey = await readJourney(request, "roman-empire");

    // Explainer: a retrieved image, with the attribution its licence requires beside it.
    await gotoStage(page, journey, "explainer");
    await expect(
      page.getByRole("heading", { level: 1, name: "The rise of the Roman Empire" }),
    ).toBeVisible();
    const map = page.getByRole("img", { name: /Roman Empire at its greatest extent/i });
    await expect(map).toBeVisible();
    await expect(map).toHaveAttribute("src", /\/api\/content\/roman-empire\/assets\//);
    await expect(page.getByText(/Tataryn/)).toBeVisible();
    await expect(page.getByRole("link", { name: "CC BY-SA 3.0" })).toBeVisible();
    // The picture must actually load, not merely be referenced.
    expect(await map.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(
      0,
    );
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Timeline: the scrubber reveals events in date order and checks an ordering prediction.
    await expect(page.getByText("Diagram / visual")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Year" })).toBeVisible();
    await expect(page.getByText("509 BCE").first()).toBeVisible();
    await expect(page.getByText("117 CE").first()).toBeVisible();
    await page.getByRole("slider", { name: "Year" }).fill("-27");
    await expect(page.getByText("Octavian becomes Augustus").first()).toBeVisible();
    // The earlier of the two offered events, recomputed by the engine from their dates.
    await page.getByRole("button", { name: "Caesar crosses the Rubicon" }).click();
    await page.getByRole("button", { name: "Check prediction" }).click();
    await expect(page.getByText("Matched")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // The mockup's multiple-choice question, marked by the server.
    await expect(page.getByText("Check understanding")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Which event marked the transition/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "The Senate granted Octavian the name Augustus in 27 BCE" })
      .click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.getByText("Correct", { exact: true })).toBeVisible();

    // Completion names the concepts by their titles rather than by their identifiers.
    const completionStageId = journey.stageIds.at(-1);
    expect(completionStageId).toBeTruthy();
    await page.goto(stageIdPath(journey, completionStageId ?? ""));
    await expect(page.getByRole("heading", { level: 1, name: /done/ })).toBeVisible();
    await expect(
      page.getByRole("rowheader", { name: "Augustus and the principate" }),
    ).toBeVisible();
  });
});
