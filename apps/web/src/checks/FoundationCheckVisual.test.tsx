import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CheckVisual } from "./CheckVisual.js";
describe("Independent check givens", () => {
  it("presents a proposed inference without calling it valid or revealing a result", () => {
    render(
      <CheckVisual
        visual={{
          type: "statements",
          title: "Argument",
          statements: [
            { label: "A", text: "If p, then q." },
            { label: "B", text: "q is true." },
          ],
          conclusion: "p is true.",
        }}
      />,
    );
    expect(screen.getByText("Proposed conclusion")).toBeInTheDocument();
    expect(screen.getByText("p is true.")).toBeInTheDocument();
    expect(screen.queryByText(/correct|invalid|worked answer/i)).toBeNull();
  });
  it("renders Python literally without executing code or injecting markup", () => {
    const { container } = render(
      <CheckVisual
        visual={{
          type: "program",
          language: "python",
          code: 'x = "<img src=x onerror=alert(1)>"\nif 4 < 5:\n    x = 3',
        }}
      />,
    );
    expect(screen.getByLabelText("Python code")).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByLabelText("Python code")).toHaveAttribute("tabindex", "0");
  });
  it("shares an axis across distributions and keeps every observation accessible", () => {
    const { container } = render(
      <CheckVisual
        visual={{
          type: "data_series",
          label: "Populations",
          series: [
            { label: "A", values: [4, 4, 8, 8] },
            { label: "B", values: [0, 4, 8, 12] },
          ],
        }}
      />,
    );
    const dots = Array.from(container.querySelectorAll("circle"));
    expect(dots[0]!.getAttribute("cx")).toBe(dots[5]!.getAttribute("cx"));
    expect(dots[2]!.getAttribute("cx")).toBe(dots[6]!.getAttribute("cx"));
    expect(screen.getByRole("img")).toHaveAccessibleDescription(
      "A: 4, 4, 8, 8. B: 0, 4, 8, 12. Each dot is one observation.",
    );
    expect(screen.queryByText(/variance|standard deviation|mean/i)).toBeNull();
  });
  it("fits a maximal repeated-value stack below its label", () => {
    const { container } = render(
      <CheckVisual
        visual={{
          type: "data_series",
          label: "Repeated values",
          series: [{ label: "Same", values: Array(12).fill(4) }],
        }}
      />,
    );
    for (const dot of container.querySelectorAll("circle"))
      expect(Number(dot.getAttribute("cy")) - 6.5).toBeGreaterThan(30);
  });
});

it("renders query input tables with typed missing values and escaped literal data", () => {
  const { container } = render(
    <CheckVisual
      visual={{
        type: "query",
        sql: "SELECT value FROM sample;",
        tables: [
          {
            name: "sample",
            columns: ["id", "value"],
            rows: [
              [1, null],
              [2, "NULL"],
              [3, "<script>bad()</script>"],
            ],
          },
        ],
      }}
    />,
  );
  expect(screen.getByRole("table", { name: "sample" })).toBeInTheDocument();
  expect(screen.getByText("NULL: missing value")).toBeInTheDocument();
  expect(screen.getByText('"NULL"')).toBeInTheDocument();
  expect(container.querySelector("script")).toBeNull();
  expect(screen.getByRole("region", { name: "sample input table" })).toHaveAttribute(
    "tabindex",
    "0",
  );
  expect(screen.getByLabelText("SQL query")).toHaveTextContent("SELECT value FROM sample;");
  expect(screen.getByLabelText("SQL query")).toHaveAttribute("tabindex", "0");
});
