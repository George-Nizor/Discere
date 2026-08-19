import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  type AuthoredLessonDraft,
  AuthoredLessonDraftSchema,
  type CourseBundle,
  StyleEditDraftSchema,
  type StyleViolation,
  toAnswerAuthority,
} from "../packages/contracts/src/index.ts";
import { type ContentIssue, validateCourseBundle } from "../packages/curriculum/src/index.ts";
import { CodexTutorProvider } from "../packages/tutor-providers/src/index.ts";
import {
  checkPreservation,
  lintText,
  type PreservationReport,
  type WritingContext,
} from "../packages/writing-engine/src/index.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_ROOT = path.join(ROOT, "content");

/** Every learner-facing string in a draft, with the rule family that judges it. */
interface AuthoredField {
  path: string;
  text: string;
  context: WritingContext;
  hiddenAnswer?: string;
}

interface PipelineStage {
  name: string;
  passed: boolean;
  detail: string;
}

interface GeneratedRecord {
  slug: string;
  courseId: string;
  conceptIds: string[];
  generatedAt: string;
  model: string;
  /** The model's first answer, before any repair. Kept so nothing is regenerated needlessly. */
  raw: AuthoredLessonDraft;
  /** The draft after at most one style-editor repair pass, which is what merges. */
  repaired: AuthoredLessonDraft;
  repairs: Array<{ path: string; violations: string[]; preservation: PreservationReport }>;
  lint: Array<{ path: string; ruleId: string; severity: string; message: string }>;
  stages: PipelineStage[];
}

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function bundlePath(courseId: string): string {
  return path.join(CONTENT_ROOT, courseId, "bundle.json");
}

function generatedPath(courseId: string, slug: string): string {
  return path.join(CONTENT_ROOT, courseId, "generated", `${slug}.json`);
}

function reviewPath(courseId: string, slug: string): string {
  return path.join(CONTENT_ROOT, courseId, "review", `${slug}.md`);
}

