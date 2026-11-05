#!/usr/bin/env node
/**
 * Writes each course as plain text, screen by screen, in the order a learner meets it:
 *   node scripts/course-map.mjs [<course-id> …]      default: every course
 * Output goes to .author/_map/<course>.txt, plus .author/_map/index.txt with sizes. Each screen
 * shows its kind, headline, text, worked lines, figure title, and the question with its options and
 * answer, so a whole course can be read and judged in one sitting.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, ".author", "_map");
mkdirSync(out, { recursive: true });

const text = (blocks = []) =>
  blocks.map((block) => block.text ?? (block.latex ? `$${block.latex}$` : "")).join("\n");
const words = (value) => value.split(/\s+/).filter(Boolean).length;

function courseMap(courseId) {
  const bundle = JSON.parse(
    readFileSync(path.join(root, "content", courseId, "bundle.json"), "utf8"),
  );
  const questions = new Map(bundle.questions.map((q) => [q.id, q]));
  const lines = [];
  const ask = (id, label = "Q") => {
    const q = questions.get(id);
    if (!q) return;
    const a = q.answerAuthority;
    const answer =
      a.kind === "numeric" ? `${a.value} ${a.unit ?? ""}`.trim() : (a.acceptedIdeas ?? [])[0];
    lines.push(`${label}: ${q.prompt}`);
    for (const choice of q.choices ?? [])
      lines.push(`   ${choice.label === answer ? "*" : "-"} ${choice.label}`);
    if (!q.choices) lines.push(`   = ${answer}`);
  };
  const figure = (diagram, hidden) => {
    if (!diagram) return;
    const name = diagram.title ?? diagram.alt ?? diagram.caption ?? diagram.type;
    lines.push(`[figure${hidden ? ", shown after answering" : ""}: ${String(name).slice(0, 160)}]`);
  };
  const intro = bundle.course.introduction;
  lines.push(`COURSE ${bundle.course.title} (${courseId})`, "", ...(intro?.paragraphs ?? []), "");
  bundle.lessons.forEach((lesson, n) => {
    lines.push("", `=== LESSON ${n + 1}: ${lesson.title} (${lesson.id})`);
    if (lesson.intro) {
      lines.push("", "-- opener", text(lesson.intro.hook.blocks));
      figure(lesson.intro.hook.diagram);
      if (lesson.intro.hook.questionId) ask(lesson.intro.hook.questionId);
    }
    for (const step of lesson.steps ?? []) {
      lines.push("", `-- ${step.kind} (${step.id})${step.headline ? `: ${step.headline}` : ""}`);
      const lead = text(step.lead ?? step.blocks);
      if (lead) lines.push(lead);
      figure(step.diagram, step.answerVisibility === "hidden-until-response");
      if (step.afterFigure?.length) lines.push(text(step.afterFigure));
      for (const line of step.workedSteps ?? []) {
        lines.push(`  > ${line.text ?? ""}${line.math ? `   [${line.math}]` : ""}`);
        if (line.blank) ask(line.blank.questionId, "  blank");
        if (line.selfExplain) ask(line.selfExplain.questionId, "  why");
      }
      if (step.checkQuestionId) ask(step.checkQuestionId);
    }
    lines.push("", "-- skill check");
    for (const id of lesson.questionIds ?? []) ask(id);
    if (lesson.recap)
      lines.push("", `-- recap: ${lesson.recap.keyIdea}`, text(lesson.recap.blocks));
  });
  return `${lines.join("\n")}\n`;
}

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(path.join(root, "content")).filter((c) =>
      existsSync(path.join(root, "content", c, "bundle.json")),
    );
const index = [];
for (const courseId of ids) {
  const map = courseMap(courseId);
  writeFileSync(path.join(out, `${courseId}.txt`), map);
  index.push(`${String(words(map)).padStart(7)} words  ${courseId}`);
}
writeFileSync(path.join(out, "index.txt"), `${index.join("\n")}\n`);
console.log(index.join("\n"));
