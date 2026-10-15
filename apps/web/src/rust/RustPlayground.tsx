import type { RustRunResult } from "@discere/contracts";
import { useQuery } from "@tanstack/react-query";
import { RuntimeSetup } from "../code-runtimes/RuntimeSetup.js";
import { Play, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { errorMessage } from "../api/client.js";
import { getRustStatus, runRust } from "./api.js";
import { RustConsole, RustEditor } from "./RustIde.js";

const STARTER = `fn main() {
    let name = "Ferris";
    let legs = 8;
    println!("{name} has {legs} legs.");
}
`;
const DRAFT_KEY = "discere:rust-playground";

function readDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return saved && saved.length <= 16000 ? saved : STARTER;
  } catch {
    return STARTER;
  }
}

/** A scratch Rust workspace: write anything, run it, nothing is graded. */
export function RustPlaygroundScreen() {
  const status = useQuery({ queryKey: ["rust-status"], queryFn: getRustStatus });
  const navigate = useNavigate();
  const [code, setCode] = useState(readDraft);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RustRunResult>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const guard = useRef(false);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, code);
    } catch {
      /* The draft only lives in this tab. */
    }
  }, [code]);
  async function run() {
    if (guard.current || !code.trim()) return;
    guard.current = true;
    setBusy(true);
    setFailure("");
    try {
      setResult(await runRust(code, stdin));
    } catch (e) {
      setFailure(errorMessage(e, "The program could not run."));
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  return (
    <main id="stage" className="rust-ide rust-ide--playground">
      <header className="rust-ide-header">
        <button
          type="button"
          className="rust-icon-button"
          aria-label="Leave the playground"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/courses"))}
        >
          <X size={20} aria-hidden="true" />
        </button>
        <h1>Rust playground</h1>
        <span className="rust-ide-version">
          {status.data?.ready ? status.data.version : status.isPending ? "" : "Rust unavailable"}
        </span>
      </header>
      <RuntimeSetup runtime="rust" />
      <div className="rust-ide-split">
        <section className="rust-ide-code" aria-label="Code">
          <RustEditor id="rust-playground-code" label="Rust code" value={code} onChange={setCode} onRun={() => void run()} />
          <div className="rust-ide-toolbar">
            <button
              type="button"
              className="button button-primary"
              disabled={busy || !code.trim()}
              onClick={() => void run()}
            >
              <Play size={16} aria-hidden="true" />
              {busy ? "Running…" : "Run"}
            </button>
            <span className="rust-ide-shortcut">Ctrl + Enter</span>
            <button
              type="button"
              className="text-button"
              disabled={busy || code === STARTER}
              onClick={() => {
                setCode(STARTER);
                setResult(undefined);
              }}
            >
              <RotateCcw size={15} aria-hidden="true" /> Reset
            </button>
          </div>
        </section>
        <div className="rust-ide-side">
          <RustConsole
            result={result}
            {...(busy ? { busy: "Compiling and running…" } : {})}
            idle="Run your program to see what rustc and the program print."
          >
            {failure ? (
              <p role="alert" className="rust-console-message">
                {failure}
              </p>
            ) : null}
          </RustConsole>
          <details className="rust-stdin">
            <summary>Standard input</summary>
            <label htmlFor="rust-playground-stdin">Text your program reads from stdin</label>
            <textarea
              id="rust-playground-stdin"
              value={stdin}
              maxLength={4000}
              rows={4}
              spellCheck={false}
              onChange={(e) => setStdin(e.target.value)}
            />
          </details>
          <p className="rust-ide-note">
            Programs compile with rustc on this computer, without network access. The{" "}
            <Link to="/courses/rust-foundations">Rust Foundations course</Link> starts from the
            beginning.
          </p>
        </div>
      </div>
    </main>
  );
}
