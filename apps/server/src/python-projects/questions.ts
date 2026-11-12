import {
  type PythonCase,
  type PythonExecution,
  type PythonExerciseTarget,
  type Question,
  type RustTaskRun,
  RustTaskRunSchema,
  judgePythonCase,
  pythonExerciseProgram,
  pythonGiven,
  pythonLiteral,
} from "@discere/contracts";
import { HttpError } from "../errors.js";
import type { PythonRuntime } from "./runtime.js";

/** A lesson question answered by writing Python: what it is judged on and its tests. */
export interface PythonQuestionTask {
  target: PythonExerciseTarget;
  cases: PythonCase[];
}

export function pythonTask(question: Question): PythonQuestionTask | undefined {
  if (question.code?.language !== "python" || !question.pythonCases) return undefined;
  return {
    target: { call: question.code.call, names: question.code.names },
    cases: question.pythonCases,
  };
}

/** True when the runtime can run code now. A runtime that cannot say is taken to be ready. */
export async function pythonReady(runtime: PythonRuntime | undefined): Promise<boolean> {
  if (!runtime) return false;
  return runtime.available ? runtime.available() : true;
}

function execute(runtime: PythonRuntime, task: PythonQuestionTask, code: string, item: PythonCase) {
  return runtime.execute(pythonExerciseProgram(task.target, code), item.inputs, task.target.call);
}

/** The runner's "assign result" guidance makes no sense to a learner who was asked for names. */
function messageFor(task: PythonQuestionTask, message: string): string {
  return task.target.names && /\bresult\b/u.test(message)
    ? "Each of " +
        task.target.names.map((name) => "`" + name + "`").join(", ") +
        " must hold a number, text, True or False, a list or a dictionary."
    : message;
}

function failedRun(task: PythonQuestionTask, error: Extract<PythonExecution, { error: string }>) {
  return {
    status:
      error.error === "code"
        ? ("runtime_error" as const)
        : error.error === "limit"
          ? ("limit" as const)
          : ("unavailable" as const),
    diagnostics: "",
    stdout: error.output ?? "",
    stderr: "",
    message: messageFor(task, error.message),
  };
}

/** Run, without marking: the visible example, with what the program printed and produced. */
export async function runPythonExample(
  runtime: PythonRuntime,
  task: PythonQuestionTask,
  code: string,
): Promise<RustTaskRun> {
  const executed = await execute(runtime, task, code, task.cases[0]!);
  if ("error" in executed) return RustTaskRunSchema.parse(failedRun(task, executed));
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
            value: name in held ? pythonLiteral(held[name]!) : "not set yet",
          })),
        }
      : { returned: pythonLiteral(executed.result) }),
  });
}

export interface PythonAssessment {
  correct: boolean;
  feedback: string;
  run: RustTaskRun;
  /** False when the program stopped with an error: that is something to fix, not a miss. */
  qualifying: boolean;
}

/**
 * Marks a Python answer by running it against every test, in order, and reports the first test
 * that fails with what it expected and what the program produced. Nothing else decides the mark.
 */
export async function assessPython(
  runtime: PythonRuntime,
  task: PythonQuestionTask,
  code: string,
): Promise<PythonAssessment> {
  const total = task.cases.length;
  let passed = 0;
  let output = "";
  let failed: RustTaskRun["failed"];
  for (const [index, item] of task.cases.entries()) {
    const executed = await execute(runtime, task, code, item);
    if ("error" in executed && executed.error === "runtime")
      throw new HttpError(503, executed.message, "PYTHON_UNAVAILABLE");
    const verdict = judgePythonCase(task.target, item, executed);
    if (index === 0) output = executed.output ?? "";
    if (verdict.error) {
      const given = pythonGiven(task.target, item.inputs);
      const stopped = failedRun(task, verdict.error);
      const run = RustTaskRunSchema.parse({
        ...stopped,
        // The example ran cleanly, so the error belongs to one test's values: say which.
        ...(index > 0
          ? { failed: { test: index + 1, given, expected: "no error", actual: stopped.message } }
          : {}),
        passed,
        total,
      });
      return {
        correct: false,
        qualifying: false,
        run,
        feedback:
          verdict.error.error === "limit"
            ? verdict.error.message
            : (index > 0
                ? "Test " + (index + 1) + " of " + total + " stopped with an error" +
                  (given ? ", with `" + given + "`. " : ". ")
                : "It stopped with an error, so no test could finish. ") +
              "The console shows what Python said. An error is not counted as a wrong answer.",
      };
    }
    if (verdict.passed) passed += 1;
    else
      failed ??= {
        test: index + 1,
        given: pythonGiven(task.target, item.inputs),
        expected: verdict.expected!,
        actual: verdict.actual!,
      };
  }
  const run = RustTaskRunSchema.parse({
    status: "ok",
    diagnostics: "",
    stdout: output,
    stderr: "",
    passed,
    total,
    ...(failed ? { failed } : {}),
  });
  return {
    correct: !failed,
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
            (failed.actual.includes(" = ") ? "it ends with `" + failed.actual + "`." : failed.actual.replace(/^(\w+) /u, "`$1` ") + "."))
      : "It passes all " + total + " tests.",
  };
}
