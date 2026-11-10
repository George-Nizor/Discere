import {
  type PythonExecution,
  type Question,
  type RustTaskRun,
  RustTaskRunSchema,
  type TypeScriptCase,
  type TypeScriptExerciseTarget,
  type TypeScriptTypeTest,
  judgeTypeScriptCase,
  typescriptCheckFile,
  typescriptCheckVerdict,
  typescriptEscapes,
  typescriptGiven,
  typescriptLiteral,
} from "@discere/contracts";
import { HttpError } from "../errors.js";
import type { TypeScriptRuntime } from "./runtime.js";

/** A lesson question answered by writing TypeScript: what it is judged on and its tests. */
export interface TypeScriptQuestionTask {
  target: TypeScriptExerciseTarget;
  cases: TypeScriptCase[];
  typeTests: TypeScriptTypeTest[];
}

export function typescriptTask(question: Question): TypeScriptQuestionTask | undefined {
  if (question.code?.language !== "typescript" || !question.typescriptCases) return undefined;
  const { call, names, typeCheck } = question.code;
  return {
    target: { call, names, typeCheck },
    cases: question.typescriptCases,
    typeTests: question.typescriptTypeTests ?? [],
  };
}

/** True when the runtime can run code now. A runtime that cannot say is taken to be ready. */
export async function typescriptReady(runtime: TypeScriptRuntime | undefined): Promise<boolean> {
  if (!runtime) return false;
  return runtime.available ? runtime.available() : true;
}

const unavailable = (message: string) => new HttpError(503, message, "TYPESCRIPT_UNAVAILABLE");

interface Compiled {
  /** The learner's own type errors, or the reason the compiler stopped. Empty when it compiles. */
  errors: string[];
  limit?: string;
  failedTests: string[];
}

/** Type-checks the program where the exercise asks for it. `tests` adds the hidden type tests. */
async function compile(
  runtime: TypeScriptRuntime,
  task: TypeScriptQuestionTask,
  code: string,
  tests: boolean,
): Promise<Compiled> {
  if (!task.target.typeCheck) return { errors: [], failedTests: [] };
  const escapes = typescriptEscapes(code);
  if (escapes.length > 0)
    return {
      errors: escapes.slice(0, 3).map((item) => `Line ${item.line}: ${item.message}`),
      failedTests: [],
    };
  const file = typescriptCheckFile(
    task.target,
    task.cases[0]!.inputs,
    code,
    tests ? task.typeTests : [],
  );
  const diagnostics = await runtime.check(file.source);
  if (!Array.isArray(diagnostics)) {
    if (diagnostics.error === "runtime") throw unavailable(diagnostics.message);
    return { errors: [], limit: diagnostics.message, failedTests: [] };
  }
  return typescriptCheckVerdict(file, diagnostics);
}

function stoppedRun(error: Extract<PythonExecution, { error: string }>) {
  return {
    status: error.error === "code" ? ("runtime_error" as const) : ("limit" as const),
    diagnostics: "",
    stdout: error.output ?? "",
    stderr: "",
    message: error.message,
  };
}

function notCompiled(compiled: Compiled) {
  return compiled.limit
    ? { status: "limit" as const, diagnostics: "", stdout: "", stderr: "", message: compiled.limit }
    : {
        status: "compile_error" as const,
        diagnostics: compiled.errors.join("\n"),
        stdout: "",
        stderr: "",
        message:
          compiled.errors.length === 1
            ? "The compiler found a type error, so the program was not run."
            : "The compiler found type errors, so the program was not run.",
      };
}

/** Run, without marking: the visible example, with what the program printed and produced. */
export async function runTypeScriptExample(
  runtime: TypeScriptRuntime,
  task: TypeScriptQuestionTask,
  code: string,
): Promise<RustTaskRun> {
  const compiled = await compile(runtime, task, code, false);
  if (compiled.limit || compiled.errors.length > 0)
    return RustTaskRunSchema.parse(notCompiled(compiled));
  const [executed] = await runtime.execute(code, [{ inputs: task.cases[0]!.inputs }], task.target);
  if (!executed || ("error" in executed && executed.error === "runtime"))
    throw unavailable(executed && "error" in executed ? executed.message : "It did not run.");
  if ("error" in executed) return RustTaskRunSchema.parse(stoppedRun(executed));
  const held = (executed.result ?? {}) as Record<string, never>;
  return RustTaskRunSchema.parse({
    status: "ok",
    diagnostics: "",
    stdout: executed.output,
    stderr: "",
    ...(task.target.names
      ? {
          values: task.target.names.map((name) => ({
            name,
            value: name in held ? typescriptLiteral(held[name]!) : "not set yet",
          })),
        }
      : { returned: typescriptLiteral(executed.result) }),
  });
}

