#!/usr/bin/env node
/**
 * Rewrites a course's learner prose to the discere-lesson-voice skill without touching anything
 * else in its bundle.
 *
 *   node scripts/voice-rewrite.mjs extract <course-id>   writes .rewrite/<course-id>/*.json
 *   node scripts/voice-rewrite.mjs apply <course-id>     merges the edited files back
 *
 * Each extracted file holds read-only `context` (step kinds, question prompts, choices and keys,
 * so feedback can be written accurately) and an editable `fields` map of path -> text. Apply
 * refuses a field whose original text has changed in the bundle, whose `$…$` maths or numbers
 * were dropped, or that is empty, and keeps the original for that field. It strips emphasis
 * marks from fields that render as plain text.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** Primary voice per course, from .claude/skills/discere-lesson-voice/SKILL.md. */
export const PRIMARY_VOICE = {
  "maths-foundations": "A",
  "calculus-change-and-accumulation": "A",
  "geometry-shape-and-space": "A",
  "linear-algebra-vectors-and-maps": "A",
  "probability-statistics": "A",
  "physics-motion-and-forces": "A",
  "chemistry-atoms-to-reactions": "A",
  "engineering-structures-and-machines": "A",
  "electronics-foundations": "A",
  "astronomy-sky-to-cosmos": "A",
  "biology-cells-to-ecosystems": "A",
  "cs-basics": "A",
  "python-for-data-analysis": "A",
  "sql-from-rows-to-reports": "A",
  "rust-foundations": "A",
  "philosophy-knowledge-mind-and-ethics": "B",
  "logic-and-reasoning": "B",
  "english-reading-writing-and-rhetoric": "B",
  "psychology-how-minds-work": "B",
  "economics-markets-and-strategy": "B",
};

const hash = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);
const bundlePath = (course) => path.join(ROOT, "content", course, "bundle.json");
const workDir = (course) => path.join(ROOT, ".rewrite", course);

function get(object, pathText) {
  return pathText
    .split(".")
    .reduce((node, key) => (node == null ? undefined : node[/^\d+$/.test(key) ? Number(key) : key]), object);
}
function set(object, pathText, value) {
  const keys = pathText.split(".");
  const last = keys.pop();
  const parent = get(object, keys.join("."));
  parent[/^\d+$/.test(last) ? Number(last) : last] = value;
}

/** Fields rendered through InlineRichText may carry **bold** and *italic*; others may not. */
function proseFields(bundle, lessonIndex) {
  const lesson = bundle.lessons[lessonIndex];
  const base = `lessons.${lessonIndex}`;
  const fields = [];
  const blocks = (list, at, emphasis = true) =>
    (list ?? []).forEach((block, i) => {
      if (["paragraph", "callout", "definition"].includes(block.kind))
        fields.push({ path: `${at}.${i}.text`, emphasis });
    });
  blocks(lesson.intro?.hook?.blocks, `${base}.intro.hook.blocks`);
  if (lesson.intro?.promise) fields.push({ path: `${base}.intro.promise`, emphasis: false });
  if (lesson.intro?.whyItMatters) fields.push({ path: `${base}.intro.whyItMatters`, emphasis: false });
  lesson.steps.forEach((step, s) => {
    const at = `${base}.steps.${s}`;
    if (step.headline) fields.push({ path: `${at}.headline`, emphasis: true });
    blocks(step.lead, `${at}.lead`);
    blocks(step.afterFigure, `${at}.afterFigure`);
    blocks(step.reveal, `${at}.reveal`);
  });
  if (lesson.recap) {
    fields.push({ path: `${base}.recap.keyIdea`, emphasis: true });
    blocks(lesson.recap.blocks, `${base}.recap.blocks`);
    if (lesson.recap.nextHook) fields.push({ path: `${base}.recap.nextHook`, emphasis: true });
  }
  const questionIds = new Set([
    ...lesson.steps.map((step) => step.checkQuestionId).filter(Boolean),
    ...(lesson.intro?.hook?.questionId ? [lesson.intro.hook.questionId] : []),
  ]);
  bundle.questions.forEach((question, q) => {
    if (!questionIds.has(question.id)) return;
    if (question.onCorrect) fields.push({ path: `questions.${q}.onCorrect`, emphasis: false });
    (question.misconceptions ?? []).forEach((_m, m) =>
      fields.push({ path: `questions.${q}.misconceptions.${m}.feedback`, emphasis: false }),
    );
  });
  return { fields, questionIds };
}

