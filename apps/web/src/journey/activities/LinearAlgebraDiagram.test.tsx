import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { LinearAlgebraDiagram as Spec, LinearAlgebraModel } from "@discere/contracts";
import { LinearAlgebraDiagram, LinearAlgebraDrawing } from "./LinearAlgebraDiagram.js";
import { CheckVisual } from "../../checks/CheckVisual.js";
const spec = (a: LinearAlgebraModel, b: LinearAlgebraModel): Spec => ({
  type: "linear_algebra_explorer",
  initialCaseId: "a",
  cases: [
    { id: "a", label: "Example", model: a },
    { id: "b", label: "Compare", model: b },
  ],
});
describe("linear algebra visual feedback", () => {
  it("hides computed vectors, transformed shapes and summaries before feedback", () => {
    const s = spec(
      {
        kind: "matrix",
        operation: "apply",
        matrix: [
          [2, 1],
          [0, 1],
        ],
        vector: [1, 1],
      },
      {
        kind: "matrix",
        operation: "apply",
        matrix: [
          [1, 0],
          [0, 2],
        ],
        vector: [1, 1],
      },
    );
    const { container, rerender } = render(<LinearAlgebraDiagram spec={s} />);
    expect(screen.queryByLabelText("Linear algebra results")).toBeNull();
    expect(container.querySelectorAll("[data-result]")).toHaveLength(0);
    expect(screen.queryByRole("slider")).toBeNull();
    rerender(<LinearAlgebraDiagram spec={s} showResults />);
    expect(screen.getByLabelText("Linear algebra results").textContent).toContain("(3, 1)");
    expect(container.querySelectorAll("[data-result]")).toHaveLength(2);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });
  it("keeps given comparison axes fixed and resets the transformation when changing cases", async () => {
    const s = spec(
      {
        kind: "matrix",
        operation: "apply",
        matrix: [
          [2, 1],
          [0, 1],
        ],
        vector: [1, 1],
      },
      {
        kind: "matrix",
        operation: "apply",
        matrix: [
          [1, 0],
          [0, 2],
        ],
        vector: [1, 1],
      },
    );
    const { container } = render(<LinearAlgebraDiagram spec={s} showResults />);
    const ticks = Array.from(container.querySelectorAll(".la-grid text"), (x) => x.textContent),
      original = container.querySelector(".la-transformed")!.getAttribute("d");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
    expect(container.querySelector(".la-transformed")!.getAttribute("d")).not.toBe(original);
    await userEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(screen.getByRole("slider")).toHaveValue("100");
    expect(Array.from(container.querySelectorAll(".la-grid text"), (x) => x.textContent)).toEqual(
      ticks,
    );
    await userEvent.click(screen.getByRole("button", { name: "Example" }));
    expect(container.querySelector(".la-transformed")!.getAttribute("d")).toBe(original);
  });
  it("exposes given rows before feedback and actual elimination only after feedback", async () => {
    const s = spec(
      {
        kind: "system",
        matrix: [
          [1, 1],
          [2, -1],
        ],
        rhs: [5, 1],
      },
      {
        kind: "system",
        matrix: [
          [1, 1],
          [2, 2],
        ],
        rhs: [3, 6],
      },
    );
    const { container, rerender } = render(<LinearAlgebraDiagram spec={s} />);
    await userEvent.click(screen.getByRole("button", { name: "Row 2" }));
    expect(container.querySelectorAll(".la-focus")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Next row operation" })).toBeNull();
    rerender(<LinearAlgebraDiagram spec={s} showResults />);
    await userEvent.click(screen.getByRole("button", { name: "Next row operation" }));
    expect(container.querySelector(".la-elimination")!.textContent).toContain("Swap rows 1 and 2");
    expect(screen.getByLabelText("Linear algebra results").textContent).toContain("(2, 3)");
    await userEvent.click(screen.getByRole("button", { name: "Reset row operations" }));
    expect(container.querySelector(".la-elimination")!.textContent).toContain("Given rows");
  });
  it("draws the actual SVD stages and conceals them before feedback", async () => {
    const s = spec(
      {
        kind: "svd",
        matrix: [
          [2, 1],
          [0, 1],
        ],
      },
      {
        kind: "svd",
        matrix: [
          [1, 2],
          [2, 4],
        ],
      },
    );
    const { container, rerender } = render(<LinearAlgebraDiagram spec={s} />);
    expect(screen.queryByRole("group", { name: "SVD transformation" })).toBeNull();
    rerender(<LinearAlgebraDiagram spec={s} showResults />);
    const full = container.querySelector(".la-transformed")!.getAttribute("d");
    await userEvent.click(screen.getByRole("button", { name: /^Input$/ }));
    expect(container.querySelector(".la-transformed")!.getAttribute("d")).not.toBe(full);
    const inputDirections = Array.from(container.querySelectorAll(".la-svd-axis path"), (element) =>
      element.getAttribute("d"),
    );
    expect(inputDirections).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Change input axes" }));
    expect(
      Array.from(container.querySelectorAll(".la-svd-axis path"), (element) =>
        element.getAttribute("d"),
      ),
    ).not.toEqual(inputDirections);
    await userEvent.click(screen.getByRole("button", { name: "Change output axes" }));
    expect(container.querySelector(".la-transformed")!.getAttribute("d")).toBe(full);
  });
  it("renders rectangular SVD shapes without implying a two dimensional drawing", () => {
    const s = spec(
      {
        kind: "svd",
        matrix: [
          [3, 0, 0],
          [0, 4, 0],
        ],
      },
      {
        kind: "svd",
        matrix: [
          [3, 0],
          [0, 4],
          [0, 0],
        ],
      },
    );
    const { container } = render(<LinearAlgebraDiagram spec={s} showResults />);
    expect(container.querySelector(".la-drawing")).toBeNull();
    expect(container.querySelector(".la-factor-shapes")!.textContent).toContain("Σ: 2 × 3");
    expect(screen.getByLabelText("Linear algebra results").textContent).toContain("(4, 3)");
  });
  it("keeps calculated labels and vectors out of course checks", () => {
    const { container } = render(
      <CheckVisual
        visual={{
          type: "linear_algebra",
          model: { kind: "projection", v: [4, 2], direction: [1, 1] },
        }}
      />,
    );
    expect(container.querySelectorAll("[data-result]")).toHaveLength(0);
    expect(screen.queryByLabelText("Linear algebra results")).toBeNull();
    expect(screen.getByRole("img").textContent).not.toContain("projection = (3, 3)");
  });
  it("marks a zero given vector without a misleading arrowhead or NaN", () => {
    const { container } = render(
      <LinearAlgebraDrawing model={{ kind: "scaled_vector", v: [0, 0], scale: 3 }} />,
    );
    expect(container.querySelector(".la-input-arrow circle")).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });
});

it("keeps fitted measurements hidden until feedback", () => {
  const s = spec(
    { kind: "least_squares", matrix: [[1], [1], [1]], rhs: [2, 4, 9] },
    { kind: "least_squares", matrix: [[1], [1], [1]], rhs: [1, 5, 9] },
  );
  const { container, rerender } = render(<LinearAlgebraDiagram spec={s} />);
  expect(container.querySelectorAll('[data-result="fit"]')).toHaveLength(0);
  rerender(<LinearAlgebraDiagram spec={s} showResults />);
  expect(container.querySelectorAll('[data-result="fit"]')).toHaveLength(3);
  expect(screen.getByLabelText("Linear algebra results").textContent).toContain("(5)");
});
