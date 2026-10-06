import {
  CheckConfidenceSchema,
  type CourseCheckSession,
  type CourseCheckResponseRequest,
} from "@discere/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Compass, Flag, CalendarDays, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError, errorMessage } from "../api/client.js";
import { AnswerInput } from "../journey/quiz/AnswerInput.js";
import {
  answerResponse,
  initialAnswerDraft,
  type AnswerDraft,
} from "../journey/quiz/answer-draft.js";
import { useExperience } from "../study/experience.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { CheckVisual } from "./CheckVisual.js";
import { CHECK_NAMES, placedOutLessons, placementVerdict } from "./check-model.js";
import { checkDate } from "./CourseChecks.js";
import {
  checksKey,
  checkSessionPath,
  getCourseChecks,
  getCheckSession,
  sessionKey,
  startCheck,
  submitCheckResponse,
} from "./api.js";

export function CheckStartScreen() {
  const { courseId = "", checkId = "" } = useParams();
  const query = useQuery({
    queryKey: checksKey(courseId),
    queryFn: () => getCourseChecks(courseId),
  });
  const navigate = useNavigate(),
    client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState<string | null>(null);
  const guard = useRef(false);
  if (query.isPending) return <LoadingScreen message="Loading the course check…" />;
  if (query.error)
    return (
      <ErrorScreen
        title="Check unavailable"
        error={query.error}
        message={errorMessage(query.error, "The check did not load.")}
        onRetry={() => query.refetch()}
        back={{ to: "/courses", label: "Back to courses" }}
      />
    );
  const check = query.data?.checks.find((c) => c.id === checkId);
  if (!check)
    return (
      <ErrorScreen
        back={{ to: "/courses", label: "Back to courses" }}
        title="Check not found"
        message="This course has no check at that address."
      />
    );
  async function start() {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const session = await startCheck(courseId, checkId);
      client.setQueryData(sessionKey(session.id), session);
      void client.invalidateQueries({ queryKey: checksKey(courseId) });
      void navigate(checkSessionPath(session.id));
    } catch (error) {
      setFailure(errorMessage(error, "Your check could not start."));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  const Icon =
    check.kind === "placement" ? Compass : check.kind === "checkpoint" ? Flag : CalendarDays;
  return (
    <main className="page check-intro" id="stage">
      <Link className="course-back" to={"/courses/" + encodeURIComponent(courseId)}>
        <ArrowLeft aria-hidden="true" size={17} /> {check.courseTitle}
      </Link>
      <Icon className="check-emblem" aria-hidden="true" />
      <h1>{CHECK_NAMES[check.kind]}</h1>
      <p className="check-intro-description">{check.description}</p>
      <p className="muted">{check.questionCount} questions · No time limit · Progress saved</p>
      {check.status === "locked" ? (
        <p className="check-availability">
          {check.remainingLessons
            ? "Finish the " + check.remainingLessons + " remaining lessons to open this challenge."
            : check.availableAt
              ? "Return on " + checkDate(check.availableAt) + " for fresh problems."
              : "This opens seven days after you finish the mixed challenge."}
        </p>
      ) : (
        <>
          <p>
            Each saved answer is final. Choose how sure you feel; results and explanations appear at
            the end.
          </p>
          <button
            className="button button-primary"
            type="button"
            disabled={busy}
            onClick={() => void start()}
          >
            {busy
              ? "Opening…"
              : check.status === "complete"
                ? "See your results"
                : check.status === "in_progress"
                  ? "Continue check"
                  : "Start check"}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </>
      )}
      {failure ? (
        <p role="alert" className="check-error">
          {failure}
        </p>
      ) : null}
      <Link className="check-return" to={"/courses/" + encodeURIComponent(courseId)}>
        Return to the course
      </Link>
    </main>
  );
}
type Confidence = CourseCheckResponseRequest["confidence"];
function savedDraft(
  key: string,
  question: NonNullable<CourseCheckSession["current"]>["question"],
): { draft: AnswerDraft; confidence: Confidence | null } {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null");
    const initial = initialAnswerDraft(question);
    const draft = value?.draft;
    const valid =
      draft?.kind === initial.kind &&
      (draft.kind === "numeric"
        ? typeof draft.value === "string" && typeof draft.unit === "string"
        : draft.kind === "choice"
          ? draft.choiceId === null || question.choices?.some((c) => c.id === draft.choiceId)
          : typeof draft.text === "string");
    return {
      draft: valid ? draft : initial,
      confidence: CheckConfidenceSchema.safeParse(value?.confidence).data ?? null,
    };
  } catch {
    return { draft: initialAnswerDraft(question), confidence: null };
  }
}
function CheckQuestion({
  session,
  onSaved,
}: {
  session: CourseCheckSession;
  onSaved: (value: CourseCheckSession) => void;
}) {
  const item = session.current!,
    key = "discere:check-draft:" + session.id + ":" + item.question.id;
  const [saved] = useState(() => savedDraft(key, item.question));
  const [draft, setDraft] = useState(saved.draft),
    [confidence, setConfidence] = useState<Confidence | null>(saved.confidence);
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState<string | null>(null);
  const guard = useRef(false),
    title = useRef<HTMLHeadingElement>(null),
    experience = useExperience();
  useEffect(() => {
    title.current?.focus();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ draft, confidence }));
    } catch {
      /* Saving a response still works without local storage. */
    }
  }, [key, draft, confidence]);
  const response =
    draft.kind === "choice" ? (draft.choiceId ?? "") : answerResponse(item.question, draft);
  async function submit() {
    if (guard.current || !response || !confidence) return;
    guard.current = true;
    setBusy(true);
    setFailure(null);
    experience.prepare();
    try {
      const next = await submitCheckResponse(session.id, {
        questionId: item.question.id,
        response,
        confidence,
      });
      try {
        localStorage.removeItem(key);
      } catch {
        /* Server progress is saved. */
      }
      if (next.result) experience.play("complete");
      onSaved(next);
    } catch (error) {
      setFailure(errorMessage(error, "The response was not saved. Try again."));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="check-question"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="check-question-scroll">
        <div className="check-question-body">
          <p className="check-position">
            Question {session.answered + 1} of {session.total}
          </p>
          <h1 ref={title} tabIndex={-1}>
            {item.question.prompt}
          </h1>
          <CheckVisual visual={item.visual} />
          <AnswerInput
            question={item.question}
            draft={draft}
            onChange={setDraft}
            answered={false}
            correct={false}
            readOnly={busy}
          />
          <fieldset className="check-confidence" disabled={busy}>
            <legend>How sure are you?</legend>
            {(
              [
                ["unsure", "Unsure"],
                ["partly", "Fairly sure"],
                ["sure", "Very sure"],
              ] as const
            ).map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="confidence"
                  value={value}
                  checked={confidence === value}
                  onChange={() => setConfidence(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </div>
      <footer className="check-actions">
        {failure ? (
          <p role="alert">
            {failure}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() =>
                void getCheckSession(session.id)
                  .then(onSaved)
                  .catch(() => {})
              }
            >
              Reload saved progress
            </button>
          </p>
        ) : null}
        <p className="muted">Results appear when you finish.</p>
        <button
          className="button button-primary"
          type="submit"
          disabled={busy || !response || !confidence}
        >
          {busy
            ? "Saving…"
            : session.answered + 1 === session.total
              ? "Finish check"
              : "Save and continue"}
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </footer>
    </form>
  );
}
function CheckResults({ session }: { session: CourseCheckSession }) {
  const result = session.result!,
    title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus();
  }, []);
  const confidentErrors = result.items.filter((i) => !i.correct && i.confidence === "sure").length;
  const placement = session.kind === "placement";
  const verdict = placementVerdict(result.correct, session.total);
  const knownCount = placement ? placedOutLessons(session).size : 0;
  const strong = placement ? verdict.tone === "strong" : result.correct === session.total;
  const lessonLink = (id: string) =>
    "/courses/" + encodeURIComponent(session.courseId) + "/lessons/" + encodeURIComponent(id);
  return (
    <div className="check-results">
      {/* A tick is earned by a strong result; otherwise the mark is a compass, not a reward. */}
      <div className={"check-result-mark" + (strong ? "" : " is-neutral")}>
        {strong ? <Check aria-hidden="true" size={44} /> : <Compass aria-hidden="true" size={44} />}
      </div>
      <h1 ref={title} tabIndex={-1}>
        {placement
          ? verdict.heading
          : session.kind === "transfer"
            ? "What stayed with you"
            : "Your course check"}
      </h1>
      <p className={"check-result-score" + (strong ? "" : " is-neutral")}>
        <strong>{result.correct}</strong> / {session.total} correct
      </p>
      <p className="muted">{result.xp > 0 ? `${result.xp} XP earned · ` : ""}Responses saved</p>
      {placement ? (
        <p className="check-placement-summary">
          {knownCount
            ? `Your roadmap now marks ${knownCount} ${knownCount === 1 ? "lesson" : "lessons"} as known. You can skip ${knownCount === 1 ? "it" : "them"}, or open ${knownCount === 1 ? "it" : "any"} whenever you like.`
            : result.correct > 0
              ? "No lesson was answered fully and surely enough to skip, so every lesson stays on your roadmap. Your right answers will make the familiar parts quicker."
              : "This check found nothing to skip, so the course starts with its first lessons. That is exactly what they are for."}
        </p>
      ) : null}
      {result.recommendedLessons.length ? (
        <section aria-label="Recommended lessons">
          <h2>{placement ? "Where to start" : "Worth another look"}</h2>
          <ul className="check-recommendations">
            {result.recommendedLessons.map((l, index) => (
              <li key={l.id}>
                <Link to={lessonLink(l.id)}>
                  <span className="check-recommendation-title">
                    {placement && index === 0 ? (
                      <span className="check-start-tag">Start here</span>
                    ) : null}
                    {l.title}
                  </span>
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : placement ? (
        <p>
          You answered every question surely and correctly. Pick any lesson to apply the ideas to
          fresh cases.
        </p>
      ) : (
        <p>You answered every problem correctly. Keep applying the ideas to fresh cases.</p>
      )}
      {confidentErrors ? (
        <p className="check-calibration">
          You felt very sure about {confidentErrors}{" "}
          {confidentErrors === 1 ? "answer that needs" : "answers that need"} another look. Compare
          your reasoning with the explanations below.
        </p>
      ) : null}
      {result.nextCheckAt ? (
        <p className="check-next-date">
          <CalendarDays aria-hidden="true" size={20} /> Fresh applications return on{" "}
          {checkDate(result.nextCheckAt)} in Review.
        </p>
      ) : null}
      <Link
        className="button button-primary"
        to={"/courses/" + encodeURIComponent(session.courseId)}
      >
        Return to the course
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
      <section className="check-explanations" aria-label="Answers and explanations">
        <h2>Look through your answers</h2>
        <p className="check-explanations-hint">Open any answer to see its worked explanation.</p>
        {result.items.map((item, index) => (
          <details key={item.question.id} className={item.correct ? "is-correct" : "is-incorrect"}>
            <summary>
              <span>
                {item.correct ? (
                  <Check aria-hidden="true" size={18} />
                ) : (
                  <X aria-hidden="true" size={18} />
                )}
              </span>
              <span>
                {index + 1}. {item.question.prompt}
              </span>
              <span className="sr-only">{item.correct ? "Correct" : "Incorrect"}</span>
            </summary>
            <div className="check-explanation-body">
              <CheckVisual visual={item.visual} />
              <p className="muted">
                Your answer: {item.response} ·{" "}
                {item.confidence === "sure"
                  ? "Very sure"
                  : item.confidence === "partly"
                    ? "Fairly sure"
                    : "Unsure"}
              </p>
              <p>{item.explanation}</p>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
export function CheckSessionScreen() {
  const { sessionId = "" } = useParams(),
    client = useQueryClient();
  const [freshFinish, setFreshFinish] = useState(false),
    experience = useExperience();
  const query = useQuery({
    queryKey: sessionKey(sessionId),
    queryFn: () => getCheckSession(sessionId),
    staleTime: 0,
  });
  if (query.isPending) return <LoadingScreen message="Restoring your check…" />;
  // A malformed or unknown session id is a bad link, not a fault worth retrying.
  const unknownSession =
    query.error instanceof ApiError && (query.error.status === 400 || query.error.status === 404);
  if (query.error || !query.data)
    return (
      <ErrorScreen
        title={unknownSession ? "Check not found" : "Check unavailable"}
        error={query.error}
        message={
          unknownSession
            ? "This check link does not lead to a saved check. Open the check again from its course."
            : errorMessage(query.error, "Your saved check did not load.")
        }
        onRetry={unknownSession ? undefined : () => query.refetch()}
        back={{ to: "/courses", label: "Back to courses" }}
      />
    );
  const session = query.data;
  function saved(value: CourseCheckSession) {
    if (value.result) setFreshFinish(true);
    client.setQueryData(sessionKey(sessionId), value);
    if (value.result)
      for (const key of [
        ["study"],
        ["home"],
        ["progress-activity"],
        ["courses"],
        checksKey(value.courseId),
        ["due-course-checks"],
      ])
        void client.invalidateQueries({ queryKey: key });
  }
  return (
    <main
      className={
        "check-player" +
        (session.result ? " is-finished" : "") +
        (freshFinish && experience.celebrations ? " is-fresh-finish" : "")
      }
      id="stage"
    >
      <header className="check-player-header">
        <Link to={"/courses/" + encodeURIComponent(session.courseId)} aria-label="Return to course">
          <X aria-hidden="true" size={20} />
        </Link>
        <progress max={session.total} value={session.answered} aria-label="Check progress" />
        <span>{CHECK_NAMES[session.kind]}</span>
      </header>
      {session.result ? (
        <CheckResults session={session} />
      ) : (
        <CheckQuestion key={session.current?.question.id} session={session} onSaved={saved} />
      )}
    </main>
  );
}
