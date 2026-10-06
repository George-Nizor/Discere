import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import type { BiologyModel, BiologyDiagram as Spec } from "@discere/contracts";
import { BiologyDiagram, BiologyGivenVisual } from "./BiologyDiagram.js";
const spec = (model: BiologyModel, other: BiologyModel = model): Spec => ({
  type: "biology_explorer",
  cases: [
    { id: "a", label: "Initial", model },
    { id: "b", label: "Comparison", model: other },
  ],
  initialCaseId: "a",
});
describe("Biology interaction", () => {
  it("conceals computed summaries until feedback", () => {
    const s = spec({ kind: "cross", first: "Aa", second: "Aa" }),
      { rerender } = render(<BiologyDiagram spec={s} />);
    expect(screen.queryByLabelText("Biology results")).toBeNull();
    rerender(<BiologyDiagram spec={s} showResults />);
    expect(screen.getByLabelText("Biology results")).toHaveTextContent("aa: 1/4");
  });
  it("moves the osmotic partition while keeping the solute amounts and resets on comparison", async () => {
    const { container } = render(
      <BiologyDiagram
        spec={spec(
          { kind: "membrane", left: 4, right: 12, permits: "water" },
          { kind: "membrane", left: 12, right: 4, permits: "water" },
        )}
      />,
    );
    const partition = () => container.querySelector('line[stroke="#e3c77b"]')!;
    expect(partition().getAttribute("x1")).toBe("280");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "100" } });
    expect(partition().getAttribute("x1")).toBe("175");
    expect(screen.getByText("Left: 4 units", { exact: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Comparison" }));
    expect(screen.getByRole("slider")).toHaveValue("0");
    expect(partition().getAttribute("x1")).toBe("280");
  });
  it("builds complementary bases in displayed order and resets them", async () => {
    render(<BiologyDiagram spec={spec({ kind: "dna", sequence: "AAGC" })} />);
    expect(screen.getAllByText("?", { exact: true })).toHaveLength(4);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "100" } });
    expect(screen.queryAllByText("?", { exact: true })).toHaveLength(0);
    expect(screen.getAllByText("T", { exact: true })).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Reset biology model" }));
    expect(screen.getAllByText("?", { exact: true })).toHaveLength(4);
  });
  it("uses a common population count scale across before and later", async () => {
    const { container } = render(
      <BiologyDiagram spec={spec({ kind: "population", before: [10, 30], after: [20, 60] })} />,
    );
    const blue = () =>
      Number(container.querySelector('rect[fill="#85adff"]')!.getAttribute("height"));
    const initial = blue();
    await userEvent.selectOptions(screen.getByRole("combobox"), "1");
    expect(blue()).toBeCloseTo(initial * 2);
    expect(screen.getByText("20", { exact: true })).toBeInTheDocument();
  });
  it("uses one shared vertical scale when comparing series", async () => {
    const { container } = render(
      <BiologyDiagram
        spec={spec(
          {
            kind: "series",
            xLabel: "Time",
            yLabel: "Height",
            points: [
              [0, 0],
              [1, 5],
              [2, 10],
            ],
          },
          {
            kind: "series",
            xLabel: "Time",
            yLabel: "Height",
            points: [
              [0, 0],
              [1, 10],
              [2, 20],
            ],
          },
        )}
      />,
    );
    const first = container.querySelector("polyline")!.getAttribute("points");
    await userEvent.click(screen.getByRole("button", { name: "Comparison" }));
    expect(container.querySelector("polyline")!.getAttribute("points")).not.toBe(first);
    expect(screen.getByText("20", { exact: true })).toBeInTheDocument();
  });
  it("does not reveal cross answers or controls in assessment givens", () => {
    render(<BiologyGivenVisual model={{ kind: "cross", first: "Aa", second: "Aa" }} />);
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByText("?", { exact: true })).toHaveLength(4);
    expect(screen.queryByLabelText("Biology results")).toBeNull();
  });
  it("supports explicit selection of cell structures and reset", async () => {
    render(<BiologyDiagram spec={spec({ kind: "cell", cell: "plant" })} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "3");
    expect(screen.getAllByText("Chloroplasts").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Reset biology model" }));
    expect(screen.getByRole("combobox")).toHaveValue("0");
  });
  it("traces carbon without implying oxygen gas contains carbon", async () => {
    const { container } = render(
      <BiologyDiagram spec={spec({ kind: "energy", process: "photosynthesis", glucose: 1 })} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Trace the carbon" }));
    expect(screen.getByText(/oxygen gas contains no carbon/)).toBeInTheDocument();
    expect(container.querySelectorAll('text[opacity="0.25"]')).toHaveLength(2);
  });
});
