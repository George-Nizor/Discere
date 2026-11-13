import { LearningDiagramSchema, type TutorWalkthroughStep } from "@discere/contracts";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { LearningDiagram } from "../journey/activities/LearningDiagram.js";
import { InlineRichText } from "../ui/RichText.js";

/**
 * A parallel example the tutor works on the lesson's own figure, one step per screen. The
 * learner moves through it at their own pace, and each step shows the figure as it stands after
 * that move. A figure is checked again here, so a stored conversation from an older version
 * cannot hand the renderer something it does not understand.
 */
export function TutorWalkthrough({ steps }: { steps: readonly TutorWalkthroughStep[] }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  if (!step) return null;
  const figure = step.figure ? LearningDiagramSchema.safeParse(step.figure) : undefined;
  const last = index === steps.length - 1;
  return (
    <div aria-label="Worked example" className="tutor-walkthrough" role="group">
      <p aria-live="polite" className="tutor-walkthrough-step">
        <span className="tutor-walkthrough-count">
          {index + 1} of {steps.length}
        </span>
        <InlineRichText text={step.text} />
      </p>
      {figure?.success ? (
        <div className="tutor-walkthrough-figure">
          <LearningDiagram key={index} showResults spec={figure.data} />
        </div>
      ) : null}
      {steps.length > 1 ? (
        <div className="tutor-walkthrough-nav">
          {index === 0 ? null : (
            <button
              aria-label="Previous step"
              className="icon-button"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.6} />
            </button>
          )}
          {last ? null : (
            <button
              className="button button-secondary"
              onClick={() => setIndex((current) => Math.min(steps.length - 1, current + 1))}
              type="button"
            >
              Next step
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.6} />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
