import type {
  AttemptResponse,
  HintResponse,
  LearnerQuestion,
  LessonFeedbackRequest,
  LessonFeedbackResponse,
} from "@discere/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { errorMessage } from "../../api/client.js";
import { getLessonFeedback, requestHint, submitAttempt } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queries.js";
import { celebrateAnswer } from "../../fx/celebrate.js";
import { useExperience } from "../../study/experience.js";
import { useTutoringMode } from "../mode-context.js";
import { type AnswerDraft, answerResponse, initialAnswerDraft } from "../quiz/answer-draft.js";

/**
 * Where an attempt stands under the shared attempt policy (audit B3, spec §3.4):
 *
 * - `answering`: nothing marked yet.
 * - `retry`: a marked wrong answer. The verdict says so plainly, the answer stays editable, the
 *   hint ladder is offered, and the worked answer is one request away.
 * - `correct`: right, with or without help.
 * - `revealed`: the worked answer is showing, after the last allowed miss or on request. That is
 *   recorded as assistance by the server.
 * - `closed`: Exam mode after the last allowed miss. Nothing is revealed; the learner moves on.
 */
export type AttemptPhase = "answering" | "retry" | "correct" | "revealed" | "closed";

export interface AttemptPolicy {
  /**
   * Marked misses before the worked answer is shown. Two by default (one retry), one where a
   * second try would mostly be a guess: a two-option choice, a prediction, a skill check.
   */
  misses?: number;
  /** Whether the hint ladder is offered between tries. Skill checks offer none. */
  hints?: boolean;
}

export interface Attempt {
  draft: AnswerDraft;
  setDraft: (draft: AnswerDraft) => void;
  /** The draft as the server expects it, or null while the learner has entered nothing. */
  response: string | null;
  attemptId: string | null;
  result: AttemptResponse | null;
  /** The response the current `result` marked, so a changed draft drops the old marks. */
  markedResponse: string | null;
  hints: HintResponse[];
  hintsLeft: number;
  /** Whether a hint may be asked for now. */
  canHint: boolean;
  solved: boolean;
  phase: AttemptPhase;
  misses: number;
  /** The explanation loaded after a correct answer, or the worked answer after a reveal. */
  lessonFeedback: LessonFeedbackResponse | null;
  /** True once the learner may move on: right, revealed, or closed in Exam mode. */
  ready: boolean;
  /** Whether the worked answer may be asked for now. */
  canReveal: boolean;
  reveal: () => Promise<void>;
  /** Retained name: reloads the explanation after a failed load. */
  loadExplanation: () => Promise<void>;
  busy: boolean;
  failure: string | null;
  send: () => Promise<void>;
  askForHint: () => Promise<void>;
}

/** Two options cannot sustain a second try: the retry would be the other option. */
export function defaultMisses(question: LearnerQuestion): number {
  return question.choices && question.choices.length <= 2 ? 1 : 2;
}

/**
 * One grading path for every place a learner answers a question. A quiz stage and an inline
 * check inside a lesson step ask differently and look different, but they submit the same
 * attempt, earn the same evidence, spend hints against the same ladder, and follow one attempt
 * policy: try, a plain verdict with specific feedback, hints, retry, and the worked answer only
 * after the retry or on request.
 */
export function useAttempt(
  question: LearnerQuestion,
  lessonContext?: LessonFeedbackRequest,
  policy: AttemptPolicy = {},
): Attempt {
  const queryClient = useQueryClient();
  const { play, prepare } = useExperience();
  const inFlight = useRef(false);
  const { mode } = useTutoringMode();
  const [draft, setDraft] = useState<AnswerDraft>(() => initialAnswerDraft(question));
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResponse | null>(null);
  const [markedResponse, setMarkedResponse] = useState<string | null>(null);
  const [hints, setHints] = useState<HintResponse[]>([]);
  const [misses, setMisses] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [lessonFeedback, setLessonFeedback] = useState<LessonFeedbackResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const response = answerResponse(question, draft);
  const allowedMisses = Math.max(1, policy.misses ?? defaultMisses(question));
  const explains = lessonContext !== undefined && mode !== "exam";
  const solved = result?.correct === true;
  const phase: AttemptPhase = solved
    ? "correct"
    : revealed
      ? "revealed"
      : misses >= allowedMisses && lessonContext !== undefined && mode === "exam"
        ? "closed"
        : misses > 0
          ? "retry"
          : "answering";

  async function fetchExplanation(id: string, asReveal: boolean): Promise<void> {
    if (!lessonContext) return;
    const explanation = await getLessonFeedback(id, lessonContext);
    setLessonFeedback(explanation);
    if (asReveal) setRevealed(true);
  }

  async function send(): Promise<void> {
    if (!response || inFlight.current || solved || revealed || phase === "closed") return;
    inFlight.current = true;
    prepare();
    const origin = document.activeElement;
    const firstSubmission = attemptId === null && hints.length === 0;
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
      setMarkedResponse(response);
      // An answer in the wrong form ("twelve", a unit typed into the number box) is not a miss.
      const counted = attempt.qualifying !== false;
      if (counted) {
        celebrateAnswer({
          correct: attempt.correct,
          firstTry: firstSubmission && attempt.independent,
          xp: attempt.xpGained ?? 0,
          origin,
          play,
        });
      }
      const nextMisses = !attempt.correct && counted ? misses + 1 : misses;
      setMisses(nextMisses);
      if (explains && attempt.correct) {
        // Being right never skips the idea: the explanation comes with the verdict.
        await fetchExplanation(attempt.attemptId, false);
      } else if (explains && nextMisses >= allowedMisses) {
        await fetchExplanation(attempt.attemptId, true);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      void queryClient.invalidateQueries({ queryKey: queryKeys.study });
    } catch (error) {
      setFailure(errorMessage(error, "The answer could not be checked."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function reveal(): Promise<void> {
    if (!attemptId || !explains || inFlight.current || solved || revealed) return;
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await fetchExplanation(attemptId, true);
    } catch (error) {
      setFailure(errorMessage(error, "The worked answer could not be loaded."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function loadExplanation(): Promise<void> {
    if (!attemptId || !explains || inFlight.current) return;
    if (!solved) return reveal();
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await fetchExplanation(attemptId, false);
    } catch (error) {
      setFailure(errorMessage(error, "The explanation could not be loaded."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function askForHint(): Promise<void> {
    if (!attemptId || inFlight.current || solved || revealed) return;
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const hint = await requestHint(attemptId);
      setHints((current) => [...current, hint]);
    } catch (error) {
      setFailure(errorMessage(error, "No hint could be loaded."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const hintsLeft = question.hintCount - hints.length;
  return {
    draft,
    setDraft,
    response,
    attemptId,
    result,
    markedResponse,
    hints,
    hintsLeft,
    canHint:
      policy.hints !== false &&
      mode !== "exam" &&
      attemptId !== null &&
      phase === "retry" &&
      hintsLeft > 0,
    solved,
    phase,
    misses,
    lessonFeedback,
    ready: phase === "correct" || phase === "revealed" || phase === "closed",
    canReveal: explains && attemptId !== null && phase === "retry",
    reveal,
    loadExplanation,
    busy,
    failure,
    send,
    askForHint,
  };
}
