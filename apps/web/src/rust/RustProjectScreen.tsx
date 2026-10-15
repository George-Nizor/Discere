import type { RustProjectAction, RustProjectSession, TutoringMode } from "@discere/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Lightbulb, Play, Send, SquareTerminal, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { errorCode, errorMessage } from "../api/client.js";
import { useExperience } from "../study/experience.js";
import { ErrorScreen, LoadingScreen } from "../ui/Feedback.js";
import { LearningCompanion } from "../ui/LearningCompanion.js";
import {
  getRustProjects,
  getRustSession,
  rustProjectsKey,
  rustSessionKey,
  rustSessionPath,
  sendRustAction,
  startRustProject,
} from "./api.js";
import { RustConsole, RustEditor, TaskText } from "./RustIde.js";
import { RuntimeSetup } from "../code-runtimes/RuntimeSetup.js";

const modes = [
  { id: "coach", label: "Coach", description: "Work from the task, with hints when you need them." },
  { id: "assisted", label: "Assisted", description: "Use hints and corrections as you go." },
  {
    id: "direct",
    label: "Direct",
    description: "Open a worked program when you want to compare approaches.",
  },
  {
    id: "exam",
    label: "Exam",
    description: "Submit each program once. Results and solutions appear at the end.",
  },
] as const;