function context(bundle, lessonIndex, questionIds) {
  const lesson = bundle.lessons[lessonIndex];
  const questions = bundle.questions
    .filter((question) => questionIds.has(question.id))
    .map((question) => ({
      id: question.id,
      prompt: question.prompt,
      choices: question.choices?.map((choice) => `${choice.id}: ${choice.label}`),
      answer: question.answerAuthority,
      misconceptionMatches: question.misconceptions?.map((m) => m.match),
    }));
  return {
    title: lesson.title,
    orientation: lesson.orientation,
    steps: lesson.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      question: step.checkQuestionId || undefined,
      workedSteps: step.workedSteps,
      hasFigure: Boolean(step.diagram || step.visualStateId),
    })),
    questions,
  };
}

function extract(course) {
  const bundle = JSON.parse(readFileSync(bundlePath(course), "utf8"));
  const voice = PRIMARY_VOICE[course] ?? "A";
  const dir = workDir(course);
  mkdirSync(dir, { recursive: true });
  const write = (name, payload) =>
    writeFileSync(path.join(dir, name), `${JSON.stringify(payload, null, 2)}\n`);
  const intro = bundle.course.introduction;
  if (intro) {
    const fields = {};
    intro.paragraphs.forEach((text, i) => {
      fields[`course.introduction.paragraphs.${i}`] = text;
    });
    write("00-course.json", {
      course,
      voice,
      note: "Course 'About this course' paragraphs, in the primary voice. No emphasis marks. The outcomes list is not included.",
      context: { title: bundle.course.title, outcomes: intro.outcomes },
      emphasisAllowed: [],
      originals: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, hash(v)])),
      fields,
    });
  }
  bundle.lessons.forEach((lesson, l) => {
    const { fields: list, questionIds } = proseFields(bundle, l);
    const fields = {};
    for (const field of list) fields[field.path] = get(bundle, field.path);
    write(`${String(l + 1).padStart(2, "0")}-${lesson.id}.json`, {
      course,
      lesson: lesson.id,
      voice,
      context: context(bundle, l, questionIds),
      emphasisAllowed: list.filter((field) => field.emphasis).map((field) => field.path),
      originals: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, hash(v)])),
      fields,
    });
  });
  console.log(`Extracted ${course} (voice ${voice}) to ${path.relative(ROOT, dir)}`);
}

const MATH = /\$[^$\n]+\$/g;
const NUMBER = /(?<![\p{L}])[−-]?\d+(?:[.,]\d+)*(?:\.\d+)?/gu;
const stripMarks = (text) =>
  text.replace(/\*\*([^*\n]+?)\*\*/g, "$1").replace(/(?<![\w*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![\w*])/g, "$1");

function apply(course) {
  const file = bundlePath(course);
  const bundle = JSON.parse(readFileSync(file, "utf8"));
  const dir = workDir(course);
  let changed = 0;
  const problems = [];
  for (const name of readdirSync(dir).filter((item) => item.endsWith(".json")).sort()) {
    const work = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
    const emphasis = new Set(work.emphasisAllowed ?? []);
    for (const [fieldPath, rawText] of Object.entries(work.fields)) {
      const original = get(bundle, fieldPath);
      if (typeof original !== "string" || hash(original) !== work.originals[fieldPath]) {
        problems.push(`${name} ${fieldPath}: the bundle changed since extraction; skipped`);
        continue;
      }
      if (typeof rawText !== "string" || !rawText.trim()) {
        problems.push(`${name} ${fieldPath}: empty; kept the original`);
        continue;
      }
      const text = emphasis.has(fieldPath) ? rawText.trim() : stripMarks(rawText.trim());
      const lostMath = (original.match(MATH) ?? []).filter((m) => !text.includes(m));
      const plain = stripMarks(text).replace(/,(?=\d{3})/g, "");
      const lostNumbers = [...new Set(stripMarks(original).replace(/,(?=\d{3})/g, "").match(NUMBER) ?? [])]
        .map((n) => n.replace("−", "-"))
        .filter((n) => !plain.replace(/−/g, "-").includes(n.replace(/^-/, "")));
      if (lostMath.length || lostNumbers.length) {
        problems.push(
          `${name} ${fieldPath}: dropped ${[...lostMath, ...lostNumbers].join(", ")}; kept the original`,
        );
        continue;
      }
      if (text !== original) {
        set(bundle, fieldPath, text);
        changed += 1;
      }
    }
  }
  writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`);
  console.log(`${course}: ${changed} fields rewritten, ${problems.length} kept or skipped`);
  for (const problem of problems) console.log(`  ${problem}`);
}

const [command, course] = process.argv.slice(2);
if (!course || !["extract", "apply"].includes(command)) {
  console.error("Usage: node scripts/voice-rewrite.mjs extract|apply <course-id>");
  process.exit(1);
}
(command === "extract" ? extract : apply)(course);
