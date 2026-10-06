import { expect, gotoStage, readJourney, stageIdPath, test } from "./fixtures.js";

const TEACH_BACK =
  "Voltage pushes charge around the loop and resistance limits how quickly that charge moves. " +
  "Current is voltage divided by resistance, so five volts across one hundred ohms gives fifty " +
  "milliamps in this circuit.";

test.describe("the lesson journey", () => {
  test("carries a learner from home to lesson completion", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const journey = await readJourney(request, "electronics-foundations");
    await gotoStage(page, journey, "explainer");

    // The lesson plays as steps: prose, an inline check that cannot be skipped, then the rest.
    await expect(page.getByText("Step 1 of 7")).toBeVisible();
    await expect(page.getByText("Step 1 of 7")).toBeVisible();
    for (const step of [2, 3, 4, 5]) {
      await page.getByRole("button", { name: /^Continue/ }).click();
      await expect(page.getByText(`Step ${step} of 7`)).toBeVisible();
    }

    // Step 5 asks the learner to point at the component on the diagram, and holds until they do.
    await expect(page.getByRole("button", { name: /^Continue/ })).toBeHidden();
    await page.getByRole("button", { name: "The battery" }).click();
    await expect(page.getByText(/Look for what opposes the flow/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Continue/ })).toBeHidden();
    await page.getByRole("button", { name: "The resistor" }).click();
    await expect(page.getByText(/it sets the current/)).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Step 6 asks a question, and also cannot be skipped.
    await expect(page.getByText("Step 6 of 7")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Continue/ })).toBeHidden();
    await page.getByRole("button", { name: "Raising the supply voltage" }).click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.locator(".answer-feedback.is-correct")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();
    await expect(page.getByText("Step 7 of 7")).toBeVisible();
    await page.getByRole("button", { name: /^Finish/ }).click();

    // Interactive visual
    await expect(page.getByRole("slider").first()).toBeVisible();
    await expect(page.getByRole("slider", { name: "Resistance" })).toBeVisible();
    await page.getByRole("slider", { name: "Resistance" }).fill("400");
    await page.getByRole("button", { name: "Decreases" }).click();
    await page.getByRole("button", { name: "Check prediction" }).click();
    await expect(page.getByText("Matched")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // First question: a wrong answer, a hint, then the right answer
    await expect(page.getByText(/Question .* of/)).toBeVisible();
    await expect(page.getByText("Question 1 of 3")).toBeVisible();
    await page.getByLabel("Value").fill("0.5");
    await page.getByLabel("Unit").fill("A");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.locator(".answer-feedback.is-retry")).toBeVisible();

    await page.getByRole("button", { name: "Ask for a hint" }).click();
    await expect(page.getByText(/Hint 1 of 3/)).toBeVisible();

    await page.getByLabel("Value").fill("0.05");
    await page.getByRole("button", { name: "Check again" }).click();
    await expect(page.locator(".answer-feedback.is-correct")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Second question: the same numeric surface with different values
    await expect(page.getByText("Question 2 of 3")).toBeVisible();
    await page.getByLabel("Value").fill("0.04");
    await page.getByLabel("Unit").fill("A");
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.locator(".answer-feedback.is-correct")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Third question: a written response marked against the accepted ideas
    await expect(page.getByText("Question 3 of 3")).toBeVisible();
    await page
      .getByLabel("Your answer")
      .fill(
        "There is only one path, so the same current passes every point. The charge is not used up by the resistor.",
      );
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.locator(".answer-feedback.is-correct")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Essay studio
    await expect(page.getByLabel("Your teach-back")).toBeVisible();
    await page.getByLabel("Your teach-back").fill(TEACH_BACK);
    await expect(page.getByText("Saved just now")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Submit teach-back" }).click();
    await expect(page.getByText("Submitted. The draft is now read-only.")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    // Review
    await expect(page.getByRole("button", { name: "Start the review" })).toBeVisible();
    await page.getByRole("button", { name: "Start the review" }).click();
    for (let card = 0; card < 2; card += 1) {
      await expect(page.getByLabel("Your answer", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Reveal answer" }).click();
      await page.getByRole("button", { name: /^Good/ }).click();
      // The rating says when the card returns, at the precision that matters (app audit m7).
      await expect(page.getByText(/This card comes back /)).toBeVisible();
      await page
        .getByRole("button", { name: card === 0 ? "Next card" : "Continue", exact: true })
        .click();
    }

    // Completion
    await expect(page.getByRole("heading", { level: 1, name: /done/ })).toBeVisible();
    await expect(page.locator(".finish-stats")).toBeVisible();
  });

  test("restores the active stage after a refresh and answers browser navigation", async ({
    page,
    request,
  }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    await gotoStage(page, journey, "interactive_visual");
    // Wait for the stage itself, not merely for a stage-shaped address: the explainer
    // address already matches that pattern.
    await expect(page.getByRole("slider").first()).toBeVisible();
    const stageUrl = page.url();

    await page.reload();
    await expect(page).toHaveURL(stageUrl);
    await expect(page.getByRole("slider").first()).toBeVisible();

    await page.goBack();
    await expect(page.getByText("Step 1 of 7")).toBeVisible();
  });

  test("resumes a lesson at the step the learner had reached", async ({ page, request }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "explainer");
    await expect(page.getByText("Step 1 of 7")).toBeVisible();

    await page.getByRole("button", { name: /^Continue/ }).click();
    await page.getByRole("button", { name: /^Continue/ }).click();
    await expect(page.getByText("Step 3 of 7")).toBeVisible();

    // The position is saved as it moves, so a reload does not send the learner back to the top.
    await page.reload();
    await expect(page.getByText("Step 3 of 7")).toBeVisible();
    await expect(page.getByText(/This loop gives charge exactly one route/)).toBeVisible();
  });

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

  test("keeps a stage's last action clear of the bottom navigator", async ({ page, request }) => {
    const journey = await readJourney(request);
    await gotoStage(page, journey, "essay");
    const footer = page.locator(".lesson-navigator");
    await expect(footer).toBeVisible();
    const lastAction = page.locator(".stage-canvas .button").last();
    await lastAction.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const actionBox = await lastAction.boundingBox();
    const footerBox = await footer.boundingBox();
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(footerBox!.y - 16);
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
    await expect(
      page.getByRole("heading", { level: 1, name: "Your learning activity" }),
    ).toBeVisible();
    await expect(page.locator(".you-ideas > summary")).toBeVisible();
    await page.locator(".you-ideas > summary").click();
    await expect(page.getByRole("heading", { name: "Practice activity" })).toBeVisible();
    await expect(page.locator(".you-ideas .concept-card")).toHaveCount(practised.length);
    if (practised.length > 0) await expect(page.getByText(/without hints ·/).first()).toBeVisible();
    else await expect(page.getByText("Your ideas appear here as you practise.")).toBeVisible();
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
    await expect(page.getByText("Step 1 of 6")).toBeVisible();
    const map = page.getByRole("img", { name: /Roman Empire at its greatest extent/i });
    await expect(map).toBeVisible();
    await expect(map).toHaveAttribute("src", /\/api\/content\/roman-empire\/assets\//);
    await expect(page.getByText(/Tataryn/)).toBeVisible();
    await expect(page.getByRole("link", { name: "CC BY-SA 3.0" })).toBeVisible();
    // The picture must actually load, not merely be referenced.
    expect(await map.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(
      0,
    );
    // Two prose steps, an ordering task, an inline check, then the closing step.
    for (const step of [2, 3, 4]) {
      await page.getByRole("button", { name: /^Continue/ }).click();
      await expect(page.getByText(`Step ${step} of 6`)).toBeVisible();
    }

    const chronological = [
      "Caesar crosses the Rubicon",
      "Caesar is assassinated",
      "Octavian wins at Actium",
      "The Senate grants Octavian the name Augustus",
    ];
    for (const [position, label] of chronological.entries()) {
      let labels = await page.locator(".order-item-label").allTextContents();
      while (labels.indexOf(label) > position) {
        await page.getByRole("button", { name: `Move "${label}" earlier` }).click();
        labels = await page.locator(".order-item-label").allTextContents();
      }
    }
    await page.getByRole("button", { name: "Check the order" }).click();
    await expect(page.getByText(/That is the sequence/)).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();

    await expect(page.getByText("Step 5 of 6")).toBeVisible();
    await page
      .getByRole("button", { name: /The Senate granted Octavian the name Augustus/ })
      .click();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(page.locator(".answer-feedback.is-correct")).toBeVisible();
    await page.getByRole("button", { name: /^Continue/ }).click();
    await page.getByRole("button", { name: /^Finish/ }).click();

    // Timeline: the scrubber reveals events in date order and checks an ordering prediction.
    await expect(page.getByRole("slider").first()).toBeVisible();
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

    // A quiz stage still follows the visual; the transition question is now asked inside the
    // lesson itself, which the walk above already answered.
    await expect(page.getByText(/Question .* of/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // A direct completion link must return to unfinished work rather than claim success.
    const completionStageId = journey.stageIds.at(-1)!;
    await page.goto(stageIdPath(journey, completionStageId));
    await expect(page).not.toHaveURL(stageIdPath(journey, completionStageId));
  });
});
