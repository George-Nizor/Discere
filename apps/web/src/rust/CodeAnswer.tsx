import {
  type CodeExercise,
  type PythonExercise,
  type PythonValue,
  type RustTaskRun,
  type SqlExercise,
  pythonGiven,
  pythonLiteral,
} from "@discere/contracts";
import { Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { RuntimeSetup, useCodeRuntime } from "../code-runtimes/RuntimeSetup.js";
import { SqlDataTable } from "../sql-projects/SqlTable.js";
import { runQuestionCode } from "./api.js";
import { RustConsole, RustEditor } from "./RustIde.js";

/** A Python exercise's one visible test: the names already set, and what the program must produce. */
function PythonExample({ exercise }: { exercise: PythonExercise }) {
  const { example, names } = exercise;
  const given = pythonGiven(exercise, example.inputs);
  const expected = example.expected as Record<string, PythonValue>;
  return (
    <dl className="code-answer-example">
      {given ? (
        <>
          <dt>{exercise.call ? "Example call" : "Already set"}</dt>
          <dd>
            <code>{given}</code>
          </dd>
        </>
      ) : null}
      <dt>{exercise.call ? "Returns" : "Should end with"}</dt>
      <dd>
        <code>
          {names
            ? names.map((name) => name + " = " + pythonLiteral(expected[name] ?? null)).join(", ")
            : pythonLiteral(example.expected)}
        </code>
      </dd>
    </dl>
  );
}

/**
 * The tables an SQL exercise reads: each table's name, its columns with their types, and the
 * rows Run uses, so nothing about the data has to be guessed.
 */
function SqlTables({ exercise }: { exercise: SqlExercise }) {
  return (
    <section className="code-answer-tables" aria-label="Tables">
      {exercise.tables.map((table) => (
        <SqlDataTable key={table.name} table={table} />
      ))}
    </section>
  );
}

/**
 * SQL runs on the SQLite inside Python. An installed Windows app downloads that Python once, so
 * the offer to download it belongs here; a checkout uses the system's Python and is offered
 * nothing, because the sandbox the Python lessons need is not what SQL runs on.
 */
function SqlRuntimeSetup() {
  const python = useCodeRuntime("python");
  return python && python.state !== "manual" ? <RuntimeSetup runtime="python" /> : null;
}

/** What the program has to do, from the one example the learner can see. */
function Example({ exercise }: { exercise: CodeExercise }) {
  if (exercise.language === "sql") return <SqlTables exercise={exercise} />;
  if (exercise.language === "python") return <PythonExample exercise={exercise} />;
  const { example, call } = exercise;
  if (exercise.kind === "function" && call)
    return (
      <dl className="code-answer-example">
        <dt>Signature</dt>
        <dd>
          <code>
            fn {call.name}({call.parameters.map((p) => p.name + ": " + p.type).join(", ")}) -&gt;{" "}
            {call.returns}
          </code>
        </dd>
        <dt>Example</dt>
        <dd>
          <code>
            {call.name}({example.arguments?.join(", ")}) returns {example.expected}
          </code>
        </dd>
      </dl>
    );
  return (
    <dl className="code-answer-example">
      {example.stdin ? (
        <>
          <dt>Input</dt>
          <dd>
            <pre>{example.stdin}</pre>
          </dd>
        </>
      ) : null}
      <dt>Expected output</dt>
      <dd>
        <pre>{example.expected}</pre>
      </dd>
    </dl>
  );
}

/**
 * A lesson question answered by writing Rust, Python or an SQL query. Run shows what the program does with
 * the example; the lesson's Check answer marks it against every test on the server.
 */
export function CodeAnswer({
  questionId,
  exercise,
  code,
  onChange,
  readOnly,
  checked,
  idPrefix,
}: {
  questionId: string;
  exercise: CodeExercise;
  code: string;
  onChange: (code: string) => void;
  readOnly: boolean;
  /** The last check's run, while the code on screen is the code that was checked. */
  checked?: RustTaskRun | undefined;
  idPrefix: string;
}) {
  const [ran, setRan] = useState<{ code: string; run: RustTaskRun }>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const python = exercise.language === "python";
  const sql = exercise.language === "sql";
  async function run() {
    if (busy || !code.trim()) return;
    setBusy(true);
    setFailure("");
    try {
      setRan({ code, run: await runQuestionCode(questionId, code) });
    } catch (e) {
      setFailure(
        errorMessage(e, sql ? "The query could not run." : "The program could not run."),
      );
    } finally {
      setBusy(false);
    }
  }
  // A check is newer than a run of the same code; an edit since either clears the console.
  const shown = checked ?? (ran?.code === code ? ran.run : undefined);
  return (
    <div className="code-answer">
      {exercise.language === "sql" ? (
        <SqlRuntimeSetup />
      ) : (
        <RuntimeSetup runtime={exercise.language} />
      )}
      <Example exercise={exercise} />
      <RustEditor
        id={`${idPrefix}-code`}
        label={sql ? "Your SQL query" : python ? "Your Python code" : "Your Rust code"}
        language={exercise.language}
        fitLines
        value={code}
        disabled={readOnly}
        onChange={onChange}
        onRun={() => void run()}
      />
      <div className="rust-ide-toolbar">
        <button
          type="button"
          className="button button-secondary"
          disabled={busy || readOnly || !code.trim()}
          onClick={() => void run()}
        >
          <Play size={16} aria-hidden="true" />
          {busy ? "Running…" : "Run"}
        </button>
        {!readOnly && code !== exercise.starter ? (
          <button type="button" className="text-button" onClick={() => onChange(exercise.starter)}>
            <RotateCcw size={15} aria-hidden="true" /> Start over
          </button>
        ) : null}
      </div>
      <RustConsole
        result={shown}
        language={exercise.language}
        {...(busy ? { busy: python || sql ? "Running…" : "Compiling and running…" } : {})}
        idle={
          exercise.language === "sql"
            ? "Run shows the rows your query returns from the tables above. Check answer also runs it against other rows."
            : exercise.language === "python"
            ? "Run shows what your code prints and produces for the example. Check answer runs every test."
            : exercise.kind === "function"
            ? "Run shows what your function returns for the example. Check answer also tries other inputs."
            : "Run shows what your program prints. Check answer compares it with the expected output."
        }
      >
        {failure ? (
          <p role="alert" className="rust-console-message rust-console-message--error">
            {failure}
          </p>
        ) : null}
      </RustConsole>
    </div>
  );
}
