import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { seriesActivity, visualStage } from "../../test/fixtures.js";
import { renderWithProviders } from "../../test/harness.js";
import { InteractiveVisualStageView } from "./InteractiveVisualStageView.js";

describe("interactive visual stage", () => {
  it("renders the controls the Ohm's law activity declares", () => {
    renderWithProviders(<InteractiveVisualStageView onContinue={() => {}} stage={visualStage} />);
    const voltage = screen.getByRole("slider", { name: /Voltage/ });
    expect(voltage).toHaveAttribute("min", "1");
    expect(voltage).toHaveAttribute("max", "12");
    expect(screen.getByRole("slider", { name: /Resistance/ })).toBeInTheDocument();
    expect(screen.getAllByText("Predict first")).toHaveLength(2);
  });

  it("renders one slider per resistor for a series circuit", () => {
    renderWithProviders(
      <InteractiveVisualStageView
        onContinue={() => {}}
        stage={{
          ...visualStage,
          activity: seriesActivity,
          prompt: seriesActivity.predictionPrompt,
        }}
      />,
    );
    expect(screen.getByRole("slider", { name: /R1/ })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /R2/ })).toBeInTheDocument();
  });

  it("keeps the current hidden until a prediction has been checked", async () => {
    const onContinue = vi.fn();
    renderWithProviders(<InteractiveVisualStageView onContinue={onContinue} stage={visualStage} />);
    expect(screen.queryByRole("button", { name: "Check prediction" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Decreases" }));
    await userEvent.click(screen.getByRole("button", { name: "Check prediction" }));
    expect(screen.queryByText("Predict first")).not.toBeInTheDocument();
    expect(screen.getAllByText("50 mA")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: /Continue/ }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("offers a table alternative to the diagram", () => {
    renderWithProviders(<InteractiveVisualStageView onContinue={() => {}} stage={visualStage} />);
    expect(screen.getByRole("rowheader", { name: "Voltage" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Resistance" })).toBeInTheDocument();
  });

  it("states plainly when an activity type has no control", () => {
    renderWithProviders(
      <InteractiveVisualStageView
        onContinue={() => {}}
        stage={{
          ...visualStage,
          // A type from a later content release, reaching a client that predates it.
          activity: { ...seriesActivity, type: "timeline_scrubber" } as never,
        }}
      />,
    );
    expect(screen.getByText("This activity is not available")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });
});
