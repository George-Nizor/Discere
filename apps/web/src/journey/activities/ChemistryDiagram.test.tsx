import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ChemistryModel, ChemistryDiagram as Spec } from "@discere/contracts";
import { ChemistryDiagram, ChemistryGivenVisual } from "./ChemistryDiagram.js";
const spec = (model: ChemistryModel, other: ChemistryModel = model): Spec => ({
  type: "chemistry_explorer",
  cases: [
    { id: "a", label: "Initial", model },
    { id: "b", label: "Comparison", model: other },
  ],
  initialCaseId: "a",
});
describe("chemistry exploration", () => {
  it("releases calculated summaries only after feedback", () => {
    const s = spec({ kind: "amount", species: "H2O", moles: 2 });
    const { rerender } = render(<ChemistryDiagram spec={s} />);
    expect(screen.queryByLabelText("Chemistry results")).toBeNull();
    rerender(<ChemistryDiagram spec={s} showResults />);
    expect(screen.getByLabelText("Chemistry results")).toHaveTextContent("36 g");
  });
  it("changes ion count, switches cases and resets without stale values", async () => {
    render(
      <ChemistryDiagram
        spec={spec(
          { kind: "ionic", cation: "Mg", anion: "Cl", positive: 1, negative: 1 },
          { kind: "ionic", cation: "Al", anion: "O", positive: 2, negative: 3 },
        )}
        showResults
      />,
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });
    expect(screen.getByLabelText("Chemistry results")).toHaveTextContent("Total charge 0");
    await userEvent.click(screen.getByRole("button", { name: "Comparison" }));
    expect(screen.getByRole("slider")).toHaveValue("0");
    await userEvent.click(screen.getByRole("button", { name: "Initial" }));
    expect(screen.getByLabelText("Chemistry results")).toHaveTextContent("Total charge +1");
  });
  it("preserves several edited coefficients while balancing, then resets them all", async () => {
    render(
      <ChemistryDiagram
        spec={spec({ kind: "reaction", reaction: "water", coefficients: [1, 1, 1] })}
        showResults
      />,
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });
    await userEvent.click(screen.getByRole("button", { name: "H₂O" }));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "1" } });
    expect(screen.getByLabelText("Chemistry results")).toHaveTextContent("H: 4 left / 4 right");
    expect(screen.getByLabelText("Chemistry results")).toHaveTextContent("O: 2 left / 2 right");
    expect(document.querySelectorAll(".chem-reaction-unit")).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: "Reset chemistry model" }));
    expect(screen.getByLabelText("Chemistry results")).toHaveTextContent("O: 2 left / 1 right");
  });
  it("moves amounts from reactant bars into products on one shared scale", () => {
    const { container } = render(
      <ChemistryDiagram spec={spec({ kind: "batch", reaction: "water", supplies: [6, 1] })} />,
    );
    const product = () => container.querySelector('rect[fill="#73dca6"]')!;
    expect(product().getAttribute("height")).toBe("0");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "100" } });
    expect(Number(product().getAttribute("height"))).toBeCloseTo((2 / 12) * 135);
    expect(screen.queryByLabelText("Chemistry results")).toBeNull();
  });
  it("switches shared bond lines to electron dots without changing lone pairs", async () => {
    const { container } = render(
      <ChemistryDiagram spec={spec({ kind: "lewis", species: "N2" })} />,
    );
    expect(container.querySelectorAll('line[stroke="#ffd269"]')).toHaveLength(3);
    await userEvent.click(screen.getByRole("button", { name: "Show shared electron dots" }));
    expect(container.querySelectorAll('circle[fill="#ffd269"]')).toHaveLength(6);
    expect(container.querySelectorAll('circle[fill="#8eafff"]')).toHaveLength(4);
  });
  it("shows check givens without interactive controls or solved summaries", () => {
    render(<ChemistryGivenVisual model={{ kind: "batch", reaction: "water", supplies: [4, 1] }} />);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByLabelText("Chemistry results")).toBeNull();
    expect(screen.getByRole("img")).toHaveAccessibleName(/4 mol H₂, 1 mol O₂/);
  });
});
