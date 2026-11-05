/**
 * Lets an agent take a course as a learner does, through the app's own learner-safe API:
 *   npx tsx scripts/learner-run.ts <course>                    the course introduction and lessons
 *   npx tsx scripts/learner-run.ts <course> <lesson>           one lesson, screen by screen, no keys
 *   npx tsx scripts/learner-run.ts answer <course> <question> <response>
 *                                                              marks one answer and prints the reply
 * Each run starts the server in memory with its own database, so several agents can run it at
 * once. Choices are lettered A, B, C… in the order the app shows them; answer with the letter.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createApp } from "../apps/server/src/app.js";

type Block = { text?: string; latex?: string; type?: string };
type Choice = { id: string; label: string };
type Question = {
  id: string;
  prompt: string;
  responseType: string;
  choices?: Choice[];
  expectedUnit?: string;
  calculator?: string;
  hintCount?: number;
};
type Diagram = Record<string, unknown> & { type: string };

const root = path.resolve(import.meta.dirname, "..");
const LETTERS = "ABCDEFGH";

function text(blocks: Block[] = []): string {
  return blocks.map((block) => block.text ?? (block.latex ? `$${block.latex}$` : "")).join("\n\n");
}

/** What a figure says, as far as words can carry it: its title, alt text and the text drawn in it. */
function figure(diagram: Diagram | undefined): string {
  if (!diagram) return "";
  const parts = [`[figure: ${diagram.type}]`];
  const describe = (item: Record<string, unknown>, label = "") => {
    for (const key of ["title", "alt", "caption", "description"])
      if (typeof item[key] === "string") parts.push(`  ${label}${key}: ${item[key]}`);
    if (typeof item.svg === "string") {
      const words = item.svg
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (words) parts.push(`  ${label}text in the drawing: ${words}`);
    }
  };
  describe(diagram);
  if (Array.isArray(diagram.cases))
    diagram.cases.forEach((item, index) =>
      describe(item as Record<string, unknown>, `case ${index + 1} `),
    );
  if (parts.length === 1) parts.push(`  ${JSON.stringify(diagram).slice(0, 600)}`);
  return parts.join("\n");
}

function question(q: Question | undefined): string {
  if (!q) return "";
  const lines = [`  QUESTION ${q.id}`, `  ${q.prompt}`];
  if (q.choices?.length)
    q.choices.forEach((choice, index) => lines.push(`    ${LETTERS[index]}) ${choice.label}`));
  else if (q.responseType === "numeric")
    lines.push(`  (type a number${q.expectedUnit ? `, unit ${q.expectedUnit}` : ""})`);
  else lines.push("  (type a short answer)");
  if (q.calculator === "available") lines.push("  (calculator allowed)");
  return lines.join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const { app } = await createApp({
    dbPath: ":memory:",
    migrate: true,
    revealDelayMs: 0,
    tutor: { providerId: "companion" },
  });
  try {
    if (args[0] === "answer") {
      const [, courseId, questionId, ...rest] = args;
      let response = rest.join(" ").trim();
      const bundle = JSON.parse(
        readFileSync(path.join(root, "content", courseId!, "bundle.json"), "utf8"),
      );
      const found = bundle.questions.find((item: Question) => item.id === questionId);
      if (!found) throw new Error(`No question ${questionId} in ${courseId}`);
      // The app sends the label of the chosen option; a learner here picks it by letter.
      if (found.choices?.length && /^[A-H]$/i.test(response))
        response = found.choices[LETTERS.indexOf(response.toUpperCase())]?.label ?? response;
      const result = await app.inject({
        method: "POST",
        url: "/api/attempts",
        payload: { questionId, response, mode: "coach" },
      });
      const body = result.json();
      console.log(body.correct ? "CORRECT" : "NOT CORRECT");
      for (const key of ["feedback", "onCorrect", "message", "explanation", "workedAnswer"])
        if (typeof body[key] === "string" && body[key]) console.log(`${key}: ${body[key]}`);
      if (result.statusCode !== 200) console.log(`(status ${result.statusCode}) ${result.body}`);
      return;
    }
    const [courseId, lessonId] = args;
    if (!courseId) throw new Error("Usage: learner-run.ts <course> [<lesson>] | answer <course> <question> <response>");
    const bundle = JSON.parse(
      readFileSync(path.join(root, "content", courseId, "bundle.json"), "utf8"),
    );
    if (!lessonId) {
      const intro = bundle.course.introduction;
      console.log(`# ${bundle.course.title}\n\n${(intro?.paragraphs ?? []).join("\n\n")}`);
      console.log(`\nAudience: ${bundle.course.audience}`);
      console.log(`\nLessons:\n${bundle.lessons.map((l: { id: string; title: string }) => `- ${l.id}: ${l.title}`).join("\n")}`);
      return;
    }
    const result = await app.inject({
      method: "GET",
      url: `/api/courses/${courseId}/lessons/${lessonId}/journey`,
    });
    if (result.statusCode !== 200) throw new Error(`journey ${result.statusCode}: ${result.body}`);
    for (const stage of result.json().stages) {
      if (stage.intro) {
        console.log(`# ${stage.title}\n\n## Opener\n${text(stage.intro.hook.blocks)}`);
        const hookFigure = figure(stage.intro.hook.diagram);
        if (hookFigure) console.log(hookFigure);
        if (stage.intro.hook.question) console.log(question(stage.intro.hook.question));
        console.log(`\nBy the end: ${stage.intro.promise}`);
      }
      for (const step of stage.steps ?? []) {
        console.log(`\n## Screen ${step.id} (${step.kind})`);
        if (step.headline) console.log(step.headline);
        const lead = text(step.lead ?? step.blocks);
        if (lead) console.log(lead);
        const stepFigure = figure(step.diagram);
        if (stepFigure)
          console.log(
            step.answerVisibility === "hidden-until-response"
              ? `${stepFigure}\n  (shown only after you answer)`
              : stepFigure,
          );
        if (step.afterFigure?.length) console.log(text(step.afterFigure));
        for (const line of step.workedSteps ?? []) {
          console.log(`  - ${line.text ?? ""}${line.math ? `  ${line.math}` : ""}`);
          // A blank or a self-explanation arrives as the question itself.
          for (const asked of [line.blank, line.selfExplain])
            if (asked?.prompt) console.log(question(asked.question ?? asked));
        }
        if (step.question) console.log(question(step.question));
      }
      if (stage.type === "quiz" && stage.question)
        console.log(`\n## ${stage.title} ${stage.questionIndex}/${stage.questionCount}\n${question(stage.question)}`);
      if (stage.type === "recap")
        console.log(`\n## Recap\n${stage.keyIdea ?? ""}\n${text(stage.blocks)}`);
    }
  } finally {
    await app.close();
  }
}

await main();
