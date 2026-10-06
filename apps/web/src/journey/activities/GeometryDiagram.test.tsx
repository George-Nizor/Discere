import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { GeometryDiagram as Spec } from "@discere/contracts";
import { GeometryDiagram, GeometryDrawing } from "./GeometryDiagram.js";
const circles: Spec = {
  type: "geometry_explorer",
  cases: [
    { id: "small", label: "Radius 3", shape: { kind: "circle", radius: 3 } },
    { id: "large", label: "Radius 6", shape: { kind: "circle", radius: 6 } },
  ],
  initialCaseId: "small",
};
describe("Geometry learning diagrams", () => {
  it("changes size at a common scale, supports keyboard selection and restores the original", async () => {
    const { container } = render(<GeometryDiagram spec={circles} />);
    const radius = Number(container.querySelector("circle.geo-shape")!.getAttribute("r"));
    screen.getByRole("button", { name: "Radius 6" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Radius 6" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(Number(container.querySelector("circle.geo-shape")!.getAttribute("r"))).toBeCloseTo(
      radius * 2,
    );
    expect(screen.queryByRole("definition")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Restore original shape" }));
    expect(Number(container.querySelector("circle.geo-shape")!.getAttribute("r"))).toBeCloseTo(
      radius,
    );
  });
  it("withholds worked measurements until feedback is available", () => {
    const { rerender } = render(<GeometryDiagram spec={circles} />);
    expect(screen.queryByText("Circumference", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName("Circle of radius 3.");
    rerender(<GeometryDiagram spec={circles} showResults />);
    expect(screen.getByText("6π", { exact: true })).toBeVisible();
    expect(screen.getByText("9π", { exact: true })).toBeVisible();
  });
  it("unfolds all six faces with their correct paired dimensions and folds back", async () => {
    const spec: Spec = {
      type: "geometry_explorer",
      cases: [
        { id: "a", label: "Box", shape: { kind: "prism", length: 5, width: 3, height: 2 } },
        { id: "b", label: "Cube", shape: { kind: "prism", length: 4, width: 4, height: 4 } },
      ],
      initialCaseId: "a",
    };
    const { container } = render(<GeometryDiagram spec={spec} />);
    await userEvent.click(screen.getByRole("button", { name: "Unfold box" }));
    expect(container.querySelectorAll(".geo-net-face")).toHaveLength(6);
    expect(screen.getAllByText("5 × 3", { exact: true })).toHaveLength(2);
    expect(screen.getAllByText("5 × 2", { exact: true })).toHaveLength(2);
    expect(screen.getAllByText("3 × 2", { exact: true })).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Fold box" }));
    expect(container.querySelectorAll(".geo-net-face")).toHaveLength(0);
  });
  it("offers unit squares and readable given dimensions without a solved area", async () => {
    const spec: Spec = {
      type: "geometry_explorer",
      cases: [
        { id: "a", label: "First", shape: { kind: "rectangle", width: 6, height: 4 } },
        { id: "b", label: "Second", shape: { kind: "rectangle", width: 8, height: 2 } },
      ],
      initialCaseId: "a",
    };
    const { container } = render(<GeometryDiagram spec={spec} />);
    await userEvent.click(screen.getByRole("button", { name: "Show unit squares" }));
    expect(container.querySelectorAll(".geo-unit-grid line")).toHaveLength(8);
    await userEvent.click(screen.getByText("Read dimensions", { exact: true }));
    expect(screen.getByText(/Rectangle: width 6, height 4/, { selector: "p" })).toBeVisible();
    expect(screen.queryByText("24", { exact: true })).not.toBeInTheDocument();
  });
  it("renders an assessment drawing with givens and no interactive controls", () => {
    render(<GeometryDrawing shape={{ kind: "right_triangle", a: 10, b: 24 }} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      /legs 10 and 24; the hypotenuse is unknown/,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("26", { exact: true })).not.toBeInTheDocument();
  });
});
