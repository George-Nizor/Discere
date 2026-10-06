import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PsychologyDiagram as Spec } from "@discere/contracts";
import { PsychologyDiagram, PsychologyGivenVisual } from "./PsychologyDiagram.js";

const experience = vi.hoisted(() => ({ reduced: true }));
vi.mock("../../study/experience.js", () => ({ useExperience: () => experience }));
afterEach(() => {
  experience.reduced = true;
});

const detection: Spec = {
  type: "psychology_explorer",
  initialCaseId: "neutral",
  cases: [
    {
      id: "neutral",
      label: "Neutral observer",
      model: { kind: "detection", separation: 1.68, criterion: 0.84, signalLabel: "Tumour" },
    },
    {
      id: "liberal",
      label: "Liberal observer",
      model: { kind: "detection", separation: 1.68, criterion: 0, signalLabel: "Tumour" },
    },
  ],
};

const forgetting: Spec = {
  type: "psychology_explorer",
  initialCaseId: "a",
  cases: [
    {
      id: "a",
      label: "Reviewed",
      model: { kind: "forgetting", stability: 2, reviews: [4], growth: 3, horizon: 30 },
    },
    {
      id: "b",
      label: "Not reviewed",
      model: { kind: "forgetting", stability: 2, reviews: [], growth: 1, horizon: 30 },
    },
  ],
};

describe("psychology explorer", () => {
  it("hides computed rates until results are shown, and moves the criterion by keyboard", async () => {
    const { container, rerender } = render(<PsychologyDiagram spec={detection} />);
    expect(container.querySelector(".psych-measures")).toBeNull();
    expect(container.textContent).not.toMatch(/d′ 1\.68|H \d/);
    const slider = screen.getByRole("slider", { name: "Criterion position" });
    expect(slider).toHaveValue("0.84");
    fireEvent.change(slider, { target: { value: "0.2" } });
    expect(slider).toHaveValue("0.2");
    screen.getByRole("button", { name: "Liberal observer" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Liberal observer" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(slider).toHaveValue("0");
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("button", { name: "Neutral observer" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    rerender(<PsychologyDiagram spec={detection} showResults />);
    expect(container.querySelector(".psych-measures")!.textContent).toContain("1.68");
  });

  it("names the drawing with its givens and never states an answer in them", () => {
    render(<PsychologyDiagram spec={detection} />);
    const img = screen.getByRole("img");
    expect(img.getAttribute("aria-label")).toMatch(/Signal detection/);
    expect(img.getAttribute("aria-label")).not.toMatch(/hit rate|80%/i);
  });

  it("offers no autoplay under reduced motion but keeps manual stepping", async () => {
    render(<PsychologyDiagram spec={forgetting} />);
    expect(screen.queryByRole("button", { name: /Play|Replay/ })).toBeNull();
    const day = screen.getByRole("slider", { name: "Day" });
    expect(day).toHaveValue("100");
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(day).toHaveValue("0");
    await userEvent.click(screen.getByRole("button", { name: "Next stretch" }));
    expect(day).toHaveValue("10");
  });

  it("offers playback when motion is allowed", () => {
    experience.reduced = false;
    render(<PsychologyDiagram spec={forgetting} />);
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
  });

  it("redraws a random assignment and keeps both groups complete", async () => {
    const spec: Spec = {
      type: "psychology_explorer",
      initialCaseId: "r",
      cases: [
        {
          id: "r",
          label: "Random",
          model: {
            kind: "assignment",
            traitLabel: "Fitness",
            traits: [5, 9, 4, 7, 6, 3, 8, 6],
            method: "random",
            seed: 3,
          },
        },
        {
          id: "s",
          label: "Chosen",
          model: {
            kind: "assignment",
            traitLabel: "Fitness",
            traits: [5, 9, 4, 7, 6, 3, 8, 6],
            method: "self_selected",
            seed: 3,
          },
        },
      ],
    };
    const { container } = render(<PsychologyDiagram spec={spec} />);
    expect(container.querySelectorAll(".psych-participant")).toHaveLength(8);
    await userEvent.click(screen.getByRole("button", { name: "Draw again" }));
    expect(container.querySelectorAll(".psych-participant")).toHaveLength(8);
    await userEvent.click(screen.getByRole("button", { name: "Chosen" }));
    expect(screen.queryByRole("button", { name: "Draw again" })).toBeNull();
  });

  it("draws a check visual from the stated values only", () => {
    const { container } = render(
      <PsychologyGivenVisual
        model={{
          kind: "base_rate",
          population: 1000,
          baseRate: 0.01,
          hitRate: 0.9,
          falseAlarmRate: 0.1,
          conditionLabel: "The disease",
          testLabel: "Screening test",
        }}
      />,
    );
    expect(container.querySelectorAll(".psych-cell")).toHaveLength(1000);
    expect(container.querySelectorAll(".psych-cell.psych-cell-tp")).toHaveLength(9);
    expect(container.querySelectorAll(".psych-cell.psych-cell-fp")).toHaveLength(99);
    expect(container.textContent).not.toMatch(/8\.3%|flags are right/);
    expect(screen.getByText(/1000 people; 1% have the disease/)).toBeInTheDocument();
  });
  it("counts trials, not milliseconds, until the total time has been answered", () => {
    const switching: Spec = {
      type: "psychology_explorer",
      initialCaseId: "mixed",
      cases: [
        {
          id: "mixed",
          label: "Alternating",
          model: {
            kind: "switching",
            sequence: "ABAB",
            labelA: "Odd or even",
            labelB: "Vowel or consonant",
            baseMs: 600,
            switchCostMs: 200,
          },
        },
        {
          id: "blocked",
          label: "Blocked",
          model: {
            kind: "switching",
            sequence: "AABB",
            labelA: "Odd or even",
            labelB: "Vowel or consonant",
            baseMs: 600,
            switchCostMs: 200,
          },
        },
      ],
    };
    const view = render(<PsychologyDiagram spec={switching} />);
    expect(screen.getByText("4 of 4")).toBeInTheDocument();
    expect(screen.queryByText(/3000 ms/)).not.toBeInTheDocument();
    view.rerender(<PsychologyDiagram spec={switching} showResults />);
    expect(screen.getAllByText(/3000 ms/).length).toBeGreaterThan(0);
  });
});
