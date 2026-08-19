import type { ExplainerStage } from "@discere/contracts";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { ModeProvider } from "../mode-context.js";
import { StoryStageView } from "./StoryStageView.js";

afterEach(() => vi.unstubAllGlobals());

const stage: ExplainerStage = {
  id: "lesson:explainer",
  type: "explainer",
  title: "Current in a single loop",
  conceptIds: ["current"],
  sourceIds: [],
  optional: false,
  completionPolicy: "interaction",
  visual: { kind: "none", alt: "No visual for this lesson.", states: [] },
  steps: [
    {
      id: "hook",
      kind: "hook",
      visualStateId: "",
      blocks: [{ kind: "paragraph", text: "Two points on one loop." }],
    },
    {
      id: "idea",
      kind: "explain",
      visualStateId: "",
      blocks: [
        { kind: "paragraph", text: "Charge has one route." },
        { kind: "definition", term: "Ampere", text: "One coulomb per second." },
        { kind: "callout", tone: "key", text: "The current is the same everywhere." },
      ],
    },
    {
      id: "check",
      kind: "check",
      visualStateId: "",
      blocks: [{ kind: "paragraph", text: "Now your turn." }],
      question: {
        id: "q1",
        conceptIds: ["current"],
        prompt: "Which change raises the current?",
        responseType: "short_text",
        difficulty: 1,
        hints: ["Look at the denominator."],
        sourceIds: [],
        choices: [
          { id: "a", label: "Raising the supply voltage" },
          { id: "b", label: "Adding a resistor" },
        ],
      },
    },
    {
      id: "close",
      kind: "explain",
      visualStateId: "",
      blocks: [{ kind: "paragraph", text: "Carry that forward." }],
    },
  ],
};

function render(overrides: Partial<Parameters<typeof StoryStageView>[0]> = {}) {
  const onComplete = vi.fn();
  const onStepChange = vi.fn();
  renderWithProviders(
    <ModeProvider lessonId="lesson">
      <StoryStageView
        courseId="electronics-foundations"
        onComplete={onComplete}
        onStepChange={onStepChange}
        savedInteractionState={undefined}
        stage={stage}
        {...overrides}
      />
    </ModeProvider>,
  );
  return { onComplete, onStepChange };
}

describe("story stage view", () => {
  it("shows one step at a time and keeps the passed ones on screen", async () => {
    stubFetch({});
    const { onStepChange } = render();

    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("Two points on one loop.")).toBeInTheDocument();
    expect(screen.queryByText("Charge has one route.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("Charge has one route.")).toBeInTheDocument();
    // The earlier step stays readable rather than being replaced.
    expect(screen.getByText("Two points on one loop.")).toBeInTheDocument();
    expect(onStepChange).toHaveBeenCalledWith(1);
  });

  it("renders definitions and callouts rather than flattening them to paragraphs", async () => {
    stubFetch({});
    render();
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(screen.getByText("Ampere")).toBeInTheDocument();
    expect(screen.getByText("One coulomb per second.")).toBeInTheDocument();
    expect(screen.getByText("The current is the same everywhere.")).toBeInTheDocument();
  });

  it("will not let a check be skipped, and moves on once it is answered", async () => {
    stubFetch({
      "POST /api/attempts": {
        body: {
          attemptId: "11111111-2222-4333-8444-555555555555",
          correct: true,
          feedback: "That raises the numerator.",
          xpAwarded: 20,
          independent: true,
          mastery: 0.7,
          conceptIds: ["current"],
        },
      },
    });
    render();
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    // No way forward until the question has been answered.
    expect(screen.queryByRole("button", { name: /Continue/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Raising the supply voltage/ }));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(await screen.findByText("That raises the numerator.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Continue/ })).toBeInTheDocument();
  });

  it("resumes at the saved step instead of restarting the lesson", () => {
    stubFetch({});
    render({ savedInteractionState: { stepIndex: 3 } });

    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
    expect(screen.getByText("Carry that forward.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finish/ })).toBeInTheDocument();
  });

  it("completes the stage from the last step", async () => {
    stubFetch({});
    const { onComplete } = render({ savedInteractionState: { stepIndex: 3 } });

    await userEvent.click(screen.getByRole("button", { name: /Finish/ }));
    expect(onComplete).toHaveBeenCalled();
  });
});
