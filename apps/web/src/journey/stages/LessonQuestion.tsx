import type { QuizStage } from "@discere/contracts";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { ModeSelector } from "../ModeSelector.js";
import { useTutoringMode } from "../mode-context.js";
import { PlayerFooterSlot } from "../player-footer.js";
import { QuestionBlock } from "./QuestionBlock.js";

/**
 * A skills-check question inside the focused lesson player. It follows the same attempt policy
 * as a step's check, except that a v2 skill check (spec §3.5) gives one try and no hints: it is
 * retrieval, and a miss goes to fresh recall rather than down a ladder.
 */
export function LessonQuestion({
  stage,
  courseId,
  lessonId,
  onContinue,
  returnLink,
}: {
  stage: QuizStage;
  courseId: string;
  lessonId: string;
  onContinue: () => void;
  returnLink: { label: string; onSelect: () => void } | null;
}) {
  const { mode, setMode } = useTutoringMode();
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  return (
    <div className="quiz lesson-question">
      <div className="quiz-heading">
        <p className="quiz-count step-eyebrow">
          {stage.skillCheck ? "Skill check" : "Skills check"} · {stage.questionIndex} of{" "}
          {stage.questionCount}
        </p>
      </div>
      <QuestionBlock
        question={stage.question}
        context={{ courseId, lessonId }}
        promptClassName="quiz-question"
        policy={stage.skillCheck ? { misses: 1, hints: false } : {}}
        onReady={() => setReady(true)}
        onStarted={() => setStarted(true)}
      />
      {ready ? (
        <PlayerFooterSlot kind="actions">
          <div className="button-row story-actions">
            <button className="button button-primary" type="button" onClick={onContinue}>
              Continue
              <ArrowRight aria-hidden="true" size={16} />
            </button>
          </div>
        </PlayerFooterSlot>
      ) : null}
      {stage.skillCheck ? null : (
        <details className="lesson-mode">
          <summary>Help settings</summary>
          <ModeSelector locked={started} onChange={setMode} value={mode} />
          {mode === "exam" ? <p>Hints and explanations stay closed during this attempt.</p> : null}
        </details>
      )}
      {returnLink ? (
        <button className="button button-quiet" onClick={returnLink.onSelect} type="button">
          {returnLink.label}
        </button>
      ) : null}
    </div>
  );
}
