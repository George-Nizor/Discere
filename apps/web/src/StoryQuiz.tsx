import { useEffect, useState } from "react";
import type { AttemptResponse, QuizStage, RevealConfirmResponse, RevealStartResponse, TransferStateResponse, TransferSubmitResponse, TutoringMode } from "@discere/contracts";
import { confirmReveal, getTransferState, requestHint, startReveal, submitAttempt, submitTransferResponse } from "./api";

const modes: Array<{ id: TutoringMode; label: string; detail: string }> = [
  { id: "coach", label: "Coach", detail: "Hints guide your next step." },
  { id: "assisted", label: "Assisted", detail: "More structure is available." },
  { id: "direct", label: "Direct", detail: "Worked help counts as assisted evidence." },
  { id: "exam", label: "Exam", detail: "No hints, reveal, or tutor help." },
];

export function StoryQuiz({ stage, onComplete }: { stage: QuizStage; onComplete: () => void }) {
  const [mode, setMode] = useState<TutoringMode>("coach");
  const [response, setResponse] = useState("");
  const [attemptId, setAttemptId] = useState<string>();
  const [result, setResult] = useState<AttemptResponse>();
  const [hint, setHint] = useState<string>();
  const [revealedAnswer, setRevealedAnswer] = useState<string>();
  const [reveal, setReveal] = useState<RevealStartResponse>();
  const [seconds, setSeconds] = useState(0);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [transfer, setTransfer] = useState<TransferStateResponse>();
  const [transferResponse, setTransferResponse] = useState("");
  const [transferResult, setTransferResult] = useState<TransferSubmitResponse>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!reveal) return;
    const update = () => setSeconds(Math.max(0, Math.ceil((Date.parse(reveal.availableAt) - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [reveal]);

  useEffect(() => {
    if (!revealedAnswer || !attemptId) return;
    void getTransferState(attemptId).then(setTransfer).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load the transfer task."));
  }, [revealedAnswer, attemptId]);

  function changeMode(next: TutoringMode): void {
    if (next === mode) return;
    setMode(next); setResponse(""); setAttemptId(undefined); setResult(undefined); setHint(undefined); setReveal(undefined); setRevealedAnswer(undefined); setTransfer(undefined); setTransferResult(undefined); setError(undefined);
  }

  async function submit(): Promise<void> {
    setBusy(true); setError(undefined);
    try {
      const next = await submitAttempt({ questionId: stage.questionId, response, mode, ...(attemptId ? { attemptId } : {}) });
      setAttemptId(next.attemptId); setResult(next); setHint(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not check this response."); }
    finally { setBusy(false); }
  }

  async function askHint(): Promise<void> {
    if (!attemptId) return;
    setBusy(true); setError(undefined);
    try { setHint((await requestHint(attemptId)).hint); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load a hint."); }
    finally { setBusy(false); }
  }

  async function beginReveal(): Promise<void> {
    if (!attemptId) return;
    setBusy(true); setError(undefined);
    try { setReveal(await startReveal(attemptId, reason)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not start the reflection pause."); }
    finally { setBusy(false); }
  }

  async function finishReveal(): Promise<void> {
    if (!attemptId || !reveal) return;
    setBusy(true); setError(undefined);
    try {
      const response: RevealConfirmResponse = await confirmReveal(attemptId, reveal.token, confirmation);
      setRevealedAnswer(response.answer); setReveal(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reveal the worked answer."); }
    finally { setBusy(false); }
  }

  async function submitTransfer(): Promise<void> {
    if (!attemptId || !transfer) return;
    setBusy(true); setError(undefined);
    try { setTransferResult(await submitTransferResponse(attemptId, { transferId: transfer.challenge.id, response: transferResponse })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not check the transfer response."); }
    finally { setBusy(false); }
  }

  const canAssist = Boolean(result && !result.correct && mode !== "exam" && !revealedAnswer);
  const complete = Boolean(result?.correct || transferResult?.completed);

  return (
    <section className="story-quiz" aria-labelledby="quiz-question-title">
      <div className="story-quiz-progress"><span>Question 1 of {stage.questionCount}</span><span className="story-quiz-progress-line" /></div>
      <div className="story-quiz-layout">
        <div className="story-quiz-main">
          <h2 id="quiz-question-title">{stage.question.prompt}</h2>
          <label className="story-response"><span>Your answer</span><textarea value={response} disabled={Boolean(result?.correct || revealedAnswer)} onChange={(event) => setResponse(event.currentTarget.value)} placeholder="Explain or calculate your answer." rows={5} /></label>
          <button className="story-primary" type="button" disabled={busy || !response.trim() || Boolean(result?.correct || revealedAnswer)} onClick={() => void submit()}>{busy ? "Checking…" : result ? "Check again" : "Check answer"}</button>
          {result ? <div className={result.correct ? "story-feedback correct" : "story-feedback"} role="status"><strong>{result.correct ? "Correct" : "Revise one step"}</strong><p>{result.feedback}</p><small>{result.independent ? "Independent evidence" : "Assisted evidence"} · {Math.round(result.mastery * 100)}% current mastery</small></div> : null}
          {hint ? <div className="story-hint" role="status"><strong>Hint</strong><p>{hint}</p></div> : null}
          {canAssist ? <div className="story-assistance"><button className="story-secondary" type="button" disabled={busy} onClick={() => void askHint()}>Give me a hint</button><details><summary>Reveal the worked answer</summary><label><span>What have you tried?</span><input value={reason} onChange={(event) => setReason(event.currentTarget.value)} placeholder="I used the formula but…" /></label>{!reveal ? <button className="story-secondary" type="button" disabled={reason.trim().length < 8 || busy} onClick={() => void beginReveal()}>Start reflection pause</button> : <><p>{seconds > 0 ? `Review your working for ${seconds} more second${seconds === 1 ? "" : "s"}.` : "Type the confirmation phrase when ready."}</p><label><span>Confirmation phrase</span><input value={confirmation} onChange={(event) => setConfirmation(event.currentTarget.value)} placeholder="show answer" /></label><button className="story-secondary" type="button" disabled={seconds > 0 || confirmation.toLowerCase() !== "show answer" || busy} onClick={() => void finishReveal()}>Show worked answer</button></>}</details></div> : null}
          {revealedAnswer ? <div className="story-revealed"><p className="story-kicker">Worked answer</p><p>{revealedAnswer}</p></div> : null}
          {complete ? <button className="story-primary" type="button" onClick={onComplete}>Continue to teach-back <span aria-hidden="true">→</span></button> : null}
          {error ? <p className="story-error" role="alert">{error}</p> : null}
        </div>
        <aside className="story-mode-panel" aria-label="Tutoring mode">
          <p className="story-kicker">Choose your support</p>
          <div className="story-mode-options">{modes.map((item) => <button key={item.id} type="button" className={mode === item.id ? "active" : ""} onClick={() => changeMode(item.id)}><strong>{item.label}</strong><span>{item.detail}</span></button>)}</div>
        </aside>
      </div>
      {transfer && !transfer.completed ? <section className="story-transfer" aria-labelledby="transfer-title"><p className="story-kicker">Recovery task</p><h3 id="transfer-title">Apply the relationship to a fresh case</h3><p>{transfer.challenge.prompt}</p><label className="story-response"><span>Answer in {transfer.challenge.expectedUnit}</span><input value={transferResponse} onChange={(event) => setTransferResponse(event.currentTarget.value)} /></label><button className="story-primary" type="button" disabled={busy || !transferResponse.trim()} onClick={() => void submitTransfer()}>Check transfer</button>{transferResult ? <p className={transferResult.correct ? "story-feedback correct" : "story-feedback"} role="status">{transferResult.feedback}</p> : null}</section> : null}
    </section>
  );
}
