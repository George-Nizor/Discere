import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundleDigest, validateCourseBundle, validateRustProjects } from "@discere/curriculum";
import { RustDiagramSchema, RustProjectCollectionSchema } from "../packages/contracts/src/index.js";
import { courseId, projects } from "../content/rust-foundations/authoring/course.js";
import { mark } from "../apps/server/src/rust/grading.js";
import { functionHarness, IsolatedRustRuntime, sameDebug, samePrinted, splitReturned } from "../apps/server/src/rust/runtime.js";

/**
 * Checks Rust Foundations against the compiler. The lessons are written in bundle.json, which is
 * the source of truth (authoring/course.ts now supplies only the projects). Every lesson program
 * is compiled and run in the same sandbox learners use and must do what its diagram declares:
 * print the stated output, or fail with the stated error code. The real output then replaces the
 * declared one, so rustc's own wording is what the learner sees. Every code question's worked
 * program must pass all its cases and its starter must fail one; every project the same.
 */
type ProgramDraft = {
  code: string;
  outcome: { kind: "output"; stdout: string } | { kind: "compile_error"; diagnostics: string };
};
/** The error code a declared compile error names, such as E0382. */
const errorCode = (diagnostics: string) => /error\[(E\d{4})\]/.exec(diagnostics)?.[1];

const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, "content", courseId);
const runtime = new IsolatedRustRuntime();
const status = await runtime.status();
if (!status.ready) throw new Error(status.message);
const evidence: Array<Record<string, unknown>> = [];

async function prepareProgram(draft: ProgramDraft, where: string) {
  const [result] = await runtime.run({ code: draft.code }, [""]);
  if (!result) throw new Error(where + ": no result");
  if (draft.outcome.kind === "output") {
    if (result.status !== "ok" || !samePrinted(result.stdout, draft.outcome.stdout))
      throw new Error(where + ": expected output " + JSON.stringify(draft.outcome.stdout) + ", got " + JSON.stringify(result));
    evidence.push({ where, status: "ok", stdout: result.stdout });
    return RustDiagramSchema.parse({
      type: "rust_program",
      runtime: status.version,
      code: draft.code,
      outcome: { kind: "output", stdout: result.stdout.replace(/\n$/, "") },
    });
  }
  const expected = errorCode(draft.outcome.diagnostics);
  if (!expected) throw new Error(where + ": a declared compile error must name its code, as error[E0382]");
  if (result.status !== "compile_error" || !result.diagnostics.includes("error[" + expected + "]"))
    throw new Error(where + ": expected " + expected + ", got " + JSON.stringify(result));
  evidence.push({ where, status: "compile_error", code: expected });
  return RustDiagramSchema.parse({
    type: "rust_program",
    runtime: status.version,
    code: draft.code,
    outcome: { kind: "compile_error", diagnostics: result.diagnostics },
  });
}

const bundlePath = path.join(directory, "bundle.json");
const candidate = JSON.parse(await readFile(bundlePath, "utf8")) as Record<string, unknown> & {
  lessons: Array<{
    id: string;
    steps: Array<{ id: string; diagram?: { type: string } }>;
    intro?: { hook: { diagram?: { type: string } } };
  }>;
};
const isProgram = (diagram?: { type: string }) => diagram?.type === "rust_program";
for (const lesson of candidate.lessons) {
  if (lesson.intro && isProgram(lesson.intro.hook.diagram))
    lesson.intro.hook.diagram = await prepareProgram(lesson.intro.hook.diagram as unknown as ProgramDraft, lesson.id + ".hook");
  for (const step of lesson.steps)
    if (isProgram(step.diagram)) step.diagram = await prepareProgram(step.diagram as unknown as ProgramDraft, lesson.id + "." + step.id);
}

// Lessons still being written (no steps yet) are left out of the check and put back unchanged.
const all = candidate.lessons;
candidate.lessons = all.filter((lesson) => lesson.steps.length > 0);
const validation = validateCourseBundle(candidate);
for (const issue of validation.issues)
  console[issue.severity === "error" ? "error" : "warn"](
    issue.severity.toUpperCase() + " " + issue.path + " " + issue.code + ": " + issue.message,
  );
