import {
  type RustCall,
  type RustCase,
  type RustRunResult,
  type RustTaskRun,
  RustTaskRunSchema,
} from "@discere/contracts";
import { HttpError } from "../errors.js";
import {
  functionHarness,
  type RustRuntime,
  sameDebug,
  samePrinted,
  splitReturned,
} from "./runtime.js";

/**
 * Running and marking a piece of learner Rust against cases. A project task and a lesson code
 * question are both this shape: a program that reads stdin and prints, or a function the
 * checker calls.
 */
export interface GradedTask {
  kind: "program" | "function";
  call?: RustCall | undefined;
  cases: RustCase[];
}

export const signature = (task: GradedTask) =>
  task.call
    ? "fn " +
      task.call.name +
      "(" +
      task.call.parameters.map((p) => p.name + ": " + p.type).join(", ") +
      ") -> " +
      task.call.returns
    : "fn main()";

/**
 * Drops diagnostics whose primary location is the checker module. Those quote the checker's
 * arguments, which for a hidden case are private, and the learner cannot edit that file anyway.
 */
function learnerDiagnostics(text: string): { text: string; dropped: boolean } {
  const blocks = text.split(/\n\n(?=(?:error|warning)\b)/);
  const kept = blocks.filter((block) => {
    const location = /-->\s+([^:\s]+):/.exec(block)?.[1];
    return location !== "discere_check.rs";
  });
  return { text: kept.join("\n\n"), dropped: kept.length !== blocks.length };
}

/** What the learner sees of one run: printed text without the checker's marker. */
export function present(task: GradedTask, result: RustRunResult): RustTaskRun {
  const { printed, returned } =
    task.kind === "function" ? splitReturned(result.stdout) : { printed: result.stdout };
  const diagnostics = learnerDiagnostics(result.diagnostics);
  const message = diagnostics.dropped
    ? "The checker calls " +
      signature(task) +
      ". Match that name, those parameter types and that return type."
    : result.message;
  return RustTaskRunSchema.parse({
    status: result.status,
    diagnostics: diagnostics.text,
    stdout: printed,
    stderr: result.stderr,
    ...(returned !== undefined ? { returned } : {}),
    ...(message ? { message } : {}),
  });
}

export function passes(task: GradedTask, result: RustRunResult, expected: string): boolean {
  if (result.status !== "ok") return false;
  if (task.kind === "program") return samePrinted(result.stdout, expected);
  const { returned } = splitReturned(result.stdout);
  return returned !== undefined && sameDebug(returned, expected);
}

/** Compiles once and runs the first `count` cases. The checker only ever holds those cases. */
export async function runCases(runtime: RustRuntime, task: GradedTask, code: string, count: number) {
  const cases = task.cases.slice(0, count);
  const results = await runtime.run(
    task.kind === "function"
      ? { code, harness: functionHarness(task.call!.name, cases.map((c) => c.arguments ?? [])) }
      : { code },
    task.kind === "function" ? cases.map((_, i) => String(i)) : cases.map((c) => c.stdin ?? ""),
  );
  if (results[0]?.status === "unavailable")
    throw new HttpError(503, results[0].message ?? "Rust is unavailable.", "RUST_UNAVAILABLE");
  return results;
}

export interface Marked {
  correct: boolean;
  /** True when the visible example passed, whatever happened to the hidden cases. */
  examplePassed: boolean;
  passed: number;
  /** The visible example's run, with the pass count; never a hidden case's output. */
  run: RustTaskRun;
}

/** Runs every case and marks the program. */
export async function mark(runtime: RustRuntime, task: GradedTask, code: string): Promise<Marked> {
  let results = await runCases(runtime, task, code, task.cases.length);
  // A compile failure against every case is shown as the visible case's failure, so the
  // diagnostics never quote a hidden case's arguments.
  if (results.length === 1 && results[0]!.status !== "ok" && task.cases.length > 1)
    results = await runCases(runtime, task, code, 1);
  const outcomes = task.cases.map(
    (c, i) => results[i] !== undefined && passes(task, results[i]!, c.expected),
  );
  const passed = outcomes.filter(Boolean).length;
  return {
    correct: passed === task.cases.length,
    examplePassed: outcomes[0] === true,
    passed,
    run: { ...present(task, results[0]!), passed, total: task.cases.length },
  };
}
