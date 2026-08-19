import type { LearnerStep } from "@discere/contracts";
import { DiagramChoice } from "./DiagramChoice.js";
import { GraphPlot } from "./GraphPlot.js";
import { OrderSequence } from "./OrderSequence.js";

/**
 * The activity an `interact` step hands over to. Only the types designed to sit inside a lesson
 * appear here: the slider explorers are full stages of their own, because they are explored
 * rather than answered, and squeezing one into a step would give it nowhere to breathe.
 *
 * An unknown type renders nothing rather than breaking the lesson, which is what lets a bundle
 * authored against a newer schema still play.
 */
export function ActivityStep({
  activity,
  courseId,
  onAnswered,
}: {
  activity: NonNullable<LearnerStep["activity"]>;
  courseId: string;
  onAnswered: (correct: boolean) => void;
}) {
  switch (activity.type) {
    case "diagram_choice":
      return <DiagramChoice activity={activity} courseId={courseId} onAnswered={onAnswered} />;
    case "order_sequence":
      return <OrderSequence activity={activity} onAnswered={onAnswered} />;
    case "graph_plot":
      return <GraphPlot activity={activity} onAnswered={onAnswered} />;
    default:
      return null;
  }
}

/** Whether a step's activity is one the story player can host. */
export function isStepActivity(activity: LearnerStep["activity"]): boolean {
  return (
    activity?.type === "diagram_choice" ||
    activity?.type === "order_sequence" ||
    activity?.type === "graph_plot"
  );
}
