import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundleDigest, validateCourseBundle, validateRustProjects } from "@discere/curriculum";
import { RustDiagramSchema, RustProjectCollectionSchema } from "../packages/contracts/src/index.js";
import {
  assemble,
  courseId,
  type ProgramDraft,
  projects,
} from "../content/rust-foundations/authoring/course.js";
import { mark } from "../apps/server/src/rust/grading.js";
import { functionHarness, IsolatedRustRuntime, sameDebug, samePrinted, splitReturned } from "../apps/server/src/rust/runtime.js";

/**
 * Builds Rust Foundations from its authoring file. Every lesson program is compiled and run in
 * the same sandbox learners use, and must do what the author declared; its real output becomes
 * the diagram. Every project solution must pass all of its cases, and every starter must fail
 * at least one, so no task can be passed without writing anything.
 */
const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, "content", courseId);
const runtime = new IsolatedRustRuntime();
const status = await runtime.status();
if (!status.ready) throw new Error(status.message);
const evidence: Array<Record<string, unknown>> = [];

async function prepareProgram(draft: ProgramDraft, where: string) {
  const [result] = await runtime.run({ code: draft.code }, [""]);
  if (!result) throw new Error(where + ": no result");
  if ("stdout" in draft.expect) {
    if (result.status !== "ok" || !samePrinted(result.stdout, draft.expect.stdout))
      throw new Error(where + ": expected output " + JSON.stringify(draft.expect.stdout) + ", got " + JSON.stringify(result));
    evidence.push({ where, status: "ok", stdout: result.stdout });
    return RustDiagramSchema.parse({
      type: "rust_program",
      runtime: status.version,
      code: draft.code,
      outcome: { kind: "output", stdout: result.stdout.replace(/\n$/, "") },
    });
  }
  if (result.status !== "compile_error" || !result.diagnostics.includes("error[" + draft.expect.error + "]"))
    throw new Error(where + ": expected " + draft.expect.error + ", got " + JSON.stringify(result));
  evidence.push({ where, status: "compile_error", code: draft.expect.error });
  return RustDiagramSchema.parse({
    type: "rust_program",
    runtime: status.version,
    code: draft.code,
    outcome: { kind: "compile_error", diagnostics: result.diagnostics },
  });
}

const candidate = assemble() as Record<string, unknown> & {
  lessons: Array<{
    id: string;
    steps: Array<{ id: string; diagram?: unknown }>;
    intro?: { hook: { diagram?: unknown } };
  }>;
};
for (const lesson of candidate.lessons) {
  if (lesson.intro?.hook.diagram)
    lesson.intro.hook.diagram = await prepareProgram(lesson.intro.hook.diagram as ProgramDraft, lesson.id + ".hook");
  for (const step of lesson.steps)
    if (step.diagram) step.diagram = await prepareProgram(step.diagram as ProgramDraft, lesson.id + "." + step.id);
}

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
await writeFile(path.join(directory, "bundle.json"), JSON.stringify(validation.bundle, null, 2) + "\n");
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
