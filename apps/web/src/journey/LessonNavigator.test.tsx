import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { explainerStage, journey, progressWith, visualStage } from "../test/fixtures.js";
import { renderWithProviders } from "../test/harness.js";
import { LessonNavigator } from "./LessonNavigator.js";
import { buildStageViews } from "./stage-machine.js";

const views = buildStageViews(
  journey,
  progressWith({ [explainerStage.id]: "completed", [visualStage.id]: "active" }),
);

describe("lesson navigator", () => {
  it("never renders a disabled control", async () => {
    renderWithProviders(
      <LessonNavigator
        canAdvance={false}
        current={views[1] as (typeof views)[number]}
        onNavigate={() => {}}
        views={views}
      />,
    );
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toBeDisabled();
    }
    expect(screen.getByText(/Finish this stage to open/)).toBeInTheDocument();
  });

  it("opens the next stage once the current one allows it", async () => {
    const onNavigate = vi.fn();
    renderWithProviders(
      <LessonNavigator
        canAdvance
        current={views[1] as (typeof views)[number]}
        onNavigate={onNavigate}
        views={views}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(onNavigate).toHaveBeenCalledWith(journey.stageOrder[2]);
  });

  it("says the first stage has nothing behind it", () => {
    renderWithProviders(
      <LessonNavigator
        canAdvance
        current={views[0] as (typeof views)[number]}
        onNavigate={() => {}}
        views={views}
      />,
    );
    expect(screen.getByText("This is the first stage")).toBeInTheDocument();
  });

  it("marks the current stage in the progress track", () => {
    renderWithProviders(
      <LessonNavigator
        canAdvance
        current={views[1] as (typeof views)[number]}
        onNavigate={() => {}}
        views={views}
      />,
    );
    expect(screen.getByText("2. Change the circuit")).toBeInTheDocument();
    const currentDot = screen.getByRole("button", { name: /Stage 2, Change the circuit/ });
    expect(currentDot).toHaveAttribute("aria-current", "step");
  });
});
