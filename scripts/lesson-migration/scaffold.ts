/**
 * Lesson migration to schema v2, the mechanical half.
 *
 *   pnpm tsx scripts/lesson-migration/scaffold.ts <course-id> [lesson-id]
 *       Writes content/<course>/.authoring/migration/<lesson>.json for every legacy lesson (or
 *       the one named): the lesson converted as far as a machine can take it, with every field
 *       that needs real writing set to a "TODO:" string, plus a `migrationNotes` list naming
 *       exactly what a writer must do. Existing draft files are never overwritten.
 *
 *   pnpm tsx scripts/lesson-migration/scaffold.ts <course-id> --apply
 *       Merges every finished draft (no "TODO:" left) into content/<course>/.authoring/
 *       candidate.json, runs the full validator, and prints what still fails. Then the normal
 *       pipeline takes over: pnpm curate review <course>, then pnpm curate publish <course>.
 *
 * What it does mechanically (docs/learning-experience §7.5):
 * - legacy kinds → v2 kinds (hook → predict, or explore when the figure binds the answer;
 *   check → try; transfer stays; worked_example stays but is flagged; explain stays);
 * - heading blocks → eyebrow (kept only as a note: most v2 steps need no eyebrow);
 * - each paragraph → `lead` (sentences that do not state the answer) and `reveal` (those that do),
 *   with exactly the split the player already uses (`splitLegacyStep`);
 * - figures in graded steps → answerVisibility "hidden-until-response" (or "live" for explore);
 * - onCorrect drafts from the worked answer's first sentence, flagged for a human pass;
 * - the course's calculator default (spec §6.3);
 * - skeletons for the opener, the close, the 3-item skill check and the skills taught.
 * Everything the style guide calls writing — hooks, promises, leads, key ideas, misconceptions,
 * worked lines — is left as TODO with the source material beside it.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CalculatorPolicy,
  CourseBundle,
  LessonBeat,
  LessonStep,
  LessonStepKind,
  Question,
} from "@discere/curriculum";
import {
  assertLessonsPublishable,
  isV2Lesson,
  splitLegacyStep,
  validateCourseBundle,
} from "@discere/curriculum";

type ClaimCitation = NonNullable<CourseBundle["authoringMetadata"]>[number]["citations"][number];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const TODO = "TODO:";

/** Course calculator defaults from docs/learning-experience §6.3. */
export const CALCULATOR_DEFAULTS: Record<string, CalculatorPolicy> = {
  "maths-foundations": "off",
  "geometry-shape-and-space": "available",
  "calculus-change-and-accumulation": "available",
  "linear-algebra-vectors-and-maps": "available",
  "probability-statistics": "available",
  "physics-motion-and-forces": "available",
  "chemistry-atoms-to-reactions": "available",
  "engineering-structures-and-machines": "available",
  "electronics-foundations": "available",
  "astronomy-sky-to-cosmos": "available",
  "economics-markets-and-strategy": "available",
  "logic-and-reasoning": "off",
  "philosophy-knowledge-mind-and-ethics": "off",
  "english-reading-writing-and-rhetoric": "off",
  "psychology-how-minds-work": "off",
  "biology-cells-to-ecosystems": "off",
  "sql-from-rows-to-reports": "off",
  "python-for-data-analysis": "off",
  "cs-basics": "off",
};

export interface MigrationDraft {
  lessonId: string;
  courseId: string;
  /** What a writer has to do before `--apply` will take this draft. */
  migrationNotes: string[];
  lesson: LessonBeat;
  /** Questions this lesson asks, with v2 fields to fill. Unchanged ids keep learner history. */
  questions: Question[];
  /**
   * The lesson's source citations, replacing its `authoringMetadata` citations on apply. Seeded
   * with the legacy ones; retarget them to the new step and question ids, and cite every step,
   * question and flashcard (curation refuses a lesson with an uncited target).
   */
  citations?: ClaimCitation[];
}