export function RustProjectStartScreen() {
  const { courseId = "", projectId = "" } = useParams();
  const query = useQuery({
    queryKey: rustProjectsKey(courseId),
    queryFn: () => getRustProjects(courseId),
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
        void navigate(rustSessionPath(project.sessionId));
        return;
      }
      const session = await startRustProject(courseId, projectId, mode);
      client.setQueryData(rustSessionKey(session.id), session);
      void client.invalidateQueries({ queryKey: rustProjectsKey(courseId) });
      void navigate(rustSessionPath(session.id));
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
        <SquareTerminal size={54} aria-hidden="true" />
      </div>
      <h1>{project.title}</h1>
      <p>{project.description}</p>
      <p className="muted">
        {project.taskCount} programs · Rust 1.93 · Progress saved
      </p>
      <p>
        Check also tests each program on inputs you don't see, so it has to work for any input
        the task describes.
      </p>
      {project.sessionId ? (
        <p>Your saved mode: {project.mode}.</p>
      ) : (
        <div className="python-mode-choice">
          <label htmlFor="rust-mode">Practice mode</label>
          <select
            id="rust-mode"
            value={mode}
            aria-describedby="rust-mode-description"
            onChange={(e) => setMode(e.target.value as TutoringMode)}
          >
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p id="rust-mode-description">{modes.find((m) => m.id === mode)?.description}</p>
        </div>
      )}
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

function readDraft(key: string, session: RustProjectSession) {
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

function Example({ task }: { task: NonNullable<RustProjectSession["current"]> }) {
  if (task.kind === "function" && task.call)
    return (
      <section className="rust-example" aria-label="Example">
        <h2>Signature</h2>
        <pre>
          <code>
            fn {task.call.name}(
            {task.call.parameters.map((p) => p.name + ": " + p.type).join(", ")}) -&gt;{" "}
            {task.call.returns}
          </code>
        </pre>
        <h2>Example</h2>
        <pre>
          <code>
            {task.call.name}({task.example.arguments?.join(", ")}) returns {task.example.expected}
          </code>
        </pre>
      </section>
    );
  return (
    <section className="rust-example" aria-label="Example">
      {task.example.stdin ? (
        <>
          <h2>When the input is</h2>
          <pre>
            <code>{task.example.stdin}</code>
          </pre>
        </>
      ) : null}
      <h2>{task.example.stdin ? "it prints" : "Expected output"}</h2>
      <pre>
        <code>{task.example.expected}</code>
      </pre>
    </section>
  );
}

function RustTaskScreen({
  session,
  onSaved,
}: {
  session: RustProjectSession;
  onSaved: (s: RustProjectSession) => void;
}) {
  const task = session.current!,
    experience = useExperience();
  const key = "discere:rust-draft:" + session.id + ":" + task.id;
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
  const guard = useRef(false);
  const matches = code === task.code;
  const feedback = matches ? task.feedback : undefined;
  const exam = session.mode === "exam";
  const act = useCallback(
    async (kind: RustProjectAction["action"], extra: Partial<RustProjectAction> = {}) => {
      if (guard.current) return;
      guard.current = true;
      setBusy(kind);
      setFailure("");
      if (kind === "check") experience.prepare();
      try {
        const saved = await sendRustAction(session.id, {
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
      } catch (e) {
        setFailure(errorMessage(e, "Your program could not be saved."));
        if (errorCode(e) === "RUST_PROJECT_CONFLICT") setConflict(true);
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
  const retrying = !exam && !task.locked && !task.solution && task.feedback?.correct === false;
  const unchangedSinceCheck = retrying && canContinue;
  const disabled = Boolean(busy) || conflict;
  return (
    <main
      id="stage"
      className={"rust-ide rust-ide--task" + (feedback?.correct ? " rust-ide--correct" : "")}
    >
      <header className="rust-ide-header">
        <Link
          className="rust-icon-button"
          to={"/courses/" + session.courseId}
          aria-label="Leave project"
        >
          <X aria-hidden="true" size={20} />
        </Link>
        <div className="rust-ide-progress">
          <span>{session.title}</span>
          <progress value={session.completed} max={session.total} aria-label="Project progress" />
        </div>
        <span className="rust-ide-version">
          {session.completed + 1} / {session.total}
        </span>
      </header>
      <RuntimeSetup runtime="rust" />
      <div className="rust-ide-split">
        <section className="rust-ide-brief" aria-label="Task">
          <h1>{task.title}</h1>
          <TaskText text={task.prompt} />
          <Example task={task} />
          {task.hints.length ? (
            <aside className="rust-hints" aria-label="Hints">
              {task.hints.map((h) => (
                <TaskText key={h} text={h} />
              ))}
            </aside>
          ) : null}
          {!exam && !task.locked ? (
            <div className="rust-help-actions">
              {task.hintsRemaining > 0 ? (
                <button
                  type="button"
                  className="text-button"
                  disabled={disabled}
                  onClick={() => void act("hint")}
                >
                  <Lightbulb size={16} aria-hidden="true" /> Hint
                </button>
              ) : null}
              <button
                type="button"
                className="text-button"
                disabled={disabled}
                onClick={() => setReasonOpen((v) => !v)}
              >
                Worked program
              </button>
            </div>
          ) : null}
          {reasonOpen && !task.solution ? (
            <section className="rust-reveal" aria-label="Request the worked program">
              <p>Opening the worked program marks this task as done with help.</p>
              {!session.reveal ? (
                <>
                  <label htmlFor="rust-reason">What do you want to compare?</label>
                  <input
                    id="rust-reason"
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={disabled || reason.trim().length < 3}
                    onClick={() => void act("reveal_start", { reason })}
                  >
                    Request worked program
                  </button>
                </>
              ) : (
                <>
                  <label htmlFor="rust-confirm">Type “show answer” to open it.</label>
                  <input
                    id="rust-confirm"
                    value={confirmation}
                    maxLength={40}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={
                      disabled ||
                      revealWait > 0 ||
                      confirmation.trim().toLowerCase() !== "show answer"
                    }
                    onClick={() =>
                      void act("reveal_confirm", { token: session.reveal!.token, confirmation })
                    }
                  >
                    {revealWait ? "Think it over for " + revealWait + "s" : "Show worked program"}
                  </button>
                </>
              )}
            </section>
          ) : null}
          {task.solution ? (
            <section className="rust-solution" aria-label="Worked program">
              <h2>One way to write it</h2>
              <pre>
                <code>{task.solution.code}</code>
              </pre>
              <TaskText text={task.solution.explanation} />
            </section>
          ) : null}
          {exam ? (
            <div className="rust-exam">
              <button
                className="text-button"
                type="button"
                disabled={disabled}
                onClick={() => setEndingExam((v) => !v)}
              >
                End exam early
              </button>
              {endingExam ? (
                <div role="region" aria-label="Finish the exam now">
                  <p>
                    Finish now? Programs you haven't submitted count as unanswered. Your submitted
                    work is graded and the solutions open.
                  </p>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={disabled}
                    onClick={() => void act("finish")}
                  >
                    Submit exam now
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
        <section className="rust-ide-code" aria-label="Code">
          <div className="rust-ide-file">
            <span>main.rs</span>
            <span aria-live="polite">
              {busy === "save" ? "Saving…" : matches ? "Saved" : "Editing"}
            </span>
          </div>
          <RustEditor
            id="rust-code"
            label="Your Rust program"
            value={code}
            disabled={task.locked || disabled}
            onChange={(next) => {
              setCode(next);
              setFailure("");
              setWhy(false);
            }}
            onRun={() => {
              if (code.trim() && !busy && !task.locked) void act("run");
            }}
          />
          <div className="rust-ide-toolbar">
            {!task.locked ? (
              <button
                type="button"
                className="button button-secondary"
                disabled={disabled || !code.trim()}
                onClick={() => void act("run")}
              >
                <Play size={16} aria-hidden="true" />
                {busy === "run" ? "Running…" : "Run"}
              </button>
            ) : null}
            {canContinue && !retrying ? (
              <button
                type="button"
                className="button button-primary"
                disabled={disabled}
                onClick={() => void act("next")}
              >
                {session.completed + 1 === session.total
                  ? exam
                    ? "Finish exam"
                    : "See results"
                  : "Continue"}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="button button-primary"
                disabled={disabled || !code.trim() || task.locked || unchangedSinceCheck}
                onClick={() => void act("check")}
              >
                <Send size={16} aria-hidden="true" />
                {busy === "check" ? "Checking…" : exam ? "Submit" : "Check"}
              </button>
            )}
            {retrying ? (
              <button
                type="button"
                className="text-button"
                disabled={disabled}
                onClick={() => void act("next")}
              >
                Skip this task
              </button>
            ) : null}
          </div>
          <RustConsole
            {...(matches && task.run ? { result: task.run } : {})}
            {...(busy === "run" || busy === "check"
              ? { busy: busy === "run" ? "Compiling and running…" : "Running the tests…" }
              : {})}
            idle="Run shows what your program does with the example. Check also tests it on inputs you don't see."
          >
            {feedback ? (
              <div
                className={"rust-verdict" + (feedback.correct ? " rust-verdict--correct" : "")}
                role="status"
              >
                <p className="rust-verdict-title">
                  {feedback.correct ? (
                    <Check size={17} aria-hidden="true" />
                  ) : (
                    <Lightbulb size={17} aria-hidden="true" />
                  )}
                  {feedback.correct ? "All tests passed" : "Not yet"}
                </p>
                {!feedback.correct || why ? <TaskText text={feedback.message} /> : null}
                {feedback.correct ? (
                  <button
                    type="button"
                    className="text-button"
                    aria-expanded={why}
                    onClick={() => setWhy((v) => !v)}
                  >
                    {why ? "Hide explanation" : "Why it works"}
                  </button>
                ) : null}
                {task.assisted && feedback.correct ? <small>Completed with help.</small> : null}
                {unchangedSinceCheck ? <small>Edit your program, then check again.</small> : null}
              </div>
            ) : canContinue && exam ? (
              <p className="rust-console-message">
                Submitted. Results appear after the last program.
              </p>
            ) : null}
            {failure ? (
              <p role="alert" className="rust-console-message rust-console-message--error">
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
          </RustConsole>
        </section>
      </div>
    </main>
  );
}

export function RustProjectSessionScreen() {
  const { sessionId = "" } = useParams();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: rustSessionKey(sessionId),
    queryFn: () => getRustSession(sessionId),
  });
  const onSaved = useCallback(
    (s: RustProjectSession) => {
      client.setQueryData(rustSessionKey(s.id), s);
      void client.invalidateQueries({ queryKey: rustProjectsKey(s.courseId) });
      void client.invalidateQueries({ queryKey: ["study"] });
    },
    [client],
  );
  if (query.isPending) return <LoadingScreen message="Opening your saved programs…" />;
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
      <RustTaskScreen
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
      <h1>{session.title}: done</h1>
      <p>
        {results.filter((r) => r.correct).length} of {results.length} programs passed every test.{" "}
        {results.filter((r) => r.independent).length} without help.
      </p>
      <p className="python-earned">+{session.xp} XP</p>
      <Link className="button button-primary" to={"/courses/" + session.courseId}>
        Back to the course
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <div className="python-project-results">
        {results.map((r) => (
          <details key={r.id}>
            <summary>
              <span>{r.title}</span>
              <span>{r.independent ? "Without help" : r.correct ? "With help" : "Revisit"}</span>
            </summary>
            <h2>Your program</h2>
            <pre>
              <code>{r.code || "Nothing submitted."}</code>
            </pre>
            <h2>One working program</h2>
            <pre>
              <code>{r.solution}</code>
            </pre>
            <TaskText text={r.explanation} />
            <Link to={"/courses/" + session.courseId + "/lessons/" + r.lessonId}>
              Back to the lesson
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </details>
        ))}
      </div>
    </main>
  );
}
