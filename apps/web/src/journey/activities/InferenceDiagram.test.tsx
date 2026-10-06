import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { InferenceDiagram as Spec, InferenceModel } from "@discere/contracts";
import { InferenceDiagram } from "./InferenceDiagram.js";
import { CheckVisual } from "../../checks/CheckVisual.js";
import { inferenceModels } from "../../../../../packages/contracts/tests/fixtures/inference-models.js";

const spec = (a: InferenceModel, b: InferenceModel = a): Spec => ({
  type: "inference_explorer",
  initialCaseId: "a",
  cases: [
    { id: "a", label: "Original example", model: a },
    { id: "b", label: "Compare example", model: b },
  ],
});

describe("statistics explanation and feedback", () => {
  it.each(inferenceModels.map((model) => [model.kind, model] as const))(
    "keeps %s numerical results gated behind feedback",
    (_, model) => {
      const s = spec(model);
      const { container, rerender } = render(<InferenceDiagram spec={s} />);
      expect(screen.queryByLabelText("Statistics results")).toBeNull();
      expect(screen.queryByRole("slider")).toBeNull();
      expect(container.textContent).not.toContain("NaN");
      expect(container.textContent).not.toContain("Infinity");
      expect(container.querySelector("svg, table, .inference-outcomes")).not.toBeNull();
      rerender(<InferenceDiagram spec={s} showResults />);
      expect(screen.getByLabelText("Statistics results").textContent!.length).toBeGreaterThan(40);
      expect(container.textContent).not.toContain("NaN");
      expect(container.textContent).not.toContain("Infinity");
      for (const element of container.querySelectorAll(
        "svg [d], svg [x], svg [y], svg [width], svg [height]",
      )) {
        expect(element.outerHTML).not.toMatch(/(?:NaN|Infinity)/);
      }
    },
  );
  it("keeps the original question's context while exploring another case", async () => {
    const s = spec(
      { kind: "sample_summary", values: [1, 3, 5] },
      { kind: "sample_summary", values: [1, 3, 50] },
    );
    render(<InferenceDiagram spec={s} />);
    await userEvent.click(screen.getByRole("button", { name: "Compare example" }));
    expect(screen.getByText("Answer for Original example.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Statistics results")).toBeNull();
  });
  it("allows keyboard conditioning without giving away the posterior", async () => {
    const m: InferenceModel = {
      kind: "bayes_table",
      rowLabels: ["A", "B"],
      columnLabels: ["Flag", "Clear"],
      counts: [
        [8, 2],
        [18, 72],
      ],
    };
    const { container, rerender } = render(<InferenceDiagram spec={spec(m)} />);
    const button = screen.getByRole("button", { name: "Only Flag" });
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelectorAll(".is-conditioned")).toHaveLength(3);
    expect(container.textContent).not.toContain("30.76923%");
    rerender(<InferenceDiagram spec={spec(m)} showResults />);
    expect(screen.getByLabelText("Statistics results").textContent).toContain("30.76923%");
  });
  it("compares interval widths on the same axis", async () => {
    const a: InferenceModel = {
      kind: "mean_interval",
      mean: 10,
      sd: 4,
      size: 16,
      knownSigma: true,
      confidence: 0.95,
    };
    const { container } = render(
      <InferenceDiagram spec={spec(a, { ...a, size: 64 })} showResults />,
    );
    const ticks = () =>
      Array.from(container.querySelectorAll(".inference-axis text"), (el) => el.textContent);
    const originalTicks = ticks();
    const originalSpan = container
      .querySelector(".inference-revealed .inference-line")!
      .getAttribute("d");
    await userEvent.click(screen.getByRole("button", { name: "Compare example" }));
    expect(ticks()).toEqual(originalTicks);
    expect(
      container.querySelector(".inference-revealed .inference-line")!.getAttribute("d"),
    ).not.toBe(originalSpan);
    expect(screen.getByLabelText("Statistics results").textContent).toContain("0.5");
  });
  it("replays a finite set of coverage intervals without resampling or changing the x axis", async () => {
    const m: InferenceModel = {
      kind: "interval_coverage",
      mean: 10,
      sd: 3,
      size: 9,
      confidence: 0.8,
      seed: 42,
      intervals: 20,
    };
    const { container } = render(<InferenceDiagram spec={spec(m)} showResults />);
    const before = container.querySelector("svg")!.innerHTML;
    const ticks = Array.from(
      container.querySelectorAll(".inference-axis text"),
      (el) => el.textContent,
    );
    fireEvent.change(screen.getByRole("slider", { name: /Intervals shown/ }), {
      target: { value: "1" },
    });
    expect(
      container.querySelectorAll(".inference-estimate, .inference-revealed, .inference-miss"),
    ).toHaveLength(1);
    expect(
      Array.from(container.querySelectorAll(".inference-axis text"), (el) => el.textContent),
    ).toEqual(ticks);
    fireEvent.change(screen.getByRole("slider", { name: /Intervals shown/ }), {
      target: { value: "20" },
    });
    expect(container.querySelector("svg")!.innerHTML).toBe(before);
    await userEvent.click(screen.getByRole("button", { name: "Compare example" }));
    expect(screen.getByRole("slider")).toHaveValue("20");
  });
  it("steps through ordered samples and resets on a case change", async () => {
    const m: InferenceModel = { kind: "sampling_means", population: [0, 2], sampleSize: 2 };
    const { container } = render(<InferenceDiagram spec={spec(m)} showResults />);
    expect(container.querySelector(".inference-sampling-trace")!.textContent).toContain("0, 0");
    await userEvent.click(screen.getByRole("button", { name: "Next sample" }));
    expect(container.querySelector(".inference-sampling-trace")!.textContent).toContain("0, 2");
    expect(container.querySelector(".inference-sampling-trace")!.textContent).toContain("Mean 1");
    await userEvent.click(screen.getByRole("button", { name: "Compare example" }));
    expect(screen.getByRole("button", { name: "Previous sample" })).toBeDisabled();
    expect(container.querySelector(".inference-sampling-trace")!.textContent).toContain("0, 0");
  });
  it("inspects count probabilities only after feedback and resets when changing examples", async () => {
    const m: InferenceModel = {
      kind: "binomial",
      trials: 4,
      probability: 0.5,
      target: 2,
      tail: "equal",
    };
    const { rerender } = render(<InferenceDiagram spec={spec(m)} />);
    expect(screen.queryByText(/P\(count =/)).toBeNull();
    rerender(<InferenceDiagram spec={spec(m)} showResults />);
    fireEvent.change(screen.getByRole("slider", { name: /Inspect count/ }), {
      target: { value: "2" },
    });
    expect(screen.getByText("P(count = 2) = 37.5%")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Compare example" }));
    expect(screen.getByRole("slider")).toHaveValue("0");
  });
  it.each(inferenceModels.map((model) => [model.kind, model] as const))(
    "shows only %s givens in a course check",
    (_, model) => {
      const { container } = render(<CheckVisual visual={{ type: "inference", model }} />);
      expect(screen.queryByLabelText("Statistics results")).toBeNull();
      expect(screen.queryByRole("slider")).toBeNull();
      expect(container.querySelector("svg, table, .inference-outcomes")).not.toBeNull();
    },
  );
});
