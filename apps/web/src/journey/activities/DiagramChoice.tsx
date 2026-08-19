import type { DiagramChoiceActivity } from "@discere/contracts";
import { evaluateDiagramChoice } from "@discere/activity-engine";
import { useState } from "react";
import { Notice } from "../../ui/Feedback.js";
import { CircuitVisual } from "./CircuitVisual.js";

/**
 * Point at the thing you mean. Answering by tapping a figure tests whether the learner can
 * find the component, which naming it from a list of words does not.
 *
 * Each target is a real button positioned over the figure, so the whole activity is operable
 * from the keyboard and every target announces itself. The circles are only visible on hover
 * and focus, because a figure covered in rings tells the learner where to look.
 */
export function DiagramChoice({
  activity,
  courseId,
  onAnswered,
}: {
  activity: DiagramChoiceActivity;
  courseId: string;
  onAnswered?: (correct: boolean) => void;
}) {
  const [chosenId, setChosenId] = useState<string | null>(null);
  const outcome = chosenId ? evaluateDiagramChoice(activity, chosenId) : null;

  function choose(targetId: string): void {
    if (outcome?.correct) return;
    setChosenId(targetId);
    onAnswered?.(evaluateDiagramChoice(activity, targetId).correct);
  }

  return (
    <div className="diagram-choice">
      <p className="diagram-choice-prompt">{activity.prompt}</p>
      <div className="diagram-choice-figure">
        {activity.circuit ? <CircuitVisual spec={activity.circuit} /> : null}
        {activity.imageFile ? (
          <img
            alt={activity.imageAlt}
            src={`/api/content/${encodeURIComponent(courseId)}/assets/${encodeURIComponent(activity.imageFile)}`}
          />
        ) : null}
        {activity.targets.map((target) => {
          const picked = chosenId === target.id;
          const state = picked ? (outcome?.correct ? " is-correct" : " is-wrong") : "";
          return (
            <button
              aria-label={target.label}
              aria-pressed={picked}
              className={`diagram-target${state}`}
              key={target.id}
              onClick={() => choose(target.id)}
              style={{
                left: `${target.x}%`,
                top: `${target.y}%`,
                width: `${target.r * 2}%`,
                aspectRatio: "1",
              }}
              type="button"
            >
              <span className="diagram-target-label">{target.label}</span>
            </button>
          );
        })}
      </div>
      {outcome ? (
        <Notice
          live
          tone={outcome.correct ? "correct" : "info"}
          title={outcome.correct ? "Correct" : "Not that one"}
        >
          <p>{outcome.explanation}</p>
        </Notice>
      ) : null}
    </div>
  );
}
