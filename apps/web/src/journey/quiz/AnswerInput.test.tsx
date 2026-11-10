import type { LearnerQuestion } from "@discere/contracts";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { numericQuestion } from "../../test/fixtures.js";
import { renderWithProviders } from "../../test/harness.js";
import { AnswerInput } from "./AnswerInput.js";

const choiceQuestion: LearnerQuestion = {
  ...numericQuestion,
  responseType: "short_text",
  choices: [
    { id: "a", label: "The Punic Wars" },
    { id: "b", label: "The assassination of Julius Caesar" },
    { id: "c", label: "The reign of Augustus" },
    { id: "d", label: "The fall of Carthage" },
  ],
};

describe("answer input", () => {
  it("renders lettered option cards and marks the chosen one", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <AnswerInput
        answered={false}
        correct={false}
        draft={{ kind: "choice", choiceId: null }}
        onChange={onChange}
        question={choiceQuestion}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /The reign of Augustus/ }));
    expect(onChange).toHaveBeenCalledWith({ kind: "choice", choiceId: "c" });
  });

  it("marks a correct selection with an icon as well as colour", () => {
    renderWithProviders(
      <AnswerInput
        answered
        correct
        draft={{ kind: "choice", choiceId: "c" }}
        onChange={() => {}}
        question={choiceQuestion}
      />,
    );
    const selected = screen.getByRole("radio", { name: /The reign of Augustus/ });
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(selected.className).toContain("choice-card-correct");
    expect(screen.getByLabelText("Correct")).toBeInTheDocument();
  });

  it("is a radio group whose options stay readable by keyboard once answered", async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <AnswerInput
        answered
        correct
        draft={{ kind: "choice", choiceId: "c" }}
        onChange={onChange}
        question={choiceQuestion}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Answer choices" })).toBeInTheDocument();
    const options = screen.getAllByRole("radio");
    for (const option of options) {
      expect(option).not.toBeDisabled();
      expect(option).toHaveAttribute("aria-disabled", "true");
    }
    // One Tab stop: the chosen option.
    const chosen = screen.getByRole("radio", { name: /The reign of Augustus/ });
    expect(options.filter((option) => option.tabIndex === 0)).toEqual([chosen]);
    chosen.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(chosen).not.toHaveFocus();
    expect(document.activeElement?.getAttribute("role")).toBe("radio");
    await userEvent.click(options[0] as HTMLElement);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("says plainly when a response type has no input", () => {
    renderWithProviders(
      <AnswerInput
        answered={false}
        correct={false}
        draft={{ kind: "text", text: "" }}
        onChange={() => {}}
        question={{ ...numericQuestion, responseType: "drawing" }}
      />,
    );
    expect(screen.getByText("This question cannot be answered here")).toBeInTheDocument();
  });
});
