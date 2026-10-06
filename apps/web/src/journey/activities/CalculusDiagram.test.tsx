import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { CalculusDiagram as Spec } from "@discere/contracts";
import { CalculusDiagram, CalculusDrawing, CalculusGivenVisual } from "./CalculusDiagram.js";
const spec: Spec = {
  type: "calculus_explorer",
  initialCaseId: "a",
  cases: [
    {
      id: "a",
      label: "One interval",
      model: { kind: "secant", coefficients: [0, 0, 1], at: 1, span: 1 },
    },
    {
      id: "b",
      label: "Another interval",
      model: { kind: "secant", coefficients: [0, 0, 1], at: 2, span: 1 },
    },
  ],
};
describe("calculus graph interactions", () => {
  it("conceals derived summaries until feedback is released", () => {
    const { rerender } = render(<CalculusDiagram spec={spec} />);
    expect(screen.queryByLabelText("Graph results")).toBeNull();
    rerender(<CalculusDiagram spec={spec} showResults />);
    expect(screen.getByLabelText("Graph results").textContent).toContain("Secant slope: 3");
  });
  it("changes a graph through its bounded control and restores the initial case", async () => {
    const { container } = render(<CalculusDiagram spec={spec} showResults />);
    const original = container.querySelector(".calc-tangent")!.getAttribute("d");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "100" } });
    expect(container.querySelector(".calc-tangent")!.getAttribute("d")).not.toBe(original);
    await userEvent.click(screen.getByRole("button", { name: "Another interval" }));
    expect(screen.getByRole("slider")).toHaveValue("0");
    await userEvent.click(screen.getByRole("button", { name: "One interval" }));
    expect(container.querySelector(".calc-tangent")!.getAttribute("d")).toBe(original);
  });
  it("draws a jump as two disconnected branches", () => {
    const { container } = render(
      <CalculusDrawing model={{ kind: "jump", at: 0, left: 2, right: 5 }} />,
    );
    expect(container.querySelectorAll(".calc-curve")).toHaveLength(2);
    expect(container.querySelectorAll(".calc-hole")).toHaveLength(1);
  });
  it("distinguishes negative and positive accumulated regions", () => {
    const { container } = render(
      <CalculusGivenVisual
        model={{
          kind: "area",
          coefficients: [0, 1],
          from: -2,
          to: 2,
          rectangles: 4,
          method: "left",
          display: "integral",
        }}
      />,
    );
    expect(container.querySelectorAll(".calc-fill-positive").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".calc-fill-negative").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Graph results")).toBeNull();
  });
  it("keeps one fixed viewport when switching comparison cases", async () => {
    const { container } = render(<CalculusDiagram spec={spec} />);
    const ticks = Array.from(container.querySelectorAll(".calc-grid text"), (n) => n.textContent);
    await userEvent.click(screen.getByRole("button", { name: "Another interval" }));
    expect(Array.from(container.querySelectorAll(".calc-grid text"), (n) => n.textContent)).toEqual(
      ticks,
    );
  });
});
