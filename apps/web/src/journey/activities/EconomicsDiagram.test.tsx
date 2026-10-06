import type { EconomicsModel, EconomicsDiagram as Spec } from "@discere/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EconomicsDiagram, EconomicsGivenVisual } from "./EconomicsDiagram.js";

const experience = vi.hoisted(() => ({ reduced: true }));
vi.mock("../../study/experience.js", () => ({ useExperience: () => experience }));
afterEach(() => {
  experience.reduced = true;
});

const coffee = (
  extra: Partial<Extract<EconomicsModel, { kind: "market" }>> = {},
): EconomicsModel => ({
  kind: "market",
  good: "Coffee",
  demand: { intercept: 100, slope: 2 },
  supply: { intercept: -20, slope: 4 },
  view: "tax",
  ...extra,
});
const spec = (...models: EconomicsModel[]): Spec => ({
  type: "economics_explorer",
  initialCaseId: "first",
  cases: models.map((model, i) => ({
    id: ["first", "second", "third"][i]!,
    label: "Case " + (i + 1),
    model,
  })),
});

describe("economics explorer", () => {
  it("switches cases by keyboard and keeps computed results hidden until answered", async () => {
    const s = spec(coffee({ tax: 6 }), coffee({ tax: 12 }));
    const { rerender, container } = render(<EconomicsDiagram spec={s} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Tax on sellers: £6 per unit",
    );
    expect(container.querySelector(".econ-measures")).toBeNull();
    expect(container.textContent).not.toContain("£24");
    screen.getByRole("button", { name: "Case 2" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Case 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain("£12 per unit");
    rerender(<EconomicsDiagram spec={s} showResults />);
    const results = container.querySelector(".econ-measures")!;
    expect(results.textContent).toContain("Buyers pay£28");
    expect(results.textContent).toContain("Deadweight loss£96");
  });

  it("moves a price probe and names a gap without measuring it before the answer", () => {
    const { container, rerender } = render(
      <EconomicsDiagram
        spec={spec(
          coffee({ view: "equilibrium" }),
          coffee({ view: "equilibrium", demandShift: 30 }),
        )}
      />,
    );
    const slider = screen.getByRole("slider", { name: "Try a price" });
    fireEvent.change(slider, { target: { value: "25" } });
    expect(container.querySelector(".econ-probe")!.getAttribute("data-price")).toBe("25");
    const gap = container.querySelector(".econ-probe .econ-gap")!;
    expect(gap.textContent).toBe("Surplus");
    rerender(
      <EconomicsDiagram
        spec={spec(
          coffee({ view: "equilibrium" }),
          coffee({ view: "equilibrium", demandShift: 30 }),
        )}
        showResults
      />,
    );
    expect(container.querySelector(".econ-probe .econ-gap")!.textContent).toBe("Surplus 30");
  });

  it("lets the learner fix a rival's choice and reveals best responses only after answering", async () => {
    const game: EconomicsModel = {
      kind: "game",
      rowPlayer: "Alpha",
      columnPlayer: "Beta",
      rowStrategies: ["High", "Low"],
      columnStrategies: ["High", "Low"],
      payoffs: [
        [
          [10, 10],
          [2, 14],
        ],
        [
          [14, 2],
          [5, 5],
        ],
      ],
    };
    const s = spec(game, {
      ...game,
      payoffs: [
        [
          [6, 6],
          [0, 0],
        ],
        [
          [0, 0],
          [4, 4],
        ],
      ],
    });
    const { container, rerender } = render(<EconomicsDiagram spec={s} />);
    await userEvent.click(screen.getByRole("button", { name: "Beta plays High" }));
    expect(container.querySelectorAll(".econ-cell-lit")).toHaveLength(2);
    expect(container.querySelector(".econ-cell-nash")).toBeNull();
    expect(container.querySelector(".econ-br")).toBeNull();
    rerender(<EconomicsDiagram spec={s} showResults />);
    expect(container.querySelector(".econ-cell-nash")!.getAttribute("data-cell")).toBe("1-1");
    expect(container.querySelectorAll(".econ-br").length).toBeGreaterThan(0);
  });

  it("plays a repeated game one round at a time with totals withheld", async () => {
    const model: EconomicsModel = {
      kind: "repeated",
      cooperate: "High",
      defect: "Low",
      reward: 10,
      temptation: 14,
      sucker: 2,
      punishment: 5,
      strategies: ["tit_for_tat", "always_defect"],
      rounds: 5,
    };
    const { container } = render(
      <EconomicsDiagram
        spec={spec(model, { ...model, strategies: ["tit_for_tat", "tit_for_tat"] })}
      />,
    );
    expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Next round" }));
    await userEvent.click(screen.getByRole("button", { name: "Next round" }));
    expect(container.querySelectorAll(".econ-round-on")).toHaveLength(2);
    expect(container.querySelector("[data-round='2'] .econ-chip-d")).not.toBeNull();
    expect(container.textContent).not.toContain("Totals");
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(container.querySelectorAll(".econ-round-on")).toHaveLength(0);
  });

  it("offers playback only with full motion and draws a static check visual", () => {
    experience.reduced = false;
    render(
      <EconomicsDiagram
        spec={spec(
          {
            kind: "elasticity",
            good: "Tickets",
            demand: { intercept: 200, slope: 15 },
            prices: [11, 9],
          },
          {
            kind: "elasticity",
            good: "Passes",
            demand: { intercept: 125, slope: 5 },
            prices: [6, 4],
          },
        )}
      />,
    );
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    const { container } = render(
      <EconomicsGivenVisual
        model={{ kind: "monopoly", demandIntercept: 100, demandSlope: 1, marginalCost: 20 }}
      />,
    );
    expect(container.textContent).toContain("Demand: P = 100 − Q");
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector(".econ-reveal")).toBeNull();
  });
});
