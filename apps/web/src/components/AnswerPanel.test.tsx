import { render, screen } from "@testing-library/react";
import type { AttemptResponse } from "@discere/contracts";
import { describe, expect, it, vi } from "vitest";
import { AnswerPanel } from "./AnswerPanel";

const correctResult: AttemptResponse = {
  attemptId: "f5a223f7-96a1-458f-aaba-3d37857cbb3d",
  correct: true,
  feedback: "The current is 0.05 A.",
  xpAwarded: 20,
  mastery: 0.28,
  independent: true,
};

const incorrectResult: AttemptResponse = {
  ...correctResult,
  correct: false,
  feedback: "Use current equals voltage divided by resistance.",
  independent: false,
};

function renderPanel(overrides: Partial<Parameters<typeof AnswerPanel>[0]> = {}): void {
  render(
    <AnswerPanel
      prompt="Calculate the current."
      mode="coach"
      response="50 mA"
      onResponse={vi.fn()}
      onSubmit={vi.fn()}
      submitting={false}
      onHint={vi.fn()}
      hinting={false}
      onStartReveal={vi.fn()}
      onConfirmReveal={vi.fn()}
      {...overrides}
    />,
  );
}

describe("AnswerPanel", () => {
  it("closes the response controls after a correct answer", () => {
    renderPanel({ result: correctResult });
    expect(
      screen.getByRole("textbox", { name: "Explain or calculate your answer" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Attempt complete" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Give me one hint" })).not.toBeInTheDocument();
    expect(screen.getByText(/28% current mastery/)).toBeInTheDocument();
  });

  it("closes hints and resubmission after a worked answer is revealed", () => {
    renderPanel({
      result: incorrectResult,
      revealedAnswer: "I = 5 / 100 = 0.05 A.",
    });
    expect(
      screen.getByRole("textbox", { name: "Explain or calculate your answer" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Answer revealed" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Give me one hint" })).not.toBeInTheDocument();
    expect(screen.queryByText("Reveal the worked answer")).not.toBeInTheDocument();
    expect(screen.getByText("I = 5 / 100 = 0.05 A.")).toBeInTheDocument();
  });
});
