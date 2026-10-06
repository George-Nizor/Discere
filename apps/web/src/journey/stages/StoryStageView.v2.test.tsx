import type { ExplainerStage, LearnerQuestion } from "@discere/contracts";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { PlayerFooterProvider, PlayerFooterSurface } from "../player-footer.js";
import { ModeProvider } from "../mode-context.js";
import { StoryStageView } from "./StoryStageView.js";

afterEach(() => vi.unstubAllGlobals());

const ATTEMPT = "11111111-2222-4333-8444-555555555555";
const numeric = (id: string, prompt: string, hintCount = 2): LearnerQuestion => ({
  id,
  conceptIds: ["variable"],
  prompt,
  responseType: "numeric",
  difficulty: 1,
  hintCount,
  sourceIds: [],
  expectedUnit: "",
});

const legacy: ExplainerStage = {
  id: "l:explainer",
  type: "explainer",
  title: "What a letter stands for",
  conceptIds: ["variable"],
  sourceIds: [],
  optional: false,
  completionPolicy: "interaction",
  visual: { kind: "none", alt: "None.", states: [] },
  steps: [
    {
      id: "predict",
      kind: "hook",
      eyebrow: "One letter, one value",
      questionLed: true,
      visualStateId: "",
      blocks: [{ kind: "paragraph", text: "The machine adds 5 to the value you choose for x." }],
      question: numeric("q1", "For x = 2, what is x + 5?"),
    },
    {
      id: "next",
      kind: "check",
      questionLed: true,
      visualStateId: "",
      blocks: [],
      question: numeric("q2", "For x = 3, what is x + 5?"),
    },
  ],
};

function render(stage: ExplainerStage, saved?: Record<string, unknown>) {
  const onStepChange = vi.fn();
  const onComplete = vi.fn();
  renderWithProviders(
    <ModeProvider lessonId="l">
      <PlayerFooterProvider enabled>
        <StoryStageView
          courseId="maths-foundations"
          lessonId="l"
          onComplete={onComplete}
          onStepChange={onStepChange}
          savedInteractionState={saved}
          stage={stage}
        />
        <PlayerFooterSurface />
      </PlayerFooterProvider>
    </ModeProvider>,
  );
  return { onStepChange, onComplete };
}

const attempt = (correct: boolean, feedback = "Recheck the calculation.") => ({
  body: {
    attemptId: ATTEMPT,
    correct,
    feedback,
    xpAwarded: 0,
    mastery: 0.1,
    independent: true,
    qualifying: true,
  },
});

describe("question-led steps (audit B1, M2)", () => {
  it("shows the step's teaching above the question, which is the headline", () => {
    stubFetch({});
    render(legacy);
    expect(screen.getByText("The machine adds 5 to the value you choose for x.")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "For x = 2, what is x + 5?",
    );
    // The old step title is only an eyebrow now.
    expect(screen.getByText("Step 1 of 2 · One letter, one value").tagName).toBe("P");
  });
});

