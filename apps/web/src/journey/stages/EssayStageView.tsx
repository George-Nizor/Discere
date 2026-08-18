import type { EssayStage, StyleViolation } from "@discere/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { errorMessage } from "../../api/client.js";
import { saveEssayDraft, submitEssay } from "../../api/endpoints.js";
import { queryKeys, useEssayDraft } from "../../api/queries.js";
import { countWords } from "../../lib/format.js";
import { ErrorScreen, LoadingScreen, Notice } from "../../ui/Feedback.js";
import { InlineRichText } from "../../ui/RichText.js";
import { AssessmentPanel } from "../essay/AssessmentPanel.js";
import { autosaveLabel, useAutosave } from "../essay/autosave.js";
import { useTutoringMode } from "../mode-context.js";

const AUTOSAVE_DELAY_MS = 1200;

export function EssayStageView({
  stage,
  onContinue,
}: {
  stage: EssayStage;
  onContinue: () => void;
}) {
  const draft = useEssayDraft(stage.essayId);
  if (draft.isPending) return <LoadingScreen message="Opening your draft…" />;
  if (draft.error || !draft.data) {
    return (
      <ErrorScreen
        message={errorMessage(draft.error, "The draft could not be loaded.")}
        title="This essay is unavailable"
      />
    );
  }
  return (
    <EssayEditor
      initialContent={draft.data.content}
      initialSavedAt={draft.data.updatedAt}
      initiallySubmitted={draft.data.submitted}
      onContinue={onContinue}
      stage={stage}
    />
  );
}

function EssayEditor({
  stage,
  initialContent,
  initialSavedAt,
  initiallySubmitted,
  onContinue,
}: {
  stage: EssayStage;
  initialContent: string;
  initialSavedAt: string | null;
  initiallySubmitted: boolean;
  onContinue: () => void;
}) {
  const queryClient = useQueryClient();
  const { mode } = useTutoringMode();
  const [content, setContent] = useState(initialContent);
  const [submitted, setSubmitted] = useState(initiallySubmitted);
  const [styleNotes, setStyleNotes] = useState<StyleViolation[]>([]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const persist = useCallback(
    async (value: string) => {
      const saved = await saveEssayDraft(stage.essayId, value);
      return saved.updatedAt;
    },
    [stage.essayId],
  );

  const autosave = useAutosave({
    value: content,
    enabled: !submitted,
    delayMs: AUTOSAVE_DELAY_MS,
    initialSavedAt,
    onSave: persist,
  });

  const words = countWords(content);
  const longEnough = words >= stage.minWords;

  async function send(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      const result = await submitEssay(stage.essayId, content);
      setSubmitted(true);
      setStyleNotes(result.styleNotes);
      await queryClient.invalidateQueries({ queryKey: queryKeys.essay(stage.essayId) });
    } catch (error) {
      setFailure(errorMessage(error, "The teach-back could not be submitted."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="essay">
      <div className="essay-prompt">
        <h1>{stage.title}</h1>
        <p className="deck">
          <InlineRichText text={stage.prompt} />
        </p>
        <p className="muted">{stage.expectedScope}</p>
      </div>

      <div className="essay-editor">
        <label className="sr-only" htmlFor="essay-content">
          Your teach-back
        </label>
        <textarea
          className="textarea essay-textarea"
          id="essay-content"
          onChange={(event) => setContent(event.currentTarget.value)}
          placeholder="Write your explanation here."
          readOnly={submitted}
          value={content}
        />
        <div className="essay-status">
          <p aria-live="polite" className="muted">
            {submitted
              ? "Submitted. The draft is now read-only."
              : autosaveLabel(autosave.status, autosave.savedAt)}
          </p>
          <p className="muted">
            {words} {words === 1 ? "word" : "words"}
            {stage.minWords > 0 ? ` · ${stage.minWords} needed` : ""}
          </p>
        </div>
      </div>

      <div className="essay-criteria">
        <h2>What a strong answer does</h2>
        <ul className="criteria-list">
          {stage.successCriteria.map((criterion) => (
            <li key={criterion}>
              <Check aria-hidden="true" size={16} strokeWidth={2} />
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
      </div>

      {!submitted ? (
        <div className="button-row">
          <button
            className="button button-secondary"
            onClick={() => void autosave.saveNow()}
            type="button"
          >
            Save draft
          </button>
          {longEnough ? (
            <button
              aria-busy={busy}
              className="button button-primary"
              onClick={() => void send()}
              type="button"
            >
              {busy ? <Loader2 aria-hidden="true" className="spin" size={16} /> : null}
              Submit teach-back
            </button>
          ) : (
            <p className="muted">
              {stage.minWords - words} more {stage.minWords - words === 1 ? "word" : "words"} before
              you can submit.
            </p>
          )}
        </div>
      ) : null}

      {styleNotes.length > 0 ? (
        <section aria-label="Style notes" className="style-notes">
          <h2>Style notes</h2>
          <p className="muted">
            These are observations about the writing. They did not affect your submission.
          </p>
          <ul className="plain-list">
            {styleNotes.map((note) => (
              <li key={`${note.ruleId}-${note.start}`}>{note.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {failure ? (
        <Notice live tone="error" title="Submission failed">
          <p>{failure}</p>
        </Notice>
      ) : null}

      {submitted ? (
        <>
          <AssessmentPanel essayId={stage.essayId} mode={mode === "exam" ? "direct" : mode} />
          <div className="button-row">
            <button className="button button-primary" onClick={onContinue} type="button">
              Continue
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
