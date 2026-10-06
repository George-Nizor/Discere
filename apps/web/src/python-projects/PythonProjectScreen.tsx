import type { PythonProjectAction, PythonProjectSession, TutoringMode } from "@discere/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Code2, Lightbulb, Play, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { errorCode, errorMessage } from "../api/client.js";
import { useExperience } from "../study/experience.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { LearningCompanion } from "../ui/LearningCompanion.js";
import {
  getPythonProjects,
  getPythonSession,
  sendPythonAction,
  pythonProjectsKey,
  pythonSessionKey,
  pythonSessionPath,
  startPythonProject,
} from "./api.js";
import { PythonInputData, PythonResultData } from "./PythonData.js";
import { CodeEditor } from "../sql-projects/CodeEditor.js";
const modes = [
  {
    id: "coach",
    label: "Coach",
    description: "Work from a question, with hints when you need them.",
  },
  {
    id: "assisted",
    label: "Assisted",
    description: "Use hints and corrections as you build your code.",
  },
  {
    id: "direct",
    label: "Direct",
    description: "Request a worked program when you want to compare approaches.",
  },
  {
    id: "exam",
    label: "Exam",
    description: "Submit each code once. Feedback and solutions appear at the end.",
  },
] as const;
export function PythonProjectStartScreen() {
  const { courseId = "", projectId = "" } = useParams();
  const code = useQuery({
    queryKey: pythonProjectsKey(courseId),
    queryFn: () => getPythonProjects(courseId),
  });
  const navigate = useNavigate(),
    client = useQueryClient();
  const [mode, setMode] = useState<TutoringMode>("coach"),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const guard = useRef(false);
  if (code.isPending) return <LoadingScreen message="Loading the project…" />;
  if (code.error)
    return (
      <ErrorScreen
        title="Project unavailable"
        error={code.error}
        message={errorMessage(code.error, "The project did not load.")}
        onRetry={() => code.refetch()}
        back={{ to: "/courses", label: "Back to courses" }}
      />
    );
  const project = code.data?.projects.find((p) => p.id === projectId);
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
        void navigate(pythonSessionPath(project.sessionId));
        return;
      }
      const session = await startPythonProject(courseId, projectId, mode);
      client.setQueryData(pythonSessionKey(session.id), session);
      void client.invalidateQueries({ queryKey: pythonProjectsKey(courseId) });
      void navigate(pythonSessionPath(session.id));
    } catch (e) {
      setFailure(errorMessage(e, "The project could not start."));
    } finally {
      setBusy(false);
      guard.current = false;
    }
  }
  return (
    <main id="stage" className="page python-intro">
      <Link className="course-back" to={"/courses/" + courseId}>
        <ArrowLeft size={18} aria-hidden="true" /> Back to the course
      </Link>
      <div className="python-intro-art">
        <LearningCompanion />
        <Code2 size={54} aria-hidden="true" />
      </div>
      <h1>{project.title}</h1>
      <p>{project.description}</p>
      <p className="muted">{project.taskCount} programming tasks · Python 3.12 · Progress saved</p>
      <p>Checks use three datasets, so your program needs to work beyond the displayed inputs.</p>
      {project.sessionId ? (
        <p>Your saved mode: {project.mode}.</p>
      ) : (
        <div className="python-mode-choice">
          <label htmlFor="python-mode">Practice mode</label>
          <select
            id="python-mode"
            value={mode}
            aria-describedby="python-mode-description"
            onChange={(e) => setMode(e.target.value as TutoringMode)}
          >
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p id="python-mode-description">{modes.find((m) => m.id === mode)?.description}</p>
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
function readDraft(key: string, session: PythonProjectSession) {
  const current = session.current!;
  if (current.locked) return current.code;
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? "null");
    return cached?.revision === session.revision &&
      typeof cached.code === "string" &&
      cached.code.length <= 16000
      ? cached.code
      : current.code;
  } catch {
    return current.code;
  }
}
function PythonTaskScreen({
  session,
  onSaved,
}: {
  session: PythonProjectSession;
  onSaved: (s: PythonProjectSession) => void;
}) {
  const task = session.current!,
    experience = useExperience();
  const key = "discere:python-draft:" + session.id + ":" + task.id;
  const [code, setCode] = useState(() => readDraft(key, session));
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
  const matches = code === task.code;
  const feedback = matches ? task.feedback : undefined;
  const act = useCallback(
    async (kind: PythonProjectAction["action"], extra: Partial<PythonProjectAction> = {}) => {
      if (guard.current) return;
      guard.current = true;
      setBusy(kind);
      setFailure("");
      if (kind === "check") experience.prepare();
      try {
        const saved = await sendPythonAction(session.id, {
          action: kind,
          taskId: task.id,
          revision: session.revision,
          requestId: crypto.randomUUID(),
          ...(["save", "run", "check", "finish"].includes(kind) ? { code } : {}),
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
        setFailure(errorMessage(e, "Your program could not be saved."));
        if (errorCode(e) === "PYTHON_PROJECT_CONFLICT") setConflict(true);
      } finally {
        guard.current = false;
        setBusy("");
      }
    },
    [session.id, session.revision, task.id, code, onSaved, experience],
  );
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ code, revision: session.revision }));
    } catch {
      /* Server saves still work. */
    }
  }, [key, code, session.revision]);
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
      className={"python-workspace" + (feedback?.correct ? " python-workspace--correct" : "")}
    >
      <header className="python-workspace-header">
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
      <div className="python-task-heading">
        <span className="python-eyebrow">{session.mode} · Python 3.12</span>
        {session.mode === "exam" ? (
          <button
            className="text-button python-end-exam"
            type="button"
            disabled={Boolean(busy) || conflict}
            onClick={() => setEndingExam((v) => !v)}
          >
            End exam early
          </button>
        ) : null}
        {endingExam ? (
          <div className="python-end-confirm" role="region" aria-label="Finish the exam now">
            <p>
              Finish now? Unsubmitted programs will be marked unanswered. Your submitted work will
              be graded and the solutions will open.
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
      <div className="python-workbench">
        <section className="python-input-data" aria-label="Supplied variables">
          <PythonInputData inputs={task.inputs} />
        </section>
        <section className="python-editor-pane" aria-label="Python workspace">
          <div className="python-editor-label">
            <label htmlFor="python-code">Your code</label>
            <span aria-live="polite">
              {busy === "save" ? "Saving…" : matches ? "Saved" : "Draft on this device"}
            </span>
          </div>
          <CodeEditor
            id="python-code"
            language="python"
            value={code}
            disabled={task.locked || Boolean(busy) || conflict}
            placeholder="Write Python here…"
            describedBy="python-output-contract"
            onChange={(next) => {
              setCode(next);
              setFailure("");
              setWhy(false);
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && code.trim() && !busy) {
                e.preventDefault();
                void act("run");
              }
            }}
          />
          <p id="python-output-contract" className="python-output-contract">
            {task.call ? (
              <>
                Checks call{" "}
                <code>
                  {task.call.name}({task.call.arguments.join(", ")})
                </code>
                .
              </>
            ) : (
              <>Ctrl / ⌘ + Enter runs your program.</>
            )}
          </p>
          <div className="python-editor-actions">
            {!task.locked ? (
              <button
                type="button"
                className="button button-secondary"
                disabled={Boolean(busy) || !code.trim() || conflict}
                onClick={() => void act("run")}
              >
                <Play size={16} aria-hidden="true" />
                {busy === "run" ? "Running…" : "Run program"}
              </button>
            ) : null}
            {session.mode !== "exam" && !task.locked ? (
              <div className="python-help-actions">
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
                  Worked program
                </button>
              </div>
            ) : null}
          </div>
          {task.hints.length ? (
            <aside className="python-hints">
              {task.hints.map((h) => (
                <p key={h}>{h}</p>
              ))}
            </aside>
          ) : null}
          {matches && task.result !== undefined ? <PythonResultData result={task.result} /> : null}
          {matches && task.output ? (
            <section className="python-printed-output" aria-label="Printed text">
              <h2>Printed text</h2>
              <pre>
                <code>{task.output}</code>
              </pre>
            </section>
          ) : null}
          {matches && task.error ? (
            <p role="alert" className="python-error">
              {task.error}
            </p>
          ) : null}
          {task.solution ? (
            <section className="python-solution" aria-label="Worked program">
              <h2>One way to write it</h2>
              <pre>
                <code>{task.solution.code}</code>
              </pre>
              <p>{task.solution.explanation}</p>
            </section>
          ) : null}
          {reasonOpen && !task.solution ? (
            <section className="python-reveal" aria-label="Request a worked program">
              <p>Seeing the solution records this task as assisted work.</p>
              {!session.reveal ? (
                <>
                  <label htmlFor="python-reason">What would you like to compare?</label>
                  <input
                    id="python-reason"
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
                    Request worked program
                  </button>
                </>
              ) : (
                <>
                  <label htmlFor="python-confirm">
                    Type “show answer” to open the worked program.
                  </label>
                  <input
                    id="python-confirm"
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
                    {revealWait ? "Reflect for " + revealWait + "s" : "Show worked program"}
                  </button>
                </>
              )}
            </section>
          ) : null}
        </section>
      </div>
      <footer className="python-task-footer" ref={feedbackRef}>
        <div className="python-feedback" role="status">
          {feedback ? (
            <>
              <span
                className={"python-verdict" + (feedback.correct ? " python-verdict--correct" : "")}
              >
                {feedback.correct ? (
                  <Check size={18} aria-hidden="true" />
                ) : (
                  <Lightbulb size={18} aria-hidden="true" />
                )}
                {feedback.correct ? "Matches all three datasets" : "Check the result"}
              </span>
              {!feedback.correct || why ? <p>{feedback.message}</p> : null}
              {retrying && unchangedSinceCheck ? (
                <small>Edit your program, then check again.</small>
              ) : null}
              {task.assisted && feedback.correct ? <small>Completed with help.</small> : null}
            </>
          ) : canContinue && session.mode === "exam" ? (
            <p>Response saved. Feedback will appear after the last task.</p>
          ) : task.solution ? (
            <p>Worked program opened. Continue when you have compared the approach.</p>
          ) : (
            <p>Run your code to inspect the output, then check your answer.</p>
          )}
          {failure ? (
            <p role="alert" className="python-error">
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
        <div className="python-submit-actions">
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
                Boolean(busy) || !code.trim() || conflict || task.locked || unchangedSinceCheck
              }
              onClick={() => void act("check")}
            >
              <Send size={16} aria-hidden="true" />
              {busy === "check"
                ? "Checking…"
                : retrying
                  ? "Check again"
                  : session.mode === "exam"
                    ? "Submit program"
                    : "Check program"}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
export function PythonProjectSessionScreen() {
  const { sessionId = "" } = useParams();
  const client = useQueryClient();
  const code = useQuery({
    queryKey: pythonSessionKey(sessionId),
    queryFn: () => getPythonSession(sessionId),
  });
  const onSaved = useCallback(
    (s: PythonProjectSession) => {
      client.setQueryData(pythonSessionKey(s.id), s);
      void client.invalidateQueries({ queryKey: pythonProjectsKey(s.courseId) });
      void client.invalidateQueries({ queryKey: ["study"] });
    },
    [client],
  );
  if (code.isPending) return <LoadingScreen message="Opening your saved programs…" />;
  if (code.error || !code.data)
    return (
      <ErrorScreen
        title="Project unavailable"
        error={code.error}
        message={errorMessage(code.error, "Your saved project did not load.")}
        onRetry={() => code.refetch()}
        back={{ to: "/courses", label: "Back to courses" }}
      />
    );
  const session = code.data;
  if (session.current)
    return (
      <PythonTaskScreen
        key={session.id + ":" + session.current.id}
        session={session}
        onSaved={onSaved}
      />
    );
  const results = session.results ?? [];
  return (
    <main id="stage" className="page python-summary">
      <div className="python-intro-art">
        <LearningCompanion />
        <Check size={52} aria-hidden="true" />
      </div>
      <span className="python-eyebrow">Project complete</span>
      <h1>{session.title}</h1>
      <p>
        {results.filter((r) => r.correct).length} of {results.length} programs matched all datasets.{" "}
        {results.filter((r) => r.independent).length} solved independently.
      </p>
      <p className="python-earned">+{session.xp} XP</p>
      <Link className="button button-primary" to={"/courses/" + session.courseId}>
        Return to the roadmap
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <div className="python-project-results">
        {results.map((r) => (
          <details key={r.id}>
            <summary>
              <span>{r.title}</span>
              <span>{r.independent ? "Independent" : r.correct ? "With help" : "Revisit"}</span>
            </summary>
            <h2>Your code</h2>
            <pre>
              <code>{r.code || "No program submitted."}</code>
            </pre>
            <h2>One working program</h2>
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
