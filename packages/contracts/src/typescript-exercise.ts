import { z } from "zod";
import { samePythonValue } from "./python-exercise.js";
import { type PythonExecution, type PythonValue, PythonValueSchema } from "./python-project.js";

/**
 * A lesson question answered by writing TypeScript. A `call` exercise defines a function, which
 * is called with a case's inputs and judged on what it returns. A `names` exercise is a few
 * lines of a program, judged on what those names hold at the end; its inputs are variables that
 * already exist when the program starts. Values are JSON: numbers, strings, booleans, null,
 * arrays and plain objects.
 *
 * With `typeCheck` the program must also compile under `strict` before it runs, and may not use
 * `any` or switch the compiler off with a comment. A question's `typescriptTypeTests` are extra
 * lines compiled after the program, for exercises whose point is a type and not a value.
 */
const Name = z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]{0,39}$/);
const Inputs = z.record(Name, PythonValueSchema).superRefine((input, ctx) => {
  if (Object.keys(input).length > 8 || JSON.stringify(input).length > 20000)
    ctx.addIssue({ code: "custom", message: "Use at most eight small inputs." });
});
export const TypeScriptCodeSchema = z.string().max(16000);
export const TypeScriptCallSchema = z
  .object({ name: Name, arguments: z.array(Name).max(6) })
  .strict();
export type TypeScriptCall = z.infer<typeof TypeScriptCallSchema>;
export const TypeScriptCaseSchema = z
  .object({ inputs: Inputs, expected: PythonValueSchema })
  .strict();
export type TypeScriptCase = z.infer<typeof TypeScriptCaseSchema>;

export const TypeScriptExerciseSchema = z
  .object({
    language: z.literal("typescript"),
    starter: TypeScriptCodeSchema,
    call: TypeScriptCallSchema.optional(),
    names: z.array(Name).min(1).max(6).optional(),
    /** The one case the learner can see; Run uses its inputs. */
    example: TypeScriptCaseSchema,
    /** The program must compile under `strict`, without `any`, before any test runs. */
    typeCheck: z.boolean().optional(),
  })
  .strict();
export type TypeScriptExercise = z.infer<typeof TypeScriptExerciseSchema>;

/**
 * Lines compiled after the learner's program and never run. The test passes when they compile,
 * so a line that must be refused is written under `// @ts-expect-error`. `message` is what the
 * learner reads when the test fails; the lines themselves are never shown.
 */
export const TypeScriptTypeTestSchema = z
  .object({ code: z.string().min(1).max(600), message: z.string().min(1).max(300) })
  .strict();
export type TypeScriptTypeTest = z.infer<typeof TypeScriptTypeTestSchema>;

export type TypeScriptExerciseTarget = Pick<TypeScriptExercise, "call" | "names" | "typeCheck">;

