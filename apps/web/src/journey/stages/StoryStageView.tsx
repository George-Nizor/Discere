import type {
  ExplainerStage,
  LearnerLessonIntro,
  LearnerStep,
  LearnerWorkedStep,
  LessonFeedbackRequest,
  LessonStepKind,
} from "@discere/contracts";
import { ArrowRight, ChevronDown } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { RichBlocks } from "../../ui/RichBlocks.js";
import { InlineRichText } from "../../ui/RichText.js";
import { ActivityStep, isStepActivity } from "../activities/ActivityStep.js";
import { LearningDiagram } from "../activities/LearningDiagram.js";
import { PlayerFooterSlot } from "../player-footer.js";
import type { AttemptPolicy } from "../quiz-shared/use-attempt.js";
import {
  canAdvanceStep,
  LESSON_OPENER_ID,
  resumeScreenIndex,
  screenIdsFor,
  stepViewsFor,
  visualStateAt,
} from "../stage-machine.js";
import { resolveStageVisual } from "../visual-source.js";
import { QuestionBlock } from "./QuestionBlock.js";
import { StoryVisual } from "./StoryVisual.js";

/**
 * Brings the top of a new screen under the header. The canvas is the scroll container, so a
 * step taller than the window opens at its eyebrow, never pre-scrolled past its question
 * (audit M3). The window is reset too, for layouts where the page itself scrolls.
 */
export function scrollStageToTop(): void {
  const canvas = document.getElementById("stage");
  if (canvas && typeof canvas.scrollTo === "function") canvas.scrollTo({ top: 0 });
  if (typeof window.scrollTo === "function") {
    try {
      window.scrollTo({ top: 0 });
    } catch {
      // jsdom does not implement scrolling; nothing to bring into view there.
    }
  }
}

const KIND_LABELS: Partial<Record<LessonStepKind, string>> = {
  explore: "Explore",
  predict: "Predict",
  explain: "New idea",
  worked_example: "Worked example",
  faded_example: "Your turn, with help",
  try: "Try it",
  transfer: "Use it",
};

/** "3 of 7 · Try it" for a v2 step; "Step 2 of 4 · <old heading>" for a legacy one. */
function eyebrowFor(step: LearnerStep, position: number, total: number, v2: boolean): string {
  const label = v2 ? (step.eyebrow ?? KIND_LABELS[step.kind]) : step.eyebrow;
  const count = v2 ? `${position} of ${total}` : `Step ${position} of ${total}`;
  return label ? `${count} · ${label}` : count;
}

/** The attempt policy a step kind asks for (spec §3.4). */
function policyFor(step: LearnerStep): AttemptPolicy {
  // A prediction is a prequestion: one honest try, then the outcome and the teaching.
  return step.kind === "predict" ? { misses: 1 } : {};
}

/**
 * Whether a figure may show derived values yet. An `explore` figure is live by design (finding
 * the value is the task); everything else shows givens only until the response is in.
 */
function figureShowsResults(step: LearnerStep, answered: boolean): boolean {
  return step.answerVisibility === "live" || answered;
}

/** The text a learner hears from Read aloud: the whole screen, choices included (audit m1). */
export function stepReadAloudText(step: LearnerStep | undefined): string {
  if (!step) return "";
  const parts: string[] = [];
  if (step.headline) parts.push(step.headline);
  for (const block of step.blocks) {
    if (block.kind === "equation") continue;
    parts.push(block.kind === "definition" ? `${block.term}: ${block.text}` : block.text);
  }
  for (const line of step.workedSteps ?? [])
    parts.push(line.math ? `${line.text} ${line.math}` : line.text);
  if (step.question) {
    parts.push(step.question.prompt);
    step.question.choices?.forEach((choice, index) =>
      parts.push(`Option ${String.fromCharCode(65 + index)}: ${choice.label}.`),
    );
  }
  return parts.join(" ").replaceAll("$", "");
}

