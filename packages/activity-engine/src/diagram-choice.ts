import type { DiagramChoiceActivity, DiagramTarget } from "@discere/contracts";

export interface DiagramChoiceOutcome {
  correct: boolean;
  /** The target the learner picked, so feedback can name it back to them. */
  chosen: DiagramTarget | undefined;
  explanation: string;
}

/**
 * Marks a tap on a diagram. The correct target is named by the activity rather than inferred
 * from position, so moving a label on the figure never silently changes the answer.
 */
export function evaluateDiagramChoice(
  activity: DiagramChoiceActivity,
  targetId: string,
): DiagramChoiceOutcome {
  const chosen = activity.targets.find((target) => target.id === targetId);
  const correct = targetId === activity.correctTargetId;
  return {
    correct,
    chosen,
    explanation: correct ? activity.feedback.correct : activity.feedback.incorrect,
  };
}

/** Structural faults an author can make that the schema cannot catch. */
export function diagramChoiceIssues(activity: DiagramChoiceActivity): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const target of activity.targets) {
    if (seen.has(target.id)) issues.push(`Target '${target.id}' is listed more than once.`);
    seen.add(target.id);
  }
  if (!seen.has(activity.correctTargetId)) {
    issues.push(`The correct target '${activity.correctTargetId}' is not one of the targets.`);
  }
  if (!activity.circuit && !activity.imageFile) {
    issues.push("A diagram choice needs a circuit or an image to place its targets on.");
  }
  return issues;
}
