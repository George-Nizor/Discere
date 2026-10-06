import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EngineeringDiagram as Spec, EngineeringModel } from "@discere/contracts";
import {
  EngineeringDiagram,
  EngineeringDrawing,
  EngineeringGivenVisual,
} from "./EngineeringDiagram.js";

const experience = vi.hoisted(() => ({ reduced: false }));
vi.mock("../../study/experience.js", () => ({ useExperience: () => experience }));
afterEach(() => {
  experience.reduced = false;
  vi.unstubAllGlobals();
});

const beam = (
  position: number,
  display: "reactions" | "shear" | "moment" = "reactions",
): EngineeringModel => ({
  kind: "beam",
  support: "simple",
  length: 6,
  supports: [0, 6],
  pointLoads: [{ position, magnitude: 12 }],
  spreadLoads: [],
  display,
});
const spec = (a: EngineeringModel, b: EngineeringModel): Spec => ({
  type: "engineering_explorer",
  initialCaseId: "first",
  cases: [
    { id: "first", label: "First case", model: a },
    { id: "second", label: "Second case", model: b },
  ],
});
const triangle: EngineeringModel = {
  kind: "truss",
  nodes: [
    { id: "A", x: 0, y: 0 },
    { id: "B", x: 4, y: 0 },
    { id: "C", x: 2, y: 1.5 },
  ],
  members: [
    ["A", "C"],
    ["B", "C"],
    ["A", "B"],
  ],
  pin: "A",
  roller: "B",
  loads: [{ node: "C", fx: 0, fy: -12 }],
};
const gearsModel: EngineeringModel = {
  kind: "gears",
  stages: [{ driver: 20, driven: 60 }],
  inputSpeed: 1200,
  inputTorque: 10,
  efficiency: 1,
};

describe("engineering explorer", () => {
  it("switches cases by keyboard, keeps given values readable and resets", async () => {
    render(<EngineeringDiagram spec={spec(beam(2), beam(3))} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(/Point load 12 kN down at x = 2 m/u);
    screen.getByRole("button", { name: "Second case" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Second case" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(/x = 3 m/u);
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("button", { name: "First case" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("slider", { name: "Load applied" })).toHaveValue("100");
  });

  it("conceals reactions and worked results until grading", () => {
    const { rerender } = render(<EngineeringDiagram spec={spec(beam(2), beam(3))} />);
    expect(screen.getByText("R_A ?")).toBeInTheDocument();
    expect(screen.queryByText(/R_A = 8/u)).not.toBeInTheDocument();
    expect(screen.queryByText("Pin reaction")).not.toBeInTheDocument();
    rerender(<EngineeringDiagram spec={spec(beam(2), beam(3))} showResults />);
    expect(screen.getByText("R_A = 8 kN")).toBeInTheDocument();
    expect(screen.getByText("Pin reaction")).toBeVisible();
    expect(screen.getByText("8 kN up")).toBeVisible();
  });

  it("probes shear and moment along the beam only after an answer", () => {
    const s = spec(beam(2, "moment"), beam(2, "shear"));
    const { rerender } = render(<EngineeringDiagram spec={s} />);
    const probe = screen.getByRole("slider", { name: "Section position along the beam" });
    fireEvent.change(probe, { target: { value: "50" } });
    expect(screen.getByText("3 m")).toBeInTheDocument();
    expect(screen.queryByText(/M = 12 kN·m/u)).not.toBeInTheDocument();
    rerender(<EngineeringDiagram spec={s} showResults />);
    // At x = 3 m: V = 8 − 12 = −4 kN and M = 8 × 3 − 12 × 1 = 12 kN·m.
    expect(screen.getByText("At x = 3 m: V = -4 kN, M = 12 kN·m")).toBeVisible();
  });

  it("colours truss members only after grading and isolates a joint by keyboard", async () => {
    const { container, rerender } = render(<EngineeringDiagram spec={spec(triangle, triangle)} />);
    expect(
      container.querySelectorAll(".engr-member-tension, .engr-member-compression"),
    ).toHaveLength(0);
    screen.getByRole("button", { name: "C" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "C" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".engr-joint-focus")).not.toBeNull();
    rerender(<EngineeringDiagram spec={spec(triangle, triangle)} showResults />);
    expect(container.querySelector('[data-member="AB"]')).toHaveClass("engr-member-tension");
    expect(container.querySelector('[data-member="AC"]')).toHaveClass("engr-member-compression");
    expect(screen.getByText("8 kN tension")).toBeVisible();
  });

  it("turns meshing gears at the tooth ratio and hides the output speed", () => {
    const { container } = render(<EngineeringDrawing model={gearsModel} progress={0.5} />);
    const angle = (teeth: number) => {
      const g = container.querySelector('[data-teeth="' + teeth + '"] > g') as SVGGElement;
      return Number(/rotate\((-?[\d.e-]+)deg\)/u.exec(g.style.transform)![1]);
    };
    const { container: start } = render(<EngineeringDrawing model={gearsModel} progress={0} />);
    const angle0 = (teeth: number) => {
      const g = start.querySelector('[data-teeth="' + teeth + '"] > g') as SVGGElement;
      return Number(/rotate\((-?[\d.e-]+)deg\)/u.exec(g.style.transform)![1]);
    };
    const input = angle(20) - angle0(20),
      output = angle(60) - angle0(60);
    expect(output / input).toBeCloseTo(-20 / 60, 9);
    expect(screen.getAllByText("? rpm out")[0]).toBeInTheDocument();
  });

  it("draws check visuals with givens and no controls or results", () => {
    render(<EngineeringGivenVisual model={triangle} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByText(/tension|compression/u)).not.toBeInTheDocument();
    expect(screen.getByText("Pin at A, roller at B")).toBeVisible();
  });

  it("plays a finite test, stops for reduced motion and keeps manual stepping", async () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let next = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.set(++next, callback);
      return next;
    });
    const cancel = vi.fn((id: number) => callbacks.delete(id));
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const s = spec(gearsModel, { ...gearsModel, stages: [{ driver: 20, driven: 40 }] });
    const { rerender } = render(<EngineeringDiagram spec={s} />);
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => callbacks.get(1)!(100));
    act(() => callbacks.get(2)!(1600));
    expect(screen.getByRole("slider", { name: "Running time" })).toHaveValue("25");
    act(() => callbacks.get(3)!(99999));
    expect(screen.getByRole("slider", { name: "Running time" })).toHaveValue("100");
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Replay" }));
    experience.reduced = true;
    rerender(<EngineeringDiagram spec={s} />);
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(cancel).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(
      Number((screen.getByRole("slider", { name: "Running time" }) as HTMLInputElement).value),
    ).toBeGreaterThan(0);
  });
});
