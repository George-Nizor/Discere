// Shared helpers for the fix pass on the-web-html-css-javascript.
const fs = require("node:fs");
const path = require("node:path");
const FILE = path.resolve(__dirname, "../../../content/the-web-html-css-javascript/bundle.json");

function load() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}
function save(bundle) {
  fs.writeFileSync(FILE, JSON.stringify(bundle, null, 2) + "\n");
}
const para = (text) => ({ kind: "paragraph", text });

function lesson(bundle, id) {
  const l = bundle.lessons.find((x) => x.id === id);
  if (!l) throw new Error("no lesson " + id);
  return l;
}
function step(bundle, lessonId, stepId) {
  const s = lesson(bundle, lessonId).steps.find((x) => x.id === stepId);
  if (!s) throw new Error(`no step ${lessonId}/${stepId}`);
  return s;
}
function question(bundle, id) {
  const q = bundle.questions.find((x) => x.id === id);
  if (!q) throw new Error("no question " + id);
  return q;
}
function setOpener(bundle, lessonId, paragraphs) {
  lesson(bundle, lessonId).intro.hook.blocks = paragraphs.map(para);
}
function cutLead(bundle, lessonId, stepId) {
  const s = step(bundle, lessonId, stepId);
  if (!s.checkQuestionId) throw new Error(`step ${stepId} has no question`);
  s.lead = [];
}
function setLead(bundle, lessonId, stepId, paragraphs) {
  const s = step(bundle, lessonId, stepId);
  if (!s.checkQuestionId) throw new Error(`step ${stepId} has no question`);
  s.lead = paragraphs.map(para);
}

/**
 * Turns (or replaces) a question with a choice question. `options` is an array of
 * { label, why } in display order; exactly one has `correct: true` (its `why` is ignored).
 * The existing id, concepts, sources, skill and difficulty are kept unless overridden.
 */
function makeChoice(bundle, id, spec) {
  const q = question(bundle, id);
  const ids = ["a", "b", "c", "d"];
  if (spec.options.length < 3 || spec.options.length > 4) throw new Error("3 or 4 options: " + id);
  const correct = spec.options.filter((o) => o.correct);
  if (correct.length !== 1) throw new Error("exactly one correct: " + id);
  for (const o of spec.options) if (!o.correct && !o.why) throw new Error("missing why: " + id);
  q.prompt = spec.prompt;
  q.responseType = "short_text";
  q.hints = spec.hints;
  q.onCorrect = spec.onCorrect;
  if (spec.difficulty !== undefined) q.difficulty = spec.difficulty;
  q.choices = spec.options.map((o, i) => ({ id: ids[i], label: o.label }));
  q.misconceptions = spec.options
    .map((o, i) => (o.correct ? null : { match: { choiceIds: [ids[i]] }, feedback: o.why }))
    .filter(Boolean);
  q.answerAuthority = {
    kind: "text",
    acceptedIdeas: [correct[0].label],
    rejectedIdeas: [],
    exampleAnswer: spec.exampleAnswer || correct[0].label,
  };
  // keep key order tidy: choices last
  const { choices, ...rest } = q;
  for (const k of Object.keys(q)) delete q[k];
  Object.assign(q, rest, { choices });
  return q;
}
module.exports = { load, save, para, lesson, step, question, setOpener, cutLead, setLead, makeChoice };
