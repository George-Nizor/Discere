import type {
  JourneyProgress,
  JourneyStageType,
  LearnerStage,
  LessonJourney,
  StageState,
} from "@discere/contracts";

export interface StageView {
  stage: LearnerStage;
  state: StageState;
  /** Zero-based position in `stageOrder`. */
  index: number;
}

const STAGE_LABELS: Record<JourneyStageType, string> = {
  explainer: "Explainer",
  interactive_visual: "Diagram / visual",
  quiz: "Check understanding",
  essay: "Essay / write & submit",
  review: "Flash cards / spaced review",
  completion: "Lesson complete",
};

export function stageTypeLabel(type: JourneyStageType): string {
  return STAGE_LABELS[type];
}

const STATE_LABELS: Record<StageState, string> = {
  available: "Available",
  active: "In progress",
  completed: "Completed",
  skipped_optional: "Skipped",
  locked: "Locked",
};

export function stageStateLabel(state: StageState): string {
  return STATE_LABELS[state];
}

/**
 * Pairs each stage in `stageOrder` with its saved state. A stage the server has never seen is
 * reported as locked, so the interface never invents progress the server does not hold.
 */
export function buildStageViews(
  journey: LessonJourney,
  progress: JourneyProgress | undefined,
): StageView[] {
  const byId = new Map(journey.stages.map((stage) => [stage.id, stage]));
  const stateById = new Map((progress?.stages ?? []).map((entry) => [entry.stageId, entry.state]));
  const views: StageView[] = [];
  journey.stageOrder.forEach((stageId, index) => {
    const stage = byId.get(stageId);
    if (!stage) return;
    views.push({ stage, state: stateById.get(stageId) ?? "locked", index });
  });
  return views;
}

export function isStageComplete(state: StageState): boolean {
  return state === "completed" || state === "skipped_optional";
}

/** A locked stage is still readable by direct link; it is only kept out of the navigator. */
export function isStageInNavigator(state: StageState): boolean {
  return state !== "locked";
}

export function findStageView(views: StageView[], stageId: string | undefined): StageView | null {
  if (!stageId) return null;
  return views.find((view) => view.stage.id === stageId) ?? null;
}

/**
 * Chooses the stage a URL should settle on: the requested stage when the journey contains it,
 * otherwise the stage the server considers active, otherwise the first stage.
 */
export function resolveStageId(
  journey: LessonJourney,
  progress: JourneyProgress | undefined,
  requestedStageId: string | undefined,
): string {
  if (requestedStageId && journey.stageOrder.includes(requestedStageId)) return requestedStageId;
  const active = progress?.activeStageId;
  if (active && journey.stageOrder.includes(active)) return active;
  return journey.stageOrder[0] ?? "";
}

export function previousStageView(views: StageView[], index: number): StageView | null {
  return views[index - 1] ?? null;
}

export function nextStageView(views: StageView[], index: number): StageView | null {
  return views[index + 1] ?? null;
}

/**
 * Forward movement in the bottom navigator. A stage the learner has finished, or one that only
 * asks to be read, opens the next stage; anything else waits for the stage's own action.
 */
export function canAdvanceFrom(view: StageView | null): boolean {
  if (!view) return false;
  if (isStageComplete(view.state)) return true;
  return view.stage.completionPolicy === "view";
}

export function completedCount(views: StageView[]): number {
  return views.filter((view) => isStageComplete(view.state)).length;
}

/** The first quiz in the journey, used by the explainer's "try the question first" action. */
export function firstStageOfType(views: StageView[], type: JourneyStageType): StageView | null {
  return views.find((view) => view.stage.type === type) ?? null;
}