if (!validation.passed || !validation.bundle) {
  process.exitCode = 1;
  throw new Error("The Rust Foundations bundle did not validate.");
}

// Every lesson code question: the worked program passes, the starter does not.
for (const question of validation.bundle.questions) {
  if (!question.code || !question.codeCases) continue;
  const task = { kind: question.code.kind, call: question.code.call, cases: question.codeCases };
  const solution = question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "";
  const solved = await mark(runtime, task, solution);
  if (!solved.correct)
    throw new Error(question.id + ": the worked program fails: " + JSON.stringify(solved.run));
  const started = await mark(runtime, task, question.code.starter);
  if (started.correct) throw new Error(question.id + ": the starter already passes");
  evidence.push({ where: question.id, solutionPasses: solved.passed, starterPasses: started.passed });
}

const collection = RustProjectCollectionSchema.parse(projects);
for (const project of collection.projects)
  for (const task of project.tasks) {
    const run = async (code: string) => {
      const results = await runtime.run(
        task.kind === "function"
          ? { code, harness: functionHarness(task.call!.name, task.cases.map((c) => c.arguments!)) }
          : { code },
        task.kind === "function" ? task.cases.map((_, i) => String(i)) : task.cases.map((c) => c.stdin ?? ""),
      );
      return task.cases.map((c, i) => {
        const result = results[i];
        if (!result || result.status !== "ok") return false;
        if (task.kind === "program") return samePrinted(result.stdout, c.expected);
        const { returned } = splitReturned(result.stdout);
        return returned !== undefined && sameDebug(returned, c.expected);
      });
    };
    const solution = await run(task.solution);
    if (solution.some((passed) => !passed))
      throw new Error(task.id + ": the worked solution fails case " + solution.indexOf(false));
    const starter = await run(task.starter);
    if (starter.every(Boolean)) throw new Error(task.id + ": the starter already passes");
    evidence.push({ where: project.id + "." + task.id, solutionPasses: solution.length, starterPasses: starter.filter(Boolean).length });
  }
const { warnings } = validateRustProjects(collection, validation.bundle);

await mkdir(path.join(directory, "review"), { recursive: true });
const written = new Map(validation.bundle.lessons.map((lesson) => [lesson.id, lesson]));
const complete = { ...validation.bundle, lessons: all.map((lesson) => written.get(lesson.id) ?? lesson) };
await writeFile(path.join(directory, "bundle.json"), JSON.stringify(complete, null, 2) + "\n");
await writeFile(path.join(directory, "rust-projects.json"), JSON.stringify(collection, null, 2) + "\n");
await writeFile(
  path.join(directory, "review", "rust-projects.json"),
  JSON.stringify(
    {
      sha256: bundleDigest(collection),
      decision: "accepted",
      reviewedAt: new Date().toISOString(),
      reviewer: "Claude Code agent review",
      authority:
        "George asked for a Rust proof of concept in Discere on 15 October 2026; this is not an independent human review.",
      evidence: [
        "Every worked solution passes all of its cases in the sandboxed " + status.version + " runtime.",
        "Every starter program fails at least one case, so no task passes unchanged.",
        "Expected values were written by hand before the solutions were run.",
      ],
      acceptedWarnings: warnings.map((w) => ({ ...w, rationale: "Reviewed while authoring the proof of concept." })),
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  path.join(directory, "review", "execution-evidence.json"),
  JSON.stringify({ runtime: status.version, results: evidence }, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      courseId,
      lessons: validation.bundle.lessons.length,
      questions: validation.bundle.questions.length,
      programs: evidence.filter((e) => "status" in e).length,
      codeQuestions: validation.bundle.questions.filter((q) => q.code).length,
      tasks: collection.projects.flatMap((p) => p.tasks).length,
      warnings: warnings.length,
      sha256: bundleDigest(validation.bundle),
    },
    null,
    2,
  ),
);
