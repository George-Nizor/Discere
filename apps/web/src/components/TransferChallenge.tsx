import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent } from "react";
import { getTransferState, submitTransferResponse } from "../api";
import "./TransferChallenge.css";

export function TransferChallenge({ attemptId }: { attemptId: string }) {
  const queryClient = useQueryClient();
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const state = useQuery({
    queryKey: ["transfer", attemptId],
    queryFn: () => getTransferState(attemptId),
  });
  const submission = useMutation({
    mutationFn: async () => {
      if (!state.data) throw new Error("The transfer challenge is still loading.");
      return submitTransferResponse(attemptId, {
        transferId: state.data.challenge.id,
        response,
      });
    },
    onSuccess: (result) => {
      setError("");
      queryClient.setQueryData(["transfer", attemptId], (current: typeof state.data) =>
        current
          ? {
              ...current,
              completed: result.completed,
              lastCorrect: result.correct,
              feedback: result.feedback,
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: ["home"] });
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : "The transfer response could not be checked."),
  });

  if (state.isLoading) {
    return (
      <section className="transfer-challenge" aria-live="polite">
        <p>Preparing the transfer challenge…</p>
      </section>
    );
  }
  if (state.error || !state.data) {
    return (
      <section className="transfer-challenge">
        <p className="form-error" role="alert">
          {state.error instanceof Error
            ? state.error.message
            : "The transfer challenge could not be loaded."}
        </p>
      </section>
    );
  }

  const result = submission.data;
  const completed = state.data.completed || result?.completed === true;
  const feedback = result?.feedback ?? state.data.feedback;
  const correct = result?.correct ?? state.data.lastCorrect;

  return (
    <section className={completed ? "transfer-challenge completed" : "transfer-challenge"}>
      <div className="transfer-heading">
        <div>
          <p className="eyebrow">Transfer check</p>
          <h3>{completed ? "You recovered the idea" : "Use the idea in a new case"}</h3>
        </div>
        {completed ? <span>Recovery recorded</span> : null}
      </div>
      <p className="transfer-prompt">{state.data.challenge.prompt}</p>
      <label>
        <span>Your answer</span>
        <input
          value={response}
          disabled={completed}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setResponse(event.currentTarget.value);
            setError("");
          }}
          placeholder={`Enter a value in ${state.data.challenge.expectedUnit}`}
        />
      </label>
      <button
        type="button"
        className="primary-button"
        disabled={completed || response.trim().length === 0 || submission.isPending}
        onClick={() => submission.mutate()}
      >
        {completed ? "Transfer complete" : submission.isPending ? "Checking…" : "Check transfer"}
      </button>
      {feedback ? (
        <div className={correct ? "transfer-feedback correct" : "transfer-feedback"} role="status">
          <strong>{correct ? "Correct" : "Try the new values again"}</strong>
          <p>{feedback}</p>
          {result?.correct ? (
            <small>
              +{result.xpAwarded} recovery XP · {Math.round(result.mastery * 100)}% current mastery
            </small>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