/** The inputs one run of the program starts with: none for a `call` exercise's own scope. */
export interface TypeScriptRun {
  inputs: TypeScriptCase["inputs"];
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** A value written the way TypeScript source would write it. */
export function typescriptLiteral(value: PythonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(typescriptLiteral).join(", ")}]`;
  const entries = Object.entries(value).map(
    ([key, item]) => `${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${typescriptLiteral(item)}`,
  );
  return entries.length ? `{ ${entries.join(", ")} }` : "{}";
}

/** The inputs of a case as the learner would write them: `total(3, 4)` or `price = 4`. */
export function typescriptGiven(
  target: TypeScriptExerciseTarget,
  inputs: TypeScriptCase["inputs"],
): string {
  if (target.call)
    return `${target.call.name}(${target.call.arguments
      .map((name) => typescriptLiteral(inputs[name] ?? null))
      .join(", ")})`;
  return Object.entries(inputs)
    .map(([name, value]) => `${name} = ${typescriptLiteral(value)}`)
    .join(", ");
}

export interface TypeScriptCaseVerdict {
  passed: boolean;
  expected?: string;
  actual?: string;
  error?: Extract<PythonExecution, { error: string }>;
}

/** Judges one finished run against one case. The first name that differs is the one reported. */
export function judgeTypeScriptCase(
  target: TypeScriptExerciseTarget,
  testCase: TypeScriptCase,
  execution: PythonExecution,
): TypeScriptCaseVerdict {
  if ("error" in execution) return { passed: false, error: execution };
  if (!target.names) {
    const passed = samePythonValue(execution.result, testCase.expected);
    return passed
      ? { passed }
      : {
          passed,
          expected: typescriptLiteral(testCase.expected),
          actual: typescriptLiteral(execution.result),
        };
  }
  const expected = testCase.expected as Record<string, PythonValue>;
  const actual = (execution.result ?? {}) as Record<string, PythonValue>;
  for (const name of target.names) {
    if (!(name in actual))
      return {
        passed: false,
        expected: `${name} = ${typescriptLiteral(expected[name]!)}`,
        actual: `${name} was never given a value`,
      };
    if (!samePythonValue(actual[name]!, expected[name]!))
      return {
        passed: false,
        expected: `${name} = ${typescriptLiteral(expected[name]!)}`,
        actual: `${name} = ${typescriptLiteral(actual[name]!)}`,
      };
  }
  return { passed: true };
}

/** Shape rules shared by the content validator and the server. */
export function typescriptExerciseIssues(
  exercise: TypeScriptExercise,
  cases: TypeScriptCase[],
  typeTests: TypeScriptTypeTest[] = [],
): string[] {
  const issues: string[] = [];
  if (Boolean(exercise.call) === Boolean(exercise.names))
    issues.push(
      "A TypeScript exercise is judged on a function call or on named values, one of them.",
    );
  if (JSON.stringify(exercise.example) !== JSON.stringify(cases[0]))
    issues.push("The visible example must be the first case.");
  const shown = JSON.stringify(Object.keys(exercise.example.inputs).sort());
  if (cases.some((item) => JSON.stringify(Object.keys(item.inputs).sort()) !== shown))
    issues.push("Every case sets the same input names as the example.");
  if (
    Object.keys(exercise.example.inputs).length > 0 &&
    new Set(cases.map((item) => JSON.stringify(item.inputs))).size !== cases.length
  )
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
  if (typeTests.length > 0 && !exercise.typeCheck)
    issues.push("Type tests need typeCheck, since they are compiled and never run.");
  return issues;
}

/** One error the compiler reported, by position in the file it was given. */
export interface TypeScriptDiagnostic {
  line: number;
  code: number;
  message: string;
}

/** Reads `tsc --pretty false` output. Indented continuation lines are detail and are dropped. */
export function parseTypeScriptDiagnostics(output: string, file = "main.ts"): TypeScriptDiagnostic[] {
  const found: TypeScriptDiagnostic[] = [];
  for (const line of output.split(/\r?\n/u)) {
    const match = /^(.+?)\((\d+),\d+\): error TS(\d+): (.*)$/u.exec(line);
    if (match && match[1]!.replaceAll("\\", "/").split("/").pop() === file)
      found.push({ line: Number(match[2]), code: Number(match[3]), message: match[4]!.trim() });
  }
  return found;
}

/** The file the compiler is given, and where the learner's lines and each type test sit in it. */
export interface TypeScriptCheckFile {
  source: string;
  /** Lines before the learner's first line. */
  offset: number;
  /** How many lines the learner's program has. */
  lines: number;
  tests: { from: number; to: number; message: string }[];
}

/**
 * Builds that file. A `names` exercise's inputs are declared on one line before the program with
 * `let`, so each has the type its value would be given (`let price = 4` is a `number`).
 */
export function typescriptCheckFile(
  target: TypeScriptExerciseTarget,
  inputs: TypeScriptCase["inputs"],
  code: string,
  typeTests: TypeScriptTypeTest[] = [],
): TypeScriptCheckFile {
  const declared = target.call
    ? ""
    : Object.entries(inputs)
        .map(([name, value]) => `let ${name} = ${typescriptLiteral(value)};`)
        .join(" ");
  const body = code.replace(/\s+$/u, "");
  const offset = declared ? 1 : 0;
  const lines = body.split("\n").length;
  const parts = declared ? [declared, body] : [body];
  const tests: TypeScriptCheckFile["tests"] = [];
  let at = offset + lines;
  for (const test of typeTests) {
    // Braces give each test its own scope, so two tests may declare the same name.
    const block = ["{", ...test.code.replace(/\s+$/u, "").split("\n"), "}"];
    tests.push({ from: at + 1, to: at + block.length, message: test.message });
    parts.push(block.join("\n"));
    at += block.length;
  }
  return { source: parts.join("\n") + "\n", offset, lines, tests };
}

/** Comments, strings and templates replaced by spaces, keeping every line break where it was. */
function codeOnly(code: string): string {
  return code.replace(
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\[\s\S]|[^`\\])*`/gu,
    (text) => text.replace(/[^\n]/gu, " "),
  );
}

/**
 * What a type-checked exercise refuses before the compiler is asked: `any`, which turns checking
 * off for a value, and the comments that turn it off for a line or a file.
 */
export function typescriptEscapes(code: string): TypeScriptDiagnostic[] {
  const found: TypeScriptDiagnostic[] = [];
  const lineAt = (index: number) => code.slice(0, index).split("\n").length;
  for (const match of code.matchAll(/@ts-(?:ignore|expect-error|nocheck)/gu))
    found.push({
      line: lineAt(match.index),
      code: 0,
      message: `This exercise is checked by the compiler, so ${match[0]} is not allowed.`,
    });
  for (const match of codeOnly(code).matchAll(/(?:[:<|&,=]|\bas|=>)\s*(any)\b(?!\s*[(.:])/gu))
    found.push({
      line: lineAt(match.index + match[0].length - 3),
      code: 0,
      message:
        "This exercise does not allow 'any', because 'any' switches type checking off. Write the type the value really has.",
    });
  // One report per line: two uses of `any` on a line are one thing to fix.
  return found
    .sort((a, b) => a.line - b.line)
    .filter((item, index) => found.findIndex((other) => other.line === item.line && other.message === item.message) === index);
}

/** A few of the compiler's commonest errors, said in plain words before its own sentence. */
const PLAIN: Record<number, string> = {
  2322: "A value is being stored where its type does not fit.",
  2345: "A function is being called with an argument of the wrong type.",
  2339: "This property is not part of the value's type.",
  2304: "This name has not been declared.",
  2552: "This name has not been declared.",
  2551: "This property is not part of the value's type.",
  2554: "The function is called with the wrong number of arguments.",
  2355: "The function promises to return a value, and one path through it returns nothing.",
  2366: "The function promises to return a value, and one path through it returns nothing.",
  2531: "This value might be null here.",
  2532: "This value might be undefined here.",
  18047: "This value might be null here.",
  18048: "This value might be undefined here.",
  2540: "This property is read-only, so it cannot be assigned.",
  2741: "The object is missing a property its type requires.",
  2353: "The object has a property its type does not list.",
  2367: "These two types have no value in common, so the comparison can never be true.",
  7006: "This parameter has no type, and the compiler will not guess one.",
  7005: "This variable has no type, and the compiler will not guess one.",
  7034: "This variable has no type, and the compiler will not guess one.",
  1294: "This syntax needs code generated for it, which this runner does not do. Use a plain object or a union of literals.",
};

export interface TypeScriptCheckVerdict {
  /** Errors in the learner's own lines, ready to show: `Line 3: …`. At most three. */
  errors: string[];
  /** The messages of type tests that did not compile, in order. */
  failedTests: string[];
}

/** Sorts the compiler's errors into the learner's own and the type tests that caught something. */
export function typescriptCheckVerdict(
  file: TypeScriptCheckFile,
  diagnostics: TypeScriptDiagnostic[],
): TypeScriptCheckVerdict {
  const own = diagnostics.filter((item) => item.line <= file.offset + file.lines);
  const errors = [...own]
    .sort((a, b) => a.line - b.line)
    .slice(0, 3)
    .map((item) => {
      const line = Math.max(1, item.line - file.offset);
      const plain = PLAIN[item.code];
      const said = item.message.length > 300 ? item.message.slice(0, 297) + "..." : item.message;
      return `Line ${line}: ${plain ? plain + " The compiler says: " : ""}${said}`;
    });
  const failedTests = file.tests
    .filter((test) => diagnostics.some((item) => item.line >= test.from && item.line <= test.to))
    .map((test) => test.message);
  return { errors, failedTests };
}
