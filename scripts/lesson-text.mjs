#!/usr/bin/env node
/**
 * Prints a course's prose as a learner meets it, so it can be read and judged without the JSON:
 *   node scripts/lesson-text.mjs <course-id>              the course introduction
 *   node scripts/lesson-text.mjs <course-id> <lesson-id>  one lesson, screen by screen
 * Each screen shows its kind, id, headline, lead and after-figure text, and the question it asks
 * with its type and answer, so a lead that repeats its question is easy to see.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const [courseId, lessonId] = process.argv.slice(2);
if (!courseId) {
  console.error("Usage: node scripts/lesson-text.mjs <course-id> [<lesson-id>]");
  process.exit(1);
}
const bundle = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, "..", "content", courseId, "bundle.json"),
    "utf8",
  ),
);
const text = (blocks = []) =>
  blocks.map((block) => block.text ?? (block.latex ? `$${block.latex}$` : "")).join("\n\n");
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
function question(id) {
  const q = questions.get(id);
  if (!q) return `  [missing question ${id}]`;
  const authority = q.answerAuthority;
  const type = q.code ? "code" : q.choices ? "choice" : q.responseType;
  const answer =
    authority.kind === "numeric"
      ? `${authority.value} ${authority.unit}`.trim()
      : authority.acceptedIdeas.join(" | ");
  const choices = q.choices ? `\n  choices: ${q.choices.map((c) => `${c.id}) ${c.label}`).join("  ")}` : "";
  return `  QUESTION ${q.id} [${type}]\n  ${q.prompt}${choices}\n  answer: ${answer}`;
}

if (!lessonId) {
  const intro = bundle.course.introduction;
  console.log(`# ${bundle.course.title}\n\n${bundle.course.description}\n`);
  console.log((intro?.paragraphs ?? []).join("\n\n"));
  console.log(`\nYou'll be able to:\n${(intro?.outcomes ?? []).map((o) => `- ${o}`).join("\n")}`);
  console.log(`\n${intro?.prerequisites ?? ""}\n${intro?.length ?? ""}`);
  console.log(`\nLessons:\n${bundle.lessons.map((l) => `- ${l.id}: ${l.title}`).join("\n")}`);
  process.exit(0);
}
const lesson = bundle.lessons.find((item) => item.id === lessonId);
if (!lesson) throw new Error(`No lesson ${lessonId} in ${courseId}`);
console.log(`# ${lesson.title}\n`);
if (lesson.intro) {
  console.log(`## Opener${lesson.intro.hook.diagram ? " (with figure)" : ""}\n${text(lesson.intro.hook.blocks)}`);
  if (lesson.intro.hook.questionId) console.log(question(lesson.intro.hook.questionId));
  console.log(`\nPromise: ${lesson.intro.promise}`);
  if (lesson.intro.whyItMatters) console.log(`Why it matters: ${lesson.intro.whyItMatters}`);
}
for (const step of lesson.steps) {
  console.log(`\n## ${step.kind} ${step.id}${step.diagram ? ` (figure: ${step.diagram.type})` : ""}`);
  if (step.headline) console.log(`Headline: ${step.headline}`);
  if (step.lead?.length) console.log(text(step.lead));
  if (step.afterFigure?.length) console.log(`[after figure]\n${text(step.afterFigure)}`);
  for (const line of step.workedSteps ?? []) {
    console.log(`  - ${line.text}${line.math ? `  ${line.math}` : ""}`);
    if (line.blank) console.log(question(line.blank.questionId));
    if (line.selfExplain) console.log(question(line.selfExplain.questionId));
  }
  if (step.checkQuestionId) console.log(question(step.checkQuestionId));
}
console.log("\n## Skill check");
for (const id of lesson.questionIds) console.log(question(id));
if (lesson.recap) console.log(`\n## Recap\n${lesson.recap.keyIdea}\n${text(lesson.recap.blocks)}`);
