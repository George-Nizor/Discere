import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhilosophyDiagram as Spec, PhilosophyModel } from "@discere/contracts";
import { PhilosophyDiagram, PhilosophyGivenVisual } from "./PhilosophyDiagram.js";

const experience = vi.hoisted(() => ({ reduced: false }));
vi.mock("../../study/experience.js", () => ({ useExperience: () => experience }));
afterEach(() => {
  experience.reduced = false;
});

const spec = (...models: Array<[string, PhilosophyModel]>): Spec => ({
  type: "philosophy_explorer",
  initialCaseId: "c0",
  cases: models.map(([label, model], i) => ({ id: "c" + i, label, model })),
});
const rain = [
  { symbol: "p" as const, meaning: "it rained" },
  { symbol: "q" as const, meaning: "the pavement is wet" },
];
const affirming: PhilosophyModel = {
  kind: "argument_map",
  premises: [
    { text: "If it rained, the pavement is wet.", formula: "p → q" },
    { text: "The pavement is wet.", formula: "q" },
  ],
  conclusion: { text: "It rained.", formula: "p" },
  atoms: rain,
};
const ponens: PhilosophyModel = {
  ...affirming,
  premises: [affirming.premises[0]!, { text: "It rained.", formula: "p" }],
  conclusion: { text: "The pavement is wet.", formula: "q" },
};
const mira: PhilosophyModel = {
  kind: "argument_map",
  passage: "Mira is a solicitor, so she has a law degree.",
  premises: [
    { text: "Every solicitor has a law degree.", unstated: true },
    { text: "Mira is a solicitor." },
  ],
  conclusion: { text: "Mira has a law degree." },
};
const drinks: PhilosophyModel = {
  kind: "machine_table",
  title: "Drinks machine",
  realiser: "silicon",
  states: [
    { id: "S0", label: "Nothing owed" },
    { id: "S1", label: "10p credited" },
  ],
  inputs: ["10p", "20p"],
  transitions: [
    { from: "S0", input: "10p", to: "S1", output: "" },
    { from: "S0", input: "20p", to: "S0", output: "can" },
    { from: "S1", input: "10p", to: "S0", output: "can" },
    { from: "S1", input: "20p", to: "S0", output: "can + 10p" },
  ],
  start: "S0",
};
const screening: PhilosophyModel = {
  kind: "bayes_grid",
  population: 1000,
  hypothesis: "have the condition",
  evidence: "test positive",
  prior: 0.1,
  hitRate: 0.9,
  falseAlarmRate: 0.1,
};

describe("philosophy explorer", () => {
  it("finds a counterexample row by keyboard and breaks the inference link", async () => {
    const { container } = render(
      <PhilosophyDiagram spec={spec(["Affirming", affirming], ["Ponens", ponens])} />,
    );
    expect(container.querySelector("[data-broken=true]")).toBeNull();
    const p = screen.getByRole("button", { name: /^p, it rained: true$/ });
    p.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: /^p, it rained: false$/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("status")).toHaveTextContent("The link breaks here");
    expect(screen.queryByRole("table", { name: "Complete truth table" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Ponens" }));
    expect(screen.getByRole("button", { name: "Ponens" })).toHaveAttribute("aria-pressed", "true");
    for (let i = 0; i < 4; i++) {
      expect(screen.queryByRole("status")).toBeNull();
      await userEvent.click(screen.getByRole("button", { name: "Next row" }));
    }
  });

  it("conceals the verdict, full table and unstated premise until grading", () => {
    const { rerender } = render(
      <PhilosophyDiagram spec={spec(["Affirming", affirming], ["Mira", mira])} />,
    );
    expect(screen.queryByText("Verdict")).toBeNull();
    rerender(
      <PhilosophyDiagram spec={spec(["Affirming", affirming], ["Mira", mira])} showResults />,
    );
    expect(screen.getByText("Invalid", { exact: true })).toBeVisible();
    const table = screen.getByRole("table", { name: "Complete truth table" });
    expect(within(table).getAllByRole("row")).toHaveLength(5);
    expect(table.querySelectorAll("[data-counterexample=true]")).toHaveLength(1);
  });

  it("keeps the map of a passage closed until the learner has answered", async () => {
    const { rerender } = render(
      <PhilosophyDiagram spec={spec(["Mira", mira], ["Ponens", ponens])} />,
    );
    expect(screen.getByRole("button", { name: "Map" })).toBeDisabled();
    expect(screen.queryByText("Every solicitor has a law degree.")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Highlight indicator words" }));
    expect(screen.getByText("so", { selector: "mark" })).toHaveClass("phil-indicator-conclusion");
    rerender(<PhilosophyDiagram spec={spec(["Mira", mira], ["Ponens", ponens])} showResults />);
    expect(screen.getByText("Every solicitor has a law degree.")).toBeVisible();
  });

  it("runs a machine table from its inputs and resets", async () => {
    render(
      <PhilosophyDiagram
        spec={spec(["Silicon", drinks], ["Gears", { ...drinks, realiser: "mechanism" }])}
      />,
    );
    for (const coin of ["10p", "10p", "10p"])
      await userEvent.click(screen.getByRole("button", { name: "Input " + coin }));
    const outputs = screen.getByRole("list", { name: "Outputs so far" });
    expect(
      within(outputs)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["10pnothing", "10pcan", "10pnothing"]);
    expect(screen.getByText(/Now in S1/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(
      within(screen.getByRole("list", { name: "Outputs so far" })).queryAllByRole("listitem"),
    ).toHaveLength(0);
  });

  it("draws one dot per person and opens filtering only after grading", () => {
    const { container, rerender } = render(
      <PhilosophyDiagram
        spec={spec(["Common", screening], ["Rare", { ...screening, prior: 0.01 }])}
      />,
    );
    expect(container.querySelectorAll(".phil-dot")).toHaveLength(1000);
    expect(container.querySelectorAll("circle.phil-dot-he")).toHaveLength(90);
    expect(container.querySelectorAll("circle.phil-dot-e")).toHaveLength(90);
    expect(screen.getByRole("button", { name: "Keep only them" })).toBeDisabled();
    expect(screen.queryByText("Posterior")).toBeNull();
    rerender(
      <PhilosophyDiagram
        spec={spec(["Common", screening], ["Rare", { ...screening, prior: 0.01 }])}
        showResults
      />,
    );
    expect(screen.getByRole("button", { name: "Keep only them" })).toBeEnabled();
    expect(screen.getByText("50%")).toBeVisible();
  });

  it("finishes a trolley run immediately under reduced motion", async () => {
    experience.reduced = true;
    render(
      <PhilosophyDiagram
        spec={spec(
          ["Footbridge", { kind: "trolley", variant: "footbridge", ahead: 5, other: 1 }],
          ["Switch", { kind: "trolley", variant: "switch", ahead: 5, other: 1 }],
        )}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Push" }));
    await userEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.getByText("1 struck on this run.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Duty lens" }));
    expect(screen.getByText(/Used as a means/)).toBeInTheDocument();
  });

  it("renders course-check drawings with givens and no controls or results", () => {
    render(<PhilosophyGivenVisual model={screening} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("50%")).toBeNull();
    expect(screen.getByText("Population 1,000")).toBeVisible();
    render(<PhilosophyGivenVisual model={mira} />);
    expect(screen.queryByText("Every solicitor has a law degree.")).toBeNull();
  });
});
