import type {
  RomanReferenceEssayId,
  RomanReferenceMilestoneId,
  RomanReferenceProgress,
  RomanReferenceQuestionId,
  RomanReferenceTurningPointId,
  TutoringMode,
} from "@discere/contracts";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  House,
  Library,
  MessageCircleQuestion,
  NotebookPen,
  RefreshCcw,
  Settings,
  Volume2,
} from "lucide-react";
import {
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { ModeProvider, useTutoringMode } from "../journey/mode-context.js";
import { TutorPanel } from "../tutor/TutorPanel.js";
import { DiscereMark } from "../ui/DiscereMark.js";
import { type ReferenceSource, ReferenceSourceDialog } from "./ReferenceSourceDialog.js";
import { ROMAN_REFERENCE_LESSON_ID, useReferenceProgress } from "./reference-progress.js";

export const COURSE_PATH = "/courses/roman-empire";
export const LESSON_ROOT = "/courses/roman-empire/lessons/rise-of-the-roman-empire/reference";

export const romanReferencePaths = {
  course: COURSE_PATH,
  opening: `${LESSON_ROOT}/opening`,
  augustus: `${LESSON_ROOT}/augustus`,
  expansion: `${LESSON_ROOT}/expansion`,
  notebook: "/courses/roman-empire/lessons/rise-of-the-roman-empire/notebook",
  question: (questionId: RomanReferenceQuestionId) => `${LESSON_ROOT}/questions/${questionId}`,
  essay: `${LESSON_ROOT}/essay`,
  recall: `${LESSON_ROOT}/recall`,
  complete: `${LESSON_ROOT}/complete`,
};

export type ReferenceBeat =
  | "course"
  | "opening"
  | "augustus"
  | "expansion"
  | "questions"
  | "essay"
  | "recall"
  | "complete";

export const AUGUSTUS_SOURCE: ReferenceSource = {
  title: "Augustus and the principate",
  detail: "OpenStax, World History Volume 1 · CC BY 4.0",
  href: "https://openstax.org/books/world-history-volume-1/pages/6-3-the-roman-empire",
};

export const MAP_SOURCE: ReferenceSource = {
  title: "Roman Empire at its greatest extent, 117 CE",
  detail: "Tataryn · CC BY-SA 3.0 · Wikimedia Commons",
  href: "https://commons.wikimedia.org/wiki/File:Roman_Empire_Trajan_117AD.png",
};

const BEAT_META: Record<ReferenceBeat, { index: number; back: string }> = {
  course: { index: 1, back: "/courses" },
  opening: { index: 1, back: COURSE_PATH },
  augustus: { index: 2, back: romanReferencePaths.opening },
  expansion: { index: 3, back: romanReferencePaths.augustus },
  questions: { index: 7, back: romanReferencePaths.expansion },
  essay: { index: 8, back: romanReferencePaths.question("two-sentence") },
  recall: { index: 8, back: romanReferencePaths.essay },
  complete: { index: 8, back: romanReferencePaths.recall },
};

const LESSON_STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const TUTOR_CONCEPT_IDS = ["roman-republic", "republican-crisis", "augustus-principate"];

export function isRomanReferencePath(pathname: string): boolean {
  return pathname === COURSE_PATH || pathname.startsWith(`${LESSON_ROOT}/`);
}

export function RomanReferenceNav({
  notebookPath = romanReferencePaths.notebook,
}: {
  notebookPath?: string;
} = {}) {
  const links = [
    { to: "/", label: "Home", icon: House },
    { to: "/courses", label: "Courses", icon: BookOpen, active: true },
    { to: "/review", label: "Review", icon: RefreshCcw },
    { to: notebookPath, label: "Notebook", icon: NotebookPen },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav aria-label="Discere" className="reference-nav">
      <Link aria-label="Discere home" className="reference-nav-mark" to="/">
        <DiscereMark size={25} />
      </Link>
      <ul className="reference-nav-list">
        {links.map((item) => (
          <li key={item.label}>
            <Link
              aria-current={item.active ? "page" : undefined}
              aria-label={item.label}
              className={item.active ? "reference-nav-link is-active" : "reference-nav-link"}
              title={item.label}
              to={item.to}
            >
              <item.icon aria-hidden="true" size={20} strokeWidth={1.8} />
              <span className="reference-nav-tip">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export interface ReferenceFrameProps {
  hideAssistance?: boolean;
  beat: ReferenceBeat;
  backPath?: string;
  children: ReactNode;
  conceptIds?: string[];
  effectiveMode?: TutoringMode;
  nextDisabled?: boolean;
  nextLabel?: string;
  nextPath?: string | null;
  onBeforeOpenSources?: () => Promise<void>;
  onBeforeOpenTutor?: () => Promise<void>;
  onNext?: () => Promise<void>;
  readText: string;
  reachedSteps?: readonly number[];
  referenceQuestionId?: RomanReferenceQuestionId;
  referenceEssayId?: RomanReferenceEssayId;
  sources: ReferenceSource[];
}

export function ReferenceFrame({
  hideAssistance = false,
  beat,
  backPath,
  children,
  conceptIds = TUTOR_CONCEPT_IDS,
  effectiveMode,
  nextDisabled = false,
  nextLabel = "Next",
  nextPath,
  onBeforeOpenSources,
  onBeforeOpenTutor,
  onNext,
  readText,
  reachedSteps,
  referenceQuestionId,
  referenceEssayId,
  sources,
}: ReferenceFrameProps) {
  const meta = BEAT_META[beat];
  const { mode: selectedMode } = useTutoringMode();
  const mode = effectiveMode ?? selectedMode;
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [moving, setMoving] = useState(false);
  const [utilityBusy, setUtilityBusy] = useState<"sources" | "tutor" | null>(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const sourceTrigger = useRef<HTMLButtonElement>(null);
  const tutorTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (mode === "exam") {
      setSourcesOpen(false);
      setTutorOpen(false);
    }
  }, [mode]);

  useEffect(
    () => () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  function toggleReadAloud() {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(readText);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  const closeTutor = useCallback(() => {
    setTutorOpen(false);
    window.requestAnimationFrame(() => tutorTrigger.current?.focus());
  }, []);

  async function openUtility(kind: "sources" | "tutor"): Promise<void> {
    if (utilityBusy || mode === "exam") return;
    setUtilityBusy(kind);
    setNavigationError(null);
    try {
      if (kind === "sources") {
        await onBeforeOpenSources?.();
        setSourcesOpen(true);
      } else {
        await onBeforeOpenTutor?.();
        setTutorOpen(true);
      }
    } catch (error) {
      setNavigationError(
        errorMessage(
          error,
          kind === "sources"
            ? "Sources could not be opened for this question."
            : "The tutor could not be opened for this question.",
        ),
      );
    } finally {
      setUtilityBusy(null);
    }
  }

  async function runNext() {
    if (!onNext || moving) return;
    setMoving(true);
    setNavigationError(null);
    try {
      await onNext();
    } catch {
      setNavigationError("Your progress was not saved. Stay here and try again.");
    } finally {
      setMoving(false);
    }
  }

  let nextControl: ReactNode;
  if (onNext) {
    nextControl = (
      <button
        aria-busy={moving}
        className="reference-footer-link reference-footer-next"
        disabled={moving || nextDisabled}
        onClick={() => void runNext()}
        type="button"
      >
        {nextLabel}
        <ChevronRight aria-hidden="true" size={18} />
      </button>
    );
  } else if (nextPath === null) {
    nextControl = null;
  } else if (nextPath) {
    nextControl = (
      <Link className="reference-footer-link reference-footer-next" to={nextPath}>
        {nextLabel}
        <ChevronRight aria-hidden="true" size={18} />
      </Link>
    );
  } else {
    nextControl = (
      <Link className="reference-footer-link reference-footer-next" to={COURSE_PATH}>
        Course home
      </Link>
    );
  }

  return (
    <section className="roman-reference-shell">
      <header className="reference-header">
        <div className="reference-header-context">
          <Link to={COURSE_PATH}>The Roman Empire</Link>
          <span>From Republic to Empire</span>
        </div>
        <div className="reference-header-tools">
          <button
            aria-label={speaking ? "Stop reading aloud" : "Read this screen aloud"}
            aria-pressed={speaking}
            className="reference-icon-button"
            onClick={toggleReadAloud}
            title={speaking ? "Stop reading aloud" : "Read aloud"}
            type="button"
          >
            <Volume2 aria-hidden="true" size={19} strokeWidth={1.8} />
          </button>
          {mode === "exam" || hideAssistance ? null : (
            <button
              aria-label="View sources"
              aria-busy={utilityBusy === "sources"}
              className="reference-icon-button"
              disabled={utilityBusy !== null}
              onClick={() => void openUtility("sources")}
              ref={sourceTrigger}
              title="Sources"
              type="button"
            >
              <Library aria-hidden="true" size={19} strokeWidth={1.8} />
            </button>
          )}
          {mode === "exam" || hideAssistance ? null : (
            <button
              aria-label="Open the tutor in the current Roman lesson"
              aria-busy={utilityBusy === "tutor"}
              aria-pressed={tutorOpen}
              className="reference-icon-button reference-tutor-link"
              disabled={utilityBusy !== null}
              onClick={() => void openUtility("tutor")}
              ref={tutorTrigger}
              title="Tutor"
              type="button"
            >
              <MessageCircleQuestion aria-hidden="true" size={19} strokeWidth={1.8} />
            </button>
          )}
          <div
            aria-label="Lesson progress"
            aria-valuemax={8}
            aria-valuemin={1}
            aria-valuenow={meta.index}
            className="reference-progress"
            role="progressbar"
          >
            <span>{meta.index} / 8</span>
            <span aria-hidden="true" className="reference-progress-track">
              <span style={{ width: `${(meta.index / 8) * 100}%` }} />
            </span>
          </div>
        </div>
      </header>

      {children}

      <footer className="reference-footer">
        <Link className="reference-footer-link" to={backPath ?? meta.back}>
          <ChevronLeft aria-hidden="true" size={18} />
          Back
        </Link>
        <ol aria-label="Lesson progress" className="reference-progress-dots">
          {LESSON_STEPS.map((step) => (
            <li
              aria-current={step === meta.index ? "step" : undefined}
              className={
                reachedSteps
                  ? reachedSteps.includes(step) || step === meta.index
                    ? "is-reached"
                    : undefined
                  : step <= meta.index
                    ? "is-reached"
                    : undefined
              }
              key={step}
            >
              <span className="sr-only">Step {step}</span>
            </li>
          ))}
        </ol>
        {nextControl}
        {navigationError ? (
          <p aria-live="assertive" className="reference-navigation-error">
            {navigationError}
          </p>
        ) : null}
      </footer>

      {sourcesOpen && !hideAssistance ? (
        <ReferenceSourceDialog
          onClose={() => setSourcesOpen(false)}
          sources={sources}
          triggerRef={sourceTrigger}
        />
      ) : null}
      {tutorOpen && mode !== "exam" && !hideAssistance ? (
        <TutorPanel
          accent="#0b8f3c"
          conceptIds={conceptIds}
          lessonId={ROMAN_REFERENCE_LESSON_ID}
          mode={mode}
          onClose={closeTutor}
          {...(referenceQuestionId === undefined ? {} : { referenceQuestionId })}
          {...(referenceEssayId === undefined ? {} : { referenceEssayId })}
        />
      ) : null}
    </section>
  );
}

export function AugustusProfile({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      aria-label="Stylised profile used to represent Augustus"
      className={compact ? "augustus-profile is-compact" : "augustus-profile"}
      role="img"
      viewBox="0 0 240 240"
    >
      <circle cx="120" cy="120" fill="#eaf7ee" r="112" stroke="#0b8f3c" strokeWidth="2" />
      <path
        d="M71 199c25-31 25-52 10-74-12-17-4-44 18-60 18-14 51-15 69 4 14 15 13 34 3 48-6 8-16 14-27 19 19 13 19 32 10 47-4 7-5 16-2 27l36 17H53z"
        fill="#173c25"
      />
    </svg>
  );
}

function TerritoryGlyph({ divided = false }: { divided?: boolean }) {
  return (
    <svg aria-hidden="true" className="territory-glyph" viewBox="0 0 260 160">
      <path
        d="M18 78C40 32 91 25 126 51c36-20 80-12 111 21 22 24 5 57-28 65-42 10-82 1-111-15-36 18-74 8-80-17-3-10-3-18 0-27Z"
        fill="#0b8f3c"
        opacity=".76"
      />
      {divided ? <path d="M130 30v112" stroke="#121513" strokeWidth="3" /> : null}
    </svg>
  );
}

const PATH_BY_BEAT = {
  opening: romanReferencePaths.opening,
  augustus: romanReferencePaths.augustus,
  expansion: romanReferencePaths.expansion,
  essay: romanReferencePaths.essay,
  recall: romanReferencePaths.recall,
  complete: romanReferencePaths.complete,
} as const;

const ROUTE_INDEX_BY_BEAT = {
  opening: 0,
  augustus: 1,
  expansion: 2,
  questions: 6,
  essay: 7,
  recall: 7,
  complete: 7,
} as const;

function RomanReferenceCourseHomeContent() {
  const progress = useReferenceProgress();
  const continuePath = (() => {
    const saved = progress.data;
    if (!saved) return null;
    if (saved.activeBeat === "questions") {
      if (saved.activeQuestionId) return romanReferencePaths.question(saved.activeQuestionId);
      return romanReferencePaths.question("two-sentence");
    }
    return PATH_BY_BEAT[saved.activeBeat];
  })();
  const activeRouteIndex = progress.data ? ROUTE_INDEX_BY_BEAT[progress.data.activeBeat] : 0;

  return (
    <ReferenceFrame
      beat="course"
      nextPath={continuePath}
      readText="Power, expansion, and division. See how Rome changed from Augustus to 476 C E."
      sources={[AUGUSTUS_SOURCE, MAP_SOURCE]}
    >
      <main className="reference-main reference-course" id="stage">
        <div className="reference-course-copy">
          <p className="reference-kicker">The Roman Empire</p>
          <h1>Power, expansion, and division</h1>
          <p className="reference-orientation">See how Rome changed from Augustus to 476 CE.</p>
          <div className="reference-course-actions">
            {continuePath ? (
              <Link className="reference-primary" to={continuePath}>
                Continue
              </Link>
            ) : (
              <button className="reference-primary" disabled type="button">
                Continue
              </button>
            )}
            <span>12 min</span>
          </div>
          {progress.error ? (
            <p aria-live="assertive" className="reference-save-error">
              Your saved place is unavailable. Refresh to try again.
            </p>
          ) : null}
        </div>
        <figure className="reference-course-art">
          <div>
            <span>Augustus</span>
            <AugustusProfile compact />
            <strong>27 BCE</strong>
          </div>
          <TerritoryGlyph />
          <figcaption className="sr-only">
            A stylised profile of Augustus beside a simplified territory motif.
          </figcaption>
        </figure>
        <div className="reference-course-route">
          <p>From Republic to Empire</p>
          <h2>How Augustus reshaped Rome</h2>
          <ol aria-label="Course route">
            {[
              "Order",
              "Augustus",
              "Expansion",
              "Governance",
              "Crisis",
              "Division",
              "476",
              "Recall",
            ].map((label, index) => (
              <li
                className={
                  index === activeRouteIndex
                    ? "is-current"
                    : index === activeRouteIndex + 1
                      ? "is-next"
                      : undefined
                }
                key={label}
              >
                <span aria-hidden="true" />
                <small>{label}</small>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </ReferenceFrame>
  );
}

export function RomanReferenceCourseHome() {
  return (
    <ModeProvider lessonId={ROMAN_REFERENCE_LESSON_ID}>
      <RomanReferenceCourseHomeContent />
    </ModeProvider>
  );
}

interface TurningPoint {
  id: RomanReferenceTurningPointId;
  title: string;
  date: string;
  visual: "augustus" | "extent" | "division" | "deposition";
}

const TURNING_POINTS: Record<RomanReferenceTurningPointId, TurningPoint> = {
  extent: { id: "extent", title: "Largest extent", date: "117 CE", visual: "extent" },
  deposition: {
    id: "deposition",
    title: "Western emperor removed",
    date: "476 CE",
    visual: "deposition",
  },
  augustus: { id: "augustus", title: "Augustus", date: "27 BCE", visual: "augustus" },
  division: {
    id: "division",
    title: "Empire divided",
    date: "395 CE",
    visual: "division",
  },
};

const FALLBACK_OPENING_ORDER: RomanReferenceTurningPointId[] = [
  "extent",
  "deposition",
  "augustus",
  "division",
];

function TurningPointVisual({ kind }: { kind: TurningPoint["visual"] }) {
  if (kind === "augustus") return <AugustusProfile compact />;
  if (kind === "extent") return <TerritoryGlyph />;
  if (kind === "division") {
    return (
      <div className="division-glyph" aria-hidden="true">
        <TerritoryGlyph divided />
        <span>West</span>
        <span>East</span>
      </div>
    );
  }
  return (
    <svg aria-hidden="true" className="deposition-glyph" viewBox="0 0 220 170">
      <circle cx="110" cy="82" fill="#eaf7ee" r="68" stroke="#0b8f3c" strokeWidth="2" />
      <path
        d="M62 100c18-45 38-44 52-10 17-40 39-30 45 10"
        fill="none"
        stroke="#0b8f3c"
        strokeWidth="8"
      />
      <path d="M110 18v128" stroke="#c8d4cb" strokeDasharray="7 8" strokeWidth="3" />
    </svg>
  );
}

type OpeningState = RomanReferenceProgress["opening"];

function openingFeedback(opening: OpeningState): string | null {
  if (opening.status === "skipped") {
    return "Your opening estimate is saved without a judgement. Continue when you are ready.";
  }
  if (opening.status !== "checked") return null;
  return opening.wasCorrect
    ? "The sequence runs from Augustus in 27 BCE to the western deposition in 476 CE."
    : "Compare your order with this sequence. You will return to it after the lesson.";
}

function RomanReferenceOpening() {
  const navigate = useNavigate();
  const progress = useReferenceProgress();
  const [order, setOrder] = useState<RomanReferenceTurningPointId[]>(FALLBACK_OPENING_ORDER);
  const [status, setStatus] = useState<OpeningState["status"]>("editing");
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [draggedId, setDraggedId] = useState<RomanReferenceTurningPointId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!progress.data || hydrated) return;
    setOrder(progress.data.opening.order);
    setStatus(progress.data.opening.status);
    setWasCorrect(progress.data.opening.wasCorrect);
    setFeedback(openingFeedback(progress.data.opening));
    setHydrated(true);
  }, [hydrated, progress.data]);

  const items = useMemo(() => order.map((id) => TURNING_POINTS[id]), [order]);
  const canEdit = hydrated && status === "editing" && !submitting;
  const readText = `Put these turning points in order. Current order: ${items
    .map((item) => `${item.title}, ${item.date}`)
    .join("; ")}.`;

  function applyOpening(saved: RomanReferenceProgress) {
    setOrder(saved.opening.order);
    setStatus(saved.opening.status);
    setWasCorrect(saved.opening.wasCorrect);
    setFeedback(openingFeedback(saved.opening));
  }

  function persistReorder(next: RomanReferenceTurningPointId[], moved: TurningPoint) {
    setOrder(next);
    setFeedback(null);
    setSaveError(null);
    const position = next.indexOf(moved.id) + 1;
    setAnnouncement(`${moved.title} moved to position ${position} of ${next.length}.`);
    void progress
      .save({ action: "reorder_opening", order: next })
      .catch(() => setSaveError("That order was not saved. Try moving the card again."));
  }

  function move(index: number, delta: number) {
    if (!canEdit) return;
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...order];
    const currentId = next[index];
    const targetId = next[target];
    if (!currentId || !targetId) return;
    next[index] = targetId;
    next[target] = currentId;
    persistReorder(next, TURNING_POINTS[currentId]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(index, -1);
    }
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(index, 1);
    }
  }

  function onDrop(event: DragEvent<HTMLLIElement>, targetId: RomanReferenceTurningPointId) {
    event.preventDefault();
    if (!canEdit || !draggedId || draggedId === targetId) return;
    const from = order.indexOf(draggedId);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setDraggedId(null);
    persistReorder(next, TURNING_POINTS[moved]);
  }

  async function checkOrder() {
    if (!canEdit) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      const saved = await progress.save({ action: "check_opening", order });
      applyOpening(saved);
    } catch {
      setSaveError("Your answer was not checked. Stay here and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function skipOpening() {
    if (!canEdit) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      const saved = await progress.save({ action: "skip_opening", order });
      applyOpening(saved);
      navigate(romanReferencePaths.augustus);
    } catch (error) {
      setSaveError("Your place was not saved. Stay here and try again.");
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  async function nextFromOpening() {
    if (status === "editing") {
      await checkOrder();
      return;
    }
    navigate(romanReferencePaths.augustus);
  }

  return (
    <ReferenceFrame
      beat="opening"
      nextDisabled={!hydrated || submitting}
      onNext={nextFromOpening}
      readText={readText}
      sources={[AUGUSTUS_SOURCE, MAP_SOURCE]}
    >
      <main className="reference-main reference-opening" id="stage">
        <h1>Put these turning points in order</h1>
        <p className="reference-orientation">
          Start with your best guess. You will revisit it at the end.
        </p>
        <p className="sr-only" id="ordering-instructions">
          Focus a card and use the arrow keys to move it, or drag it to a new position.
        </p>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
        <ol aria-describedby="ordering-instructions" className="turning-point-grid">
          {items.map((item, index) => (
            <li
              draggable={canEdit}
              key={item.id}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={() => {
                if (canEdit) setDraggedId(item.id);
              }}
              onDrop={(event) => onDrop(event, item.id)}
            >
              <button
                aria-describedby="ordering-instructions"
                aria-disabled={!canEdit}
                aria-label={`${item.title}, ${item.date}, position ${index + 1} of ${items.length}`}
                aria-roledescription="sortable turning point"
                className="turning-point-sortable"
                onKeyDown={(event) => onKeyDown(event, index)}
                type="button"
              >
                <GripVertical aria-hidden="true" className="turning-point-grip" size={20} />
                <TurningPointVisual kind={item.visual} />
                <strong>{item.title}</strong>
                <span>{item.date}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="reference-opening-actions">
          <button
            aria-busy={submitting}
            className="reference-primary"
            disabled={!canEdit}
            onClick={() => void checkOrder().catch(() => undefined)}
            type="button"
          >
            Check order
          </button>
          <button
            className="reference-text-action"
            disabled={!canEdit}
            onClick={() => void skipOpening().catch(() => undefined)}
            type="button"
          >
            Skip for now
          </button>
          {feedback ? (
            <p aria-live="polite" className="reference-feedback">
              {status === "checked" && wasCorrect === true ? (
                <Check aria-hidden="true" size={18} />
              ) : null}
              {feedback}
            </p>
          ) : null}
        </div>
        {saveError || progress.error ? (
          <p aria-live="assertive" className="reference-save-error">
            {saveError ?? "Your saved opening order is unavailable. Refresh to try again."}
          </p>
        ) : null}
        {status === "checked" && wasCorrect === null ? (
          <p className="sr-only">The server did not return a result for this order.</p>
        ) : null}
      </main>
    </ReferenceFrame>
  );
}

function RomanReferenceAugustus() {
  const navigate = useNavigate();
  const progress = useReferenceProgress();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function continueToExpansion() {
    if (submitting) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      await progress.save({ action: "complete_augustus" });
      navigate(romanReferencePaths.expansion);
    } catch {
      setSaveError("Your place was not saved. Stay here and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ReferenceFrame
      beat="augustus"
      nextDisabled={progress.isPending || submitting}
      onNext={continueToExpansion}
      readText="How Augustus changed Rome. A new political system emerged from decades of civil war. In 27 B C E, Octavian received the title Augustus. Republican offices still existed, but Augustus controlled the army, major provinces, and the direction of government. His settlement reduced open competition among powerful commanders. It also concentrated authority in one ruler, creating the political structure later emperors inherited."
      sources={[AUGUSTUS_SOURCE]}
    >
      <main className="reference-main reference-augustus" id="stage">
        <section className="reference-augustus-copy">
          <h1>How Augustus changed Rome</h1>
          <p className="reference-orientation">
            A new political system emerged from decades of civil war.
          </p>
          <div className="reference-prose">
            <p>
              In 27 BCE, Octavian received the title Augustus. Republican offices still existed, but
              Augustus controlled the army, major provinces, and the direction of government.
            </p>
            <p>
              His settlement reduced open competition among powerful commanders. It also
              concentrated authority in one ruler, creating the political structure later emperors
              inherited.
            </p>
          </div>
          <p className="reference-highlight">
            <Check aria-hidden="true" size={30} strokeWidth={2.2} />
            <span>
              Augustus kept republican forms while holding the powers that made him the dominant
              ruler.
            </span>
          </p>
          <button
            aria-busy={submitting}
            className="reference-primary"
            disabled={progress.isPending || submitting}
            onClick={() => void continueToExpansion().catch(() => undefined)}
            type="button"
          >
            Continue
          </button>
          {saveError || progress.error ? (
            <p aria-live="assertive" className="reference-save-error">
              {saveError ?? "Your saved place is unavailable. Refresh to try again."}
            </p>
          ) : null}
        </section>
        <figure className="reference-augustus-visual">
          <span>Caesar Avgvstvs</span>
          <AugustusProfile />
          <ol aria-label="Augustus timeline">
            <li>
              <span />
              44 BCE
            </li>
            <li className="is-current">
              <span />
              27 BCE
            </li>
            <li>
              <span />
              14 CE
            </li>
          </ol>
          <figcaption className="sr-only">
            A stylised profile of Augustus and a timeline from Caesar's death to Augustus's death.
          </figcaption>
        </figure>
      </main>
    </ReferenceFrame>
  );
}

interface Milestone {
  id: RomanReferenceMilestoneId;
  year: string;
  summary: string;
}

const MILESTONES = [
  {
    id: "27-bce",
    year: "27 BCE",
    summary: "Augustus took control of a state that already encircled much of the Mediterranean.",
  },
  {
    id: "117-ce",
    year: "117 CE",
    summary: "Under Trajan, Roman rule reached its greatest territorial extent.",
  },
  {
    id: "284-ce",
    year: "284 CE",
    summary: "Diocletian took power after the third-century crisis and reorganised imperial rule.",
  },
  {
    id: "476-ce",
    year: "476 CE",
    summary: "The western emperor was removed; Roman government continued in the east.",
  },
] as const satisfies readonly Milestone[];

function RomanReferenceExpansion() {
  const navigate = useNavigate();
  const progress = useReferenceProgress();
  const [activeId, setActiveId] = useState<RomanReferenceMilestoneId>("117-ce");
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const draftRevision = useRef(0);

  useEffect(() => {
    if (!progress.data || hydrated) return;
    setActiveId(progress.data.expansion.milestoneId);
    setAnswerOpen(progress.data.expansion.answerOpen);
    setAnswer(progress.data.expansion.answer);
    setSaved(progress.data.expansion.saved);
    setHydrated(true);
  }, [hydrated, progress.data]);

  const active = MILESTONES.find((milestone) => milestone.id === activeId) ?? MILESTONES[1];
  const readText = `How far did Rome spread? Current milestone: ${active.year}. ${active.summary} The map shows Rome's 117 C E boundary for comparison. What changed between 27 B C E and 117 C E?`;

  function selectMilestone(milestoneId: RomanReferenceMilestoneId) {
    if (!hydrated) return;
    const previous = activeId;
    setActiveId(milestoneId);
    setSaveError(null);
    void progress
      .save({ action: "select_expansion_milestone", milestoneId })
      .then((next) => setActiveId(next.expansion.milestoneId))
      .catch(() => {
        setActiveId(previous);
        setSaveError("That milestone was not saved. Try selecting it again.");
      });
  }

  function persistDraft(nextOpen: boolean, nextAnswer: string) {
    if (!hydrated) return;
    draftRevision.current += 1;
    setAnswerOpen(nextOpen);
    setAnswer(nextAnswer);
    setSaved(false);
    setSaveError(null);
    void progress
      .save({ action: "update_expansion_draft", answerOpen: nextOpen, answer: nextAnswer })
      .catch(() => setSaveError("That draft was not saved. Keep this screen open and try again."));
  }

  async function saveAnswer() {
    if (!answer.trim() || saving) return;
    const revisionAtSave = draftRevision.current;
    setSaving(true);
    setSaveError(null);
    try {
      const next = await progress.save({ action: "save_expansion_response", answer });
      if (draftRevision.current === revisionAtSave) {
        setAnswer(next.expansion.answer);
        setAnswerOpen(next.expansion.answerOpen);
        setSaved(next.expansion.saved);
      }
    } catch {
      setSaved(false);
      setSaveError("Your answer was not saved. Stay here and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function completeExpansion() {
    if (!saved || completing) return;
    setCompleting(true);
    setSaveError(null);
    try {
      await progress.save({ action: "complete_expansion" });
      navigate(romanReferencePaths.question("turning-points"));
    } catch {
      setSaveError("Your saved answer could not be completed. Stay here and try again.");
      throw new Error("Expansion completion failed.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <ReferenceFrame
      beat="expansion"
      nextDisabled={completing}
      {...(saved ? { onNext: completeExpansion } : { nextPath: null })}
      readText={readText}
      sources={[MAP_SOURCE, AUGUSTUS_SOURCE]}
    >
      <main className="reference-main reference-expansion" id="stage">
        <header>
          <div>
            <h1>How far did Rome spread?</h1>
            <p className="reference-orientation">Move through time, then answer the prompt.</p>
          </div>
          <strong className="reference-map-year">{active.year}</strong>
          <p aria-live="polite" className="sr-only">
            {active.year}. {active.summary}
          </p>
        </header>
        <figure className="reference-map">
          <img
            alt="The Roman Empire at its greatest extent under Trajan in 117 CE"
            src="/api/content/roman-empire/assets/roman-empire-extent-117ce.png"
          />
          <figcaption>
            <span>117 CE extent</span>
            {active.id === "117-ce"
              ? active.summary
              : `${active.summary} The 117 CE boundary remains on the map for comparison.`}
          </figcaption>
        </figure>
        <ol aria-label="Roman Empire milestones" className="reference-map-timeline">
          {MILESTONES.map((milestone) => (
            <li
              className={milestone.id === active.id ? "is-current" : undefined}
              key={milestone.id}
            >
              <button
                aria-pressed={milestone.id === active.id}
                disabled={!hydrated}
                onClick={() => selectMilestone(milestone.id)}
                type="button"
              >
                <span aria-hidden="true" />
                {milestone.year}
              </button>
            </li>
          ))}
        </ol>
        <details className="reference-map-equivalent">
          <summary>Read the timeline as text</summary>
          <table>
            <caption className="sr-only">Roman Empire milestones</caption>
            <tbody>
              {MILESTONES.map((milestone) => (
                <tr key={milestone.id}>
                  <th scope="row">{milestone.year}</th>
                  <td>{milestone.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <section className={answerOpen ? "reference-map-prompt is-open" : "reference-map-prompt"}>
          <div>
            <span aria-hidden="true" className="reference-prompt-mark" />
            <h2>What changed between 27 BCE and 117 CE?</h2>
          </div>
          {answerOpen ? (
            <div className="reference-map-answer">
              <label htmlFor="reference-expansion-answer">Your answer</label>
              <textarea
                id="reference-expansion-answer"
                maxLength={2_000}
                onChange={(event) => persistDraft(true, event.currentTarget.value)}
                rows={3}
                value={answer}
              />
              <button
                aria-busy={saving}
                className="reference-primary"
                disabled={!answer.trim() || saving}
                onClick={() => void saveAnswer()}
                type="button"
              >
                Save answer
              </button>
              {saved ? <p aria-live="polite">Saved for the end-of-lesson comparison.</p> : null}
            </div>
          ) : (
            <button
              className="reference-primary"
              disabled={!hydrated}
              onClick={() => persistDraft(true, answer)}
              type="button"
            >
              Answer
            </button>
          )}
        </section>
        {saveError || progress.error ? (
          <p aria-live="assertive" className="reference-save-error">
            {saveError ?? "Your saved map work is unavailable. Refresh to try again."}
          </p>
        ) : null}
      </main>
    </ReferenceFrame>
  );
}

function RomanReferenceBeatContent() {
  const { referenceBeat } = useParams();
  if (referenceBeat === "opening") return <RomanReferenceOpening />;
  if (referenceBeat === "augustus") return <RomanReferenceAugustus />;
  if (referenceBeat === "expansion") return <RomanReferenceExpansion />;
  return (
    <main className="page" id="stage">
      <h1>Reference screen not found</h1>
      <Link className="button button-primary" to={COURSE_PATH}>
        Return to the course
      </Link>
    </main>
  );
}

export function RomanReferenceBeat() {
  return (
    <ModeProvider lessonId={ROMAN_REFERENCE_LESSON_ID}>
      <RomanReferenceBeatContent />
    </ModeProvider>
  );
}
