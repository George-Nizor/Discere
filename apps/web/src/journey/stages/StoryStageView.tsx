import type { ExplainerStage, LearnerStep } from "@discere/contracts";
import { ArrowRight, Lightbulb, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Notice } from "../../ui/Feedback.js";
import { ReadAloudButton } from "../../ui/ReadAloud.js";
import { blocksToText, RichBlocks } from "../../ui/RichBlocks.js";
import { useTutoringMode } from "../mode-context.js";
import { AnswerInput } from "../quiz/AnswerInput.js";
import { AttemptResult, HintLadder } from "../quiz-shared/AttemptFeedback.js";
import { useAttempt } from "../quiz-shared/use-attempt.js";
import { canAdvanceStep, resumeStepIndex, stepViewsFor } from "../stage-machine.js";
import { resolveStageVisual } from "../visual-source.js";

/** Not every environment implements it, and a missing scroll must never break the lesson. */
function bringIntoView(element: HTMLElement | null): void {
  if (typeof element?.scrollIntoView !== "function") return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
}

const STEP_KIND_LABELS: Record<LearnerStep["kind"], string> = {
  hook: "Think first",
  explain: "Idea",
  worked_example: "Worked example",
  check: "Your turn",
  interact: "Try it",
  transfer: "Apply it",
  teach_back: "In your own words",
};

/**
 * An inline check. It is the quiz stage's machinery in a smaller frame: the same attempt, the
 * same hint ladder, the same evidence. What differs is that answering it moves the lesson on
 * rather than ending a stage.
 */
function CheckStep({ step, onSolved }: { step: LearnerStep; onSolved: () => void }) {
  const { mode } = useTutoringMode();
  const question = step.question;
  // Hooks must run unconditionally, so an absent question is handled after the hook call.
  const attempt = useAttempt(
    question ?? { id: "", conceptIds: [], prompt: "", responseType: "short_text", difficulty: 1, hints: [], sourceIds: [] },
  );
  const announced = useRef(false);

  useEffect(() => {
    if (attempt.solved && !announced.current) {
      announced.current = true;
      onSolved();
    }
  }, [attempt.solved, onSolved]);

  if (!question) return null;

  return (
    <div className="step-check">
      <AnswerInput
        answered={attempt.result !== null}
        correct={attempt.solved}
        draft={attempt.draft}
        onChange={attempt.setDraft}
        question={question}
      />
      <div className="button-row">
        {attempt.response && !attempt.solved ? (
          <button
            aria-busy={attempt.busy}
            className="button button-primary"
            onClick={() => void attempt.send()}
            type="button"
          >
            {attempt.busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
            {attempt.result === null ? "Check answer" : "Check again"}
          </button>
        ) : null}
        {mode !== "exam" && attempt.attemptId && !attempt.solved && attempt.hintsLeft > 0 ? (
          <button
            className="button button-quiet"
            onClick={() => void attempt.askForHint()}
            type="button"
          >
            <Lightbulb aria-hidden="true" size={16} strokeWidth={1.8} />
            Ask for a hint
          </button>
        ) : null}
      </div>
      <HintLadder hints={attempt.hints} />
      <AttemptResult result={attempt.result} />
      {attempt.failure ? (
        <Notice live tone="error" title="Something went wrong">
          <p>{attempt.failure}</p>
        </Notice>
      ) : null}
    </div>
  );
}

/**
 * A lesson played as beats rather than read as an essay. Steps the learner has passed stay on
 * screen above the active one, dimmed and compressed: the thread of the argument remains
 * visible without competing with the thing to do now, which is the one dominant task.
 */
export function StoryStageView({
  stage,
  savedInteractionState,
  onStepChange,
  onComplete,
}: {
  stage: ExplainerStage;
  savedInteractionState: Record<string, unknown> | undefined;
  /** Called on every advance so the position survives a refresh. */
  onStepChange: (stepIndex: number) => void;
  onComplete: () => void;
}) {
  const steps = stage.steps;
  const [activeIndex, setActiveIndex] = useState(() =>
    resumeStepIndex(steps.length, savedInteractionState),
  );
  const [solvedSteps, setSolvedSteps] = useState<ReadonlySet<number>>(new Set());
  const activeRef = useRef<HTMLLIElement>(null);
  const visual = resolveStageVisual(stage.visual);
  const views = stepViewsFor(steps, activeIndex);
  const active = steps[activeIndex];
  const isLast = activeIndex >= steps.length - 1;
  const ready = canAdvanceStep(active, {
    solved: solvedSteps.has(activeIndex),
    revealed: false,
  });

  // A newly revealed step is brought into view, but never on first paint: a resumed lesson
  // should open where the learner left off without the page jumping under them.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    bringIntoView(activeRef.current);
  }, []);

  function advance(): void {
    if (isLast) {
      onComplete();
      return;
    }
    const next = activeIndex + 1;
    setActiveIndex(next);
    onStepChange(next);
    window.requestAnimationFrame(() => bringIntoView(activeRef.current));
  }

  return (
    <div className={visual ? "story story-split" : "story"}>
      <div className="story-flow">
        <h1 className="story-title">{stage.title}</h1>
        <p className="story-progress" aria-live="polite">
          Step {activeIndex + 1} of {steps.length}
        </p>
        <ol className="story-steps">
          {views.map(({ step, index, active: isActive }) => (
            <li
              className={isActive ? "story-step is-active" : "story-step is-past"}
              key={step.id}
              {...(isActive ? { ref: activeRef } : {})}
            >
              <p className="story-step-kind">{STEP_KIND_LABELS[step.kind]}</p>
              <div className="story-step-body">
                <RichBlocks blocks={step.blocks} />
              </div>
              {isActive && step.question ? (
                <CheckStep
                  onSolved={() => setSolvedSteps((current) => new Set(current).add(index))}
                  step={step}
                />
              ) : null}
              {isActive ? (
                <div className="button-row story-actions">
                  {ready ? (
                    <button className="button button-primary" onClick={advance} type="button">
                      {isLast ? "Finish" : "Continue"}
                      <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
                    </button>
                  ) : null}
                  <ReadAloudButton text={blocksToText(step.blocks)} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {visual ? (
        <figure className="story-visual">
          {visual.kind === "image" ? (
            <img alt={visual.alt} src={visual.src} />
          ) : (
            <div className="visual-described">
              <p className="eyebrow">Described in words</p>
              <p>{visual.alt}</p>
              <p className="muted">{visual.reason}</p>
            </div>
          )}
          <figcaption>
            {visual.kind === "image" && visual.image ? visual.image.caption : stage.visual.alt}
            {/* A retrieved picture carries the attribution its licence requires, beside it. */}
            {visual.kind === "image" && visual.image ? (
              <span className="visual-credit">
                {visual.image.attribution},{" "}
                {visual.image.licenceUrl ? (
                  <a href={visual.image.licenceUrl} rel="noreferrer" target="_blank">
                    {visual.image.licence}
                  </a>
                ) : (
                  visual.image.licence
                )}
                {" · "}
                <a href={visual.image.landingPageUrl} rel="noreferrer" target="_blank">
                  Source
                </a>
              </span>
            ) : null}
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}
