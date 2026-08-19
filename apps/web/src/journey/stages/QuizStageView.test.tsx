import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { quizStage } from "../../test/fixtures.js";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { ModeProvider } from "../mode-context.js";
import { QuizStageView } from "./QuizStageView.js";

afterEach(() => vi.unstubAllGlobals());

function renderQuiz(onContinue = vi.fn()) {
  renderWithProviders(
    <ModeProvider lessonId="lesson">
      <QuizStageView onContinue={onContinue} returnLink={null} stage={quizStage} />
    </ModeProvider>,
  );
  return onContinue;
}

describe("quiz stage", () => {
  it("asks one question with a numeric value and unit", () => {
    stubFetch({});
    renderQuiz();
    expect(screen.getByText("Question 1 of 1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Calculate the current/);
    expect(screen.getByLabelText("Value")).toBeInTheDocument();
    expect(screen.getByLabelText("Unit")).toBeInTheDocument();
  });

  it("moves from a wrong answer through a hint to a correct one", async () => {
    let attempts = 0;
    const { calls } = stubFetch({
      "POST /api/attempts": () => {
        attempts += 1;
        return {
          body: {
            attemptId: "11111111-1111-4111-8111-111111111111",
            correct: attempts > 1,
            feedback: attempts > 1 ? "Your value and unit are correct." : "Check the division.",
            xpAwarded: attempts > 1 ? 12 : 0,
            mastery: attempts > 1 ? 0.6 : 0.1,
            independent: false,
          },
        };
      },
      "POST /api/attempts/11111111-1111-4111-8111-111111111111/hints": {
        body: { hint: "Write Ohm's law as I = V / R.", level: 1, remaining: 1 },
      },
    });
    const onContinue = renderQuiz();

    await userEvent.type(screen.getByLabelText("Value"), "0.5");
    await userEvent.type(screen.getByLabelText("Unit"), "A");
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("Check the division.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Ask for a hint/ }));
    expect(await screen.findByText("Write Ohm's law as I = V / R.")).toBeInTheDocument();
    expect(screen.getByText("Hint 1 of 2")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Value"));
    await userEvent.type(screen.getByLabelText("Value"), "0.05");
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByText("Your value and unit are correct.")).toBeInTheDocument();
    expect(screen.getByText(/12 XP/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(calls.filter((call) => call.key === "POST /api/attempts")).toHaveLength(2);
    expect(calls[0]?.body).toMatchObject({ response: "0.5 A", mode: "coach" });
  });

  it("locks the tutoring mode once an attempt exists", async () => {
    stubFetch({
      "POST /api/attempts": {
        body: {
          attemptId: "11111111-1111-4111-8111-111111111111",
          correct: false,
          feedback: "Check the division.",
          xpAwarded: 0,
          mastery: 0.1,
          independent: true,
        },
      },
    });
    renderQuiz();
    expect(screen.getByRole("button", { name: "Exam" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Value"), "1 A");
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText(/Mode locked to/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exam" })).not.toBeInTheDocument();
  });

  it("closes hints and the worked answer in Exam mode", async () => {
    stubFetch({
      "POST /api/attempts": {
        body: {
          attemptId: "11111111-1111-4111-8111-111111111111",
          correct: false,
          feedback: "Not correct.",
          xpAwarded: 0,
          mastery: 0,
          independent: true,
        },
      },
    });
    renderQuiz();
    await userEvent.click(screen.getByRole("button", { name: "Exam" }));
    await userEvent.type(screen.getByLabelText("Value"), "1 A");
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("Not correct.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ask for a hint/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Show the worked answer/ }),
    ).not.toBeInTheDocument();
  });
});
