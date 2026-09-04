import {
  type RomanReferenceAction,
  RomanReferenceContinuityChoiceIdSchema,
  RomanReferenceMapRegionIdSchema,
  RomanReferenceOpeningOrderSchema,
  type RomanReferenceProgress,
  type RomanReferenceQuestionContent,
  type RomanReferenceQuestionId,
  RomanReferenceQuestionIdSchema,
  type RomanReferenceQuestionProgress,
  type RomanReferenceQuestionResponse,
  type RomanReferenceQuestionView,
  RomanReferenceTurningPointIdSchema,
  type TutoringMode,
} from "@discere/contracts";
import { Check, CircleAlert, GripVertical, Lightbulb, Lock, X } from "lucide-react";
import { type DragEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { ModeProvider, useTutoringMode } from "../journey/mode-context.js";
import {
  AugustusProfile,
  COURSE_PATH,
  ReferenceFrame,
  romanReferencePaths,
} from "./RomanReference.js";
import { questionSources } from "./RomanReferenceQuestionSources.js";
import { ROMAN_REFERENCE_LESSON_ID, useReferenceProgress } from "./reference-progress.js";

const QUESTION_IDS = [
  "turning-points",
  "476-continuity",
  "map-117",
  "two-sentence",
] as const satisfies readonly RomanReferenceQuestionId[];

const MODE_LABELS: Record<TutoringMode, string> = {
  coach: "Coach",
  assisted: "Assisted",
  direct: "Direct",
  exam: "Exam",
};

const QUESTION_CONCEPTS: Record<RomanReferenceQuestionId, string[]> = {
  "turning-points": ["roman-turning-points", "augustus-principate"],
  "476-continuity": ["fall-and-legacy", "constantinople"],
  "map-117": ["roman-expansion", "roman-geography"],
  "two-sentence": ["augustus-principate", "roman-expansion"],
};

type SaveReference = (action: RomanReferenceAction) => Promise<RomanReferenceProgress>;
type SaveState = "idle" | "saving" | "saved" | "failed";

function storedResponse(progress: RomanReferenceQuestionProgress) {
  return progress.draft ?? progress.submittedResponse;
}

function initialResponse(view: RomanReferenceQuestionView): RomanReferenceQuestionResponse | null {
  const stored = storedResponse(view.progress);
  if (stored) return stored;
  const content = view.content;
  if (content.kind === "ordering") {
    return {
      kind: "ordering",
      order: RomanReferenceOpeningOrderSchema.parse(content.options.map((option) => option.id)),
    };
  }
  if (content.kind === "multi_select") return { kind: "multi_select", choiceIds: [] };
  if (content.kind === "free_response") return { kind: "free_response", text: "" };
  return null;
}

function responseMatches(
  left: RomanReferenceQuestionResponse | null,
  right: RomanReferenceQuestionResponse | null,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sentenceCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return (trimmed.match(/[^.!?]+(?:[.!?]+|$)/g) ?? []).filter((part) => part.trim()).length;
}

function readText(content: RomanReferenceQuestionContent): string {
  const choices =
    content.kind === "ordering"
      ? content.options.map((option) => option.label)
      : content.kind === "selection" || content.kind === "multi_select"
        ? content.choices.map((choice) => choice.label)
        : [];
  const instruction = "instruction" in content ? content.instruction : "";
  const mapDescription = content.kind === "multi_select" ? content.mapDescription : "";
  return [content.prompt, instruction, mapDescription, ...choices].filter(Boolean).join(". ");
}

function responseText(
  content: RomanReferenceQuestionContent,
  response: RomanReferenceQuestionResponse,
): string {
  if (response.kind === "free_response") return response.text;
  if (response.kind === "ordering" && content.kind === "ordering") {
    const labels = new Map(content.options.map((option) => [option.id, option.label]));
    return response.order.map((id) => labels.get(id) ?? id).join(" → ");
  }
  if (response.kind === "selection" && content.kind === "selection") {
    return (
      content.choices.find((choice) => choice.id === response.choiceId)?.label ?? response.choiceId
    );
  }
  if (response.kind === "multi_select" && content.kind === "multi_select") {
    const labels = new Map(content.choices.map((choice) => [choice.id, choice.label]));
    return response.choiceIds.map((id) => labels.get(id) ?? id).join(" and ");
  }
  return "The authorised answer is available in the feedback above.";
}

function CompactModeControl({ lockedMode }: { lockedMode: TutoringMode | null }) {
  const { mode, setMode } = useTutoringMode();
  const effectiveMode = lockedMode ?? mode;
  if (lockedMode) {
    return (
      <p className="reference-mode-locked">
        <Lock aria-hidden="true" size={14} />
        {MODE_LABELS[lockedMode]}
      </p>
    );
  }
  return (
    <fieldset aria-label="Learning mode" className="reference-mode-control">
      {(Object.keys(MODE_LABELS) as TutoringMode[]).map((candidate) => (
        <button
          aria-pressed={candidate === effectiveMode}
          key={candidate}
          onClick={() => setMode(candidate)}
          type="button"
        >
          {MODE_LABELS[candidate]}
        </button>
      ))}
    </fieldset>
  );
}

function ResultFeedback({ progress }: { progress: RomanReferenceQuestionProgress }) {
  if (!progress.feedback || !progress.result) return null;
  const Icon =
    progress.result === "correct" ? Check : progress.result === "incorrect" ? X : CircleAlert;
  return (
    <section
      aria-live="polite"
      className={`reference-question-feedback is-${progress.result}`}
      data-result={progress.result}
    >
      <Icon aria-hidden="true" size={24} />
      <p>{progress.feedback}</p>
    </section>
  );
}

interface ResponseEditorProps {
  busy: boolean;
  content: RomanReferenceQuestionContent;
  draft: RomanReferenceQuestionResponse | null;
  locked: boolean;
  onChange: (response: RomanReferenceQuestionResponse, announcement?: string) => void;
}

function OrderingResponse({ busy, content, draft, locked, onChange }: ResponseEditorProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  if (content.kind !== "ordering") return null;
  const fallback = RomanReferenceOpeningOrderSchema.parse(
    content.options.map((option) => option.id),
  );
  const order = draft?.kind === "ordering" ? draft.order : fallback;
  const labels = new Map(content.options.map((option) => [option.id, option.label]));
  const canEdit = !locked && !busy;

  function move(index: number, delta: number) {
    if (!canEdit) return;
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const current = next[index];
    const other = next[target];
    if (!current || !other) return;
    next[index] = other;
    next[target] = current;
    onChange(
      { kind: "ordering", order: RomanReferenceOpeningOrderSchema.parse(next) },
      `${labels.get(current) ?? current} moved to position ${target + 1} of ${next.length}.`,
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(index, -1);
    } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      move(index, 1);
    }
  }

  function onDrop(event: DragEvent<HTMLLIElement>, targetId: string) {
    event.preventDefault();
    if (!canEdit || !draggedId || draggedId === targetId) return;
    const from = order.indexOf(RomanReferenceTurningPointIdSchema.parse(draggedId));
    const to = order.indexOf(RomanReferenceTurningPointIdSchema.parse(targetId));
    if (from < 0 || to < 0) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setDraggedId(null);
    onChange(
      { kind: "ordering", order: RomanReferenceOpeningOrderSchema.parse(next) },
      `${labels.get(moved) ?? moved} moved to position ${to + 1} of ${next.length}.`,
    );
  }

  return (
    <ol aria-describedby="reference-order-instruction" className="reference-question-order">
      {order.map((id, index) => (
        <li
          draggable={canEdit}
          key={id}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={() => canEdit && setDraggedId(id)}
          onDrop={(event) => onDrop(event, id)}
        >
          <button
            aria-disabled={!canEdit}
            aria-label={`${labels.get(id) ?? id}, position ${index + 1} of ${order.length}`}
            aria-roledescription="sortable turning point"
            onKeyDown={(event) => onKeyDown(event, index)}
            type="button"
          >
            <GripVertical aria-hidden="true" size={20} />
            <span>{index + 1}</span>
            <strong>{labels.get(id) ?? id}</strong>
          </button>
        </li>
      ))}
    </ol>
  );
}