function v2Kind(step: LessonStep): LessonStepKind {
  switch (step.kind) {
    case "hook":
      return step.diagram && "bindAnswer" in step.diagram && step.diagram.bindAnswer
        ? "explore"
        : "predict";
    case "check":
    case "teach_back":
      return "try";
    case "interact":
      return "explore";
    default:
      return step.kind;
  }
}

function firstSentence(text: string): string {
  return text.split(/(?<=[.!?])\s+/u)[0] ?? text;
}

/** Converts one legacy lesson. Pure, so it is tested without touching the file system. */
export function scaffoldLesson(bundle: CourseBundle, lesson: LessonBeat): MigrationDraft {
  const notes: string[] = [];
  const questions = new Map(bundle.questions.map((question) => [question.id, question]));
  const usedQuestions: Question[] = [];
  const index = bundle.lessons.findIndex((item) => item.id === lesson.id);
  const steps: LessonStep[] = lesson.steps.map((step) => {
    const question = step.checkQuestionId ? questions.get(step.checkQuestionId) : undefined;
    const projection = splitLegacyStep(step, question);
    const kind = v2Kind(step);
    const at = `step '${step.id}'`;
    if (projection.eyebrow)
      notes.push(
        `${at}: the old title "${projection.eyebrow}" was dropped. If it names the idea, it may become the onCorrect line or an explain headline; never a headline above a question.`,
      );
    if (step.kind !== kind)
      notes.push(
        `${at}: kind ${step.kind} → ${kind}; check the order of teaching and asking still fits (style guide §2).`,
      );
    if (projection.lead.length === 0 && kind !== "worked_example")
      notes.push(
        `${at}: no safe lead survived the split; write a lead (≤ 60 words) that teaches what the question needs without stating its answer.`,
      );
    if (projection.reveal.length > 0)
      notes.push(
        `${at}: ${projection.reveal.length} block(s) moved to reveal because they state the answer; make the reveal refer to the learner's attempt.`,
      );
    if (kind === "worked_example")
      notes.push(
        `${at}: write workedSteps from the worked answer (one line per move, one self-explanation prompt), a headline naming the problem, and recompute every number.`,
      );
    const graded = Boolean(step.checkQuestionId);
    return {
      id: step.id,
      kind,
      blocks: [],
      lead: projection.lead,
      reveal: projection.reveal,
      ...(kind === "explain" || kind === "worked_example"
        ? {
            headline: `${TODO} the key idea as one sentence (explain) or the problem (worked example)`,
          }
        : {}),
      ...(kind === "worked_example"
        ? { workedSteps: [{ text: `${TODO} first line` }, { text: `${TODO} second line` }] }
        : {}),
      ...(step.diagram ? { diagram: step.diagram } : {}),
      ...(step.diagram && graded
        ? {
            answerVisibility:
              kind === "explore" ? ("live" as const) : ("hidden-until-response" as const),
          }
        : {}),
      visualStateId: step.visualStateId,
      checkQuestionId: step.checkQuestionId,
      activityId: step.activityId,
    };
  });
  for (const id of [...lesson.steps.map((step) => step.checkQuestionId), ...lesson.questionIds]) {
    const question = id ? questions.get(id) : undefined;
    if (!question) continue;
    const authority = question.answerAuthority;
    const worked = authority.kind === "numeric" ? authority.workedAnswer : authority.exampleAnswer;
    usedQuestions.push({
      ...question,
      onCorrect: question.onCorrect ?? `${TODO} ${firstSentence(worked)}`,
      skill: question.skill ?? "todo-name-the-skill",
    });
  }
  notes.push(
    "intro: write the hook (a puzzle the learner can do from what they bring, never a definition), the promise (≤ 25 words, “By the end you'll …”) and the time.",
    "recap: write the key idea (the promise, kept), the learner's own results, and the one-line bridge to the next lesson.",
    `skill check: the lesson has ${lesson.questionIds.length} quiz item(s); it needs exactly 3, each on something this lesson taught.`,
    "questions: replace every TODO onCorrect (≤ 25 words, states the idea), tag each skill, add misconceptions for predictable wrong answers (the feedback must not state the key).",
    "vocabulary: give each explain step introducesTerms; no prompt may use a term before the step that introduces it.",
    "add an explain step before any question that needs a new word or symbol; add a transfer if the lesson has none.",
    "citations: retarget the seeded citations to the new step and question ids, and give every step, question and flashcard at least one (same sourceIds; the claim is what that screen asserts).",
  );
  if (!steps.some((step) => step.kind === "transfer"))
    notes.push("the lesson has no transfer step: add one (the same idea in a changed situation).");
  const draft: LessonBeat = {
    ...lesson,
    steps,
    intro: {
      hook: {
        blocks: [
          {
            kind: "paragraph",
            text: `${TODO} hook. Orientation for reference: ${lesson.orientation}`,
          },
        ],
      },
      promise: `${TODO} By the end you'll ${lesson.orientation.charAt(0).toLocaleLowerCase()}${lesson.orientation.slice(1)}`,
      estimatedMinutes: 10,
    },
    recap: {
      keyIdea: `${TODO} the key idea. Previous next action: ${lesson.nextAction}`,
      nextHook: `${TODO} one line bridging to ${bundle.lessons[index + 1]?.title ?? "the next lesson"}`,
    },
    calculator: lesson.calculator ?? CALCULATOR_DEFAULTS[bundle.course.id] ?? "available",
    taughtSkills: lesson.taughtSkills ?? ["todo-name-the-skill"],
    stageTitles: { ...lesson.stageTitles, quiz: "Skill check" },
  };
  const citations =
    bundle.authoringMetadata?.find((item) => item.lessonId === lesson.id)?.citations ?? [];
  return {
    lessonId: lesson.id,
    courseId: bundle.course.id,
    migrationNotes: notes,
    lesson: draft,
    questions: usedQuestions,
    citations,
  };
}

