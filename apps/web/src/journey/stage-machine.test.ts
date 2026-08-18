import { describe, expect, it } from "vitest";
import { explainerStage, journey, progressWith, quizStage, visualStage } from "../test/fixtures.js";
import {
  buildStageViews,
  canAdvanceFrom,
  completedCount,
  findStageView,
  firstStageOfType,
  isStageInNavigator,
  resolveStageId,
  stageTypeLabel,
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
    expect(canAdvanceFrom(views[0] ?? null)).toBe(true);
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
    expect(firstStageOfType(views, "quiz")?.stage.id).toBe(quizStage.id);
    expect(firstStageOfType(views, "completion")).toBeNull();
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
