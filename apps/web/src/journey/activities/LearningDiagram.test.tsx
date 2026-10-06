import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LearningDiagram } from "./LearningDiagram.js";

const control = { min: -4, max: 20, value: 0, step: 1 };
describe("candidate diagrams", () => {
  it("keeps a fixed given independent of the numeric answer", () => {
    render(
      <LearningDiagram
        spec={{
          type: "number_machine",
          input: { ...control, value: 2 },
          operations: [{ operator: "add", operand: 5 }],
        }}
        answerText="7"
      />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName("x = 2, + 5, gives 7");
  });
  it("shows givens only before the response: the output is a question mark (audit M1)", () => {
    const spec = {
      type: "number_machine" as const,
      input: { ...control, value: 2 },
      operations: [{ operator: "add" as const, operand: 5 }],
    };
    const view = render(<LearningDiagram spec={spec} showResults={false} />);
    expect(view.container.textContent).not.toContain("7");
    expect(view.container.textContent).toContain("?");
    expect(screen.getByRole("img")).toHaveAccessibleName(/hidden until you answer/);
    // A slider that is not the answer would be a second input for one answer (audit M7).
    expect(screen.queryByRole("slider")).toBeNull();
    view.rerender(<LearningDiagram spec={spec} showResults />);
    expect(view.container.textContent).toContain("7");
    expect(screen.getByRole("slider", { name: /Try another x/ })).toBeInTheDocument();
  });
  it("keeps the balance level and unevaluated before the response", () => {
    const view = render(
      <LearningDiagram
        spec={{
          type: "equation_balance",
          coefficient: 1,
          constant: 5,
          right: 12,
          variable: { ...control, value: 3 },
        }}
        showResults={false}
      />,
    );
    expect(view.container.textContent).not.toContain("8");
    expect(view.container.querySelector("g[transform]")?.getAttribute("transform")).toBe(
      "rotate(0 300 137)",
    );
  });
  it("hides a truth table's result column until the response", () => {
    const view = render(
      <LearningDiagram
        spec={{ type: "truth_table", formula: "p_and_q", p: true, q: true }}
        showResults={false}
      />,
    );
    expect(view.container.querySelectorAll("tbody td:last-child")[0]?.textContent).toBe("?");
    expect(screen.queryByRole("button", { name: /p:/ })).toBeNull();
  });
  it("uses the learner's candidate for both sides and binds slider exploration to the answer", () => {
    const onChange = vi.fn();
    const spec = {
      type: "equation_balance" as const,
      bindAnswer: true,
      coefficient: 1,
      constant: 5,
      right: 12,
      variable: control,
    };
    const view = render(<LearningDiagram spec={spec} answerText="7" onAnswerChange={onChange} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "With x = 7, x + 5 is 12; the right side is 12",
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith(3);
    view.rerender(<LearningDiagram spec={spec} answerText="1/2" answerLocked />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "With x = 0.5, x + 5 is 5.5; the right side is 12",
    );
    expect(screen.getByRole("slider")).toBeDisabled();
  });
});

describe("coordinate givens", () => {
  it("keeps named coordinates visible and distinct while the learner explores", () => {
    const { container } = render(
      <LearningDiagram
        spec={{
          type: "coordinate_plane",
          min: -5,
          max: 5,
          points: [{ x: 3, y: 2, label: "A" }],
          explore: true,
        }}
      />,
    );
    const image = screen.getByRole("img");
    expect(image).toHaveAccessibleName(/A at \(3, 2\)/);
    const given = container.querySelector(".coordinate-given")!;
    expect(given).toHaveAttribute("fill", "#91a7ff");
    expect(screen.getByText(/not your answer/)).toBeInTheDocument();
    const position = [given.getAttribute("cx"), given.getAttribute("cy")];
    fireEvent.change(screen.getByRole("slider", { name: /Dot x/ }), {
      target: { value: "-2" },
    });
    expect([given.getAttribute("cx"), given.getAttribute("cy")]).toEqual(position);
    expect(screen.getByRole("slider", { name: /Dot x/ })).toHaveValue("-2");
  });
});
