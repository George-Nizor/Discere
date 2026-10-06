import type {
  RomanReferenceAction,
  RomanReferenceEssayEvidence,
  RomanReferenceEssayEvidenceId,
  RomanReferenceProgress,
  TutoringMode,
} from "@discere/contracts";
import { Check, CircleAlert, Lock, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { errorMessage } from "../api/client.js";
import { ModeProvider, useTutoringMode } from "../journey/mode-context.js";
import { ReferenceFrame, romanReferencePaths } from "./RomanReference.js";
import type { ReferenceSource } from "./ReferenceSourceDialog.js";
import { ROMAN_REFERENCE_LESSON_ID, useReferenceProgress } from "./reference-progress.js";

const ESSAY_SOURCES: ReferenceSource[] = [
  {
    title: "Augustus and the principate",
    detail: "OpenStax, World History Volume 1 - CC BY 4.0",
    href: "https://openstax.org/books/world-history-volume-1/pages/6-3-the-roman-empire",
  },
  {
    title: "The Roman Empire in 117 CE",
    detail: "Tataryn - CC BY-SA 3.0 - Wikimedia Commons",
    href: "https://commons.wikimedia.org/wiki/File:Roman_Empire_Trajan_117AD.png",
  },
  {
    title: "The eastward shift",
    detail: "OpenStax, World History Volume 1, section 10.1 - CC BY 4.0",
    href: "https://openstax.org/books/world-history-volume-1/pages/10-1-the-eastward-shift",
  },
  {
    title: "Fall of the Western Roman Empire",
    detail: "Wikipedia - CC BY-SA 4.0",
    href: "https://en.wikipedia.org/wiki/Fall_of_the_Western_Roman_Empire",
  },
];

const MODE_LABELS: Record<TutoringMode, string> = {
  coach: "Coach",
  assisted: "Assisted",
  direct: "Direct",
  exam: "Exam",
};

type SaveReference = (action: RomanReferenceAction) => Promise<RomanReferenceProgress>;
type SaveState = "idle" | "saving" | "saved" | "failed";

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function ModeControl({ lockedMode }: { lockedMode: TutoringMode | null }) {
  const { mode, setMode } = useTutoringMode();
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
          aria-pressed={candidate === mode}
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

function EvidenceVisual({ evidence }: { evidence: RomanReferenceEssayEvidence }) {
  if (evidence.visual === "map") {
    return <img alt="" src="/api/content/roman-empire/assets/roman-empire-extent-117ce.png" />;
  }
  const marks: Record<RomanReferenceEssayEvidence["visual"], string> = {
    portrait: "A",
    map: "",
    fracture: "III",
    tetrarchy: "IV",
    city: "C",
    continuity: "E/W",
  };
  return <span aria-hidden="true">{marks[evidence.visual]}</span>;
}

function EvidenceRail({
  evidence,
  selected,
  disabled,
  mode,
  onOpen,
  onToggle,
}: {
  evidence: readonly RomanReferenceEssayEvidence[];
  selected: readonly RomanReferenceEssayEvidenceId[];
  disabled: boolean;
  mode: TutoringMode;
  onOpen: () => Promise<void>;
  onToggle: (id: RomanReferenceEssayEvidenceId) => void;
}) {
  if (mode === "exam") {
    return (
      <aside className="reference-essay-evidence is-closed" aria-label="Evidence">
        <p className="reference-kicker">Evidence</p>
        <h2>Closed in Exam mode</h2>
        <p>Use what you can recall. Sources remain unavailable until the response is submitted.</p>
      </aside>
    );
  }
  if (evidence.length === 0) {
    return (
      <aside className="reference-essay-evidence is-closed" aria-label="Evidence">
        <p className="reference-kicker">Evidence</p>
        <h2>Choose your mode first</h2>
        <p>Opening the evidence pack locks this essay to the selected learning mode.</p>
        <button
          className="reference-secondary"
          disabled={disabled}
          onClick={() => void onOpen()}
          type="button"
        >
          Open evidence
        </button>
      </aside>
    );
  }
  return (
    <aside className="reference-essay-evidence" aria-label="Evidence">
      <div className="reference-essay-evidence-heading">
        <p className="reference-kicker">Evidence</p>
        <span>{selected.length} selected</span>
      </div>
      <ul>
        {evidence.map((item) => {
          const checked = selected.includes(item.id);
          return (
            <li className={checked ? "is-selected" : undefined} key={item.id}>
              <label>
                <input
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(item.id)}
                  type="checkbox"
                />
                <span className="reference-essay-evidence-visual">
                  <EvidenceVisual evidence={item} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.date}</small>
                  <span>{item.summary}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function Feedback({
  latest,
  onRevise,
  busy,
}: {
  latest: RomanReferenceProgress["essay"]["progress"]["submissions"][number];
  onRevise: () => Promise<void>;
  busy: boolean;
}) {
  return (
    <section className="reference-essay-feedback" aria-label="Essay feedback">
      <div>
        <p className="reference-kicker">Revision {latest.revision}</p>
        <h2>Feedback on your argument</h2>
        <p>{latest.summary}</p>
      </div>
      <ol>
        {latest.dimensions.map((item) => (
          <li className={`is-${item.status}`} key={item.id}>
            {item.status === "met" ? (
              <Check aria-hidden="true" size={18} />
            ) : (
              <CircleAlert aria-hidden="true" size={18} />
            )}
            <div>
              <strong>{item.label}</strong>
              {item.excerpt ? <blockquote>{item.excerpt}</blockquote> : null}
              <p>{item.comment}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="reference-essay-next-step">
        <strong>Revise next:</strong> {latest.nextStep}
      </p>
      <button
        className="reference-secondary"
        disabled={busy}
        onClick={() => void onRevise()}
        type="button"
      >
        <RotateCcw aria-hidden="true" size={17} />
        Revise
      </button>
    </section>
  );
}

function EssayStudio({
  progress,
  save,
}: {
  progress: RomanReferenceProgress;
  save: SaveReference;
}) {
  const navigate = useNavigate();
  const { mode: selectedMode } = useTutoringMode();
  const essay = progress.essay.progress;
  const content = progress.essay.content;
  const effectiveMode = essay.mode ?? selectedMode;
  const [draft, setDraft] = useState(essay.draft);
  const [claimPlan, setClaimPlan] = useState(essay.claimPlan);
  const [evidencePlan, setEvidencePlan] = useState<RomanReferenceEssayEvidenceId[]>([
    ...essay.evidencePlan,
  ]);
  const [complicationPlan, setComplicationPlan] = useState(essay.complicationPlan);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const revision = useRef(0);
  const hydrated = useRef(false);
  const words = countWords(draft);
  const latest = essay.submissions.at(-1) ?? null;
  const editing = essay.status === "editing" && !essay.finished;
  const withinLimit = words >= content.minWords && words <= content.maxWords;
  const selectedSet = useMemo(() => new Set(evidencePlan), [evidencePlan]);

  async function persist(next?: {
    draft?: string;
    claimPlan?: string;
    evidencePlan?: RomanReferenceEssayEvidenceId[];
    complicationPlan?: string;
  }): Promise<RomanReferenceProgress> {
    revision.current += 1;
    const currentRevision = revision.current;
    setSaveState("saving");
    const result = await save({
      action: "update_essay_draft",
      draft: next?.draft ?? draft,
      claimPlan: next?.claimPlan ?? claimPlan,
      evidencePlan: next?.evidencePlan ?? evidencePlan,
      complicationPlan: next?.complicationPlan ?? complicationPlan,
    });
    if (revision.current === currentRevision) setSaveState("saved");
    return result;
  }

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (!editing) return;
    const timer = window.setTimeout(() => {
      void persist().catch((error) => {
        setSaveState("failed");
        setFailure(errorMessage(error, "The draft was not saved."));
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, claimPlan, complicationPlan, evidencePlan, editing]);

  function toggleEvidence(id: RomanReferenceEssayEvidenceId) {
    const next = selectedSet.has(id)
      ? evidencePlan.filter((item) => item !== id)
      : [...evidencePlan, id];
    setEvidencePlan(next);
    setFailure(null);
  }

  async function openEvidence() {
    setBusy(true);
    setFailure(null);
    try {
      await save({ action: "access_essay_sources", mode: effectiveMode });
    } catch (error) {
      setFailure(errorMessage(error, "The evidence pack could not be opened."));
    } finally {
      setBusy(false);
    }
  }

  async function authoriseTutor() {
    await save({ action: "access_essay_tutor", mode: effectiveMode });
  }

  async function submit() {
    if (!editing || !withinLimit || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await persist();
      await save({ action: "submit_essay_revision", content: draft, mode: effectiveMode });
      setSaveState("saved");
    } catch (error) {
      setFailure(errorMessage(error, "The essay was not submitted. Stay here and try again."));
    } finally {
      setBusy(false);
    }
  }

  async function revise() {
    setBusy(true);
    setFailure(null);
    try {
      await save({ action: "start_essay_revision" });
    } catch (error) {
      setFailure(errorMessage(error, "A new revision could not be opened."));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    await save({ action: "finish_essay" });
    navigate(romanReferencePaths.recall);
  }

  const readText = [
    content.prompt,
    content.instruction,
    ...content.rubric.map((item) => `${item.label}. ${item.description}`),
  ].join(" ");

  return (
    <ReferenceFrame
      backPath={romanReferencePaths.question("two-sentence")}
      beat="essay"
      conceptIds={["augustus-principate", "roman-expansion", "fall-and-legacy"]}
      effectiveMode={effectiveMode}
      nextDisabled={busy}
      nextLabel={essay.finished ? "Next" : "Finish"}
      {...(essay.status === "submitted" && !essay.finished
        ? { onNext: finish }
        : essay.finished
          ? { nextPath: romanReferencePaths.recall }
          : { nextPath: null })}
      onBeforeOpenSources={openEvidence}
      onBeforeOpenTutor={authoriseTutor}
      referenceEssayId={content.id}
      reachedSteps={[1, 2, 3, 7]}
      readText={readText}
      sources={ESSAY_SOURCES}
    >
      <main className="reference-main reference-essay" id="stage">
        <div className="reference-essay-topline">
          <span>8 / 8</span>
          <ModeControl lockedMode={essay.mode} />
        </div>
        <header>
          <h1>{content.prompt}</h1>
          <p className="reference-orientation">{content.instruction}</p>
        </header>

        <div className="reference-essay-layout">
          <section className="reference-essay-workspace" aria-label="Essay draft">
            <details className="reference-essay-plan">
              <summary>Plan the argument</summary>
              <label>
                Claim
                <textarea
                  disabled={!editing || busy}
                  maxLength={2_000}
                  onChange={(event) => setClaimPlan(event.currentTarget.value)}
                  rows={2}
                  value={claimPlan}
                />
              </label>
              <label>
                Complication
                <textarea
                  disabled={!editing || busy}
                  maxLength={2_000}
                  onChange={(event) => setComplicationPlan(event.currentTarget.value)}
                  rows={2}
                  value={complicationPlan}
                />
              </label>
            </details>

            <div className="reference-essay-editor-heading">
              <label htmlFor="reference-essay-draft">Draft</label>
              <span>
                {words} words
                {words < content.minWords ? ` - ${content.minWords - words} to submit` : ""}
              </span>
            </div>
            <textarea
              aria-describedby="reference-essay-save-state"
              disabled={!editing || busy}
              id="reference-essay-draft"
              maxLength={100_000}
              onChange={(event) => {
                setDraft(event.currentTarget.value);
                setFailure(null);
              }}
              placeholder="Start with your claim..."
              rows={18}
              value={draft}
            />
            <div className="reference-essay-actions">
              <span aria-live="polite" id="reference-essay-save-state">
                {saveState === "saving"
                  ? "Saving..."
                  : saveState === "saved"
                    ? "Saved"
                    : saveState === "failed"
                      ? "Not saved"
                      : ""}
              </span>
              {editing ? (
                <button
                  aria-busy={busy}
                  className="reference-primary"
                  disabled={!withinLimit || busy}
                  onClick={() => void submit()}
                  type="button"
                >
                  Submit
                </button>
              ) : null}
            </div>
            {failure ? (
              <p aria-live="assertive" className="reference-save-error">
                {failure}
              </p>
            ) : null}
          </section>

          <EvidenceRail
            disabled={!editing || busy}
            evidence={content.evidence}
            mode={effectiveMode}
            onOpen={openEvidence}
            onToggle={toggleEvidence}
            selected={evidencePlan}
          />
        </div>

        <section className="reference-essay-rubric" aria-label="Rubric">
          <h2>What the response must do</h2>
          <ul>
            {content.rubric.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </li>
            ))}
          </ul>
        </section>

        {latest ? <Feedback busy={busy} latest={latest} onRevise={revise} /> : null}
      </main>
    </ReferenceFrame>
  );
}

function RomanReferenceEssayContent() {
  const progress = useReferenceProgress();
  // Error first: a failed load leaves `data` undefined, so testing for the data first would leave
  // a learner watching a loading line that will never resolve.
  if (progress.error) {
    return (
      <main className="page" id="stage">
        <h1>The draft could not be opened</h1>
        <p>{errorMessage(progress.error, "Refresh to try again.")}</p>
      </main>
    );
  }
  if (progress.isPending || !progress.data) {
    return (
      <main className="page" id="stage">
        <p>Opening your draft...</p>
      </main>
    );
  }
  return <EssayStudio progress={progress.data} save={progress.save} />;
}

export function RomanReferenceEssay() {
  return (
    <ModeProvider lessonId={ROMAN_REFERENCE_LESSON_ID}>
      <RomanReferenceEssayContent />
    </ModeProvider>
  );
}
