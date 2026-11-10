import type { EssayDraftResponse, EssayStage, StyleViolation } from "@discere/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { errorMessage } from "../../api/client.js";
import { reviseEssay, saveEssayDraft, submitEssay } from "../../api/endpoints.js";
import { queryKeys, useEssayDraft } from "../../api/queries.js";
import { countWords } from "../../lib/format.js";
import { ErrorScreen, LoadingScreen, Notice } from "../../ui/Feedback.js";
import { useCapability } from "../../capabilities/capability-context.js";
import { InlineRichText, splitParagraphs } from "../../ui/RichText.js";
import { AssessmentPanel } from "../essay/AssessmentPanel.js";
import { autosaveLabel, useAutosave } from "../essay/autosave.js";
import { EarlierVersions } from "../essay/EarlierVersions.js";
import { useTutoringMode } from "../mode-context.js";

const AUTOSAVE_DELAY_MS = 1200;

/**
 * The writing task of a lesson. It is optional: `onSkip`, when given, leaves it without
 * submitting, and the lesson carries on to its review cards and completes as usual.
 */
export function EssayStageView({
  stage,
  onContinue,
  onSkip,
}: {
  stage: EssayStage;
  onContinue: () => void;
  onSkip?: () => void;
}) {
  const draft = useEssayDraft(stage.essayId);
  if (draft.isPending) return <LoadingScreen embedded message="Opening your draft…" />;
  if (draft.error || !draft.data) {
    return (
      <ErrorScreen
        embedded
        message={errorMessage(draft.error, "The draft could not be loaded.")}
        title="This writing task is unavailable"
      />
    );
  }
  return (
    <EssayEditor
      initialContent={draft.data.content}
      initialSavedAt={draft.data.updatedAt}
      initiallySubmitted={draft.data.submitted}
      initialEarlierVersions={draft.data.earlierVersions}
      onContinue={onContinue}
      {...(onSkip ? { onSkip } : {})}
      stage={stage}
    />
  );
}

function EssayEditor({
  stage,
  initialContent,
  initialSavedAt,
  initiallySubmitted,
  initialEarlierVersions,
  onContinue,
  onSkip,
}: {
  stage: EssayStage;
  initialContent: string;
  initialSavedAt: string | null;
  initiallySubmitted: boolean;
  initialEarlierVersions: EssayDraftResponse["earlierVersions"];
  onContinue: () => void;
  onSkip?: () => void;
}) {
  const queryClient = useQueryClient();
  const { mode } = useTutoringMode();
  const tutor = useCapability("tutor_generation");
  const tutorUnavailable = tutor?.state === "unavailable";
  // The first paragraph is the task. Later ones are the material it supplies: a question,
  // the evidence, a draft to revise.
  const [task = stage.prompt, ...material] = splitParagraphs(stage.prompt);
  const [content, setContent] = useState(initialContent);
  const [submitted, setSubmitted] = useState(initiallySubmitted);
  // Every submitted version is kept. The one in the editor is the next number after them.
  const [earlierVersions, setEarlierVersions] = useState(initialEarlierVersions);
  const version = earlierVersions.length + 1;
  const [assessing, setAssessing] = useState(false);
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
      // Submitting records the task as done in the lesson, also when it was skipped before.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.essay(stage.essayId) }),
        queryClient.invalidateQueries({ queryKey: ["journey-progress"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home }),
        queryClient.invalidateQueries({ queryKey: ["course"] }),
      ]);
    } catch (error) {
      setFailure(errorMessage(error, "Your writing could not be submitted."));
    } finally {
      setBusy(false);
    }
  }

  async function revise(): Promise<void> {
    setBusy(true);
    setFailure(null);
    try {
      const draft = await reviseEssay(stage.essayId);
      setEarlierVersions(draft.earlierVersions);
      setContent(draft.content);
      setStyleNotes([]);
      setSubmitted(false);
      // The assessment on screen belongs to the version just set aside.
      queryClient.removeQueries({ queryKey: queryKeys.essayAssessment(stage.essayId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.essay(stage.essayId) });
    } catch (error) {
      setFailure(errorMessage(error, "This version could not be opened for revising."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="essay">
      <div className="essay-prompt">
        <h1>{stage.title}</h1>
        <p className="deck">
          <InlineRichText text={task} />
        </p>
        {material.length > 0 ? (
          <div className="essay-material prose">
            {material.map((paragraph) => (
              <p key={paragraph}>
                <InlineRichText text={paragraph} />
              </p>
            ))}
          </div>
        ) : null}
        <p className="muted">{stage.expectedScope}</p>
        {stage.optional && !submitted && version === 1 ? (
          <p className="muted">
            This task is optional. The lesson is complete whether or not you write it.
          </p>
        ) : null}
        {tutorUnavailable && !submitted ? (
          <Notice tone="info" title="The tutor is not available">
            <p>
              {tutor.reason} You can still write and submit. Nothing will assess your writing, so
              check it yourself against the list under “What a strong answer does”.
            </p>
          </Notice>
        ) : null}
      </div>

      <div className="essay-editor">
        <label className="sr-only" htmlFor="essay-content">
          Your writing
        </label>
        <textarea
          className="textarea essay-textarea"
          id="essay-content"
          onChange={(event) => setContent(event.currentTarget.value)}
          placeholder="Write here."
          readOnly={submitted}
          value={content}
        />
        <div className="essay-status">
          <p aria-live="polite" className="muted">
            {submitted
              ? version > 1
                ? `Version ${version}, submitted. Choose Revise to change it.`
                : "Submitted. Choose Revise to change it."
              : version > 1
                ? `Version ${version}. ${autosaveLabel(autosave.status, autosave.savedAt)}`
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
              {version > 1 ? `Submit version ${version}` : "Submit"}
            </button>
          ) : (
            <p className="muted">
              {stage.minWords - words} more {stage.minWords - words === 1 ? "word" : "words"} before
              you can submit.
            </p>
          )}
          {version > 1 ? (
            // An earlier version is already submitted, so there is nothing left to skip.
            <button className="button button-quiet" onClick={onContinue} type="button">
              Continue without submitting
            </button>
          ) : onSkip ? (
            <button className="button button-quiet" onClick={onSkip} type="button">
              Skip this task
            </button>
          ) : null}
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
        <Notice live tone="error" title={submitted ? "Revising failed" : "Submission failed"}>
          <p>{failure}</p>
        </Notice>
      ) : null}

      {submitted ? (
        <>
          <AssessmentPanel
            essayId={stage.essayId}
            mode={mode === "exam" ? "direct" : mode}
            onPendingChange={setAssessing}
            {...(tutorUnavailable ? { unavailableReason: tutor.reason } : {})}
          />
          <div className="button-row">
            <button
              aria-busy={busy}
              className="button button-secondary"
              disabled={assessing || busy}
              onClick={() => void revise()}
              type="button"
            >
              Revise
            </button>
            <button className="button button-primary" onClick={onContinue} type="button">
              Continue
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
          </div>
          <p className="muted essay-note">
            {assessing
              ? "You can revise once the tutor has finished reading this version."
              : "Revise opens this text for editing. The submitted version and its feedback are kept under “Earlier versions”."}
          </p>
        </>
      ) : null}

      <EarlierVersions
        essayId={stage.essayId}
        key={earlierVersions.length}
        openLatest={!submitted}
        versions={earlierVersions}
      />
    </div>
  );
}