export interface TypeScriptAssessment {
  correct: boolean;
  feedback: string;
  run: RustTaskRun;
  /** False when the program did not compile or stopped with an error: something to fix, not a miss. */
  qualifying: boolean;
}

/**
 * Marks a TypeScript answer. Where the exercise is type-checked the program is compiled first,
 * and a type error in the learner's own lines stops there without costing a try. Then every case
 * runs, in order, and the first that fails is reported with what it expected and what the
 * program produced. A type test that does not compile counts as a failed test.
 */
export async function assessTypeScript(
  runtime: TypeScriptRuntime,
  task: TypeScriptQuestionTask,
  code: string,
): Promise<TypeScriptAssessment> {
  const compiled = await compile(runtime, task, code, true);
  if (compiled.limit || compiled.errors.length > 0)
    return {
      correct: false,
      qualifying: false,
      run: RustTaskRunSchema.parse(notCompiled(compiled)),
      feedback:
        compiled.limit ??
        "No test ran, because the compiler stopped first. The console shows what it said and on which line. A type error is not counted as a wrong answer.",
    };
  const total = task.cases.length + task.typeTests.length;
  const executions = await runtime.execute(
    code,
    task.cases.map((item) => ({ inputs: item.inputs })),
    task.target,
  );
  let passed = task.typeTests.length - compiled.failedTests.length;
  let failed: RustTaskRun["failed"];
  for (const [index, item] of task.cases.entries()) {
    const executed = executions[index];
    if (!executed || ("error" in executed && executed.error === "runtime"))
      throw unavailable(executed && "error" in executed ? executed.message : "It did not run.");
    const verdict = judgeTypeScriptCase(task.target, item, executed);
    if (verdict.error) {
      const given = typescriptGiven(task.target, item.inputs);
      const stopped = stoppedRun(verdict.error);
      return {
        correct: false,
        qualifying: false,
        run: RustTaskRunSchema.parse({
          ...stopped,
          // The example ran cleanly, so the error belongs to one test's values: say which.
          ...(index > 0
            ? { failed: { test: index + 1, given, expected: "no error", actual: stopped.message } }
            : {}),
          passed: 0,
          total,
        }),
        feedback:
          verdict.error.error === "limit"
            ? verdict.error.message
            : (index > 0
                ? "Test " + (index + 1) + " of " + total + " stopped with an error" +
                  (given ? ", with `" + given + "`. " : ". ")
                : "It stopped with an error, so no test could finish. ") +
              "The console shows what went wrong. An error is not counted as a wrong answer.",
      };
    }
    if (verdict.passed) passed += 1;
    else
      failed ??= {
        test: index + 1,
        given: typescriptGiven(task.target, item.inputs),
        expected: verdict.expected!,
        actual: verdict.actual!,
      };
  }
  const first = executions[0]!;
  const typeFault = compiled.failedTests[0];
  const run = RustTaskRunSchema.parse({
    status: "ok",
    diagnostics: "",
    stdout: "output" in first ? (first.output ?? "") : "",
    stderr: "",
    passed,
    total,
    ...(failed ? { failed } : typeFault ? { message: typeFault } : {}),
  });
  return {
    correct: !failed && !typeFault,
    qualifying: true,
    run,
    feedback: failed
      ? "Test " +
        failed.test +
        " of " +
        total +
        " failed. " +
        (task.target.call
          ? "`" + failed.given + "` should return `" + failed.expected + "`, but it returned `" + failed.actual + "`."
          : (failed.given ? "With `" + failed.given + "`, the" : "The") +
            " program should end with `" +
            failed.expected +
            "`, but " +
            (failed.actual.includes(" = ") ? "it ends with `" + failed.actual + "`." : failed.actual.replace(/^(\S+) /u, "`$1` ") + "."))
      : typeFault
        ? "The values are right, but the types are not what was asked for. " + typeFault
        : "It passes all " + total + " tests.",
  };
}
