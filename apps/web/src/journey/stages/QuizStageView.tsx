import type {
  AttemptResponse,
  HintResponse,
  QuizStage,
  RevealConfirmResponse,
} from "@discere/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Lightbulb, Loader2 } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../api/client.js";
import { requestHint, submitAttempt } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queries.js";
import { Notice } from "../../ui/Feedback.js";
import { ReadAloudButton } from "../../ui/ReadAloud.js";
import { InlineRichText } from "../../ui/RichText.js";
import { ModeSelector } from "../ModeSelector.js";
import { useTutoringMode } from "../mode-context.js";
import { AnswerInput } from "../quiz/AnswerInput.js";
import { type AnswerDraft, answerResponse, initialAnswerDraft } from "../quiz/answer-draft.js";
import { RevealFlow } from "../quiz/RevealFlow.js";
import { TransferChallenge } from "../quiz/TransferChallenge.js";

export function QuizStageView({
  stage,
  onContinue,
  returnLink,
}: {
  stage: QuizStage;
  onContinue: () => void;
  returnLink: { label: string; onSelect: () => void } | null;
}) {
  const queryClient = useQueryClient();
  const { mode, setMode } = useTutoringMode();
  const question = stage.question;
  const [draft, setDraft] = useState<AnswerDraft>(() => initialAnswerDraft(question));
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResponse | null>(null);
  const [hints, setHints] = useState<HintResponse[]>([]);
  const [revealed, setRevealed] = useState<RevealConfirmResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const response = answerResponse(question, draft);
  const solved = result?.correct === true;
  const hintsLeft = question.hints.length - hints.length;

  async function send(): Promise<void> {
    if (!response) return;
    setBusy(true);
    setFailure(null);
    try {
      const attempt = await submitAttempt({
        questionId: question.id,
        response,
        mode,
        ...(attemptId === null ? {} : { attemptId }),
      });
      setAttemptId(attempt.attemptId);
      setResult(attempt);
      await queryClient.invalidateQueries({ queryKey: queryKeys.home });
    } catch (error) {
      setFailure(errorMessage(error, "The answer could not be checked."));
    } finally {
      setBusy(false);
    }
  }

  async function askForHint(): Promise<void> {
    if (!attemptId) return;
    setBusy(true);
    setFailure(null);
    try {
      const hint = await requestHint(attemptId);
      setHints((current) => [...current, hint]);
    } catch (error) {
      setFailure(errorMessage(error, "No hint could be loaded."));
    } finally {
      setBusy(false);
    }
  }

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

      {hints.length > 0 ? (
        <ol aria-label="Hints used" className="hint-ladder">
          {hints.map((hint) => (
            <li key={hint.level}>
              <p className="eyebrow">
                Hint {hint.level} of {hint.level + hint.remaining}
              </p>
              <p>{hint.hint}</p>
            </li>
          ))}
          <li className="hint-cost muted">
            Each hint records assisted evidence for this attempt rather than independent evidence.
          </li>
        </ol>
      ) : null}

      {result ? (
        <Notice
          live
          tone={result.correct ? "correct" : "info"}
          title={result.correct ? "Correct" : "Not correct yet"}
        >
          <p>{result.feedback}</p>
          <p className="muted feedback-meta">
            {result.xpAwarded} XP · {result.independent ? "independent" : "assisted"} evidence ·
            mastery {Math.round(result.mastery * 100)}%
          </p>
        </Notice>
      ) : null}

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
