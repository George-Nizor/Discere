import type { TransferSubmitResponse } from "@discere/contracts";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../api/client.js";
import { getTransferState, submitTransfer } from "../../api/endpoints.js";
import { Notice } from "../../ui/Feedback.js";

/** The changed case that follows a revealed answer. It re-opens independent evidence. */
export function TransferChallenge({ attemptId }: { attemptId: string }) {
  const state = useQuery({
    queryKey: ["transfer", attemptId],
    queryFn: () => getTransferState(attemptId),
  });
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TransferSubmitResponse | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (state.isPending) return <p className="muted">Loading the transfer question…</p>;
  if (state.error || !state.data) {
    return <p className="muted">{errorMessage(state.error, "No transfer question is ready.")}</p>;
  }

  const challenge = state.data.challenge;
  const response = [value.trim(), unit.trim()].filter(Boolean).join(" ");

  async function send(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      setResult(await submitTransfer(attemptId, { transferId: challenge.id, response }));
    } catch (error) {
      setFailure(errorMessage(error, "The transfer answer could not be checked."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Transfer question" className="transfer">
      <p className="eyebrow">Apply it to a changed case</p>
      <p className="transfer-prompt">{challenge.prompt}</p>
      <div className="numeric-answer">
        <div className="numeric-answer-value">
          <label className="field-label" htmlFor="transfer-value">
            Value
          </label>
          <input
            className="text-input"
            id="transfer-value"
            inputMode="decimal"
            onChange={(event) => setValue(event.currentTarget.value)}
            type="text"
            value={value}
          />
        </div>
        <div className="numeric-answer-unit">
          <label className="field-label" htmlFor="transfer-unit">
            Unit
          </label>
          <input
            className="text-input"
            id="transfer-unit"
            onChange={(event) => setUnit(event.currentTarget.value)}
            placeholder={challenge.expectedUnit}
            type="text"
            value={unit}
          />
        </div>
      </div>
      {response ? (
        <button
          aria-busy={busy}
          className="button button-secondary"
          onClick={() => void send()}
          type="button"
        >
          {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
          Check the transfer answer
        </button>
      ) : null}
      {result ? (
        <Notice
          live
          tone={result.correct ? "correct" : "info"}
          title={result.correct ? "Correct" : "Not yet"}
        >
          <p>{result.feedback}</p>
        </Notice>
      ) : null}
      {failure ? (
        <Notice live tone="error" title="Check failed">
          <p>{failure}</p>
        </Notice>
      ) : null}
    </section>
  );
}
