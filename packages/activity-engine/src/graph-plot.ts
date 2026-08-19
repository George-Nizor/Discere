import type { GraphPlotActivity } from "@discere/contracts";

export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphPlotOutcome {
  correct: boolean;
  explanation: string;
}

/** Rounds to the axis grid, so a placed point sits on a gridline rather than between two. */
export function snapToGrid(value: number, min: number, max: number, step: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  const snapped = min + Math.round((clamped - min) / step) * step;
  // Re-derive from the step to avoid the drift that repeated addition of a decimal step causes.
  return Number(Math.max(min, Math.min(max, snapped)).toFixed(6));
}

/**
 * Marks a point against the authored answer. The tolerance is per axis and in axis units, so an
 * activity can be strict about the value being read and forgiving about where it was clicked.
 */
export function evaluateGraphPlot(
  activity: GraphPlotActivity,
  point: GraphPoint,
): GraphPlotOutcome {
  const correct =
    Math.abs(point.x - activity.answer.x) <= activity.tolerance.x + 1e-9 &&
    Math.abs(point.y - activity.answer.y) <= activity.tolerance.y + 1e-9;
  return {
    correct,
    explanation: correct ? activity.feedback.correct : activity.feedback.incorrect,
  };
}

/** Converts a click inside the plot area into axis units. */
export function pointFromFraction(
  activity: GraphPlotActivity,
  fractionX: number,
  fractionY: number,
): GraphPoint {
  const x = activity.x.min + (activity.x.max - activity.x.min) * Math.max(0, Math.min(1, fractionX));
  // The vertical fraction is measured from the top of the box, and axes count upwards.
  const y =
    activity.y.min + (activity.y.max - activity.y.min) * (1 - Math.max(0, Math.min(1, fractionY)));
  return {
    x: snapToGrid(x, activity.x.min, activity.x.max, activity.x.step),
    y: snapToGrid(y, activity.y.min, activity.y.max, activity.y.step),
  };
}

export function graphPlotIssues(activity: GraphPlotActivity): string[] {
  const issues: string[] = [];
  if (activity.x.min >= activity.x.max) issues.push("The x axis must run from low to high.");
  if (activity.y.min >= activity.y.max) issues.push("The y axis must run from low to high.");
  const inside =
    activity.answer.x >= activity.x.min &&
    activity.answer.x <= activity.x.max &&
    activity.answer.y >= activity.y.min &&
    activity.answer.y <= activity.y.max;
  if (!inside) issues.push("The answer sits outside the axes the learner can reach.");
  if (activity.mode === "read" && activity.series.length < 2) {
    issues.push("A reading task needs a line on the axes to read from.");
  }
  return issues;
}
