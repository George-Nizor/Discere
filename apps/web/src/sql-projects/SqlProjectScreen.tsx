import type { SqlProjectAction, SqlProjectSession, TutoringMode } from "@discere/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Database, Lightbulb, Play, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { errorCode, errorMessage } from "../api/client.js";
import { useExperience } from "../study/experience.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { LearningCompanion } from "../ui/LearningCompanion.js";
import {
  getSqlProjects,
  getSqlSession,
  sendSqlAction,
  sqlProjectsKey,
  sqlSessionKey,
  sqlSessionPath,
  startSqlProject,
} from "./api.js";
import { SqlDataTable, SqlResultTable } from "./SqlTable.js";
import { CodeEditor } from "./CodeEditor.js";
const modes = [
  {
    id: "coach",
    label: "Coach",
    description: "Work from a question, with hints when you need them.",
  },
  {
    id: "assisted",
    label: "Assisted",
    description: "Use hints and corrections as you build your query.",
  },
  {
    id: "direct",
    label: "Direct",
    description: "Request a worked query when you want to compare approaches.",
  },
  {
    id: "exam",
    label: "Exam",
    description: "Submit each query once. Feedback and solutions appear at the end.",
  },
] as const;
export function SqlProjectStartScreen() {
  const { courseId = "", projectId = "" } = useParams();
  const query = useQuery({
    queryKey: sqlProjectsKey(courseId),
    queryFn: () => getSqlProjects(courseId),
  });
  const navigate = useNavigate(),
    client = useQueryClient();
  const [mode, setMode] = useState<TutoringMode>("coach"),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const guard = useRef(false);
  if (query.isPending) return <LoadingScreen message="Loading the project…" />;
  if (query.error)
    return (
      <ErrorScreen
        title="Project unavailable"
        error={query.error}
        message={errorMessage(query.error, "The project did not load.")}
        onRetry={() => query.refetch()}
        back={{ to: "/courses", label: "Back to courses" }}
      />
    );
  const project = query.data?.projects.find((p) => p.id === projectId);
  if (!project)
    return (
      <ErrorScreen
        back={{ to: "/courses", label: "Back to courses" }}
        title="Project not found"
        message="There is no project at this address."
      />
    );
  async function start() {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setFailure("");
    try {
      if (project?.sessionId) {
        void navigate(sqlSessionPath(project.sessionId));
        return;
      }
      const session = await startSqlProject(courseId, projectId, mode);
      client.setQueryData(sqlSessionKey(session.id), session);
      void client.invalidateQueries({ queryKey: sqlProjectsKey(courseId) });
      void navigate(sqlSessionPath(session.id));
    } catch (e) {
      setFailure(errorMessage(e, "The project could not start."));
    } finally {
      setBusy(false);
      guard.current = false;
    }
  }
  return (
    <main id="stage" className="page sql-intro">
      <Link className="course-back" to={"/courses/" + courseId}>
        <ArrowLeft size={18} aria-hidden="true" /> Back to the course
      </Link>
      <div className="sql-intro-art">
        <LearningCompanion />
        <Database size={54} aria-hidden="true" />
      </div>
      <h1>{project.title}</h1>
      <p>{project.description}</p>
      <p className="muted">{project.taskCount} query tasks · SQLite · Progress saved</p>
      <p>Checks use three datasets, so your query needs to work beyond the displayed rows.</p>
      {project.sessionId ? (
        <p>Your saved mode: {project.mode}.</p>
      ) : (
        <div className="sql-mode-choice">
          <label htmlFor="sql-mode">Practice mode</label>
          <select
            id="sql-mode"
            value={mode}
            aria-describedby="sql-mode-description"
            onChange={(e) => setMode(e.target.value as TutoringMode)}
          >
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p id="sql-mode-description">{modes.find((m) => m.id === mode)?.description}</p>
        </div>
      )}
      <p className="muted">
        {project.sessionId ? "" : "Your mode stays fixed. "}Hints and solutions mark assisted work.
      </p>
      <button
        type="button"
        className="button button-primary"
        disabled={busy}
        onClick={() => void start()}
      >
        {busy
          ? "Opening…"
          : project.finished
            ? "See your results"
            : project.sessionId
              ? "Continue project"
              : "Start project"}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
      {failure ? <p role="alert">{failure}</p> : null}
    </main>
  );
}
function readDraft(key: string, session: SqlProjectSession) {
  const current = session.current!;
  if (current.locked) return current.query;
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? "null");
    return cached?.revision === session.revision &&
      typeof cached.query === "string" &&
      cached.query.length <= 16000
      ? cached.query
      : current.query;
  } catch {
    return current.query;
  }
}
function SqlTaskScreen({
  session,
  onSaved,
}: {
  session: SqlProjectSession;
  onSaved: (s: SqlProjectSession) => void;
}) {
  const task = session.current!,
    experience = useExperience();
  const key = "discere:sql-draft:" + session.id + ":" + task.id;
  const [query, setQuery] = useState(() => readDraft(key, session));
  const [busy, setBusy] = useState(""),
    [failure, setFailure] = useState(""),
    [conflict, setConflict] = useState(false);
  const [endingExam, setEndingExam] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false),
    [reason, setReason] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [now, setNow] = useState(Date.now()),
    [why, setWhy] = useState(false);
  const guard = useRef(false),
    feedbackRef = useRef<HTMLDivElement>(null);
  const matches = query === task.query;
  const feedback = matches ? task.feedback : undefined;
  const act = useCallback(
    async (kind: SqlProjectAction["action"], extra: Partial<SqlProjectAction> = {}) => {
      if (guard.current) return;
      guard.current = true;
      setBusy(kind);
      setFailure("");
      if (kind === "check") experience.prepare();
      try {
        const saved = await sendSqlAction(session.id, {
          action: kind,
          taskId: task.id,
          revision: session.revision,
          requestId: crypto.randomUUID(),
          ...(["save", "run", "check", "finish"].includes(kind) ? { query } : {}),
          ...extra,
        });
        onSaved(saved);
        if (kind === "check" && saved.current?.feedback?.correct) experience.play("answer");
        if ((kind === "next" || kind === "finish") && saved.results) experience.play("complete");
        if (kind !== "save")
          setTimeout(
            () => feedbackRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" }),
            0,
          );
      } catch (e) {
        setFailure(errorMessage(e, "Your query could not be saved."));
        if (errorCode(e) === "SQL_PROJECT_CONFLICT") setConflict(true);
      } finally {
        guard.current = false;
        setBusy("");
      }
    },
    [session.id, session.revision, task.id, query, onSaved, experience],
  );
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ query, revision: session.revision }));
    } catch {
      /* Server saves still work. */
    }
  }, [key, query, session.revision]);
  useEffect(() => {
    if (matches || busy || failure || task.locked) return;
    const timer = setTimeout(() => void act("save"), 750);
    return () => clearTimeout(timer);
  }, [matches, busy, failure, task.locked, act]);
  useEffect(() => {
    if (!session.reveal) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [session.reveal]);
  const revealWait = session.reveal
    ? Math.max(0, Math.ceil((Date.parse(session.reveal.availableAt) - now) / 1000))
    : 0;
  const canContinue = matches && task.canContinue;
  // After a wrong check outside an exam, trying again stays the main action; moving on without
  // a correct answer is offered, but only as a deliberate, secondary choice.
  const retrying =
    session.mode !== "exam" && !task.locked && !task.solution && task.feedback?.correct === false;
  const unchangedSinceCheck = retrying && canContinue;
  return (
    <main
      id="stage"
      className={"sql-workspace" + (feedback?.correct ? " sql-workspace--correct" : "")}
    >
      <header className="sql-workspace-header">
        <Link to={"/courses/" + session.courseId} aria-label="Leave project">
          <X aria-hidden="true" size={22} />
        </Link>
        <div>
          <span>{session.title}</span>
          <progress value={session.completed} max={session.total} aria-label="Project progress" />
        </div>
        <span>
          {session.completed + 1} / {session.total}
        </span>
      </header>
      <div className="sql-task-heading">
        <span className="sql-eyebrow">{session.mode} · SQLite</span>
        {session.mode === "exam" ? (
          <button
            className="text-button sql-end-exam"
            type="button"
            disabled={Boolean(busy) || conflict}
            onClick={() => setEndingExam((v) => !v)}
          >
            End exam early
          </button>
        ) : null}
        {endingExam ? (
          <div className="sql-end-confirm" role="region" aria-label="Finish the exam now">
            <p>
              Finish now? Unsubmitted queries will be marked unanswered. Your submitted work will be
              graded and the solutions will open.
            </p>
            <button
              type="button"
              className="button button-secondary"
              disabled={Boolean(busy) || conflict}
              onClick={() => void act("finish")}
            >
              Submit exam now
            </button>
            <button type="button" className="text-button" onClick={() => setEndingExam(false)}>
              Keep working
            </button>
          </div>
        ) : null}
        <h1>{task.title}</h1>
        <p>{task.prompt}</p>
      </div>
      <div className="sql-workbench">
        <section className="sql-input-data" aria-label="Input tables">
          {task.tables.map((t) => (
            <SqlDataTable key={t.name} table={t} />
          ))}
        </section>
        <section className="sql-editor-pane" aria-label="Query workspace">
          <div className="sql-editor-label">
            <label htmlFor="sql-query">Your query</label>
            <span aria-live="polite">
              {busy === "save" ? "Saving…" : matches ? "Saved" : "Draft on this device"}
            </span>
          </div>
          <CodeEditor
            id="sql-query"
            language="sql"
            value={query}
            disabled={task.locked || Boolean(busy) || conflict}
            placeholder="SELECT …"
            describedBy="sql-output-contract"
            onChange={(next) => {
              setQuery(next);
              setFailure("");
              setWhy(false);
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && query.trim() && !busy) {
                e.preventDefault();
                void act("run");
              }
            }}
          />
          <p id="sql-output-contract" className="sql-output-contract">
            Return <code>{task.outputColumns.join(", ")}</code>.{" "}
            {task.ordered ? "Use the requested row order." : "Row order does not matter."}
          </p>
          <div className="sql-editor-actions">
            {!task.locked ? (
              <button
                type="button"
                className="button button-secondary"
                disabled={Boolean(busy) || !query.trim() || conflict}
                onClick={() => void act("run")}
              >
                <Play size={16} aria-hidden="true" />
                {busy === "run" ? "Running…" : "Run query"}
              </button>
            ) : null}
            {session.mode !== "exam" && !task.locked ? (
              <div className="sql-help-actions">
                {task.hintsRemaining > 0 ? (
                  <button
                    type="button"
                    className="text-button"
                    disabled={Boolean(busy) || conflict}
                    onClick={() => void act("hint")}
                  >
                    <Lightbulb size={17} aria-hidden="true" /> Hint
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-button"
                  disabled={Boolean(busy) || conflict}
                  onClick={() => setReasonOpen((v) => !v)}
                >
                  Worked query
                </button>
              </div>
            ) : null}
          </div>
          {task.hints.length ? (
            <aside className="sql-hints">
              {task.hints.map((h) => (
                <p key={h}>{h}</p>
              ))}
            </aside>
          ) : null}
          {matches && task.result ? <SqlResultTable result={task.result} /> : null}
          {matches && task.error ? (
            <p role="alert" className="sql-error">
              {task.error}
            </p>
          ) : null}
          {task.solution ? (
            <section className="sql-solution" aria-label="Worked query">
              <h2>One way to write it</h2>
              <pre>
                <code>{task.solution.query}</code>
              </pre>
              <p>{task.solution.explanation}</p>
            </section>
          ) : null}
          {reasonOpen && !task.solution ? (
            <section className="sql-reveal" aria-label="Request a worked query">
              <p>Seeing the solution records this task as assisted work.</p>
              {!session.reveal ? (
                <>
                  <label htmlFor="sql-reason">What would you like to compare?</label>
                  <input
                    id="sql-reason"
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={Boolean(busy) || !reason.trim() || conflict}
                    onClick={() => void act("reveal_start", { reason })}
                  >
                    Request worked query
                  </button>
                </>
              ) : (
                <>
                  <label htmlFor="sql-confirm">Type “show answer” to open the worked query.</label>
                  <input
                    id="sql-confirm"
                    value={confirmation}
                    maxLength={80}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={
                      Boolean(busy) ||
                      revealWait > 0 ||
                      confirmation.trim().toLowerCase() !== "show answer" ||
                      conflict
                    }
                    onClick={() =>
                      void act("reveal_confirm", { token: session.reveal!.token, confirmation })
                    }
                  >
                    {revealWait ? "Reflect for " + revealWait + "s" : "Show worked query"}
                  </button>
                </>
              )}
            </section>
          ) : null}
        </section>
      </div>
      <footer className="sql-task-footer" ref={feedbackRef}>
        <div className="sql-feedback" role="status">
          {feedback ? (
            <>
              <span className={"sql-verdict" + (feedback.correct ? " sql-verdict--correct" : "")}>
                {feedback.correct ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <Lightbulb size={18} aria-hidden="true" />
                )}
                {feedback.correct ? "Matches all three datasets" : "Check the result"}
              </span>
              {!feedback.correct || why ? <p>{feedback.message}</p> : null}
              {retrying && unchangedSinceCheck ? (
                <small>Edit your query, then check again.</small>
              ) : null}
              {task.assisted && feedback.correct ? <small>Completed with help.</small> : null}
            </>
          ) : canContinue && session.mode === "exam" ? (
            <p>Response saved. Feedback will appear after the last task.</p>
          ) : task.solution ? (
            <p>Worked query opened. Continue when you have compared the approach.</p>
          ) : (
            <p>Run your query to inspect the output, then check your answer.</p>
          )}
          {failure ? (
            <p role="alert" className="sql-error">
              {failure}
            </p>
          ) : null}
          {conflict ? (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                try {
                  localStorage.removeItem(key);
                } catch {}
                window.location.reload();
              }}
            >
              Load saved progress
            </button>
          ) : null}
        </div>
        <div className="sql-submit-actions">
          {feedback?.correct ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setWhy((v) => !v)}
              aria-expanded={why}
            >
              Why?
            </button>
          ) : null}
          {retrying ? (
            <button
              type="button"
              className="button button-quiet"
              disabled={Boolean(busy) || conflict}
              onClick={() => void act("next")}
            >
              Skip this task
            </button>
          ) : null}
          {canContinue && !retrying ? (
            <button
              type="button"
              className="button button-primary"
              disabled={Boolean(busy) || conflict}
              onClick={() => void act("next")}
            >
              {session.completed + 1 === session.total
                ? session.mode === "exam"
                  ? "Finish exam"
                  : "See results"
                : "Continue"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="button button-primary"
              disabled={
                Boolean(busy) || !query.trim() || conflict || task.locked || unchangedSinceCheck
              }
              onClick={() => void act("check")}
            >
              <Send size={16} aria-hidden="true" />
              {busy === "check"
                ? "Checking…"
                : retrying
                  ? "Check again"
                  : session.mode === "exam"
                    ? "Submit query"
                    : "Check query"}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
export function SqlProjectSessionScreen() {
  const { sessionId = "" } = useParams();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: sqlSessionKey(sessionId),
    queryFn: () => getSqlSession(sessionId),
  });
  const onSaved = useCallback(
    (s: SqlProjectSession) => {
      client.setQueryData(sqlSessionKey(s.id), s);
      void client.invalidateQueries({ queryKey: sqlProjectsKey(s.courseId) });
      void client.invalidateQueries({ queryKey: ["study"] });
    },
    [client],
  );
  if (query.isPending) return <LoadingScreen message="Opening your saved queries…" />;
  if (query.error || !query.data)
    return (
      <ErrorScreen
        title="Project unavailable"
        error={query.error}
        message={errorMessage(query.error, "Your saved project did not load.")}
        onRetry={() => query.refetch()}
        back={{ to: "/courses", label: "Back to courses" }}
      />
    );
  const session = query.data;
  if (session.current)
    return (
      <SqlTaskScreen
        key={session.id + ":" + session.current.id}
        session={session}
        onSaved={onSaved}
      />
    );
  const results = session.results ?? [];
  return (
    <main id="stage" className="page sql-summary">
      <div className="sql-intro-art">
        <LearningCompanion />
        <Check size={52} aria-hidden="true" />
      </div>
      <span className="sql-eyebrow">Project complete</span>
      <h1>{session.title}</h1>
      <p>
        {results.filter((r) => r.correct).length} of {results.length} queries matched all datasets.{" "}
        {results.filter((r) => r.independent).length} solved independently.
      </p>
      <p className="sql-earned">+{session.xp} XP</p>
      <Link className="button button-primary" to={"/courses/" + session.courseId}>
        Return to the roadmap
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <div className="sql-project-results">
        {results.map((r) => (
          <details key={r.id}>
            <summary>
              <span>{r.title}</span>
              <span>{r.independent ? "Independent" : r.correct ? "With help" : "Revisit"}</span>
            </summary>
            <h2>Your query</h2>
            <pre>
              <code>{r.query || "No query submitted."}</code>
            </pre>
            <h2>One working query</h2>
            <pre>
              <code>{r.solution}</code>
            </pre>
            <p>{r.explanation}</p>
            <Link to={"/courses/" + session.courseId + "/lessons/" + r.lessonId}>
              Revisit the lesson
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </details>
        ))}
      </div>
    </main>
  );
}