describe("one attempt policy (audit B3, M5)", () => {
  it("says a wrong answer is wrong, keeps it editable, offers a hint, and reveals after the retry", async () => {
    let answers = 0;
    const { calls } = stubFetch({
      "POST /api/attempts": () => {
        answers += 1;
        return attempt(false);
      },
      [`POST /api/attempts/${ATTEMPT}/hints`]: {
        body: { hint: "Replace x with 2.", level: 1, remaining: 1 },
      },
      [`POST /api/attempts/${ATTEMPT}/lesson-feedback`]: {
        body: {
          attemptId: ATTEMPT,
          correct: false,
          answer: "2 + 5 = 7.",
          blocks: [],
          reviewRequired: true,
        },
      },
    });
    render(legacy);
    const value = screen.getByLabelText("Value");
    await userEvent.type(value, "8");
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText(/Not right, try again/)).toBeInTheDocument();
    expect(screen.getByText("Recheck the calculation.")).toBeInTheDocument();
    expect(value).not.toHaveAttribute("readonly");
    // No reveal yet: the first miss never fetches the worked answer.
    expect(calls.some((call) => call.key.endsWith("/lesson-feedback"))).toBe(false);
    expect(screen.queryByRole("button", { name: /Continue/ })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Get a hint" }));
    expect(await screen.findByText("Replace x with 2.")).toBeInTheDocument();

    await userEvent.clear(value);
    await userEvent.type(value, "9");
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByText("Not right. Here is the answer.")).toBeInTheDocument();
    expect(screen.getByText("2 + 5 = 7.")).toBeInTheDocument();
    expect(answers).toBe(2);
    expect(await screen.findByRole("button", { name: /Continue/ })).toBeInTheDocument();
  });

  it("reveals on request after one miss", async () => {
    stubFetch({
      "POST /api/attempts": attempt(false),
      [`POST /api/attempts/${ATTEMPT}/lesson-feedback`]: {
        body: { attemptId: ATTEMPT, correct: false, answer: "7", blocks: [], reviewRequired: true },
      },
    });
    render(legacy);
    await userEvent.type(screen.getByLabelText("Value"), "8");
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await userEvent.click(await screen.findByRole("button", { name: "Show the answer" }));
    expect(await screen.findByText("Not right. Here is the answer.")).toBeInTheDocument();
  });

  it("gives a right answer the idea with the verdict, not behind a click", async () => {
    stubFetch({
      "POST /api/attempts": attempt(true, "2 + 5 = 7."),
      [`POST /api/attempts/${ATTEMPT}/lesson-feedback`]: {
        body: {
          attemptId: ATTEMPT,
          correct: true,
          answer: "2 + 5 = 7.",
          blocks: [],
          reviewRequired: false,
          onCorrect: "A letter is a number you have not been told yet.",
        },
      },
    });
    render(legacy);
    await userEvent.type(screen.getByLabelText("Value"), "7");
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("Correct.")).toBeInTheDocument();
    expect(
      await screen.findByText("A letter is a number you have not been told yet."),
    ).toBeInTheDocument();
  });

  it("does not count an unreadable answer as a miss", async () => {
    stubFetch({
      "POST /api/attempts": {
        body: { ...attempt(false, "Enter a number.").body, qualifying: false },
      },
    });
    render(legacy);
    await userEvent.type(screen.getByLabelText("Value"), "seven");
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("That answer could not be read.")).toBeInTheDocument();
  });
});

describe("stable step ids (spec §7.4)", () => {
  it("resumes on the saved step id, and saves ids as it advances", async () => {
    stubFetch({});
    render(legacy, { stepId: "next", stepIndex: 0 });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "For x = 3, what is x + 5?",
    );
  });
  it("starts again from the top when the saved id no longer exists", () => {
    stubFetch({});
    render(legacy, { stepId: "removed", stepIndex: 1 });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "For x = 2, what is x + 5?",
    );
  });
});

const v2: ExplainerStage = {
  ...legacy,
  intro: {
    hook: {
      blocks: [{ kind: "paragraph", text: "I'm thinking of a number. I add 5 and get 12." }],
      question: numeric("hook", "What's my number?"),
    },
    promise: "By the end you'll read 3x − 4 as a calculation waiting for a number.",
    estimatedMinutes: 10,
  },
  steps: [
    {
      id: "name",
      kind: "explain",
      questionLed: true,
      headline: "A letter stands for a number you haven't been told yet.",
      visualStateId: "",
      blocks: [{ kind: "paragraph", text: "So we use a box, and then a letter." }],
    },
    {
      id: "same",
      kind: "worked_example",
      questionLed: true,
      headline: "Find x + x + 4 when x = 5.",
      visualStateId: "",
      blocks: [],
      workedSteps: [
        { text: "Replace every x with 5", math: "$5 + 5 + 4$" },
        { text: "Calculate", math: "$14$" },
      ],
    },
  ],
};

describe("v2 anatomy", () => {
  it("opens on the lesson title, the hook and the promise", () => {
    stubFetch({});
    render(v2);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What a letter stands for");
    expect(screen.getByText("I'm thinking of a number. I add 5 and get 12.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("What's my number?");
    expect(screen.getByText(/By the end you'll read/)).toBeInTheDocument();
    expect(screen.getByText("About 10 minutes · 2 steps")).toBeInTheDocument();
  });

  it("puts an explain step's key idea first and lets it continue", async () => {
    stubFetch({});
    const { onStepChange } = render(v2, { stepId: "name" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "A letter stands for a number you haven't been told yet.",
    );
    expect(screen.getByText("1 of 2 · New idea")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: /Continue/ }));
    expect(onStepChange).toHaveBeenCalledWith("same", 1);
  });

  it("reveals a worked example one line at a time", async () => {
    stubFetch({});
    render(v2, { stepId: "same" });
    expect(screen.getByText("Replace every x with 5")).toBeInTheDocument();
    expect(screen.queryByText("Calculate")).toBeNull();
    expect(screen.queryByRole("button", { name: /Finish/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Show the next line/ }));
    expect(screen.getByText("Calculate")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Finish/ })).toBeInTheDocument();
  });
});
