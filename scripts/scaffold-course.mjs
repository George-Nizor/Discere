#!/usr/bin/env node
/**
 * Starts a new course from its curriculum: `node scripts/scaffold-course.mjs <course-id>`.
 *
 * Reads docs/curricula/<course-id>.json and writes content/<course-id>/bundle.json with the
 * course, modules, concepts, sources and one stub per lesson, ready for
 * `scripts/author-lesson.mjs` to fill lesson by lesson. Bundle lesson i is curriculum lesson i,
 * which is how the authoring brief finds a lesson's plan.
 *
 * Lesson and concept ids must be unique across every course, so an id that another course or
 * curriculum already uses is given the course's prefix. Question and card ids always carry it.
 * The stub lessons do not validate, so the course must be fully written before it is merged.
 *
 * `--extend` grows a course that already exists: lessons, concepts, modules and sources the
 * curriculum adds are appended as stubs, the written lessons are kept, and the lessons are put
 * in curriculum order.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CURRICULA = path.join(ROOT, "docs", "curricula");
const CONTENT = path.join(ROOT, "content");
const read = (file) => JSON.parse(readFileSync(file, "utf8"));

/** Distinct accents for new courses, none of them the action green. */
const ACCENTS = [
  "#5b8def", "#e0679f", "#d9822b", "#8e6cef", "#2ab0c5", "#c9a227", "#ef6f5b", "#4f7cc4",
  "#b55fd1", "#3fa7a0", "#e3a33b", "#7d8ff0", "#d4566b", "#5aa9e6", "#a77a4f", "#9b6bd6",
];
const STOP = new Set(["and", "the", "of", "to", "from", "a"]);

/** A short, stable prefix for a course's question and card ids: system-design -> sysd. */
export function coursePrefix(courseId) {
  const [first, ...rest] = courseId.split("-").filter((word) => !STOP.has(word));
  return first.slice(0, 3) + rest.map((word) => word[0]).join("");
}

function curriculumIds() {
  return readdirSync(CURRICULA)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -5));
}

/** Every lesson and concept id used anywhere else, with its owner. */
function idsElsewhere(courseId) {
  const lessons = new Set();
  const concepts = new Set();
  for (const directory of readdirSync(CONTENT)) {
    const file = path.join(CONTENT, directory, "bundle.json");
    if (directory === courseId || !existsSync(file)) continue;
    const bundle = read(file);
    bundle.lessons.forEach((lesson) => lessons.add(lesson.id));
    bundle.concepts.forEach((concept) => concepts.add(concept.id));
  }
  for (const id of curriculumIds()) {
    if (id === courseId) continue;
    const curriculum = read(path.join(CURRICULA, `${id}.json`));
    for (const lesson of curriculum.lessons) {
      lessons.add(lesson.id);
      lesson.concepts.forEach((concept) => concepts.add(concept.id));
    }
  }
  return { lessons, concepts };
}

function publisher(url) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return host;
}