async function readBundle(courseId: string): Promise<CourseBundle> {
  const raw = JSON.parse(await readFile(bundlePath(courseId), "utf8")) as unknown;
  const validation = validateCourseBundle(raw);
  if (!validation.bundle) {
    throw new Error(
      `Course '${courseId}' does not parse:\n${formatIssues(validation.issues).join("\n")}`,
    );
  }
  return validation.bundle;
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function formatIssues(issues: ContentIssue[]): string[] {
  return issues.map(
    (issue) => `${issue.severity.toUpperCase()} ${issue.path} ${issue.code}: ${issue.message}`,
  );
}

async function courseDirectories(): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(CONTENT_ROOT, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && existsSync(bundlePath(entry.name)))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Learner-facing strings in a bundle, paired with the rule family each one answers to. The
 * writing gate and the review file both read the course through this one list, so neither can
 * quietly skip a field the other checks.
 */
export function bundleFields(bundle: CourseBundle): AuthoredField[] {
  const fields: AuthoredField[] = [
    { path: "course.description", text: bundle.course.description, context: "lesson" },
  ];
  for (const module of bundle.modules) {
    fields.push({
      path: `modules.${module.id}.description`,
      text: module.description,
      context: "lesson",
    });
  }
  for (const concept of bundle.concepts) {
    fields.push({
      path: `concepts.${concept.id}.summary`,
      text: concept.summary,
      context: "lesson",
    });
  }
  for (const lesson of bundle.lessons) {
    fields.push(
      { path: `lessons.${lesson.id}.title`, text: lesson.title, context: "lesson" },
      { path: `lessons.${lesson.id}.orientation`, text: lesson.orientation, context: "lesson" },
      { path: `lessons.${lesson.id}.explanation`, text: lesson.explanation, context: "lesson" },
      { path: `lessons.${lesson.id}.takeaway`, text: lesson.takeaway, context: "lesson" },
      { path: `lessons.${lesson.id}.reviewLabel`, text: lesson.reviewLabel, context: "lesson" },
      { path: `lessons.${lesson.id}.nextAction`, text: lesson.nextAction, context: "lesson" },
    );
    for (const [name, title] of Object.entries(lesson.stageTitles)) {
      fields.push({
        path: `lessons.${lesson.id}.stageTitles.${name}`,
        text: title,
        context: "lesson",
      });
    }
    if (lesson.image) {
      fields.push({
        path: `lessons.${lesson.id}.image.caption`,
        text: lesson.image.caption,
        context: "lesson",
      });
    }
  }
  for (const activity of bundle.activities) {
    fields.push(
      { path: `activities.${activity.id}.title`, text: activity.title, context: "lesson" },
      {
        path: `activities.${activity.id}.instructions`,
        text: activity.instructions,
        context: "lesson",
      },
      {
        path: `activities.${activity.id}.predictionPrompt`,
        text: activity.predictionPrompt,
        context: "question",
      },
    );
    if (activity.type === "timeline_explorer") {
      for (const event of activity.events) {
        fields.push({
          path: `activities.${activity.id}.events.${event.id}`,
          text: event.detail,
          context: "lesson",
        });
      }
    }
  }
  for (const question of bundle.questions) {
    const hiddenAnswer =
      question.answerAuthority.kind === "numeric"
        ? `${question.answerAuthority.value} ${question.answerAuthority.unit}`
        : question.answerAuthority.exampleAnswer;
    fields.push({
      path: `questions.${question.id}.prompt`,
      text: question.prompt,
      context: "question",
    });
    question.hints.forEach((hint, index) => {
      fields.push({
        path: `questions.${question.id}.hints.${index}`,
        text: hint,
        context: "hint",
        hiddenAnswer,
      });
    });
  }
  for (const card of bundle.flashcards) {
    fields.push(
      { path: `flashcards.${card.id}.front`, text: card.front, context: "question" },
      { path: `flashcards.${card.id}.back`, text: card.back, context: "lesson" },
    );
  }
  for (const essay of bundle.essays) {
    fields.push(
      { path: `essays.${essay.id}.prompt`, text: essay.prompt, context: "question" },
      { path: `essays.${essay.id}.expectedScope`, text: essay.expectedScope, context: "lesson" },
    );
    essay.successCriteria.forEach((criterion, index) => {
      fields.push({
        path: `essays.${essay.id}.successCriteria.${index}`,
        text: criterion,
        context: "lesson",
      });
    });
  }
  return fields;
}

/** The same list for a generated draft, before it has an identity inside a bundle. */
function draftFields(draft: AuthoredLessonDraft): AuthoredField[] {
  const fields: AuthoredField[] = [
    { path: "title", text: draft.title, context: "lesson" },
    { path: "orientation", text: draft.orientation, context: "lesson" },
    { path: "explanation", text: draft.explanation, context: "lesson" },
    { path: "takeaway", text: draft.takeaway, context: "lesson" },
    { path: "reviewLabel", text: draft.reviewLabel, context: "lesson" },
    { path: "nextAction", text: draft.nextAction, context: "lesson" },
  ];
  draft.questions.forEach((question, index) => {
    const hiddenAnswer =
      question.answerAuthority.kind === "numeric"
        ? `${question.answerAuthority.value} ${question.answerAuthority.unit}`
        : question.answerAuthority.exampleAnswer;
    fields.push({ path: `questions.${index}.prompt`, text: question.prompt, context: "question" });
    question.hints.forEach((hint, hintIndex) => {
      fields.push({
        path: `questions.${index}.hints.${hintIndex}`,
        text: hint,
        context: "hint",
        hiddenAnswer,
      });
    });
  });
  draft.flashcards.forEach((card, index) => {
    fields.push(
      { path: `flashcards.${index}.front`, text: card.front, context: "question" },
      { path: `flashcards.${index}.back`, text: card.back, context: "lesson" },
    );
  });
  return fields;
}

function lintField(field: AuthoredField): StyleViolation[] {
  return lintText(field.text, {
    context: field.context,
    ...(field.hiddenAnswer === undefined ? {} : { hiddenAnswer: field.hiddenAnswer }),
  }).violations;
}

function writeDraftPath(draft: AuthoredLessonDraft, dotted: string, value: string): void {
  const segments = dotted.split(".");
  const last = segments.pop();
  if (last === undefined) return;
  let current: unknown = draft;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return;
    current = (current as Record<string, unknown>)[segment];
  }
  if (current !== null && typeof current === "object") {
    (current as Record<string, unknown>)[last] = value;
  }
}

