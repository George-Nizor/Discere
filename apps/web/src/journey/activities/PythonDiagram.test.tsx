import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LearningDiagram } from "@discere/contracts";
import { reducedMotionEnabled } from "../../study/experience.js";
import { PythonDiagram } from "./PythonDiagram.js";
vi.mock("../../study/experience.js", () => ({ reducedMotionEnabled: vi.fn(() => false) }));
const spec: Extract<LearningDiagram, { type: "python_execution" }> = {
  type: "python_execution",
  runtime: "Python 3.12",
  initialCaseId: "one",
  cases: [
    {
      id: "one",
      label: "Original",
      code: "x = 2\nx += 3",
      steps: [
        {
          lineStart: 1,
          lineEnd: 1,
          values: [{ name: "x", type: "int", display: "2" }],
          stdout: "",
        },
        {
          lineStart: 2,
          lineEnd: 2,
          values: [{ name: "x", type: "int", display: "5" }],
          stdout: "five\n",
        },
      ],
    },
    {
      id: "two",
      label: "Changed input",
      code: "x = 7",
      steps: [
        {
          lineStart: 1,
          lineEnd: 1,
          values: [{ name: "x", type: "int", display: "7" }],
          stdout: "",
        },
      ],
    },
  ],
};
afterEach(() => {
  vi.useRealTimers();
  vi.mocked(reducedMotionEnabled).mockReturnValue(false);
});
describe("Python example playback", () => {
  it("reveals one executed state at a time and resets when a case changes", () => {
    const { container } = render(<PythonDiagram spec={spec} />);
    expect(container.querySelector(".python-state")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(container.querySelector("dd")).toHaveTextContent("2");
    expect(container.querySelector(".is-current")).toHaveTextContent("x = 2");
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(container.querySelector("dd")).toHaveTextContent("5");
    expect(screen.getByText("five")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Changed input" }));
    expect(container.querySelector(".python-state")).toBeNull();
    expect(screen.getByRole("button", { name: "Changed input" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(container.querySelector("dd")).toHaveTextContent("7");
    fireEvent.click(screen.getByRole("button", { name: "Reset example" }));
    expect(container.querySelector(".python-state")).toBeNull();
  });
  it("pauses playback and cancels the old timer on case changes", () => {
    vi.useFakeTimers();
    const { container } = render(<PythonDiagram spec={spec} />);
    fireEvent.click(screen.getByRole("button", { name: "Play example" }));
    act(() => vi.advanceTimersByTime(650));
    expect(container.querySelector("dd")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => vi.advanceTimersByTime(2000));
    expect(container.querySelector("dd")).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "Play example" }));
    fireEvent.click(screen.getByRole("button", { name: "Changed input" }));
    act(() => vi.advanceTimersByTime(2000));
    expect(container.querySelector(".python-state")).toBeNull();
  });
  it("honours reduced motion and clears state for another beat", () => {
    vi.mocked(reducedMotionEnabled).mockReturnValue(true);
    const { container, rerender } = render(<PythonDiagram spec={spec} />);
    fireEvent.click(screen.getByRole("button", { name: "Play example" }));
    expect(container.querySelector("dd")).toHaveTextContent("5");
    expect(screen.queryByRole("button", { name: "Next step" })).toBeNull();
    rerender(<PythonDiagram spec={{ ...spec, initialCaseId: "two" }} />);
    expect(container.querySelector(".python-state")).toBeNull();
  });
  it("renders column labels and distinguishes a missing table cell from zero", () => {
    const tableSpec = structuredClone(spec);
    tableSpec.cases[0]!.steps[0]!.values = [
      {
        name: "df",
        type: "DataFrame",
        display: "table",
        table: {
          columns: ["index", "units"],
          rows: [
            [0, 0],
            [1, null],
          ],
        },
      },
    ];
    render(<PythonDiagram spec={tableSpec} />);
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByRole("table", { name: "df" })).toHaveTextContent("indexunits001missing");
    expect(screen.getByText("missing")).toBeVisible();
    expect(screen.getByRole("region", { name: "df data" })).not.toHaveAttribute("tabindex");
  });
});

describe("Python values before the learner answers", () => {
  it("steps through lines but keeps values and output for after the answer", () => {
    const view = render(<PythonDiagram spec={spec} showResults={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Next step/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next step/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Step 2 of 2");
    expect(screen.queryByText("five")).not.toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    expect(screen.getByText(/Values and output appear once you have answered/)).toBeInTheDocument();
    view.rerender(<PythonDiagram spec={spec} showResults />);
    expect(screen.getByText("five")).toBeInTheDocument();
  });
});
