/**
 * Validates one course after a voice rewrite: `npx tsx scripts/voice-check.ts <course-id>`.
 * Prints every error, and exits non-zero if there is one.
 *
 * A course still being written from its curriculum has stub lessons with no steps. Those are
 * left out, so the check covers every lesson written so far and says how many remain.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { validateCourseBundle } from "../packages/curriculum/src/index.js";

const course = process.argv[2];
if (!course) throw new Error("Usage: npx tsx scripts/voice-check.ts <course-id>");
const bundle = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, "..", "content", course, "bundle.json"), "utf8"),
);
const stubs = bundle.lessons.filter((lesson: { steps: unknown[] }) => lesson.steps.length === 0);
bundle.lessons = bundle.lessons.filter((lesson: { steps: unknown[] }) => lesson.steps.length > 0);
const errors = validateCourseBundle(bundle).issues.filter((issue) => issue.severity === "error");
// The voice skill: an opener starts from the subject and never lists what the lesson will cover.
const ANNOUNCES = /\b(?:this|the rest of this|the second half of this) lesson\b/iu;
for (const lesson of bundle.lessons as Array<{ id: string; intro?: { hook: { blocks: Array<{ text?: string }> } } }>) {
  for (const block of lesson.intro?.hook.blocks ?? [])
    for (const sentence of (block.text ?? "").match(/[^.?!]+[.?!]?/gu) ?? [])
      if (ANNOUNCES.test(sentence))
        errors.push({
          code: "OPENER_ANNOUNCES_LESSON",
          path: `lessons.${lesson.id}.intro.hook`,
          severity: "error",
          message: `The opener announces the lesson ("${sentence.trim().slice(0, 80)}…"). End it on the subject or the question instead.`,
        });
}
// A question screen's lead sets up what the question cannot, in a sentence or two; it never
// retells the question. Measured on the question's longer words, which carry its content.
const contentWords = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .replace(/\[\[([^|\]]+)\|[^\]]+\]\]/gu, "$1")
      .match(/[a-z0-9_]{4,}/gu) ?? [],
  );
const questions = new Map(
  (bundle.questions as Array<{ id: string; prompt: string }>).map((q) => [q.id, q]),
);
type Block = { text?: string };
for (const lesson of bundle.lessons as Array<{
  id: string;
  steps: Array<{ id: string; checkQuestionId?: string; lead?: Block[] }>;
}>)
  for (const step of lesson.steps) {
    const lead = (step.lead ?? []).map((block) => block.text ?? "").join(" ");
    const at = `lessons.${lesson.id}.steps.${step.id}`;
    if (/\b(before (you )?read(ing)? on|before you (go|move) on|before reading further)\b/iu.test(lead))
      errors.push({
        code: "FILLER_INSTRUCTION",
        path: at,
        severity: "error",
        message: "The lead tells the learner to answer before reading on; the question already asks.",
      });
    const question = step.checkQuestionId ? questions.get(step.checkQuestionId) : undefined;
    if (!question || !lead) continue;
    const prompt = contentWords(question.prompt);
    if (prompt.size < 6) continue;
    const shared = [...prompt].filter((word) => contentWords(lead).has(word)).length;
    if (shared / prompt.size >= 0.5)
      errors.push({
        code: "LEAD_REPEATS_QUESTION",
        path: at,
        severity: "error",
        message: `The lead repeats ${Math.round((100 * shared) / prompt.size)}% of the question's words. Put the setup in one place: the question, with the lead cut or reduced to what the question does not say.`,
      });
  }
// A course introduction says what the subject is and why it is worth learning. The order of the
// lessons is shown by the course page itself.
const SYLLABUS =
  /\b(the (first|middle|later|last|final|next|opening|closing) (lessons?|modules?|parts?|half)|you (begin|start|finish|end) (with|by)|the course (begins|starts|ends|closes|moves|turns|follows)|lessons? \d+ (to|and) \d+)\b/iu;
for (const [index, paragraph] of (
  (bundle.course.introduction?.paragraphs ?? []) as string[]
).entries())
  if (SYLLABUS.test(paragraph))
    errors.push({
      code: "INTRODUCTION_IS_A_SYLLABUS",
      path: `course.introduction.paragraphs.${index}`,
      severity: "error",
      message: `The paragraph walks through the course ("${paragraph.match(SYLLABUS)?.[0]}…"). Introduce the subject instead: what it is, why it matters, what it lets you do.`,
    });
for (const issue of errors) console.log(`${issue.code} ${issue.path}: ${issue.message}`);
console.log(
  `${course}: ${errors.length} error(s)${stubs.length ? `; ${stubs.length} lesson(s) not written yet` : ""}`,
);
process.exit(errors.length ? 1 : 0);