function provider(): CodexTutorProvider {
  // Authoring is slower and more careful than a tutor reply, and it runs while the author
  // waits rather than while a learner does.
  return new CodexTutorProvider({
    reasoningEffort: process.env["DISCERE_CODEX_EFFORT"]?.trim() || "medium",
    timeoutMs: Number.parseInt(process.env["DISCERE_AUTHOR_TIMEOUT_MS"] ?? "", 10) || 600_000,
  });
}

interface GenerateOptions {
  courseId: string;
  slug: string;
  conceptIds: string[];
  plan: string;
  force: boolean;
}

async function generate(options: GenerateOptions): Promise<GeneratedRecord> {
  const file = generatedPath(options.courseId, options.slug);
  if (!options.force && existsSync(file)) {
    log(`· ${options.slug}: reusing the cached generation at ${path.relative(ROOT, file)}`);
    return JSON.parse(await readFile(file, "utf8")) as GeneratedRecord;
  }

  const bundle = await readBundle(options.courseId);
  const concepts = bundle.concepts.filter((concept) => options.conceptIds.includes(concept.id));
  if (concepts.length !== options.conceptIds.length) {
    throw new Error(`Course '${options.courseId}' does not define every requested concept.`);
  }
  const sources = bundle.sources.filter((source) => bundle.course.sourceIds.includes(source.id));

  const codex = provider();
  const stages: PipelineStage[] = [];
  log(`· ${options.slug}: generating with the local Codex CLI. This takes a few minutes.`);
  const started = Date.now();
  const generated = await codex.generate<unknown, AuthoredLessonDraft>(
    {
      operation: "author_lesson",
      requestId: randomUUID(),
      payload: {
        course: {
          id: bundle.course.id,
          title: bundle.course.title,
          audience: bundle.course.audience,
        },
        concepts: concepts.map((concept) => ({
          id: concept.id,
          title: concept.title,
          summary: concept.summary,
          prerequisiteIds: concept.prerequisiteIds,
        })),
        contentPlan: options.plan,
        allowedSourceIds: sources.map((source) => source.id),
        sources: sources.map((source) => ({ id: source.id, title: source.title, url: source.url })),
      },
    },
    {
      systemPrompt: "lesson-writer",
      outputSchema: z.toJSONSchema(AuthoredLessonDraftSchema),
      parsePayload: (value) => AuthoredLessonDraftSchema.parse(value),
      maxAttempts: 2,
    },
  );
  stages.push({
    name: "generate",
    passed: true,
    detail: `Returned a parsed draft in ${Math.round((Date.now() - started) / 1000)} s.`,
  });
  const raw = generated.payload;
  log(
    `· ${options.slug}: draft returned (${raw.explanation.split(/\s+/u).length} words of explanation).`,
  );

  const repaired = structuredClone(raw);
  const repairs: GeneratedRecord["repairs"] = [];
  const failing = draftFields(raw).filter((field) =>
    lintField(field).some((violation) => violation.severity === "hard"),
  );
  for (const field of failing) {
    const violations = lintField(field).filter((violation) => violation.severity === "hard");
    log(
      `· ${options.slug}: repairing ${field.path} (${violations.map((item) => item.ruleId).join(", ")}).`,
    );
    const revised = await repairOnce(codex, field.text, violations);
    const preservation = checkPreservation(field.text, revised);
    repairs.push({
      path: field.path,
      violations: violations.map((item) => `${item.ruleId}: ${item.message}`),
      preservation,
    });
    if (preservation.passed) writeDraftPath(repaired, field.path, revised);
  }
  stages.push({
    name: "lint + one repair pass",
    passed: draftFields(repaired).every((field) =>
      lintField(field).every((violation) => violation.severity !== "hard"),
    ),
    detail:
      repairs.length === 0
        ? "The first draft passed the writing gate."
        : `${repairs.length} field(s) went through the style editor.`,
  });
  stages.push({
    name: "semantic preservation",
    passed: repairs.every((repair) => repair.preservation.passed),
    detail:
      repairs.length === 0
        ? "No repair was needed, so nothing could drift."
        : "Numbers, units, equations, and citations were compared before and after each repair.",
  });

  const record: GeneratedRecord = {
    slug: options.slug,
    courseId: options.courseId,
    conceptIds: options.conceptIds,
    generatedAt: new Date().toISOString(),
    model: process.env["DISCERE_CODEX_MODEL"]?.trim() || "codex-cli default",
    raw,
    repaired,
    repairs,
    lint: draftFields(repaired).flatMap((field) =>
      lintField(field).map((violation) => ({
        path: field.path,
        ruleId: violation.ruleId,
        severity: violation.severity,
        message: violation.message,
      })),
    ),
    stages,
  };
  await writeJson(file, record);
  log(`· ${options.slug}: saved ${path.relative(ROOT, file)}`);
  return record;
}

