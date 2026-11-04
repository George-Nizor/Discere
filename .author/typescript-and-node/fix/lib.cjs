const fs = require("fs");
const path = require("path");
const file = path.resolve(__dirname, "../../../content/typescript-and-node/bundle.json");
const load = () => JSON.parse(fs.readFileSync(file, "utf8"));
const save = (b) => fs.writeFileSync(file, JSON.stringify(b, null, 2) + "\n");
const para = (text) => ({ kind: "paragraph", text });
function lesson(b, id) {
  const l = b.lessons.find((x) => x.id === id);
  if (!l) throw new Error("no lesson " + id);
  return l;
}
function step(b, lessonId, stepId) {
  const s = lesson(b, lessonId).steps.find((x) => x.id === stepId);
  if (!s) throw new Error(`no step ${lessonId}/${stepId}`);
  return s;
}
function question(b, id) {
  const q = b.questions.find((x) => x.id === id);
  if (!q) throw new Error("no question " + id);
  return q;
}
function setHook(b, lessonId, paragraphs) {
  const hook = lesson(b, lessonId).intro.hook;
  hook.blocks = paragraphs.map(para);
}
function clearLead(b, lessonId, stepId) {
  step(b, lessonId, stepId).lead = [];
}
function setLead(b, lessonId, stepId, paragraphs) {
  step(b, lessonId, stepId).lead = paragraphs.map(para);
}
// Turn a question into a 4-option (or 3-option) choice question. correctIndex is 0-based position of the correct option.
function toChoice(b, id, { prompt, options, correct, misconceptions, onCorrect, hints, keepId = true }) {
  const q = question(b, id);
  const letters = ["a", "b", "c", "d"];
  q.prompt = prompt;
  q.responseType = "short_text";
  q.choices = options.map((label, i) => ({ id: letters[i], label }));
  q.answerAuthority = {
    kind: "text",
    acceptedIdeas: [options[correct]],
    rejectedIdeas: [],
    exampleAnswer: options[correct],
  };
  q.misconceptions = options
    .map((_, i) => i)
    .filter((i) => i !== correct)
    .map((i) => ({ match: { choiceIds: [letters[i]] }, feedback: misconceptions[i] }));
  if (onCorrect) q.onCorrect = onCorrect;
  if (hints) q.hints = hints;
  delete q.transfer;
}
module.exports = { load, save, para, lesson, step, question, setHook, clearLead, setLead, toChoice };
