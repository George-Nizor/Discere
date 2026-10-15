import type { CodeExercise, RustTaskRun } from "@discere/contracts";
import { Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { RuntimeSetup } from "../code-runtimes/RuntimeSetup.js";
import { runQuestionCode } from "./api.js";
import { RustConsole, RustEditor } from "./RustIde.js";

/** What the program has to do, from the one example the learner can see. */
function Example({ exercise }: { exercise: CodeExercise }) {
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
 * A lesson question answered by writing Rust. Run shows what the program does with the example;
 * the lesson's Check answer marks it against every test on the server.
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
  async function run() {
    if (busy || !code.trim()) return;
    setBusy(true);
    setFailure("");
    try {
      setRan({ code, run: await runQuestionCode(questionId, code) });
    } catch (e) {
      setFailure(errorMessage(e, "The program could not run."));
    } finally {
      setBusy(false);
    }
  }
  // A check is newer than a run of the same code; an edit since either clears the console.
  const shown = checked ?? (ran?.code === code ? ran.run : undefined);
  return (
    <div className="code-answer">
      <RuntimeSetup runtime="rust" />
      <Example exercise={exercise} />
      <RustEditor
        id={`${idPrefix}-code`}
        label="Your Rust code"
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
        {...(busy ? { busy: "Compiling and running…" } : {})}
        idle={
          exercise.kind === "function"
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