/**
 * Plain-text fields that hold TeX: a caret or a backslash command outside `$…$` is shown to the
 * learner literally ("4x^3"). Equation blocks (`latex`) and code are exempt.
 */
export function untypesetMaths(value: unknown, at = ""): string[] {
  if (typeof value === "string") {
    const outside = value.replace(/\$[^$]*\$/gu, "");
    return /\\[a-zA-Z]+|\w\^|\^[{(\w]/u.test(outside) ? [`${at}: ${value.slice(0, 60)}`] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item, i) => untypesetMaths(item, `${at}.${i}`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) =>
      ["latex", "code", "migrationNotes", "citations", "answerAuthority"].includes(key)
        ? []
        : untypesetMaths(item, at ? `${at}.${key}` : key),
    );
  return [];
}

/** Steps, questions and flashcards of a draft that no citation targets, as "kind:id". */
export function uncitedTargets(draft: MigrationDraft): string[] {
  const lesson = draft.lesson;
  const questionIds = [
    ...lesson.steps.flatMap((step) => (step.checkQuestionId ? [step.checkQuestionId] : [])),
    ...lesson.questionIds,
    ...(lesson.intro?.hook.questionId ? [lesson.intro.hook.questionId] : []),
  ];
  const targets = [
    ...lesson.steps.map((step) => `step:${step.id}`),
    ...[...new Set(questionIds)].map((id) => `question:${id}`),
    ...lesson.flashcardIds.map((id) => `flashcard:${id}`),
  ];
  const cited = new Set(
    (draft.citations ?? []).map((item) => `${item.targetKind}:${item.targetId}`),
  );
  return targets.filter((target) => !cited.has(target));
}

/** Paths in a draft that still say TODO, for the apply step's refusal message. */
export function remainingTodos(value: unknown, at = ""): string[] {
  if (typeof value === "string")
    return value.includes(TODO) || value.startsWith("todo-") ? [at] : [];
  if (Array.isArray(value))
    return value.flatMap((item, index) => remainingTodos(item, `${at}.${index}`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) =>
      key === "migrationNotes" ? [] : remainingTodos(item, at ? `${at}.${key}` : key),
    );
  return [];
}

/** Merges finished drafts into a bundle. Questions are replaced by id; new ones appended. */
export function applyDrafts(bundle: CourseBundle, drafts: MigrationDraft[]): CourseBundle {
  const byLesson = new Map(drafts.map((draft) => [draft.lessonId, draft]));
  const replaced = new Map(
    drafts.flatMap((draft) => draft.questions.map((q) => [q.id, q] as const)),
  );
  const known = new Set(bundle.questions.map((question) => question.id));
  // A course published before metadata was required has none: each draft brings its own entry,
  // with the previous lesson as its prerequisite.
  const existing = bundle.authoringMetadata ?? [];
  const missing = bundle.lessons.flatMap((lesson, index) =>
    byLesson.has(lesson.id) && !existing.some((item) => item.lessonId === lesson.id)
      ? [
          {
            lessonId: lesson.id,
            prerequisiteLessonIds: index > 0 ? [bundle.lessons[index - 1]!.id] : [],
            citations: [] as ClaimCitation[],
            uncertainty: [] as string[],
          },
        ]
      : [],
  );
  const authoringMetadata = [...existing, ...missing].map((metadata) => {
    const draft = byLesson.get(metadata.lessonId);
    if (!draft) return metadata;
    if (draft.citations) return { ...metadata, citations: draft.citations };
    // A draft from before drafts carried citations: keep only those whose target still exists.
    const live = new Set([
      ...draft.lesson.steps.map((step) => `step:${step.id}`),
      ...bundle.questions.map((q) => `question:${q.id}`),
      ...draft.questions.map((q) => `question:${q.id}`),
      ...draft.lesson.flashcardIds.map((id) => `flashcard:${id}`),
    ]);
    return {
      ...metadata,
      citations: metadata.citations.filter((c) => live.has(`${c.targetKind}:${c.targetId}`)),
    };
  });
  const lessons = bundle.lessons.map((lesson) => byLesson.get(lesson.id)?.lesson ?? lesson);
  // Activities only the replaced legacy steps used would be unreachable: drop them.
  const stillUsed = new Set(lessons.flatMap((lesson) => lesson.steps.map((step) => step.activityId)));
  const orphaned = new Set(
    bundle.lessons
      .filter((lesson) => byLesson.has(lesson.id))
      .flatMap((lesson) => lesson.steps.map((step) => step.activityId))
      .filter((id): id is string => Boolean(id) && !stillUsed.has(id)),
  );
  return {
    ...bundle,
    ...(authoringMetadata.length ? { authoringMetadata } : {}),
    ...(bundle.activities
      ? { activities: bundle.activities.filter((activity) => !orphaned.has(activity.id)) }
      : {}),
    lessons,
    questions: [
      ...bundle.questions.map((question) => replaced.get(question.id) ?? question),
      ...[...replaced.values()].filter((question) => !known.has(question.id)),
    ],
  };
}

async function main(): Promise<void> {
  const [courseId, flag] = process.argv.slice(2);
  if (!courseId || !/^[a-z0-9]+(-[a-z0-9]+)*$/u.test(courseId)) {
    console.error(
      "Usage: pnpm tsx scripts/lesson-migration/scaffold.ts <course-id> [lesson-id | --apply]",
    );
    process.exitCode = 1;
    return;
  }
  const directory = path.join(ROOT, "content", courseId);
  const bundlePath = path.join(directory, "bundle.json");
  const candidatePath = path.join(directory, ".authoring", "candidate.json");
  const draftDirectory = path.join(directory, ".authoring", "migration");
  const bundle = JSON.parse(await readFile(bundlePath, "utf8")) as CourseBundle;

  if (flag === "--apply") {
    const files = existsSync(draftDirectory)
      ? (await readdir(draftDirectory)).filter((name) => name.endsWith(".json"))
      : [];
    const drafts: MigrationDraft[] = [];
    for (const file of files) {
      const draft = JSON.parse(
        await readFile(path.join(draftDirectory, file), "utf8"),
      ) as MigrationDraft;
      const todos = remainingTodos(draft);
      if (todos.length) {
        console.log(`· ${file}: ${todos.length} TODO(s) left, skipped (first: ${todos[0]})`);
        continue;
      }
      const tex = untypesetMaths({ lesson: draft.lesson, questions: draft.questions });
      if (tex.length) {
        console.log(
          `· ${file}: ${tex.length} field(s) with TeX outside $…$, skipped (${tex.slice(0, 3).join("; ")}). Wrap typeset maths in $…$, or write plain text with Unicode (x², ×, −).`,
        );
        continue;
      }
      const uncited = uncitedTargets(draft);
      if (uncited.length) {
        console.log(
          `· ${file}: ${uncited.length} target(s) without a citation, skipped (${uncited.slice(0, 4).join(", ")}${uncited.length > 4 ? ", …" : ""})`,
        );
        continue;
      }
      drafts.push(draft);
    }
    if (drafts.length === 0) {
      console.log("No finished drafts to apply.");
      return;
    }
    const merged = applyDrafts(bundle, drafts);
    const validation = validateCourseBundle(merged);
    const errors = validation.issues.filter((issue) => issue.severity === "error");
    for (const issue of validation.issues)
      if (drafts.some((draft) => issue.path.includes(draft.lessonId)) || issue.severity === "error")
        console.log(
          `${issue.severity === "error" ? "✕" : "!"} ${issue.path} ${issue.code}: ${issue.message}`,
        );
    if (!validation.passed || !validation.bundle) {
      console.log(`\n${errors.length} error(s). Nothing was written.`);
      process.exitCode = 1;
      return;
    }
    // Publication's own lesson rules, so a draft never passes here only to fail at publish.
    try {
      assertLessonsPublishable(validation.bundle);
    } catch (error) {
      console.log(`✕ publication: ${(error as Error).message}\nNothing was written.`);
      process.exitCode = 1;
      return;
    }
    await mkdir(path.dirname(candidatePath), { recursive: true });
    await writeFile(candidatePath, `${JSON.stringify(validation.bundle, null, 2)}\n`);
    console.log(
      `\nApplied ${drafts.map((draft) => draft.lessonId).join(", ")} to .authoring/candidate.json.\nNext: add citations for new steps and questions, then pnpm curate review ${courseId}.`,
    );
    return;
  }

  const lessons = bundle.lessons.filter(
    (lesson) => (!flag || lesson.id === flag) && !isV2Lesson(lesson),
  );
  if (lessons.length === 0) {
    console.log(
      flag ? `No legacy lesson '${flag}' in ${courseId}.` : "Every lesson is already v2.",
    );
    return;
  }
  await mkdir(draftDirectory, { recursive: true });
  for (const lesson of lessons) {
    const file = path.join(draftDirectory, `${lesson.id}.json`);
    if (existsSync(file)) {
      console.log(`· ${lesson.id}: draft exists, left alone`);
      continue;
    }
    const draft = scaffoldLesson(bundle, lesson);
    await writeFile(file, `${JSON.stringify(draft, null, 2)}\n`);
    console.log(`✓ ${lesson.id}: ${remainingTodos(draft).length} field(s) to write`);
    for (const note of draft.migrationNotes) console.log(`    - ${note}`);
  }
  console.log(
    `\nDrafts are in ${path.relative(ROOT, draftDirectory)}. Follow docs/learning-experience/style-guide.md.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
