import type { QuizStage, RevealConfirmResponse } from "@discere/contracts";
import { ArrowRight, Lightbulb, Loader2 } from "lucide-react";
import { useState } from "react";
import { Notice } from "../../ui/Feedback.js";
import { ReadAloudButton } from "../../ui/ReadAloud.js";
import { InlineRichText } from "../../ui/RichText.js";
import { ModeSelector } from "../ModeSelector.js";
import { useTutoringMode } from "../mode-context.js";
import { AnswerInput } from "../quiz/AnswerInput.js";
import { RevealFlow } from "../quiz/RevealFlow.js";
import { TransferChallenge } from "../quiz/TransferChallenge.js";
import { AttemptResult, HintLadder } from "../quiz-shared/AttemptFeedback.js";
import { useAttempt } from "../quiz-shared/use-attempt.js";

export function QuizStageView({
  stage,
  onContinue,
  returnLink,
}: {
  stage: QuizStage;
  onContinue: () => void;
  returnLink: { label: string; onSelect: () => void } | null;
}) {
  const { mode, setMode } = useTutoringMode();
  const question = stage.question;
  const [revealed, setRevealed] = useState<RevealConfirmResponse | null>(null);
  const {
    draft,
    setDraft,
    response,
    attemptId,
    result,
    hints,
    hintsLeft,
    solved,
    busy,
    failure,
    send,
    askForHint,
  } = useAttempt(question);

  return (
    <div className="quiz">
      <div className="quiz-heading">
        <p className="quiz-count">
          Question {stage.questionIndex} of {stage.questionCount}
        </p>
        <div className="quiz-heading-actions">
          {/* The question is read on its own. A hint or the answer is never spoken here. */}
          <ReadAloudButton label="Read the question" text={question.prompt} />
          {returnLink ? (
            <button className="button button-quiet" onClick={returnLink.onSelect} type="button">
              {returnLink.label}
            </button>
          ) : null}
        </div>
      </div>

      <h1 className="quiz-question">
        <InlineRichText text={question.prompt} />
      </h1>

      <ModeSelector locked={attemptId !== null} onChange={setMode} value={mode} />

      <AnswerInput
        answered={result !== null}
        correct={solved}
        draft={draft}
        onChange={setDraft}
        question={question}
      />

      <div className="button-row quiz-actions">
        {response && !solved ? (
          <button
            aria-busy={busy}
            className="button button-primary"
            onClick={() => void send()}
            type="button"
          >
            {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
            {result === null ? "Check answer" : "Check again"}
          </button>
        ) : null}
        {!response && !solved ? <p className="muted">Enter an answer to check it.</p> : null}

        {mode !== "exam" && attemptId && !solved && hintsLeft > 0 ? (
          <button className="button button-quiet" onClick={() => void askForHint()} type="button">
            <Lightbulb aria-hidden="true" size={16} strokeWidth={1.8} />
            Ask for a hint
          </button>
        ) : null}

        {mode === "direct" && attemptId && !solved && !revealed ? (
          <RevealFlow attemptId={attemptId} onRevealed={setRevealed} />
        ) : null}
      </div>

      {mode !== "exam" && !attemptId ? (
        <p className="muted quiz-note">A hint becomes available after your first attempt.</p>
      ) : null}
      {mode === "exam" ? (
        <p className="muted quiz-note">
          Exam mode: hints, the worked answer, and the tutor stay closed for this attempt.
        </p>
      ) : null}

      <HintLadder hints={hints} />
      <AttemptResult result={result} />

      {revealed ? (
        <section className="revealed-answer">
          <p className="eyebrow">Worked answer</p>
          <p>{revealed.answer}</p>
        </section>
      ) : null}

      {revealed?.transferPrompt && attemptId ? <TransferChallenge attemptId={attemptId} /> : null}

      {failure ? (
        <Notice live tone="error" title="Something went wrong">
          <p>{failure}</p>
        </Notice>
      ) : null}

      {solved || revealed ? (
        <div className="button-row">
          <button className="button button-primary" onClick={onContinue} type="button">
            Continue
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