/** One targeted style-editor pass over a single failing field. */
async function repairOnce(
  codex: CodexTutorProvider,
  text: string,
  violations: StyleViolation[],
): Promise<string> {
  const response = await codex.generate<unknown, unknown>(
    {
      operation: "edit_style",
      requestId: randomUUID(),
      payload: {
        draft: text,
        violations: violations.map((violation) => ({
          ruleId: violation.ruleId,
          message: violation.message,
          start: violation.start,
          end: violation.end,
          excerpt: violation.excerpt,
        })),
        instruction:
          "Repair only the flagged spans. Preserve every number, unit, equation, citation, and answer boundary already present.",
      },
    },
    {
      systemPrompt: "style-editor",
      outputSchema: z.toJSONSchema(StyleEditDraftSchema),
      parsePayload: (value) => StyleEditDraftSchema.parse(value),
    },
  );
  return StyleEditDraftSchema.parse(response.payload).revisedText;
}

async function lintCourses(courseIds: string[]): Promise<boolean> {
  let clean = true;
  for (const courseId of courseIds) {
    const bundle = await readBundle(courseId);
    const fields = bundleFields(bundle);
    const violations = fields.flatMap((field) =>
      lintField(field).map((violation) => ({ field, violation })),
    );
    for (const { field, violation } of violations) {
      log(
        `${violation.severity === "hard" ? "ERROR" : "warn "} ${courseId}/${field.path} ${violation.ruleId}: ${violation.message}`,
      );
      if (violation.severity === "hard") clean = false;
    }
    log(
      `${clean ? "✓" : "✗"} ${courseId}: linted ${fields.length} learner-facing strings, ${violations.length} note(s).`,
    );
  }
  return clean;
}

async function validateCourses(courseIds: string[]): Promise<boolean> {
  let passed = true;
  for (const courseId of courseIds) {
    const raw = JSON.parse(await readFile(bundlePath(courseId), "utf8")) as unknown;
    const result = validateCourseBundle(raw);
    for (const line of formatIssues(result.issues)) log(`${courseId}: ${line}`);
    if (!result.passed) passed = false;
    else {
      const bundle = result.bundle;
      log(
        `✓ ${courseId}: ${bundle?.lessons.length ?? 0} lesson(s), ${bundle?.questions.length ?? 0} question(s), ${bundle?.flashcards.length ?? 0} card(s).`,
      );
    }
  }
  return passed;
}

