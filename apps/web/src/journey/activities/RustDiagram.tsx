import type { LearningDiagram, RustRunResult } from "@discere/contracts";
import { Play, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { errorMessage } from "../../api/client.js";
import { runRust } from "../../rust/api.js";
import { RustConsole, RustEditor } from "../../rust/RustIde.js";

type Spec = Extract<LearningDiagram, { type: "rust_program" }>;

function recorded(spec: Spec): RustRunResult {
  return spec.outcome.kind === "output"
    ? { status: "ok", diagnostics: "", stdout: spec.outcome.stdout, stderr: "", exitCode: 0 }
    : {
        status: "compile_error",
        diagnostics: spec.outcome.diagnostics,
        stdout: "",
        stderr: "",
        exitCode: 1,
      };
}

/**
 * A lesson's Rust program. Until the learner answers, it is only code to read. After that it
 * shows what rustc did with it, and the learner can edit the program and run it for real.
 */
export function RustDiagram({ spec, showResults }: { spec: Spec; showResults: boolean }) {
  const id = useId();
  const [code, setCode] = useState(spec.code);
  const [live, setLive] = useState<RustRunResult>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const edited = code !== spec.code;
  async function run() {
    if (busy || !code.trim()) return;
    setBusy(true);
    setFailure("");
    try {
      setLive(await runRust(code));
    } catch (e) {
      setFailure(errorMessage(e, "The program could not run."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="learning-diagram rust-diagram">
      <RustEditor
        id={id}
        label="Rust program"
        fitLines
        value={code}
        disabled={!showResults}
        onChange={(next) => {
          setCode(next);
          setLive(undefined);
        }}
        onRun={() => void run()}
      />
      {showResults ? (
        <>
          <div className="rust-ide-toolbar">
            <button
              type="button"
              className="button button-secondary"
              disabled={busy || !code.trim()}
              onClick={() => void run()}
            >
              <Play size={16} aria-hidden="true" />
              {busy ? "Running…" : edited ? "Run your version" : "Run it yourself"}
            </button>
            {edited ? (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setCode(spec.code);
                  setLive(undefined);
                }}
              >
                <RotateCcw size={15} aria-hidden="true" /> Original
              </button>
            ) : null}
          </div>
          <RustConsole
            {...(live ? { result: live } : edited ? {} : { result: recorded(spec) })}
            {...(busy ? { busy: "Compiling and running…" } : {})}
            idle="Run your edited program to see what it does."
          >
            {failure ? (
              <p role="alert" className="rust-console-message rust-console-message--error">
                {failure}
              </p>
            ) : null}
          </RustConsole>
        </>
      ) : null}
    </div>
  );
}
