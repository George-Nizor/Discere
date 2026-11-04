const fs = require("node:fs");
const path = require("node:path");
const file = path.resolve(__dirname, "../../../content/backend-and-api-design/bundle.json");
exports.load = () => JSON.parse(fs.readFileSync(file, "utf8"));
exports.save = (b) => fs.writeFileSync(file, JSON.stringify(b, null, 2) + "\n");
exports.lesson = (b, id) => b.lessons.find((l) => l.id === id);
exports.step = (b, lid, sid) => {
  const s = exports.lesson(b, lid).steps.find((x) => x.id === sid);
  if (!s) throw new Error(`no step ${lid}/${sid}`);
  return s;
};
exports.q = (b, id) => {
  const q = b.questions.find((x) => x.id === id);
  if (!q) throw new Error(`no question ${id}`);
  return q;
};
exports.paras = (...texts) => texts.map((text) => ({ kind: "paragraph", text }));
exports.setOpener = (b, lid, ...texts) => {
  exports.lesson(b, lid).intro.hook.blocks = exports.paras(...texts);
};
exports.cutLead = (b, lid, sid, ...texts) => {
  exports.step(b, lid, sid).lead = exports.paras(...texts);
};
// Make a choice question from scratch fields (keeps the id when given).
exports.makeChoice = (b, spec) => {
  const base = spec.id && b.questions.find((x) => x.id === spec.id);
  const correct = spec.choices.find((c) => c.correct);
  const q = {
    id: spec.id,
    conceptIds: spec.conceptIds ?? base?.conceptIds,
    prompt: spec.prompt,
    difficulty: spec.difficulty ?? base?.difficulty ?? 1,
    hints: spec.hints,
    sourceIds: spec.sourceIds ?? base?.sourceIds,
    onCorrect: spec.onCorrect,
    skill: spec.skill ?? base?.skill,
    calculator: "off",
    responseType: "short_text",
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [correct.label],
      rejectedIdeas: [],
      exampleAnswer: correct.label,
    },
    misconceptions: spec.choices
      .filter((c) => !c.correct)
      .map((c) => ({ match: { choiceIds: [c.id] }, feedback: c.why })),
    choices: spec.choices.map((c) => ({ id: c.id, label: c.label })),
  };
  const i = b.questions.findIndex((x) => x.id === spec.id);
  if (i >= 0) b.questions[i] = q;
  else b.questions.push(q);
  return q;
};
