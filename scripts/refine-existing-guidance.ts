import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { deepStrictEqual } from "node:assert";
import path from "node:path";
import { CourseBundleSchema } from "../packages/contracts/src/index.js";
import {
  validateCourseBundle,
  bundleDigest,
  assertEditorialApproval,
} from "../packages/curriculum/src/index.js";

const root = path.resolve(import.meta.dirname, "..");
const read = (name: string) => JSON.parse(readFileSync(path.join(root, name), "utf8"));
const save = (name: string, data: unknown) => {
  mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  writeFileSync(path.join(root, name), JSON.stringify(data, null, 2) + "\n");
};
const guidance = read("docs/quality-pass/foundation-guidance.json") as {
  maths: Record<string, string[][]>;
  cs: Record<string, string[][]>;
  logic: Record<string, string[][]>;
  explanations: Record<string, string>;
  prompts: Record<string, string>;
};
const baseline = read("docs/quality-pass/content-baseline.json") as {
  courses: { name: string; sha256: string }[];
};
const reasons = existsSync(path.join(root, "docs/quality-pass/warning-reasons.json"))
  ? (read("docs/quality-pass/warning-reasons.json") as Record<string, string>)
  : {};
const courseHints: Record<string, Record<string, string[][]>> = {
  "maths-foundations": guidance.maths,
  "logic-and-reasoning": guidance.logic,
  "cs-basics": guidance.cs,
  "sql-from-rows-to-reports": {},
  "probability-statistics": {},
};
type QuestionDelta = {
  questionId: string;
  before: { hints?: string[]; prompt?: string; exampleAnswer?: string };
  after: { hints?: string[]; prompt?: string; exampleAnswer?: string };
};
const staged = [];
for (const [courseId, hints] of Object.entries(courseHints)) {
  const directory = "content/" + courseId;
  const raw = readFileSync(path.join(root, directory, "bundle.json"), "utf8");
  const currentSha = createHash("sha256").update(raw).digest("hex");
  if (currentSha !== baseline.courses.find((c) => c.name === courseId)?.sha256)
    throw Error(courseId + ": source differs from quality baseline; inspect before restaging.");
  const before = CourseBundleSchema.parse(JSON.parse(raw));
  deepStrictEqual(currentSha, bundleDigest(before));
  const candidate = structuredClone(before),
    questions: QuestionDelta[] = [],
    diagrams = [];
  const ids = new Map<string, string[]>();
  for (const [lessonId, sets] of Object.entries(hints)) {
    const lesson = candidate.lessons.find((l) => l.id === lessonId);
    if (!lesson) throw Error("Missing lesson " + lessonId);
    const questionIds = [...lesson.steps.map((s) => s.checkQuestionId), ...lesson.questionIds];
    if (questionIds.length !== sets.length) throw Error("Hint count mismatch " + lessonId);
    questionIds.forEach((id, index) => {
      if (!id || ids.has(id)) throw Error("Missing/duplicate question");
      ids.set(id, sets[index]!);
    });
  }
  for (const question of candidate.questions) {
    const delta: QuestionDelta = { questionId: question.id, before: {}, after: {} };
    const nextHints = ids.get(question.id),
      prompt = guidance.prompts[question.id],
      explanation = guidance.explanations[question.id];
    if (nextHints) {
      delta.before.hints = question.hints;
      delta.after.hints = nextHints;
      question.hints = nextHints;
    }
    if (prompt) {
      delta.before.prompt = question.prompt;
      delta.after.prompt = prompt;
      question.prompt = prompt;
    }
    if (explanation) {
      if (question.answerAuthority.kind !== "text") throw Error("Expected text explanation");
      delta.before.exampleAnswer = question.answerAuthority.exampleAnswer;
      delta.after.exampleAnswer = explanation;
      question.answerAuthority.exampleAnswer = explanation;
    }
    if (Object.keys(delta.after).length) questions.push(delta);
  }
  if (courseId === "logic-and-reasoning") {
    const lesson = candidate.lessons.find((l) => l.id === "knights-and-knaves")!;
    for (const step of lesson.steps) {
      const previous = step.diagram;
      const next = {
        type: "truth_table" as const,
        p: true,
        q: false,
        formula:
          step.id === "check"
            ? ("speaker_agreement" as const)
            : step.id === "transfer"
              ? ("conflicting_speakers" as const)
              : ("p_xor_q" as const),
        pLabel: step.id === "transfer" ? "Cara is a knight" : "Ada is a knight",
        qLabel: step.id === "transfer" ? "Drew is a knight" : "Ben is a knight",
        outputLabel:
          step.id === "predict" || step.id === "work" ? "Fits Ada's claim" : "Fits both claims",
      };
      step.diagram = next;
      diagrams.push({ lessonId: lesson.id, stepId: step.id, before: previous, after: next });
    }
  }
  candidate.course.version = before.course.version.replace(/\d+$/, (v) => String(Number(v) + 1));
  const validation = validateCourseBundle(candidate);
  if (!validation.passed || !validation.bundle) {
    console.error(
      JSON.stringify(
        { courseId, issues: validation.issues.filter((i) => i.severity === "error") },
        null,
        2,
      ),
    );
    if (process.argv.includes("--stage")) throw Error("Candidate fails validation");
    else continue;
  }
  const parsed = validation.bundle;
  // Restoring only the recorded teaching deltas must reconstruct the exact prior bundle.
  const restored = structuredClone(parsed);
  restored.course.version = before.course.version;
  for (const delta of questions) {
    const q = restored.questions.find((q) => q.id === delta.questionId)!;
    if (delta.before.hints) q.hints = delta.before.hints;
    if (delta.before.prompt) q.prompt = delta.before.prompt;
    if (delta.before.exampleAnswer !== undefined && q.answerAuthority.kind === "text")
      q.answerAuthority.exampleAnswer = delta.before.exampleAnswer;
  }
  for (const delta of diagrams)
    restored.lessons
      .find((l) => l.id === delta.lessonId)!
      .steps.find((s) => s.id === delta.stepId)!.diagram = delta.before;
  deepStrictEqual(restored, before);
  const previousReview = read(directory + "/review/publication.json");
  const acceptedWarnings = [],
    missing = [];
  for (const warning of validation.issues.filter((i) => i.severity === "warning")) {
    const old = previousReview.acceptedWarnings.find(
      (r: { code: string; path: string }) => r.code === warning.code && r.path === warning.path,
    );
    const reason = reasons[courseId + ":" + warning.code + ":" + warning.path] ?? old?.reason;
    if (!reason) missing.push(warning);
    else acceptedWarnings.push({ code: warning.code, path: warning.path, reason });
  }
  console.log(
    JSON.stringify(
      {
        courseId,
        changedQuestions: questions.length,
        hints: questions.filter((q) => q.after.hints).length,
        prompts: questions.filter((q) => q.after.prompt).length,
        explanations: questions.filter((q) => q.after.exampleAnswer).length,
        diagrams: diagrams.length,
        missingWarningReasons: missing,
      },
      null,
      2,
    ),
  );
  const reviewedAt = new Date().toISOString(),
    sha = bundleDigest(parsed);
  const review = {
    ...previousReview,
    reviewer: "Codex, model-assisted quality review delegated by George",
    reviewedAt,
    bundleSha256: sha,
    acceptedWarnings,
    factChecks: [
      ...previousReview.factChecks,
      "Quality refinement: essential givens are available before answering; hints address each question's actual operations, values or reasoning.",
      "Preserved every ID, marking key, answer choice, check, recall card, source and artwork record. Reversing the recorded guidance deltas reconstructs the exact previous publication hash.",
      ...(diagrams.length
        ? [
            "Enumerated all four speaker-type assignments for each puzzle: Ada alone permits two; Ada and Ben together permit only Ada knight/Ben knave; Cara and Drew permit none.",
          ]
        : []),
    ],
    changes: [
      ...previousReview.changes,
      "Refined existing question guidance and feedback. This patch adds no course, lesson, question, check or recall card; exact before/after fields are in guidance-refinement.json.",
    ],
  };
  const evidence = {
    reviewedAt,
    reviewMethod:
      "Model-assisted editorial review with exact-delta preservation and deterministic regression checks.",
    previousBundleSha256: bundleDigest(before),
    publishedBundleSha256: sha,
    previousVersion: before.course.version,
    publishedVersion: parsed.course.version,
    questions,
    diagrams,
  };
  staged.push({ directory, parsed, review, previousReview, validation, evidence, missing });
}
if (process.argv.includes("--stage")) {
  if (staged.some((s) => s.missing.length))
    throw Error("Review the listed warnings before staging.");
  for (const s of staged) assertEditorialApproval(s.parsed, s.review, s.validation);
  for (const s of staged) {
    save(
      s.directory + "/review/history/" + s.evidence.previousBundleSha256 + ".json",
      s.previousReview,
    );
    save(s.directory + "/.authoring/candidate.json", s.parsed);
    save(s.directory + "/review/guidance-refinement.json", s.evidence);
    save(s.directory + "/review/publication.json", s.review);
  }
  console.log(
    "Five reviewed candidates staged. Publish each with pnpm curate publish <course-id>.",
  );
}