/** The opener (spec §3.1): the lesson's title, its hook, the promise and the time it takes. */
function OpenerScreen({
  title,
  intro,
  stepCount,
  context,
  onReady,
}: {
  title: string;
  intro: LearnerLessonIntro;
  stepCount: number;
  context: LessonFeedbackRequest | undefined;
  onReady: () => void;
}) {
  const question = intro.hook.question;
  return (
    <section className="lesson-opener" aria-labelledby="lesson-opener-title">
      <h1 className="opener-title" id="lesson-opener-title">
        {title}
      </h1>
      <div className="opener-hook step-lead">
        <RichBlocks blocks={intro.hook.blocks} />
      </div>
      {question ? (
        <QuestionBlock
          question={question}
          context={context}
          heading="h2"
          promptClassName="opener-prompt"
          onReady={onReady}
          figure={(attempt) =>
            intro.hook.diagram ? (
              <LearningDiagram spec={intro.hook.diagram} showResults={attempt.ready} />
            ) : null
          }
        />
      ) : intro.hook.diagram ? (
        <LearningDiagram spec={intro.hook.diagram} showResults={false} />
      ) : null}
      <p className="opener-promise">{intro.promise}</p>
      {intro.whyItMatters ? <p className="opener-why">{intro.whyItMatters}</p> : null}
      <p className="opener-meta">
        About {intro.estimatedMinutes} minutes · {stepCount} steps
      </p>
    </section>
  );
}

/**
 * The lines of a worked or faded example. A worked example reveals one line per press, so the
 * learner reads the method in order; a faded example shows every line and leaves blanks for the
 * learner to fill. A self-explanation asks why a line is allowed.
 */