function reviewMarkdown(record: GeneratedRecord): string {
  const draft = record.repaired;
  const lines = [
    `# Review: ${draft.title}`,
    "",
    `- Course: \`${record.courseId}\``,
    `- Concepts: ${record.conceptIds.map((id) => `\`${id}\``).join(", ")}`,
    `- Generated: ${record.generatedAt} by ${record.model}`,
    "",
    "## Pipeline",
    "",
    "| Stage | Result | Detail |",
    "| --- | --- | --- |",
    ...record.stages.map(
      (stage) => `| ${stage.name} | ${stage.passed ? "pass" : "FAIL"} | ${stage.detail} |`,
    ),
    "",
    "## Prose",
    "",
    `**Orientation.** ${draft.orientation}`,
    "",
    draft.explanation,
    "",
    `**Takeaway.** ${draft.takeaway}`,
    "",
    "## Questions",
    "",
  ];
  for (const question of draft.questions) {
    lines.push(`### ${question.id}`, "", `${question.prompt}`, "");
    if (question.choices.length > 0) {
      lines.push(...question.choices.map((choice) => `- (${choice.id}) ${choice.label}`), "");
    }
    lines.push(
      question.answerAuthority.kind === "numeric"
        ? `- Answer: **${question.answerAuthority.value} ${question.answerAuthority.unit}** — ${question.answerAuthority.workedAnswer}`
        : `- Accepted ideas: ${question.answerAuthority.acceptedIdeas.join("; ")}`,
      ...question.hints.map((hint, index) => `- Hint ${index + 1}: ${hint}`),
      "",
    );
  }
  lines.push("## Recall cards", "");
  for (const card of draft.flashcards) {
    lines.push(`- **${card.front}** → ${card.back}`);
  }
  lines.push("", "## Repairs", "");
  if (record.repairs.length === 0) lines.push("None. The first draft passed the writing gate.");
  for (const repair of record.repairs) {
    lines.push(
      `- \`${repair.path}\`: ${repair.violations.join("; ")} — preservation ${repair.preservation.passed ? "held" : "FAILED"}.`,
    );
  }
  lines.push("", "## Remaining lint notes", "");
  if (record.lint.length === 0) lines.push("None.");
  for (const note of record.lint) {
    lines.push(`- \`${note.path}\` ${note.ruleId} (${note.severity}): ${note.message}`);
  }
  if (draft.uncertainty.length > 0) {
    lines.push("", "## Declared uncertainty", "", ...draft.uncertainty.map((item) => `- ${item}`));
  }
  lines.push(
    "",
    "## Decision",
    "",
    "Accept by running `pnpm author merge --course <id> --item <slug>`, which re-validates the whole bundle before writing it.",
    "",
  );
  return lines.join("\n");
}

async function review(courseId: string, slug: string): Promise<void> {
  const record = JSON.parse(
    await readFile(generatedPath(courseId, slug), "utf8"),
  ) as GeneratedRecord;
  const file = reviewPath(courseId, slug);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, reviewMarkdown(record), "utf8");
  log(`✓ wrote ${path.relative(ROOT, file)}`);
}

/**
 * Folds an accepted draft into the bundle. Nothing is written until the whole bundle passes
 * curriculum validation with the new material in it.
 */