function SelectionResponse({ busy, content, draft, locked, onChange }: ResponseEditorProps) {
  if (content.kind !== "selection") return null;
  const selected = draft?.kind === "selection" ? draft.choiceId : null;
  return (
    <fieldset className="reference-question-choices">
      <legend className="sr-only">Choose one answer</legend>
      {content.choices.map((choice, index) => (
        <label className={selected === choice.id ? "is-selected" : undefined} key={choice.id}>
          <input
            checked={selected === choice.id}
            disabled={locked || busy}
            name="reference-continuity-choice"
            onChange={() =>
              onChange({
                kind: "selection",
                choiceId: RomanReferenceContinuityChoiceIdSchema.parse(choice.id),
              })
            }
            type="radio"
          />
          <span aria-hidden="true" className="reference-choice-letter">
            {String.fromCharCode(65 + index)}
          </span>
          <span>{choice.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

function MultiSelectResponse({ busy, content, draft, locked, onChange }: ResponseEditorProps) {
  if (content.kind !== "multi_select") return null;
  const selected = draft?.kind === "multi_select" ? draft.choiceIds : [];
  return (
    <fieldset className="reference-question-choices is-multi">
      <legend className="sr-only">Choose two regions</legend>
      {content.choices.map((choice) => {
        const checked = selected.includes(RomanReferenceMapRegionIdSchema.parse(choice.id));
        return (
          <label className={checked ? "is-selected" : undefined} key={choice.id}>
            <input
              checked={checked}
              disabled={locked || busy || (!checked && selected.length >= content.selectionCount)}
              onChange={() => {
                const id = RomanReferenceMapRegionIdSchema.parse(choice.id);
                const next = checked ? selected.filter((item) => item !== id) : [...selected, id];
                onChange({ kind: "multi_select", choiceIds: next });
              }}
              type="checkbox"
            />
            <span aria-hidden="true" className="reference-choice-check">
              {checked ? <Check size={16} /> : null}
            </span>
            <span>{choice.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function FreeResponse({ busy, content, draft, locked, onChange }: ResponseEditorProps) {
  if (content.kind !== "free_response") return null;
  const value = draft?.kind === "free_response" ? draft.text : "";
  const count = sentenceCount(value);
  return (
    <div className="reference-question-writing">
      <label htmlFor="reference-two-sentence-answer">Your two sentences</label>
      <textarea
        disabled={locked || busy}
        id="reference-two-sentence-answer"
        maxLength={content.maxLength}
        onChange={(event) => onChange({ kind: "free_response", text: event.currentTarget.value })}
        rows={7}
        value={value}
      />
      <p aria-live="polite">
        {count} {count === 1 ? "sentence" : "sentences"}
      </p>
    </div>
  );
}

function QuestionVisual({
  content,
  progress,
}: {
  content: RomanReferenceQuestionContent;
  progress: RomanReferenceQuestionProgress;
}) {
  if (content.id === "476-continuity") {
    const continuationReleased = progress.feedback !== null || progress.revealedAnswer !== null;
    return (
      <figure className="reference-continuity-visual">
        <div>
          <span>West</span>
          <strong>476</strong>
        </div>
        <div>
          <span>East</span>
          <strong>{continuationReleased ? "continues" : "?"}</strong>
        </div>
        <figcaption className="sr-only">
          {continuationReleased
            ? "The western court ends in 476 while eastern Roman government continues."
            : "The year 476 is marked in the west; the eastern outcome is not yet shown."}
        </figcaption>
      </figure>
    );
  }
  if (content.id === "map-117") {
    return (
      <figure className="reference-question-map">
        <img
          alt="The Roman Empire at its greatest extent under Trajan in 117 CE"
          src="/api/content/roman-empire/assets/roman-empire-extent-117ce.png"
        />
        <figcaption>Roman territory in 117 CE</figcaption>
      </figure>
    );
  }
  if (content.id === "two-sentence") {
    return (
      <figure className="reference-question-comparison">
        <AugustusProfile compact />
        <img
          alt="The Roman Empire at its greatest extent under Trajan in 117 CE"
          src="/api/content/roman-empire/assets/roman-empire-extent-117ce.png"
        />
        <figcaption>Augustus in 27 BCE and Roman territory in 117 CE</figcaption>
      </figure>
    );
  }
  return (
    <figure className="reference-order-visual">
      <span aria-hidden="true" />
      <figcaption>Four turning points on one timeline</figcaption>
    </figure>
  );
}

function MapTextEquivalent({ description }: { description: string }) {
  return (
    <details className="reference-question-map-text">
      <summary>Read the map as text</summary>
      <p>{description}</p>
    </details>
  );
}

interface QuestionBodyProps {
  assessmentFinished: boolean;
  questions: readonly RomanReferenceQuestionView[];
  save: SaveReference;
  view: RomanReferenceQuestionView;
}

function QuestionBody({ assessmentFinished, questions, save, view }: QuestionBodyProps) {
  const navigate = useNavigate();
  const { mode: selectedMode } = useTutoringMode();
  const { content, progress } = view;
  const [draft, setDraft] = useState<RomanReferenceQuestionResponse | null>(() =>
    initialResponse(view),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealReason, setRevealReason] = useState("");
  const [revealConfirmation, setRevealConfirmation] = useState("");
  const revision = useRef(0);
  const effectiveMode = progress.mode ?? selectedMode;
  const submitted = progress.submittedResponse;
  const draftChanged = !responseMatches(draft, submitted);
  const locked =
    assessmentFinished || progress.status === "revealed" || progress.result === "correct";
  const canAdvance =
    !draftChanged &&
    (progress.status === "revealed" ||
      progress.result === "correct" ||
      (effectiveMode === "exam" && progress.status === "submitted"));
  const canFinishAssessment =
    assessmentFinished ||
    questions.every(({ progress: item }) => {
      if (item.submittedResponse === null) return false;
      return item.mode === "exam" || item.status === "revealed" || item.result === "correct";
    });
  const questionIndex = QUESTION_IDS.indexOf(content.id);
  const previousPath =
    questionIndex <= 0
      ? romanReferencePaths.expansion
      : romanReferencePaths.question(QUESTION_IDS[questionIndex - 1] ?? "turning-points");
  const nextQuestion = QUESTION_IDS[questionIndex + 1] ?? null;

  useEffect(() => {
    if (progress.mode && progress.mode !== selectedMode) {
      // The server-owned lock is rendered immediately through effectiveMode. Local storage remains
      // the learner's preference for a later, unlocked question.
      setRevealOpen(false);
    }
  }, [progress.mode, selectedMode]);

  function responseReady(response: RomanReferenceQuestionResponse | null): boolean {
    if (!response) return false;
    if (response.kind === "selection") return response.choiceId.length > 0;
    if (response.kind === "multi_select") return response.choiceIds.length === 2;
    if (response.kind === "free_response") return response.text.trim().length > 0;
    return response.order.length === 4;
  }

  function persistDraft(response: RomanReferenceQuestionResponse, message?: string) {
    if (locked || busy) return;
    revision.current += 1;
    const currentRevision = revision.current;
    setDraft(response);
    setFailure(null);
    setSaveState("saving");
    if (message) setAnnouncement(message);
    void save({ action: "update_question_draft", questionId: content.id, response })
      .then(() => {
        if (revision.current === currentRevision) setSaveState("saved");
      })
      .catch((error) => {
        if (revision.current !== currentRevision) return;
        setSaveState("failed");
        setFailure(errorMessage(error, "That response was not saved. Try again."));
      });
  }

  async function submit() {
    if (!responseReady(draft) || locked || busy || !draft) return;
    setBusy(true);
    setFailure(null);
    try {
      await save({
        action: "submit_question",
        questionId: content.id,
        response: draft,
        mode: effectiveMode,
      });
      setSaveState("saved");
    } catch (error) {
      setFailure(errorMessage(error, "Your answer was not checked. Stay here and try again."));
    } finally {
      setBusy(false);
    }
  }

  async function requestHint() {
    if (busy || progress.status === "editing") return;
    setBusy(true);
    setFailure(null);
    try {
      await save({
        action: "request_question_hint",
        questionId: content.id,
        mode: effectiveMode,
      });
    } catch (error) {
      setFailure(errorMessage(error, "A hint could not be opened for this question."));
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    if (
      busy ||
      effectiveMode !== "direct" ||
      revealReason.trim().length < 20 ||
      revealConfirmation !== "show answer"
    ) {
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      await save({
        action: "reveal_question",
        questionId: content.id,
        mode: "direct",
        reason: revealReason,
        confirmation: "show answer",
      });
      setRevealOpen(false);
    } catch (error) {
      setFailure(errorMessage(error, "The answer could not be revealed."));
    } finally {
      setBusy(false);
    }
  }

  async function authoriseAccess(kind: "sources" | "tutor") {
    await save({
      action: kind === "sources" ? "access_question_sources" : "access_question_tutor",
      questionId: content.id,
      mode: effectiveMode,
    });
  }

  async function advance() {
    if (!canAdvance) return;
    if (nextQuestion) {
      navigate(romanReferencePaths.question(nextQuestion));
      return;
    }
    if (!assessmentFinished && canFinishAssessment) {
      await save({ action: "finish_assessment" });
      return;
    }
    navigate(COURSE_PATH);
  }

  const showSubmit =
    !locked && responseReady(draft) && (progress.status === "editing" || draftChanged);
  const submitLabel =
    progress.status === "editing"
      ? content.kind === "ordering"
        ? "Check order"
        : "Check answer"
      : "Check again";
  const canAskForHint =
    !locked &&
    progress.status !== "editing" &&
    (effectiveMode === "coach" || effectiveMode === "assisted");
  const canReveal = !locked && effectiveMode === "direct" && progress.status === "submitted";

  return (
    <ReferenceFrame
      backPath={previousPath}
      beat="questions"
      conceptIds={QUESTION_CONCEPTS[content.id]}
      effectiveMode={effectiveMode}
      nextDisabled={busy}
      nextLabel={
        nextQuestion
          ? "Next"
          : canFinishAssessment && !assessmentFinished
            ? "Finish"
            : "Course home"
      }
      {...(canAdvance ? { onNext: advance } : { nextPath: null })}
      onBeforeOpenSources={() => authoriseAccess("sources")}
      onBeforeOpenTutor={() => authoriseAccess("tutor")}
      reachedSteps={[1, 2, 3]}
      readText={readText(content)}
      referenceQuestionId={content.id}
      sources={questionSources(content)}
    >
      <main className={`reference-main reference-question is-${content.kind}`} id="stage">
        <div className="reference-question-progress-row">
          <div
            aria-label={`Question ${content.ordinal} of 4`}
            aria-valuemax={4}
            aria-valuemin={1}
            aria-valuenow={content.ordinal}
            className="reference-question-progress"
            role="progressbar"
          >
            <span>{content.ordinal} / 4</span>
            <span aria-hidden="true">
              <span style={{ width: `${(content.ordinal / 4) * 100}%` }} />
            </span>
          </div>
          <CompactModeControl lockedMode={progress.mode} />
        </div>

        <div className="reference-question-heading">
          <div>
            <h1>{content.prompt}</h1>
            {"instruction" in content ? (
              <p className="reference-orientation" id="reference-order-instruction">
                {content.instruction}
              </p>
            ) : content.kind === "multi_select" ? (
              <p className="reference-orientation">Choose two.</p>
            ) : null}
          </div>
          <QuestionVisual content={content} progress={progress} />
        </div>

        {content.kind === "multi_select" ? (
          <MapTextEquivalent description={content.mapDescription} />
        ) : null}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>

        <OrderingResponse
          busy={busy}
          content={content}
          draft={draft}
          locked={locked}
          onChange={persistDraft}
        />
        <SelectionResponse
          busy={busy}
          content={content}
          draft={draft}
          locked={locked}
          onChange={persistDraft}
        />
        <MultiSelectResponse
          busy={busy}
          content={content}
          draft={draft}
          locked={locked}
          onChange={persistDraft}
        />
        <FreeResponse
          busy={busy}
          content={content}
          draft={draft}
          locked={locked}
          onChange={persistDraft}
        />

        <div className="reference-question-actions">
          {showSubmit ? (
            <button
              aria-busy={busy}
              className="reference-primary"
              disabled={busy}
              onClick={() => void submit()}
              type="button"
            >
              {submitLabel}
            </button>
          ) : null}
          {canAskForHint ? (
            <button
              className="reference-text-action"
              disabled={busy}
              onClick={() => void requestHint()}
              type="button"
            >
              <Lightbulb aria-hidden="true" size={17} />
              Ask for a hint
            </button>
          ) : null}
          {canReveal && !revealOpen ? (
            <button
              className="reference-text-action"
              disabled={busy}
              onClick={() => setRevealOpen(true)}
              type="button"
            >
              Reveal answer
            </button>
          ) : null}
          {saveState === "saving" ? <span aria-live="polite">Saving…</span> : null}
          {saveState === "saved" ? <span aria-live="polite">Saved</span> : null}
        </div>

        {effectiveMode === "exam" && progress.status === "submitted" && !progress.feedback ? (
          <p className="reference-exam-note">Answer saved. Feedback opens after you finish.</p>
        ) : null}

        {progress.hints.length > 0 ? (
          <ol aria-label="Hints" className="reference-question-hints">
            {progress.hints.map((hint) => (
              <li key={hint.level}>
                <Lightbulb aria-hidden="true" size={17} />
                {hint.text}
              </li>
            ))}
          </ol>
        ) : null}

        <ResultFeedback progress={progress} />

        {progress.revealedAnswer ? (
          <section className="reference-revealed-answer">
            <h2>Answer</h2>
            <p>{responseText(content, progress.revealedAnswer)}</p>
          </section>
        ) : null}

        {revealOpen ? (
          <section className="reference-reveal-form">
            <h2>Before the answer opens</h2>
            <label htmlFor="reference-reveal-reason">Why do you need the answer?</label>
            <textarea
              disabled={busy}
              id="reference-reveal-reason"
              maxLength={500}
              onChange={(event) => setRevealReason(event.currentTarget.value)}
              rows={3}
              value={revealReason}
            />
            <label htmlFor="reference-reveal-confirmation">
              Type <strong>show answer</strong> to confirm
            </label>
            <input
              disabled={busy}
              id="reference-reveal-confirmation"
              onChange={(event) => setRevealConfirmation(event.currentTarget.value)}
              value={revealConfirmation}
            />
            <div>
              <button
                className="reference-primary"
                disabled={
                  busy || revealReason.trim().length < 20 || revealConfirmation !== "show answer"
                }
                onClick={() => void reveal()}
                type="button"
              >
                Show answer
              </button>
              <button
                className="reference-text-action"
                disabled={busy}
                onClick={() => setRevealOpen(false)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        {failure || saveState === "failed" ? (
          <p aria-live="assertive" className="reference-save-error">
            {failure ?? "That response was not saved. Try again."}
          </p>
        ) : null}
      </main>
    </ReferenceFrame>
  );
}

function RomanReferenceQuestionRouteContent() {
  const { referenceQuestion } = useParams();
  const parsedId = RomanReferenceQuestionIdSchema.safeParse(referenceQuestion);
  const reference = useReferenceProgress();

  if (reference.isError) {
    return (
      <ReferenceFrame
        beat="questions"
        effectiveMode="exam"
        reachedSteps={[1, 2, 3]}
        readText="The saved Roman lesson question could not be restored."
        sources={[]}
      >
        <main className="reference-main reference-question-invalid" id="stage">
          <h1>Question unavailable</h1>
          <p className="reference-orientation">Refresh the page or return to the course.</p>
        </main>
      </ReferenceFrame>
    );
  }

  if (!parsedId.success) {
    return (
      <ReferenceFrame
        beat="questions"
        effectiveMode="exam"
        reachedSteps={[1, 2, 3]}
        readText="That Roman lesson question does not exist."
        sources={[]}
      >
        <main className="reference-main reference-question-invalid" id="stage">
          <h1>Question not found</h1>
          <p className="reference-orientation">
            Return to the course and continue from your saved place.
          </p>
        </main>
      </ReferenceFrame>
    );
  }

  if (!reference.data) {
    return (
      <ReferenceFrame
        beat="questions"
        effectiveMode="exam"
        nextPath={null}
        reachedSteps={[1, 2, 3]}
        readText="Restoring your Roman lesson question."
        sources={[]}
      >
        <main className="reference-main reference-question-loading" id="stage">
          <p aria-live="polite">Restoring your question…</p>
        </main>
      </ReferenceFrame>
    );
  }

  const view = reference.data.questions.find((question) => question.content.id === parsedId.data);
  if (!view) {
    return (
      <ReferenceFrame
        beat="questions"
        effectiveMode="exam"
        reachedSteps={[1, 2, 3]}
        readText="That Roman lesson question is unavailable."
        sources={[]}
      >
        <main className="reference-main reference-question-invalid" id="stage">
          <h1>Question unavailable</h1>
          <p className="reference-orientation">Return to the course and try again.</p>
        </main>
      </ReferenceFrame>
    );
  }

  return (
    <QuestionBody
      assessmentFinished={reference.data.assessmentFinished}
      questions={reference.data.questions}
      key={parsedId.data}
      save={reference.save}
      view={view}
    />
  );
}

export function RomanReferenceQuestion() {
  return (
    <ModeProvider lessonId={ROMAN_REFERENCE_LESSON_ID}>
      <RomanReferenceQuestionRouteContent />
    </ModeProvider>
  );
}