function WorkedLines({
  lines,
  faded,
  context,
  onReadyChange,
}: {
  lines: LearnerWorkedStep[];
  faded: boolean;
  context: LessonFeedbackRequest | undefined;
  onReadyChange: (ready: boolean, blanksDone: boolean) => void;
}) {
  const [shown, setShown] = useState(faded ? lines.length : 1);
  const [done, setDone] = useState<ReadonlySet<string>>(new Set());
  const questionIds = lines
    .slice(0, shown)
    .flatMap((line) => [line.blank?.id, line.selfExplain?.id])
    .filter((id): id is string => Boolean(id));
  const currentDone = questionIds.every((id) => done.has(id));
  const blanks = lines.flatMap((line) => (line.blank ? [line.blank.id] : []));
  const blanksDone = blanks.every((id) => done.has(id));
  const ready = shown >= lines.length && currentDone;
  useEffect(() => onReadyChange(ready, blanksDone), [ready, blanksDone, onReadyChange]);
  const markDone = (id: string) => () => setDone((current) => new Set(current).add(id));
  return (
    <div className="worked-lines">
      <ol>
        {lines.slice(0, shown).map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: worked lines are fixed and never reorder; text can repeat.
          <li key={`${index}-${line.text}`} className={line.blank ? "is-blank" : undefined}>
            <span className="worked-line-text">
              <InlineRichText text={line.text} />
            </span>
            {line.math && !line.blank ? (
              <span className="worked-line-math">
                <InlineRichText text={line.math} />
              </span>
            ) : null}
            {line.blank ? (
              <QuestionBlock
                question={line.blank}
                context={context}
                hidePrompt
                label={line.blank.prompt}
                inline
                onReady={markDone(line.blank.id)}
              />
            ) : null}
            {line.selfExplain ? (
              <div className="worked-self-explain">
                <QuestionBlock
                  question={line.selfExplain}
                  context={context}
                  heading="h3"
                  promptClassName="self-explain-prompt"
                  inline
                  onReady={markDone(line.selfExplain.id)}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      {shown < lines.length && currentDone ? (
        <button
          className="button button-secondary worked-next"
          onClick={() => setShown((count) => count + 1)}
          type="button"
        >
          Show the next line
          <ChevronDown aria-hidden="true" size={16} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * One question-led screen, in the order the spec sets (§4.3): eyebrow, lead, headline, figure,
 * response, with the verdict in the footer. An `explain` screen puts its key idea first.
 */
function StepScreen({
  step,
  position,
  total,
  v2,
  context,
  onReady,
}: {
  step: LearnerStep;
  position: number;
  total: number;
  v2: boolean;
  context: LessonFeedbackRequest | undefined;
  onReady: () => void;
}) {
  const [linesState, setLinesState] = useState({ ready: false, blanksDone: false });
  const [questionReady, setQuestionReady] = useState(false);
  const onLines = useCallback(
    (ready: boolean, blanksDone: boolean) =>
      setLinesState((current) =>
        current.ready === ready && current.blanksDone === blanksDone
          ? current
          : { ready, blanksDone },
      ),
    [],
  );
  const hasLines = (step.workedSteps?.length ?? 0) > 0;
  const ready = (!hasLines || linesState.ready) && (!step.question || questionReady);
  const announced = useRef(false);
  useEffect(() => {
    if (ready && !announced.current) {
      announced.current = true;
      onReady();
    }
  }, [ready, onReady]);

  const eyebrow = eyebrowFor(step, position, total, v2);
  // A worked or explain screen keeps its headline; its question is then secondary.
  const headline = step.headline;
  const figureAnswered = hasLines ? linesState.blanksDone : questionReady;
  return (
    <article className="step-screen" data-kind={step.kind}>
      <p className="step-eyebrow">{eyebrow}</p>
      {headline ? (
        <h1 className="step-headline">
          <InlineRichText text={headline} />
        </h1>
      ) : null}
      {step.blocks.length ? (
        <div className="step-lead">
          <RichBlocks blocks={step.blocks} />
        </div>
      ) : null}
      {hasLines ? (
        <WorkedLines
          lines={step.workedSteps ?? []}
          faded={step.kind === "faded_example"}
          context={context}
          onReadyChange={onLines}
        />
      ) : null}
      {hasLines && step.diagram ? (
        <LearningDiagram
          spec={step.diagram}
          showResults={figureShowsResults(step, figureAnswered)}
        />
      ) : null}
      {step.question ? (
        <QuestionBlock
          question={step.question}
          context={context}
          policy={policyFor(step)}
          heading={headline ? "h2" : "h1"}
          promptClassName={headline ? "step-question is-secondary" : "step-question"}
          onReady={() => setQuestionReady(true)}
          hideInput={
            step.kind === "explore" &&
            step.diagram !== undefined &&
            "bindAnswer" in step.diagram &&
            step.diagram.bindAnswer === true
          }
          figure={(attempt) =>
            step.diagram && !hasLines ? (
              <LearningDiagram
                key={step.id}
                spec={step.diagram}
                showResults={figureShowsResults(step, attempt.ready)}
                answerText={attempt.response ?? undefined}
                onAnswerChange={(value) =>
                  attempt.setDraft({ kind: "numeric", value: String(value), unit: "" })
                }
                answerLocked={attempt.ready}
              />
            ) : null
          }
        />
      ) : !hasLines && step.diagram ? (
        <LearningDiagram spec={step.diagram} showResults={figureShowsResults(step, true)} />
      ) : null}
    </article>
  );
}

/**
 * A lesson played as screens. A v2 lesson opens on its own opener and then one typed step per
 * screen; a legacy lesson plays its question-led steps the same way, with teaching shown above
 * each question instead of being withheld. Prose-only steps from archived courses keep the
 * older reading layout.
 */
export function StoryStageView({
  stage,
  courseId,
  lessonId,
  savedInteractionState,
  onStepChange,
  onComplete,
}: {
  stage: ExplainerStage;
  /** Needed to resolve any course asset an activity draws on. */
  courseId: string;
  lessonId?: string;
  savedInteractionState: Record<string, unknown> | undefined;
  /** Called on every advance with the new screen's stable id, so the position survives a refresh. */
  onStepChange: (stepId: string, stepIndex: number) => void;
  onComplete: () => void;
}) {
  const steps = stage.steps;
  const screens = screenIdsFor(stage);
  const [position, setPosition] = useState(() =>
    resumeScreenIndex(screens, steps, savedInteractionState),
  );
  const [solved, setSolved] = useState<ReadonlySet<string>>(new Set());
  const screenId = screens[position] ?? screens[0] ?? "";
  const onOpener = screenId === LESSON_OPENER_ID;
  const activeIndex = onOpener ? -1 : steps.findIndex((step) => step.id === screenId);
  const active = activeIndex >= 0 ? steps[activeIndex] : undefined;
  const v2 = stage.intro !== undefined;
  const isLast = position >= screens.length - 1;
  const markSolved = useCallback(
    (id: string) => () =>
      setSolved((current) => (current.has(id) ? current : new Set(current).add(id))),
    [],
  );
  const context = (stepId: string): LessonFeedbackRequest | undefined =>
    lessonId ? { courseId, lessonId, stepId } : undefined;

  const ready = onOpener
    ? !stage.intro?.hook.question || solved.has(LESSON_OPENER_ID)
    : active?.questionLed
      ? solved.has(active.id)
      : canAdvanceStep(active, { solved: active ? solved.has(active.id) : false, revealed: false });

  function advance(): void {
    if (isLast) {
      onComplete();
      return;
    }
    const next = position + 1;
    setPosition(next);
    const nextId = screens[next] ?? "";
    onStepChange(
      nextId,
      steps.findIndex((step) => step.id === nextId),
    );
    window.requestAnimationFrame(scrollStageToTop);
  }

  const continueButton = ready ? (
    <PlayerFooterSlot kind="actions">
      <div className="button-row story-actions">
        <button className="button button-primary" onClick={advance} type="button">
          {onOpener && !stage.intro?.hook.question ? "Start" : isLast ? "Finish" : "Continue"}
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
        </button>
      </div>
    </PlayerFooterSlot>
  ) : null;

  if (onOpener && stage.intro) {
    return (
      <div className="story story-question-led story-v2">
        <OpenerScreen
          key={LESSON_OPENER_ID}
          title={stage.title}
          intro={stage.intro}
          stepCount={steps.length}
          context={context(LESSON_OPENER_ID)}
          onReady={markSolved(LESSON_OPENER_ID)}
        />
        {continueButton}
      </div>
    );
  }

  if (active?.questionLed) {
    return (
      <div className={"story story-question-led" + (v2 ? " story-v2" : "")}>
        <StepScreen
          key={active.id}
          step={active}
          position={activeIndex + 1}
          total={steps.length}
          v2={v2}
          context={context(active.id)}
          onReady={markSolved(active.id)}
        />
        {continueButton}
      </div>
    );
  }

  return (
    <LegacyProseStory
      stage={stage}
      activeIndex={Math.max(0, activeIndex)}
      courseId={courseId}
      onSolved={(id) => markSolved(id)()}
      continueButton={continueButton}
    />
  );
}

/** The reading layout for prose steps (archived courses, and legacy steps with no question). */
function LegacyProseStory({
  stage,
  activeIndex,
  courseId,
  onSolved,
  continueButton,
}: {
  stage: ExplainerStage;
  activeIndex: number;
  courseId: string;
  onSolved: (stepId: string) => void;
  continueButton: ReactNode;
}) {
  const steps = stage.steps;
  const active = steps[activeIndex];
  const hasVisual =
    active?.diagram !== undefined ||
    stage.visual.circuit !== undefined ||
    resolveStageVisual(stage.visual) !== null;
  const activeStateId = visualStateAt(steps, activeIndex);
  const views = stepViewsFor(steps, activeIndex);
  return (
    <div className={hasVisual ? "story story-split" : "story"}>
      <div className="story-flow">
        <p className="story-progress" aria-live="polite">
          Step {activeIndex + 1} of {steps.length}
        </p>
        <ol className="story-steps">
          {views
            .filter((view) => view.active)
            .map(({ step }) => (
              <li className="story-step is-active beat-enter" key={step.id}>
                <h1 className="story-title">
                  {step.blocks.find((block) => block.kind === "heading")?.text ??
                    step.eyebrow ??
                    stage.title}
                </h1>
                <div className="story-step-body">
                  <RichBlocks blocks={step.blocks.filter((block) => block.kind !== "heading")} />
                </div>
                {step.question ? (
                  <QuestionBlock
                    question={step.question}
                    context={undefined}
                    heading="h2"
                    onReady={() => onSolved(step.id)}
                  />
                ) : null}
                {step.activity && isStepActivity(step.activity) ? (
                  <div className="step-activity">
                    <ActivityStep
                      activity={step.activity}
                      courseId={courseId}
                      onAnswered={(correct) => {
                        if (correct) onSolved(step.id);
                      }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
        </ol>
        {continueButton}
        {activeIndex > 0 ? (
          <details className="story-earlier">
            <summary>Earlier ideas</summary>
            {steps.slice(0, activeIndex).map((step) => (
              <div key={step.id}>
                <RichBlocks blocks={step.blocks} />
              </div>
            ))}
          </details>
        ) : null}
      </div>
      {active?.diagram ? (
        <LearningDiagram key={active.id} spec={active.diagram} />
      ) : hasVisual ? (
        <StoryVisual activeStateId={activeStateId} stage={stage} />
      ) : null}
    </div>
  );
}