async function merge(courseId: string, slug: string, lessonId: string): Promise<void> {
  const record = JSON.parse(
    await readFile(generatedPath(courseId, slug), "utf8"),
  ) as GeneratedRecord;
  const draft = record.repaired;
  const bundle = await readBundle(courseId);
  const lesson = bundle.lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    throw new Error(
      `Course '${courseId}' has no lesson '${lessonId}'. Add the lesson's plumbing (activity, visual brief, sources) first; the pipeline writes prose, questions, and cards into it.`,
    );
  }

  lesson.title = draft.title;
  lesson.orientation = draft.orientation;
  lesson.explanation = draft.explanation;
  lesson.takeaway = draft.takeaway;
  lesson.reviewLabel = draft.reviewLabel;
  lesson.nextAction = draft.nextAction;
  lesson.stageTitles = draft.stageTitles;

  for (const question of draft.questions) {
    const existing = bundle.questions.findIndex((item) => item.id === question.id);
    const merged = {
      id: question.id,
      conceptIds: record.conceptIds,
      prompt: question.prompt,
      responseType: question.responseType,
      difficulty: question.difficulty,
      hints: question.hints,
      answerAuthority: toAnswerAuthority(question.answerAuthority),
      sourceIds: lesson.sourceIds,
      ...(question.choices.length > 0 ? { choices: question.choices } : {}),
    };
    if (existing >= 0) bundle.questions[existing] = merged;
    else bundle.questions.push(merged);
    if (!lesson.questionIds.includes(question.id)) lesson.questionIds.push(question.id);
  }

  for (const card of draft.flashcards) {
    const existing = bundle.flashcards.findIndex((item) => item.id === card.id);
    const merged = {
      id: card.id,
      conceptIds: card.conceptIds,
      front: card.front,
      back: card.back,
      sourceIds: lesson.sourceIds,
    };
    if (existing >= 0) bundle.flashcards[existing] = merged;
    else bundle.flashcards.push(merged);
    if (!lesson.flashcardIds.includes(card.id)) lesson.flashcardIds.push(card.id);
  }

  const validation = validateCourseBundle(bundle);
  if (!validation.passed) {
    log(`✗ ${slug}: the merged bundle does not validate. Nothing was written.`);
    for (const line of formatIssues(validation.issues)) log(`  ${line}`);
    process.exitCode = 1;
    return;
  }
  await writeJson(bundlePath(courseId), bundle);
  log(`✓ merged ${slug} into ${path.relative(ROOT, bundlePath(courseId))}`);
}

function flag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
}

function requireFlag(argv: string[], name: string): string {
  const value = flag(argv, name);
  if (!value) throw new Error(`Missing required --${name}.`);
  return value;
}

const USAGE = `pnpm author <command>

  generate  --course <id> --slug <name> --concepts <a,b> --plan <text|@file> [--force]
  lint      [--course <id>]
  validate  [--course <id>]
  review    --course <id> --item <slug>
  merge     --course <id> --item <slug> --lesson <lessonId>
  pipeline  --course <id> --slug <name> --concepts <a,b> --plan <text|@file> --lesson <lessonId> [--force]

Generation spawns the local Codex CLI with DISCERE_CODEX_EFFORT=medium and caches its answer
under content/<course>/generated/, which is ignored by Git.`;

async function readPlan(value: string): Promise<string> {
  return value.startsWith("@") ? readFile(path.resolve(ROOT, value.slice(1)), "utf8") : value;
}

async function main(argv: string[]): Promise<void> {
  const command = argv[0];
  if (!command || command === "help" || command === "--help") {
    log(USAGE);
    return;
  }
  const courseFlag = flag(argv, "course");
  const courses = courseFlag ? [courseFlag] : await courseDirectories();

  if (command === "lint") {
    if (!(await lintCourses(courses))) process.exitCode = 1;
    return;
  }
  if (command === "validate") {
    if (!(await validateCourses(courses))) process.exitCode = 1;
    return;
  }
  if (command === "review") {
    await review(requireFlag(argv, "course"), requireFlag(argv, "item"));
    return;
  }
  if (command === "merge") {
    await merge(
      requireFlag(argv, "course"),
      requireFlag(argv, "item"),
      requireFlag(argv, "lesson"),
    );
    return;
  }
  if (command === "generate" || command === "pipeline") {
    const courseId = requireFlag(argv, "course");
    const slug = requireFlag(argv, "slug");
    const record = await generate({
      courseId,
      slug,
      conceptIds: requireFlag(argv, "concepts")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
      plan: await readPlan(requireFlag(argv, "plan")),
      force: argv.includes("--force"),
    });
    for (const stage of record.stages) {
      log(`  ${stage.passed ? "✓" : "✗"} ${stage.name}: ${stage.detail}`);
    }
    await review(courseId, slug);
    if (command === "pipeline") {
      await merge(courseId, slug, requireFlag(argv, "lesson"));
      if (!(await validateCourses([courseId]))) process.exitCode = 1;
      if (!(await lintCourses([courseId]))) process.exitCode = 1;
    }
    return;
  }
  log(USAGE);
  process.exitCode = 1;
}

await main(process.argv.slice(2));
