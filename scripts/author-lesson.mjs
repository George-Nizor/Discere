#!/usr/bin/env node
/**
 * Authoring a lesson from the curriculum, into the app's own format.
 *
 *   node scripts/author-lesson.mjs brief <course-id> <lesson-id>   writes .author/<course>/<lesson>/input.json
 *   node scripts/author-lesson.mjs apply <course-id> <lesson-id>   merges .author/<course>/<lesson>/output.json
 *
 * The input carries the curriculum (objective, concepts, skills, neighbours), the lesson's figures
 * and questions as a pool to reuse, and the lesson's format with every learner-facing string
 * blanked, so the author sees the shape of valid data but none of the old prose.
 *
 * The output is { "lesson": <complete lesson object>, "questions": [<question objects>] }, plus
 * "flashcards" and "activities" for a lesson written from a curriculum. Apply
 * replaces the lesson, adds or replaces the listed questions (a reused id keeps learner history),
 * and keeps questions the lesson no longer uses so old attempts still resolve.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PRIMARY_VOICE } from "./voice-rewrite.mjs";
import { coursePrefix } from "./scaffold-course.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const [command, course, lessonId] = process.argv.slice(2);
if (!lessonId || !["brief", "apply"].includes(command)) {
  console.error("Usage: node scripts/author-lesson.mjs brief|apply <course-id> <lesson-id>");
  process.exit(1);
}
const bundleFile = path.join(ROOT, "content", course, "bundle.json");
const dir = path.join(ROOT, ".author", course, lessonId);
const bundle = JSON.parse(readFileSync(bundleFile, "utf8"));
const index = bundle.lessons.findIndex((lesson) => lesson.id === lessonId);
if (index < 0) throw new Error(`No lesson ${lessonId} in ${course}`);
const lesson = bundle.lessons[index];

const PROSE_KEYS = new Set(["text", "headline", "promise", "whyItMatters", "keyIdea", "nextHook", "orientation"]);
/** The lesson with its prose replaced by "…", so its shape is visible but its wording is not. */
function blank(value, key) {
  if (Array.isArray(value)) return value.map((item) => blank(item, key));
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blank(v, k)]));
  return typeof value === "string" && PROSE_KEYS.has(key) ? "…" : value;
}
function collectQuestionIds(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => collectQuestionIds(item, found));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && /questionid/i.test(k) && v) found.add(v);
      else if (k === "questionIds" && Array.isArray(v)) v.forEach((id) => found.add(id));
      else collectQuestionIds(v, found);
    }
  return found;
}

const curriculumFile = path.join(ROOT, "docs", "curricula", `${course}.json`);

/**
 * A course scaffolded from docs/curricula has no old lesson to show, so its brief carries the
 * lesson's plan from the curriculum instead (bundle lesson i is curriculum lesson i), with the
 * concept ids as the bundle spells them. The format is learnt from
 * docs/writing-calibration/new-course/example-lesson.json, so it is not repeated per lesson.
 */
function curriculumBrief() {
  const curriculum = JSON.parse(readFileSync(curriculumFile, "utf8"));
  const plan = curriculum.lessons[index];
  const conceptIds = Object.fromEntries(
    plan.concepts.map((concept, i) => [concept.id, lesson.conceptIds[i] ?? concept.id]),
  );
  const done = (other) => other.steps.length > 0;
  return {
    course: {
      id: course,
      title: bundle.course.title,
      voice: curriculum.voice,
      audience: curriculum.audience,
      prerequisiteCourses: curriculum.prerequisites,
      idPrefix: coursePrefix(course),
    },
    lesson: {
      id: lesson.id,
      position: `${index + 1} of ${bundle.lessons.length}`,
      title: lesson.title,
      conceptIds: lesson.conceptIds,
      taughtSkills: lesson.taughtSkills,
      plan: {
        ...plan,
        concepts: plan.concepts.map((concept) => ({ ...concept, id: conceptIds[concept.id] })),
      },
      sources: bundle.sources.filter((s) => lesson.sourceIds.includes(s.id)),
    },
    previousLesson: bundle.lessons[index - 1]
      ? { id: bundle.lessons[index - 1].id, title: bundle.lessons[index - 1].title, written: done(bundle.lessons[index - 1]) }
      : null,
    nextLesson: bundle.lessons[index + 1]
      ? { id: bundle.lessons[index + 1].id, title: bundle.lessons[index + 1].title, objective: bundle.lessons[index + 1].orientation }
      : null,
    otherCourseLessons: bundle.lessons.map((other) => `${other.id}: ${other.title}`),
  };
}

if (command === "brief" && existsSync(curriculumFile)) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "input.json"), `${JSON.stringify(curriculumBrief(), null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, dir)}/input.json from the curriculum`);
} else if (command === "brief") {
  const concept = (id) => bundle.concepts.find((item) => item.id === id);
  const used = collectQuestionIds(lesson);
  const neighbour = (other) =>
    other ? { id: other.id, title: other.title, objective: other.orientation, concepts: other.conceptIds } : null;
  const figures = lesson.steps
    .filter((step) => step.diagram)
    .map((step) => ({ fromStep: step.id, diagram: step.diagram }));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "input.json"),
    `${JSON.stringify(
      {
        course: {
          id: course,
          title: bundle.course.title,
          audience: bundle.course.audience,
          outcomes: bundle.course.introduction?.outcomes ?? [],
          voice: PRIMARY_VOICE[course] ?? "A",
        },
        lesson: {
          id: lesson.id,
          position: `${index + 1} of ${bundle.lessons.length}`,
          title: lesson.title,
          objective: lesson.orientation,
          concepts: lesson.conceptIds.map(concept),
          taughtSkills: lesson.taughtSkills,
          sources: bundle.sources.filter((s) => lesson.sourceIds.includes(s.id)).map((s) => ({ id: s.id, title: s.title, url: s.url })),
        },
        previousLesson: neighbour(bundle.lessons[index - 1]),
        nextLesson: neighbour(bundle.lessons[index + 1]),
        figurePool: figures,
        visualStates: lesson.visualStates,
        questionPool: bundle.questions.filter((q) => used.has(q.id)),
        flashcards: bundle.flashcards.filter((card) => lesson.flashcardIds.includes(card.id)),
        formatExample: blank(lesson),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Wrote ${path.relative(ROOT, dir)}/input.json (${figures.length} figures, ${used.size} questions in the pool)`);
} else {
  const output = JSON.parse(readFileSync(path.join(dir, "output.json"), "utf8"));
  if (output.lesson?.id !== lessonId) throw new Error("output.lesson.id must equal the lesson id");
  bundle.lessons[index] = output.lesson;
  // A new course's lesson also brings its recall cards and any activities it hands over to.
  for (const [key, items] of [
    ["questions", output.questions],
    ["flashcards", output.flashcards],
    ["activities", output.activities],
  ]) {
    for (const item of items ?? []) {
      const at = bundle[key].findIndex((existing) => existing.id === item.id);
      if (at >= 0) bundle[key][at] = item;
      else bundle[key].push(item);
    }
  }
  writeFileSync(bundleFile, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`Applied ${lessonId}: ${(output.questions ?? []).length} questions written`);
}
