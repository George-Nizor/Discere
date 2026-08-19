import type { LearnerStep } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { explainerStage, journey, progressWith, quizStage, visualStage } from "../test/fixtures.js";
import {
  buildStageViews,
  canAdvanceFrom,
  canAdvanceStep,
  completedCount,
  findStageView,
  isStageInNavigator,
  resolveStageId,
  resumeStepIndex,
  stageTypeLabel,
  stepViewsFor,
  visualStateAt,
} from "./stage-machine.js";

describe("stage machine", () => {
  it("pairs every ordered stage with the state the server reports", () => {
    const views = buildStageViews(
      journey,
      progressWith({ [explainerStage.id]: "completed", [visualStage.id]: "active" }),
    );
    expect(views.map((view) => view.state)).toEqual(["completed", "active", "locked", "locked"]);
    expect(views.map((view) => view.index)).toEqual([0, 1, 2, 3]);
  });

  it("treats a stage the server has never seen as locked", () => {
    const views = buildStageViews(journey, undefined);
    expect(views.every((view) => view.state === "locked")).toBe(true);
  });

  it("keeps a requested stage when the journey contains it", () => {
    const progress = progressWith({ [explainerStage.id]: "active" });
    expect(resolveStageId(journey, progress, quizStage.id)).toBe(quizStage.id);
  });

  it("falls back to the active stage when the address names no stage", () => {
    const progress = progressWith({ [explainerStage.id]: "completed", [visualStage.id]: "active" });
    expect(resolveStageId(journey, progress, undefined)).toBe(visualStage.id);
  });

  it("falls back to the first stage when the requested stage is unknown", () => {
    expect(resolveStageId(journey, undefined, "not-a-stage")).toBe(explainerStage.id);
  });

  it("opens forward movement for a completed stage or a stage that only asks to be read", () => {
    const views = buildStageViews(journey, progressWith({ [explainerStage.id]: "active" }));
    // A stepped lesson is worked through, so an unfinished one holds the navigator rather than
    // letting the learner skip past the teaching.
    expect(canAdvanceFrom(views[0] ?? null)).toBe(false);
    expect(canAdvanceFrom(views[2] ?? null)).toBe(false);
    const done = buildStageViews(journey, progressWith({ [quizStage.id]: "completed" }));
    expect(canAdvanceFrom(done[2] ?? null)).toBe(true);
  });

  it("counts finished stages and finds the first quiz", () => {
    const views = buildStageViews(
      journey,
      progressWith({ [explainerStage.id]: "completed", [visualStage.id]: "skipped_optional" }),
    );
    expect(completedCount(views)).toBe(2);
  });

  it("keeps locked stages out of the navigator and finds a view by id", () => {
    const views = buildStageViews(journey, progressWith({ [explainerStage.id]: "active" }));
    expect(isStageInNavigator("locked")).toBe(false);
    expect(isStageInNavigator("completed")).toBe(true);
    expect(findStageView(views, visualStage.id)?.stage.title).toBe(visualStage.title);
    expect(findStageView(views, undefined)).toBeNull();
  });

  it("names each stage type for the header", () => {
    expect(stageTypeLabel("explainer")).toBe("Explainer");
    expect(stageTypeLabel("interactive_visual")).toBe("Diagram / visual");
    expect(stageTypeLabel("review")).toBe("Flash cards / spaced review");
  });
});

describe("stepped lessons", () => {
  const step = (id: string, kind: LearnerStep["kind"], visualStateId = ""): LearnerStep => ({
    id,
    kind,
    blocks: [{ kind: "paragraph", text: `Body of ${id}` }],
    visualStateId,
  });
  const steps: LearnerStep[] = [
    step("a", "hook", "start"),
    step("b", "explain"),
    step("c", "check"),
    step("d", "explain", "end"),
  ];

  it("resumes where the learner left off and clamps a stale index", () => {
    expect(resumeStepIndex(steps.length, { stepIndex: 2 })).toBe(2);
    expect(resumeStepIndex(steps.length, {})).toBe(0);
    expect(resumeStepIndex(steps.length, undefined)).toBe(0);
    // A lesson edited down to fewer steps must not strand a learner past the end.
    expect(resumeStepIndex(steps.length, { stepIndex: 99 })).toBe(3);
    expect(resumeStepIndex(steps.length, { stepIndex: -4 })).toBe(0);
    expect(resumeStepIndex(steps.length, { stepIndex: "two" })).toBe(0);
  });

  it("shows the steps up to the active one and no further", () => {
    const views = stepViewsFor(steps, 1);
    expect(views.map((view) => view.step.id)).toEqual(["a", "b"]);
    expect(views.at(-1)?.active).toBe(true);
    expect(views[0]?.active).toBe(false);
  });

  it("holds a check step until it has been answered", () => {
    const unanswered = { solved: false, revealed: false };
    expect(canAdvanceStep(steps[2], unanswered)).toBe(false);
    expect(canAdvanceStep(steps[2], { solved: true, revealed: false })).toBe(true);
    expect(canAdvanceStep(steps[2], { solved: false, revealed: true })).toBe(true);
    // Prose asks nothing, so it never blocks.
    expect(canAdvanceStep(steps[1], unanswered)).toBe(true);
    expect(canAdvanceStep(undefined, { solved: true, revealed: true })).toBe(false);
  });

  it("carries the last named visual state forward through steps that name none", () => {
    expect(visualStateAt(steps, 0)).toBe("start");
    expect(visualStateAt(steps, 2)).toBe("start");
    expect(visualStateAt(steps, 3)).toBe("end");
    expect(visualStateAt([], 0)).toBe("");
  });
});
