import type { AttemptResponse, HintResponse, LearnerQuestion } from "@discere/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "../../api/client.js";
import { requestHint, submitAttempt } from "../../api/endpoints.js";
import { queryKeys } from "../../api/queries.js";
import { type AnswerDraft, answerResponse, initialAnswerDraft } from "../quiz/answer-draft.js";
import { useTutoringMode } from "../mode-context.js";

export interface Attempt {
  draft: AnswerDraft;
  setDraft: (draft: AnswerDraft) => void;
  /** The draft as the server expects it, or null while the learner has entered nothing. */
  response: string | null;
  attemptId: string | null;
  result: AttemptResponse | null;
  hints: HintResponse[];
  hintsLeft: number;
  solved: boolean;
  busy: boolean;
  failure: string | null;
  send: () => Promise<void>;
  askForHint: () => Promise<void>;
}

/**
 * One grading path for every place a learner answers a question. A quiz stage and an inline
 * check inside a lesson step ask differently and look different, but they submit the same
 * attempt, earn the same evidence, and spend hints against the same ladder — so the code that
 * does it lives here rather than being written twice and drifting.
 */
export function useAttempt(question: LearnerQuestion): Attempt {
  const queryClient = useQueryClient();
  const { mode } = useTutoringMode();
  const [draft, setDraft] = useState<AnswerDraft>(() => initialAnswerDraft(question));
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResponse | null>(null);
  const [hints, setHints] = useState<HintResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const response = answerResponse(question, draft);

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

  return {
    draft,
    setDraft,
    response,
    attemptId,
    result,
    hints,
    hintsLeft: question.hints.length - hints.length,
    solved: result?.correct === true,
    busy,
    failure,
    send,
    askForHint,
  };
}