function scaffold(courseId, extend = false) {
  const curriculum = read(path.join(CURRICULA, `${courseId}.json`));
  const prefix = coursePrefix(courseId);
  const prefixes = curriculumIds().filter((id) => id !== courseId).map(coursePrefix);
  if (prefixes.includes(prefix)) throw new Error(`Prefix '${prefix}' is shared with another course.`);
  const elsewhere = idsElsewhere(courseId);
  const lessonId = (id) => (elsewhere.lessons.has(id) ? `${prefix}-${id}` : id);
  const conceptId = (id) => (elsewhere.concepts.has(id) ? `${prefix}-${id}` : id);
  const titles = Object.fromEntries(
    readdirSync(CONTENT)
      .filter((dir) => existsSync(path.join(CONTENT, dir, "bundle.json")))
      .map((dir) => [dir, read(path.join(CONTENT, dir, "bundle.json")).course.title]),
  );
  for (const id of curriculumIds()) titles[id] ??= read(path.join(CURRICULA, `${id}.json`)).title;

  const today = new Date().toISOString().slice(0, 10);
  const sources = curriculum.sources.map((source) => ({
    id: source.id,
    title: source.title,
    publisher: publisher(source.url),
    url: source.url,
    licence: source.licence,
    accessedAt: today,
    reuse: source.use === "adapt" || source.use === "adaptable" ? "adaptable" : "reference_only",
  }));
  const concepts = [];
  const seenConcepts = new Set();
  for (const lesson of curriculum.lessons)
    for (const concept of lesson.concepts) {
      const id = conceptId(concept.id);
      if (seenConcepts.has(id)) continue;
      seenConcepts.add(id);
      concepts.push({
        id,
        moduleId: lesson.moduleId,
        title: concept.title,
        summary: concept.summary,
        prerequisiteIds: [],
        misconceptionIds: [],
        assuranceLevel: "source_backed",
      });
    }
  const modules = curriculum.modules.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.summary,
    conceptIds: concepts.filter((concept) => concept.moduleId === module.id).map((c) => c.id),
  }));
  const lessons = curriculum.lessons.map((lesson) => ({
    id: lessonId(lesson.id),
    courseId,
    conceptIds: lesson.concepts.map((concept) => conceptId(concept.id)),
    title: lesson.title,
    steps: [],
    orientation: lesson.objective,
    visualStates: [],
    visualKind: "none",
    activityId: "",
    questionIds: [],
    flashcardIds: [],
    reviewLabel: lesson.title,
    nextAction: "",
    stageTitles: { quiz: "Skill check", review: "Recall it later", completion: "Ready for the next idea" },
    sourceIds: lesson.sourceIds,
    assuranceLevel: "source_backed",
    calculator: "off",
    taughtSkills: lesson.skills.slice(0, 12),
  }));
  const prerequisites = curriculum.prerequisites.length
    ? `It builds on ${curriculum.prerequisites.map((id) => titles[id] ?? id).join(", ")}.`
    : "No earlier Discere course is needed.";
  const bundle = {
    course: {
      id: courseId,
      version: "0.1.0",
      title: curriculum.title,
      description: curriculum.description,
      audience: curriculum.audience,
      assuranceLevel: "source_backed",
      moduleIds: modules.map((module) => module.id),
      sourceIds: sources.map((source) => source.id),
      accent: ACCENTS[curriculumIds().sort().indexOf(courseId) % ACCENTS.length],
      coverAsset: "cover.svg",
      status: "available",
      introduction: {
        paragraphs: [curriculum.description],
        outcomes: curriculum.outcomes.slice(0, 6),
        prerequisites,
        length: `${lessons.length} lessons, about 12 to 15 minutes each`,
      },
    },
    modules,
    concepts,
    lessons,
    activities: [],
    questions: [],
    flashcards: [],
    essays: [],
    sources,
  };
  const directory = path.join(CONTENT, courseId);
  if (extend) {
    const existing = read(path.join(directory, "bundle.json"));
    const merge = (current, added) => [
      ...current,
      ...added.filter((item) => !current.some((kept) => kept.id === item.id)),
    ];
    existing.modules = merge(existing.modules, modules).map((module) => ({
      ...module,
      conceptIds: [
        ...new Set([
          ...module.conceptIds,
          ...concepts.filter((concept) => concept.moduleId === module.id).map((c) => c.id),
        ]),
      ],
    }));
    existing.concepts = merge(existing.concepts, concepts);
    existing.sources = merge(existing.sources, sources);
    existing.course.moduleIds = existing.modules.map((module) => module.id);
    existing.course.sourceIds = existing.sources.map((source) => source.id);
    existing.lessons = lessons.map(
      (stub) => existing.lessons.find((lesson) => lesson.id === stub.id) ?? stub,
    );
    writeFileSync(path.join(directory, "bundle.json"), `${JSON.stringify(existing, null, 2)}\n`);
    const added = existing.lessons.filter((lesson) => lesson.steps.length === 0).length;
    console.log(`Extended ${courseId}: ${added} new lesson stubs, ${existing.lessons.length} lessons in all`);
    return;
  }
  if (existsSync(path.join(directory, "bundle.json")))
    throw new Error(`content/${courseId}/bundle.json already exists.`);
  mkdirSync(path.join(directory, "assets"), { recursive: true });
  writeFileSync(path.join(directory, "bundle.json"), `${JSON.stringify(bundle, null, 2)}\n`);
  const renamed = [
    ...lessons.filter((l, i) => l.id !== curriculum.lessons[i].id).map((l) => `lesson ${l.id}`),
    ...concepts.filter((c) => c.id.startsWith(`${prefix}-`)).map((c) => `concept ${c.id}`),
  ];
  console.log(
    `Scaffolded ${courseId}: ${lessons.length} lessons, ${concepts.length} concepts, ${sources.length} sources; id prefix '${prefix}'${renamed.length ? `; prefixed ${renamed.length}: ${renamed.join(", ")}` : ""}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const extend = process.argv.includes("--extend");
  const ids = process.argv.slice(2).filter((arg) => arg !== "--extend");
  if (!ids.length) {
    console.error("Usage: node scripts/scaffold-course.mjs [--extend] <course-id> [<course-id> …]");
    process.exit(1);
  }
  for (const id of ids) scaffold(id, extend);
}
