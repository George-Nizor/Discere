import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { explainerStage } from "../../test/fixtures.js";
import { renderWithProviders } from "../../test/harness.js";
import { ExplainerStageView } from "./ExplainerStageView.js";

describe("explainer stage", () => {
  it("shows one dominant task: a title, the prose, the takeaway and one primary action", () => {
    renderWithProviders(
      <ExplainerStageView onContinue={() => {}} onTryQuestion={null} stage={explainerStage} />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Build the idea" })).toBeInTheDocument();
    expect(screen.getByText("Trace the wire around the loop.")).toBeInTheDocument();
    expect(screen.getByText("Voltage pushes, resistance limits.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try a question first/ })).not.toBeInTheDocument();
  });

  it("renders the visual the stage names, with its own text alternative", () => {
    renderWithProviders(
      <ExplainerStageView onContinue={() => {}} onTryQuestion={null} stage={explainerStage} />,
    );
    const image = screen.getByRole("img", { name: explainerStage.visual.alt });
    expect(image).toHaveAttribute("src", "/api/visuals/circuit.svg");
  });

  it("describes a visual kind with no deterministic renderer instead of breaking", () => {
    renderWithProviders(
      <ExplainerStageView
        onContinue={() => {}}
        onTryQuestion={null}
        stage={{
          ...explainerStage,
          visual: { kind: "timeline", alt: "Milestones from 509 BCE to 117 CE." },
        }}
      />,
    );
    expect(screen.getByText("Described in words")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("jumps to the linked question when the learner asks for it", async () => {
    const tryQuestion = vi.fn();
    const cont = vi.fn();
    renderWithProviders(
      <ExplainerStageView onContinue={cont} onTryQuestion={tryQuestion} stage={explainerStage} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Try a question first/ }));
    expect(tryQuestion).toHaveBeenCalledOnce();
    expect(cont).not.toHaveBeenCalled();
  });
});
