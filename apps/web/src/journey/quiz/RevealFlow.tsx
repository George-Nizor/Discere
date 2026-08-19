import type { RevealConfirmResponse } from "@discere/contracts";
import { Eye, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "../../api/client.js";
import { confirmReveal, startReveal } from "../../api/endpoints.js";
import { Notice } from "../../ui/Feedback.js";

const CONFIRMATION_PHRASE = "show answer";
const MIN_REASON_LENGTH = 8;

function secondsRemaining(availableAt: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(availableAt) - now) / 1000));
}

/**
 * The worked answer costs deliberate effort: a written reason, a wait the server sets, and a
 * typed confirmation. Every step here reflects state the server already enforces.
 */
export function RevealFlow({
  attemptId,
  onRevealed,
}: {
  attemptId: string;
  onRevealed: (result: RevealConfirmResponse) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "reason" | "waiting">("idle");
  const [reason, setReason] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [availableAt, setAvailableAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!availableAt) return;
    setRemaining(secondsRemaining(availableAt, Date.now()));
    const timer = window.setInterval(
      () => setRemaining(secondsRemaining(availableAt, Date.now())),
      250,
    );
    return () => window.clearInterval(timer);
  }, [availableAt]);

  async function requestReveal(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      const result = await startReveal(attemptId, reason.trim());
      setToken(result.token);
      setAvailableAt(result.availableAt);
      setPhase("waiting");
    } catch (error) {
      setFailure(errorMessage(error, "The answer could not be requested."));
    } finally {
      setBusy(false);
    }
  }

  async function completeReveal(): Promise<void> {
    if (!token) return;
    setBusy(true);
    setFailure(null);
    try {
      onRevealed(await confirmReveal(attemptId, token, confirmation));
    } catch (error) {
      setFailure(errorMessage(error, "The answer could not be shown."));
    } finally {
      setBusy(false);
    }
  }

  if (phase === "idle") {
    return (
      <button className="button button-quiet" onClick={() => setPhase("reason")} type="button">
        <Eye aria-hidden="true" size={16} strokeWidth={1.8} />
        Show the worked answer
      </button>
    );
  }

  return (
    <section aria-label="Worked answer" className="reveal-flow">
      {phase === "reason" ? (
        <>
          <label className="field-label" htmlFor="reveal-reason">
            Why do you want the worked answer?
          </label>
          <textarea
            className="textarea textarea-short"
            id="reveal-reason"
            onChange={(event) => setReason(event.currentTarget.value)}
            value={reason}
          />
          <p className="muted">
            At least {MIN_REASON_LENGTH} characters. Your reason is stored with the attempt.
          </p>
          <div className="button-row">
            {reason.trim().length >= MIN_REASON_LENGTH ? (
              <button
                aria-busy={busy}
                className="button button-secondary"
                onClick={() => void requestReveal()}
                type="button"
              >
                {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
                Start the reflection pause
              </button>
            ) : null}
            <button className="button button-quiet" onClick={() => setPhase("idle")} type="button">
              Keep working
            </button>
          </div>
        </>
      ) : null}

      {phase === "waiting" ? (
        remaining > 0 ? (
          <p aria-live="polite" className="reveal-countdown">
            The answer opens in {remaining} {remaining === 1 ? "second" : "seconds"}.
          </p>
        ) : (
          <>
            <label className="field-label" htmlFor="reveal-confirmation">
              Type “{CONFIRMATION_PHRASE}” to confirm
            </label>
            <input
              autoComplete="off"
              className="text-input"
              id="reveal-confirmation"
              onChange={(event) => setConfirmation(event.currentTarget.value)}
              value={confirmation}
            />
            <div className="button-row">
              {confirmation.trim().toLocaleLowerCase() === CONFIRMATION_PHRASE ? (
                <button
                  aria-busy={busy}
                  className="button button-secondary"
                  onClick={() => void completeReveal()}
                  type="button"
                >
                  {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
                  Show the answer
                </button>
              ) : null}
            </div>
          </>
        )
      ) : null}

      {failure ? (
        <Notice live tone="error" title="The reveal did not complete">
          <p>{failure}</p>
        </Notice>
      ) : null}
    </section>
  );
}
