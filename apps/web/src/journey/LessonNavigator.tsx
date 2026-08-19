import { ArrowLeft, ArrowRight } from "lucide-react";
import { isStageComplete, isStageInNavigator, type StageView } from "./stage-machine.js";

/**
 * The black bottom bar. Movement the learner has not unlocked is shown as plain text rather
 * than a dead button, so every control on screen does something.
 */
export function LessonNavigator({
  views,
  current,
  canAdvance,
  onNavigate,
}: {
  views: StageView[];
  current: StageView;
  canAdvance: boolean;
  onNavigate: (stageId: string) => void;
}) {
  const previous = views[current.index - 1] ?? null;
  const next = views[current.index + 1] ?? null;

  return (
    <nav aria-label="Lesson stages" className="lesson-navigator">
      {previous ? (
        <button
          className="navigator-step navigator-previous"
          onClick={() => onNavigate(previous.stage.id)}
          type="button"
        >
          <span className="navigator-direction">
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
            Previous
          </span>
          <span className="navigator-title">{previous.stage.title}</span>
        </button>
      ) : (
        <p className="navigator-step navigator-static">
          <span className="navigator-direction">Lesson start</span>
          <span className="navigator-title">This is the first stage</span>
        </p>
      )}

      <div className="navigator-track">
        <ol className="navigator-dots">
          {views.map((view) => {
            const isCurrent = view.index === current.index;
            const status = isCurrent
              ? "current"
              : isStageComplete(view.state)
                ? "complete"
                : "upcoming";
            return (
              <li key={view.stage.id}>
                {isStageInNavigator(view.state) || isCurrent ? (
                  <button
                    aria-current={isCurrent ? "step" : undefined}
                    className={`navigator-dot navigator-dot-${status}`}
                    onClick={() => onNavigate(view.stage.id)}
                    type="button"
                  >
                    <span className="sr-only">
                      Stage {view.index + 1}, {view.stage.title}
                    </span>
                  </button>
                ) : (
                  <span className={`navigator-dot navigator-dot-${status}`}>
                    <span className="sr-only">
                      Stage {view.index + 1}, {view.stage.title}, not open yet
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="navigator-current">
          {current.index + 1}. {current.stage.title}
        </p>
      </div>

      {next && canAdvance ? (
        <button
          className="navigator-step navigator-next"
          onClick={() => onNavigate(next.stage.id)}
          type="button"
        >
          <span className="navigator-direction">
            Next
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </span>
          <span className="navigator-title">{next.stage.title}</span>
        </button>
      ) : (
        <p className="navigator-step navigator-static navigator-next">
          <span className="navigator-direction">{next ? "Next" : "Lesson end"}</span>
          <span className="navigator-title">
            {next ? `Finish this stage to open ${next.stage.title}` : "No further stages"}
          </span>
        </p>
      )}
    </nav>
  );
}
