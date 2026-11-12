import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type CourseBundle,
  type PythonExecution,
  judgeTypeScriptCase,
  parseTypeScriptDiagnostics,
  typescriptCheckFile,
  typescriptCheckVerdict,
  typescriptEscapes,
  typescriptGiven,
} from "@discere/contracts";
import {
  TYPESCRIPT_AMBIENT,
  TYPESCRIPT_COMPILER_FLAGS,
  TYPESCRIPT_NODE_FLAGS,
  TYPESCRIPT_RUNNER,
  findTypeScriptCompiler,
  nodeStripsTypes,
} from "./typescript-runner.js";

/**
 * Runs every TypeScript exercise of a bundle the way the app marks it: the worked program must
 * compile where the exercise is type-checked, pass each type test and pass each case, and the
 * starter must fail at one of those. The app runs learner code in its sandbox
 * (apps/server/src/typescript); authored code is trusted, so this check starts the same runner
 * and the same compiler directly.
 */
export interface TypeScriptTools {
  node: string;
  compiler: string;
}

/** This machine's Node and compiler, or undefined where either cannot run the exercises. */
export function findTypeScriptTools(env: NodeJS.ProcessEnv = process.env): TypeScriptTools | undefined {
  const compiler = findTypeScriptCompiler(env);
  return compiler && nodeStripsTypes() ? { node: process.execPath, compiler } : undefined;
}

export interface TypeScriptExerciseReport {
  exercises: number;
  /** One line per fault; empty when every worked program passes and no starter does. */
  issues: string[];
}

export function checkTypeScriptExercises(
  bundle: CourseBundle,
  tools: TypeScriptTools,
): TypeScriptExerciseReport {
  const exercises = bundle.questions.flatMap((question) =>
    question.code?.language === "typescript" && question.typescriptCases
      ? [
          {
            question,
            code: question.code,
            cases: question.typescriptCases,
            typeTests: question.typescriptTypeTests ?? [],
            programs: [
              question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "",
              question.code.starter,
            ] as const,
          },
        ]
      : [],
  );
  if (exercises.length === 0) return { exercises: 0, issues: [] };

  // One compiler run for every type-checked program: each file is its own module.
  const work = mkdtempSync(path.join(tmpdir(), "discere-typescript-check-"));
  let compiled = "";
  const files = exercises.map(({ code, cases, typeTests, programs }) =>
    programs.map((program) => typescriptCheckFile(code, cases[0]!.inputs, program, typeTests)),
  );
  try {
    const names: string[] = [];
    exercises.forEach(({ code }, index) => {
      if (!code.typeCheck) return;
      files[index]!.forEach((file, which) => {
        const name = `e${index}-${which}.ts`;
        writeFileSync(path.join(work, name), file.source);
        names.push(name);
      });
    });
    if (names.length > 0) {
      writeFileSync(path.join(work, "discere.d.ts"), TYPESCRIPT_AMBIENT);
      const ran = spawnSync(tools.compiler, [...TYPESCRIPT_COMPILER_FLAGS, ...names, "discere.d.ts"], {
        cwd: work,
        encoding: "utf8",
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024,
      });
      if (ran.error || ran.status === null)
        return {
          exercises: exercises.length,
          issues: [`The TypeScript compiler could not run: ${ran.error?.message ?? "no exit status"}`],
        };
      compiled = ran.stdout;
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  const issues: string[] = [];
  exercises.forEach(({ question, code, cases, programs }, index) => {
    const outcomes = programs.map((program, which) => {
      const faults: string[] = [];
      if (code.typeCheck) {
        faults.push(...typescriptEscapes(program).map((item) => `line ${item.line}: ${item.message}`));
        const verdict = typescriptCheckVerdict(
          files[index]![which]!,
          parseTypeScriptDiagnostics(compiled, `e${index}-${which}.ts`),
        );
        faults.push(...verdict.errors, ...verdict.failedTests.map((message) => `type test: ${message}`));
      }
      const ran = spawnSync(tools.node, [...TYPESCRIPT_NODE_FLAGS, "-e", TYPESCRIPT_RUNNER], {
        input: JSON.stringify({
          code: program,
          runs: cases.map((item) => ({ inputs: item.inputs })),
          ...(code.call ? { call: code.call } : { names: code.names }),
        }),
        encoding: "utf8",
        timeout: 30000,
      });
      let results: PythonExecution[] = [];
      try {
        results = JSON.parse(ran.stdout) as PythonExecution[];
      } catch {
        faults.push(`Node could not run it: ${ran.error?.message ?? ran.stderr.slice(0, 300)}`);
      }
      results.forEach((result, at) => {
        const verdict = judgeTypeScriptCase(code, cases[at]!, result);
        if (verdict.passed) return;
        const given = typescriptGiven(code, cases[at]!.inputs);
        faults.push(
          `test ${at + 1}${given ? ` (${given})` : ""}: ` +
            (verdict.error
              ? verdict.error.message
              : `expected ${verdict.expected}, got ${verdict.actual}`),
        );
      });
      return faults;
    });
    for (const fault of outcomes[0]!) issues.push(`${question.id}: the worked program fails, ${fault}`);
    if (outcomes[1]!.length === 0)
      issues.push(`${question.id}: the starter code already compiles and passes every test`);
  });
  return { exercises: exercises.length, issues };
}
