import { useEffect, useState } from "react";
import type { EssayStage } from "@discere/contracts";
import { getEssayDraft, saveEssayDraft, submitEssay } from "./api";

export function StoryEssay({ stage, onComplete }: { stage: EssayStage; onComplete: () => void }) {
  const [content, setContent] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedLabel, setSavedLabel] = useState("Loading draft…");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getEssayDraft(stage.essayId).then((draft) => { setContent(draft.content); setSubmitted(draft.submitted); setSavedLabel(draft.updatedAt ? "Draft saved" : "No draft saved yet"); setHydrated(true); }).catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : "Could not load the essay draft."); setHydrated(true); });
  }, [stage.essayId]);

  useEffect(() => {
    if (!hydrated || submitted) return;
    const timer = window.setTimeout(() => { void saveEssayDraft(stage.essayId, { content }).then(() => setSavedLabel("Saved just now")).catch(() => setSavedLabel("Could not autosave")); }, 650);
    return () => window.clearTimeout(timer);
  }, [content, hydrated, stage.essayId, submitted]);

  async function submit(): Promise<void> {
    setBusy(true); setError(undefined);
    try { await submitEssay(stage.essayId, { content }); setSubmitted(true); setSavedLabel("Submitted just now"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit the teach-back."); }
    finally { setBusy(false); }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  return (
    <section className="story-essay" aria-labelledby="essay-title">
      <div className="story-essay-prompt">
        <p className="story-kicker">Teach-back</p>
        <h2 id="essay-title">{stage.prompt}</h2>
        <p>{stage.expectedScope}</p>
        <details className="story-evidence"><summary>Success criteria</summary><ul>{stage.successCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></details>
        <details className="story-evidence"><summary>Lesson evidence</summary><p>Use the relationship, equation, and example from the previous visual stage. Sources: {stage.sourceIds.join(", ")}.</p></details>
      </div>
      <div className="story-essay-editor">
        <div className="story-editor-toolbar" aria-label="Writing tools"><button type="button" disabled aria-label="Bold">B</button><button type="button" disabled aria-label="Italic"><em>I</em></button><span>{wordCount} words</span></div>
        <textarea aria-label="Teach-back response" value={content} disabled={submitted} onChange={(event) => setContent(event.currentTarget.value)} placeholder="Write in your own words…" rows={14} />
        <div className="story-essay-footer"><span role="status">{savedLabel}</span><button className="story-primary" type="button" disabled={busy || submitted || wordCount < stage.minWords} onClick={() => void submit()}>{submitted ? "Submitted" : busy ? "Submitting…" : "Submit teach-back"}</button></div>
        {error ? <p className="story-error" role="alert">{error}</p> : null}
        {submitted ? <button className="story-secondary" type="button" onClick={onComplete}>Continue to review <span aria-hidden="true">→</span></button> : null}
      </div>
    </section>
  );
}
