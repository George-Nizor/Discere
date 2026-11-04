// Helpers for the fix pass. Loads the bundle, edits it in memory, and writes it back.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const COURSE = "game-design-and-programming-patterns";
const file = path.resolve(import.meta.dirname, "..", "..", "..", "content", COURSE, "bundle.json");
export const bundle = JSON.parse(readFileSync(file, "utf8"));

export const lesson = (id) => {
  const l = bundle.lessons.find((x) => x.id === id);
  if (!l) throw new Error(`No lesson ${id}`);
  return l;
};
export const step = (lessonId, stepId) => {
  const s = lesson(lessonId).steps.find((x) => x.id === stepId);
  if (!s) throw new Error(`No step ${lessonId}/${stepId}`);
  return s;
};
export const question = (id) => {
  const q = bundle.questions.find((x) => x.id === id);
  if (!q) throw new Error(`No question ${id}`);
  return q;
};
const paragraphs = (texts) => texts.map((text) => ({ kind: "paragraph", text }));

export function setOpener(lessonId, texts) {
  lesson(lessonId).intro.hook.blocks = paragraphs(texts);
}
export function setLead(lessonId, stepId, texts) {
  step(lessonId, stepId).lead = paragraphs(texts);
}
export function setPrompt(qid, prompt) {
  question(qid).prompt = prompt;
}

/**
 * Turns a question into a choice question, keeping its id.
 * options: [{ label, why }] in display order; `why` is the reply to a learner who picks it (the
 * correct option's `why` is ignored). correct: index of the right option.
 */
export function toChoice(qid, { prompt, options, correct, onCorrect, hints, keep = [] }) {
  const q = question(qid);
  const ids = ["a", "b", "c", "d"];
  if (options.length < 3 || options.length > 4) throw new Error("3 or 4 options");
  q.prompt = prompt;
  q.responseType = "short_text";
  q.choices = options.map((o, i) => ({ id: ids[i], label: o.label }));
  q.answerAuthority = {
    kind: "text",
    acceptedIdeas: [options[correct].label],
    rejectedIdeas: [],
    exampleAnswer: options[correct].label,
  };
  q.misconceptions = options
    .map((o, i) => ({ match: { choiceIds: [ids[i]] }, feedback: o.why }))
    .filter((_, i) => i !== correct);
  q.onCorrect = onCorrect;
  q.hints = hints;
  q.calculator = "off";
  for (const key of ["transfer"]) delete q[key];
}

export function save() {
  writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
}
