import type { AttemptResponse, TutoringMode } from "@discere/contracts";
import { useEffect, useState, type ChangeEvent } from "react";

export interface RevealState { token: string; availableAt: string; }
export function AnswerPanel(props: { prompt: string; mode: TutoringMode; response: string; onResponse: (value: string) => void; onSubmit: () => void; submitting: boolean; result?: AttemptResponse; hint?: string; onHint: () => void; hinting: boolean; onStartReveal: (reason: string) => Promise<RevealState>; onConfirmReveal: (token: string, confirmation: string) => Promise<void>; revealedAnswer?: string; transferPrompt?: string; }) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [reveal, setReveal] = useState<RevealState>();
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!reveal) return;
    const update = (): void => setSeconds(Math.max(0, Math.ceil((Date.parse(reveal.availableAt) - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [reveal]);
  async function beginReveal(): Promise<void> { try { setError(""); setReveal(await props.onStartReveal(reason)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start answer reveal."); } }
  async function confirm(): Promise<void> { if (!reveal) return; try { setError(""); await props.onConfirmReveal(reveal.token, confirmation); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reveal the answer."); } }
  const attemptClosed = Boolean(props.result?.correct || props.revealedAnswer);
  const canAssist = Boolean(props.mode !== "exam" && props.result && !props.result.correct && !props.revealedAnswer);
  const submitLabel = props.revealedAnswer ? "Answer revealed" : props.result?.correct ? "Attempt complete" : props.submitting ? "Checking…" : props.result ? "Check again" : "Check my answer";
  return <section className="answer-panel" aria-labelledby="question-title"><p className="eyebrow">Your turn</p><h2 id="question-title">{props.prompt}</h2><label className="answer-input"><span>Explain or calculate your answer</span><textarea value={props.response} disabled={attemptClosed} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => props.onResponse(event.currentTarget.value)} rows={4} placeholder="Write your answer and include the unit." /></label><div className="answer-actions"><button className="primary-button" type="button" disabled={attemptClosed || props.submitting || props.response.trim().length === 0} onClick={props.onSubmit}>{submitLabel}</button>{canAssist ? <button type="button" className="text-button" disabled={props.hinting} onClick={props.onHint}>{props.hinting ? "Loading hint…" : "Give me one hint"}</button> : null}</div>{props.result ? <div className={props.result.correct ? "feedback correct" : "feedback"}><strong>{props.result.correct ? "Correct" : "Try another step"}</strong><p>{props.result.feedback}</p><small>+{props.result.xpAwarded} XP · {Math.round(props.result.mastery * 100)}% current mastery</small></div> : null}{props.hint ? <div className="hint"><strong>Next hint</strong><p>{props.hint}</p></div> : null}{canAssist ? <details className="reveal-panel"><summary>Reveal the worked answer</summary>{!reveal ? <><label><span>What have you tried or where are you stuck?</span><input value={reason} onChange={(event: ChangeEvent<HTMLInputElement>) => setReason(event.currentTarget.value)} placeholder="I used the formula but…" /></label><button type="button" disabled={reason.trim().length < 8} onClick={() => void beginReveal()}>Start reflection pause</button></> : <><p>{seconds > 0 ? `Review your working for ${seconds} more second${seconds === 1 ? "" : "s"}.` : "Type the confirmation phrase when you are ready."}</p><label><span>Confirmation phrase</span><input value={confirmation} onChange={(event: ChangeEvent<HTMLInputElement>) => setConfirmation(event.currentTarget.value)} placeholder="show answer" /></label><button type="button" disabled={seconds > 0 || confirmation.trim().toLocaleLowerCase() !== "show answer"} onClick={() => void confirm()}>Show worked answer</button></>}{error ? <p className="form-error" role="alert">{error}</p> : null}</details> : null}{props.revealedAnswer ? <div className="revealed-answer"><p className="eyebrow">Worked answer</p><p>{props.revealedAnswer}</p>{props.transferPrompt ? <><strong>Check the idea in a new case</strong><p>{props.transferPrompt}</p></> : null}</div> : null}</section>;
}
