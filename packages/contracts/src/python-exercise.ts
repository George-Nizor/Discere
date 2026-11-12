import { z } from "zod";
import {
  PythonCallSchema,
  PythonCodeSchema,
  type PythonExecution,
  PythonInputsSchema,
  type PythonValue,
  PythonValueSchema,
} from "./python-project.js";

/**
 * A lesson question answered by writing Python. The learner's program runs with a case's
 * `inputs` already set as names, as if an earlier notebook cell had run. A `call` exercise
 * defines a function, which is called with the named inputs and judged on what it returns. A
 * `names` exercise is a few lines of a program, judged on what those names hold at the end.
 */
const Name = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
export const PythonCaseSchema = z
  .object({ inputs: PythonInputsSchema, expected: PythonValueSchema })
  .strict();
export type PythonCase = z.infer<typeof PythonCaseSchema>;

export const PythonExerciseSchema = z
  .object({
    language: z.literal("python"),
    starter: PythonCodeSchema,
    call: PythonCallSchema.optional(),
    names: z.array(Name).min(1).max(6).optional(),
    /** The one case the learner can see; Run uses its inputs. */
    example: PythonCaseSchema,
  })
  .strict();
export type PythonExercise = z.infer<typeof PythonExerciseSchema>;

/** What an exercise is judged on, without its public starter and example. */
export type PythonExerciseTarget = Pick<PythonExercise, "call" | "names">;

/**
 * The program actually run for a `names` exercise: the learner's code, then one line that
 * gathers the judged names into `result`, which is the value the runner hands back. A name the
 * program never set is simply absent, so the verdict can say which one is missing.
 */
export function pythonExerciseProgram(target: PythonExerciseTarget, code: string): string {
  if (!target.names) return code;
  const names = target.names.map((name) => JSON.stringify(name)).join(", ");
  return `${code.replace(/\s+$/u, "")}\n\nresult = {name: globals()[name] for name in (${names},) if name in globals()}\n`;
}

/** A value written the way Python would show it, for "expected" and "got" lines. */
export function pythonLiteral(value: PythonValue): string {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string")
    return `'${value
      .replace(/\\/gu, "\\\\")
      .replace(/'/gu, "\\'")
      .replace(/\n/gu, "\\n")
      .replace(/\t/gu, "\\t")}'`;
  if (Array.isArray(value)) return `[${value.map(pythonLiteral).join(", ")}]`;
  return `{${Object.entries(value)
    .map(([key, item]) => `${pythonLiteral(key)}: ${pythonLiteral(item)}`)
    .join(", ")}}`;
}

/** Numbers compare within 1e-9, so 0.1 + 0.2 is accepted where 0.3 is expected. */
export function samePythonValue(actual: PythonValue, expected: PythonValue): boolean {
  if (typeof actual !== typeof expected) return false;
  if (typeof actual === "number" && typeof expected === "number")
    return Math.abs(actual - expected) <= Math.max(1e-9, 1e-9 * Math.abs(expected));
  if (
    actual === null ||
    expected === null ||
    typeof actual !== "object" ||
    typeof expected !== "object"
  )
    return actual === expected;
  if (Array.isArray(actual) || Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      Array.isArray(expected) &&
      actual.length === expected.length &&
      actual.every((item, index) => samePythonValue(item, expected[index]!))
    );
  const keys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    JSON.stringify(keys) === JSON.stringify(expectedKeys) &&
    keys.every((key) => samePythonValue(actual[key]!, expected[key]!))
  );
}

/** The inputs of a case as the learner would write them: `price = 4, quantity = 3`. */
export function pythonGiven(target: PythonExerciseTarget, inputs: PythonCase["inputs"]): string {
  if (target.call)
    return `${target.call.name}(${target.call.arguments
      .map((name) => pythonLiteral(inputs[name] ?? null))
      .join(", ")})`;
  return Object.entries(inputs)
    .map(([name, value]) => `${name} = ${pythonLiteral(value)}`)
    .join(", ");
}

export interface PythonCaseVerdict {
  passed: boolean;
  /** Present when the program ran: what was expected and what it produced instead. */
  expected?: string;
  actual?: string;
  /** Present when the program did not run to a result. */
  error?: Extract<PythonExecution, { error: string }>;
}

/** Judges one finished run against one case. The first name that differs is the one reported. */
export function judgePythonCase(
  target: PythonExerciseTarget,
  testCase: PythonCase,
  execution: PythonExecution,
): PythonCaseVerdict {
  if ("error" in execution) return { passed: false, error: execution };
  if (!target.names) {
    const passed = samePythonValue(execution.result, testCase.expected);
    return passed
      ? { passed }
      : {
          passed,
          expected: pythonLiteral(testCase.expected),
          actual: pythonLiteral(execution.result),
        };
  }
  const expected = testCase.expected as Record<string, PythonValue>;
  const actual = (execution.result ?? {}) as Record<string, PythonValue>;
  for (const name of target.names) {
    if (!(name in actual))
      return {
        passed: false,
        expected: `${name} = ${pythonLiteral(expected[name]!)}`,
        actual: `${name} was never given a value`,
      };
    if (!samePythonValue(actual[name]!, expected[name]!))
      return {
        passed: false,
        expected: `${name} = ${pythonLiteral(expected[name]!)}`,
        actual: `${name} = ${pythonLiteral(actual[name]!)}`,
      };
  }
  return { passed: true };
}

/**
 * Shape rules shared by the content validator and the server: exactly one of `call` and
 * `names`, the visible example first, every case with the same input names, and for a `names`
 * exercise an expected value for each judged name.
 */
export function pythonExerciseIssues(exercise: PythonExercise, cases: PythonCase[]): string[] {
  const issues: string[] = [];
  if (Boolean(exercise.call) === Boolean(exercise.names))
    issues.push("A Python exercise is judged on a function call or on named values, one of them.");
  if (JSON.stringify(exercise.example) !== JSON.stringify(cases[0]))
    issues.push("The visible example must be the first case.");
  const shown = JSON.stringify(Object.keys(exercise.example.inputs).sort());
  if (cases.some((item) => JSON.stringify(Object.keys(item.inputs).sort()) !== shown))
    issues.push("Every case sets the same input names as the example.");
  if (new Set(cases.map((item) => JSON.stringify(item.inputs))).size !== cases.length)
    issues.push("Each case needs different input.");
  if (exercise.call?.arguments.some((name) => !(name in exercise.example.inputs)))
    issues.push("A function call uses the supplied input names.");
  if (exercise.names) {
    const wanted = JSON.stringify([...exercise.names].sort());
    if (
      cases.some(
        (item) =>
          item.expected === null ||
          typeof item.expected !== "object" ||
          Array.isArray(item.expected) ||
          JSON.stringify(Object.keys(item.expected).sort()) !== wanted,
      )
    )
      issues.push("Every case gives an expected value for each judged name.");
  }
  return issues;
}
