import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AstronomyDiagram as Spec, AstronomyModel } from "@discere/contracts";
import { AstronomyDiagram, AstronomyDrawing, AstronomyGivenVisual } from "./AstronomyDiagram.js";

const experience = vi.hoisted(() => ({ reduced: false }));
vi.mock("../../study/experience.js", () => ({ useExperience: () => experience }));
afterEach(() => {
  experience.reduced = false;
  vi.unstubAllGlobals();
});

const orbitSpec: Spec = {
  type: "astronomy_explorer",
  initialCaseId: "first",
  cases: [
    {
      id: "first",
      label: "a = 2 AU, e = 0.6",
      model: { kind: "orbit", semiMajorAxis: 2, eccentricity: 0.6, starMass: 1 },
    },
    {
      id: "second",
      label: "a = 4 AU",
      model: { kind: "orbit", semiMajorAxis: 4, eccentricity: 0.1, starMass: 1 },
    },
  ],
};

describe("astronomy explorer", () => {
  it("steps, scrubs, switches cases by keyboard and resets", async () => {
    const { container } = render(<AstronomyDiagram spec={orbitSpec} />);
    const r = () => Number(container.querySelector("[data-r]")!.getAttribute("data-r"));
    expect(r()).toBeCloseTo(0.8, 3);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "50" } });
    expect(r()).toBeCloseTo(3.2, 3);
    await userEvent.click(screen.getByRole("button", { name: "Step" }));
    expect(screen.getByRole("slider")).not.toHaveValue("50");
    screen.getByRole("button", { name: "a = 4 AU" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "a = 4 AU" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("slider")).toHaveValue("0");
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("button", { name: "a = 2 AU, e = 0.6" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("conceals worked results until grading", () => {
    const { rerender } = render(<AstronomyDiagram spec={orbitSpec} />);
    expect(screen.queryByText("Period", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText(/2\.828 yr/)).not.toBeInTheDocument();
    rerender(<AstronomyDiagram spec={orbitSpec} showResults />);
    expect(screen.getByText("Period", { exact: true })).toBeVisible();
    expect(screen.getAllByText(/2\.828 yr/).length).toBeGreaterThan(0);
  });

  it("hides playback under reduced motion and plays to a finite end otherwise", () => {
    experience.reduced = true;
    const { unmount } = render(<AstronomyDiagram spec={orbitSpec} />);
    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
    unmount();
    experience.reduced = false;
    let now = 0;
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    render(<AstronomyDiagram spec={orbitSpec} />);
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    for (let i = 0; i < 40 && callbacks.length; i++) {
      now += 500;
      const cb = callbacks.shift()!;
      act(() => cb(now));
    }
    expect(screen.getByRole("slider")).toHaveValue("100");
    expect(screen.getByRole("button", { name: "Replay" })).toBeVisible();
  });

  it("draws every model kind with an accessible name and no hidden results", () => {
    const models: AstronomyModel[] = [
      { kind: "sky", latitude: 52, declination: 20, hours: 6 },
      { kind: "seasons", latitude: 51.5, date: "june-solstice", tilt: 23.4 },
      { kind: "moon", day: 7 },
      { kind: "eclipse", alignment: "full", moonLatitude: 0.4 },
      { kind: "orbit", semiMajorAxis: 4, eccentricity: 0.2, starMass: 1 },
      { kind: "gravity", massA: 2, massB: 3, separation: 2 },
      { kind: "launch", body: "earth", altitude: 400, speed: 7.67 },
      { kind: "tides", moonDistance: 60.3, sunAligned: true },
      { kind: "light", luminosity: 1, distance: 2, unit: "au" },
      { kind: "parallax", parallax: 0.768 },
      { kind: "blackbody", temperature: 5772 },
      { kind: "doppler", restWavelength: 656.28, velocity: 3000 },
      { kind: "hr", temperature: 3600, radius: 760 },
      { kind: "life", mass: 15 },
      { kind: "expansion", hubbleConstant: 70, distance: 100 },
    ];
    for (const model of models) {
      const { unmount } = render(<AstronomyDrawing model={model} fraction={1} />);
      const svg = screen.getByRole("img");
      expect(svg).toHaveAttribute("data-kind", model.kind);
      expect(svg).toHaveAccessibleName();
      expect(svg.querySelector(".astro-value")).toBeNull();
      unmount();
    }
    const { container } = render(
      <AstronomyDrawing model={{ kind: "life", mass: 15 }} fraction={1} reveal />,
    );
    expect(container.textContent).toContain("neutron star");
  });

  it("keeps a course-check visual to its givens", () => {
    render(
      <AstronomyGivenVisual model={{ kind: "expansion", hubbleConstant: 70, distance: 100 }} />,
    );
    expect(screen.getByText(/Hubble constant 70 km\/s per Mpc/, { selector: "p" })).toBeVisible();
    expect(screen.queryByText(/7,000/)).not.toBeInTheDocument();
  });

  it("lights the Moon's disc in proportion to the phase angle", () => {
    const { container, rerender } = render(<AstronomyDrawing model={{ kind: "moon", day: 0 }} />);
    const angle = () =>
      Number(container.querySelector("[data-elongation]")!.getAttribute("data-elongation"));
    expect(angle()).toBeCloseTo(0, 6);
    rerender(<AstronomyDrawing model={{ kind: "moon", day: 7 }} />);
    expect(angle()).toBeCloseTo((360 * 7) / 29.530589, 2);
  });
});
