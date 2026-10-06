import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MechanicsDiagram as Spec } from "@discere/contracts";
import { MechanicsDiagram, MechanicsDrawing, MechanicsGivenVisual } from "./MechanicsDiagram.js";
const experience = vi.hoisted(() => ({ reduced: false }));
vi.mock("../../study/experience.js", () => ({ useExperience: () => experience }));
afterEach(() => {
  experience.reduced = false;
  vi.unstubAllGlobals();
});
const spec: Spec = {
  type: "mechanics_explorer",
  initialCaseId: "slow",
  cases: [
    {
      id: "slow",
      label: "2 m/s",
      model: {
        kind: "motion",
        x0: 0,
        v0: 2,
        acceleration: 0,
        duration: 4,
        axis: "horizontal",
        display: "track",
      },
    },
    {
      id: "fast",
      label: "4 m/s",
      model: {
        kind: "motion",
        x0: 0,
        v0: 4,
        acceleration: 0,
        duration: 4,
        axis: "horizontal",
        display: "track",
      },
    },
  ],
};
describe("mechanics interactions", () => {
  it("steps, scrubs, switches cases by keyboard and resets the original givens", async () => {
    const { container } = render(<MechanicsDiagram spec={spec} />);
    await userEvent.click(screen.getByRole("button", { name: "Next instant" }));
    expect(Number(container.querySelector("[data-body=A]")!.getAttribute("data-position"))).toBe(1);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "100" } });
    expect(Number(container.querySelector("[data-body=A]")!.getAttribute("data-position"))).toBe(8);
    screen.getByRole("button", { name: "4 m/s" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("slider")).toHaveValue("0");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "100" } });
    expect(Number(container.querySelector("[data-body=A]")!.getAttribute("data-position"))).toBe(
      16,
    );
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("button", { name: "2 m/s" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("slider")).toHaveValue("0");
  });
  it("draws doubled work displacement at twice the distance on a shared scale", () => {
    const short = { kind: "work" as const, force: 10, distance: 4, alignment: "with" as const };
    const long = { ...short, distance: 8 };
    const models = [short, long];
    const { container, rerender } = render(
      <MechanicsDrawing model={short} models={models} fraction={0} />,
    );
    const x = () =>
      Number(
        container
          .querySelector(".mech-cart")!
          .getAttribute("transform")!
          .split("(")[1]!
          .split(" ")[0],
      );
    const origin = x();
    rerender(<MechanicsDrawing model={short} models={models} fraction={1} />);
    const a = x() - origin;
    rerender(<MechanicsDrawing model={long} models={models} fraction={1} />);
    const b = x() - origin;
    expect(b / a).toBeCloseTo(2, 9);
  });
  it("conceals worked quantities until grading", () => {
    const { rerender } = render(<MechanicsDiagram spec={spec} />);
    expect(screen.queryByText("Final position", { exact: true })).not.toBeInTheDocument();
    rerender(<MechanicsDiagram spec={spec} showResults />);
    expect(screen.getByText("Final position", { exact: true })).toBeVisible();
    expect(screen.getByText("8 m", { exact: true })).toBeVisible();
  });
  it("renders independent checks with given values and no playback or worked results", () => {
    render(
      <MechanicsGivenVisual
        model={{ kind: "forces", mass: 4, left: 8, right: 20, v0: 0, duration: 2 }}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByText("3 m/s²", { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText("Mass 4 kg", { exact: true })).toBeVisible();
  });
  it("preserves energy as the learner moves through a descent", () => {
    const energy: Spec = {
      type: "mechanics_explorer",
      initialCaseId: "a",
      cases: [
        {
          id: "a",
          label: "Smooth",
          model: {
            kind: "energy_drop",
            mass: 2,
            gravity: 10,
            height: 5,
            initialSpeed: 0,
            thermalLoss: 0,
          },
        },
        {
          id: "b",
          label: "Rough",
          model: {
            kind: "energy_drop",
            mass: 2,
            gravity: 10,
            height: 5,
            initialSpeed: 0,
            thermalLoss: 20,
          },
        },
      ],
    };
    const { container } = render(<MechanicsDiagram spec={energy} />);
    const heights = () =>
      Array.from(container.querySelectorAll(".mech-energy-bar")).map((r) =>
        Number(r.getAttribute("height")),
      );
    heights().forEach((height, i) => expect(height).toBeCloseTo([0, 195, 0][i]!, 8));
    fireEvent.change(screen.getByRole("slider"), { target: { value: "50" } });
    heights().forEach((height, i) => expect(height).toBeCloseTo([97.5, 97.5, 0][i]!, 8));
    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
  });
  it("stops playback when reduced motion is enabled and keeps manual stepping", async () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let next = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.set(++next, callback);
      return next;
    });
    const cancel = vi.fn((id: number) => callbacks.delete(id));
    vi.stubGlobal("cancelAnimationFrame", cancel);
    const { rerender } = render(<MechanicsDiagram spec={spec} />);
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => callbacks.get(1)!(100));
    act(() => callbacks.get(2)!(600));
    expect(screen.getByRole("slider")).toHaveValue("12.5");
    experience.reduced = true;
    rerender(<MechanicsDiagram spec={spec} />);
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    expect(cancel).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Next instant" }));
    expect(screen.getByRole("slider")).toHaveValue("25");
  });
});
