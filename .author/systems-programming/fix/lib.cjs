// Helpers for the fix pass: load the bundle, edit fields, write it back.
const fs = require("node:fs");
const path = require("node:path");
const file = path.resolve(__dirname, "../../../content/systems-programming/bundle.json");

exports.load = () => {
  const bundle = JSON.parse(fs.readFileSync(file, "utf8"));
  const lesson = (id) => {
    const l = bundle.lessons.find((x) => x.id === id);
    if (!l) throw new Error(`no lesson ${id}`);
    return l;
  };
  const step = (lessonId, stepId) => {
    const s = lesson(lessonId).steps.find((x) => x.id === stepId);
    if (!s) throw new Error(`no step ${lessonId}/${stepId}`);
    return s;
  };
  const question = (id) => {
    const q = bundle.questions.find((x) => x.id === id);
    if (!q) throw new Error(`no question ${id}`);
    return q;
  };
  const para = (text) => ({ kind: "paragraph", text });
  const setOpener = (lessonId, ...texts) => {
    lesson(lessonId).intro.hook.blocks = texts.map(para);
  };
  const setLead = (lessonId, stepId, ...texts) => {
    step(lessonId, stepId).lead = texts.map(para);
  };
  // Turn (or replace) a question with a choice question. options: [{label, why}] in display
  // order; correct: index of the right option; why is the fact and reason for a wrong option.
  const toChoice = (id, { prompt, options, correct, hints, onCorrect }) => {
    const q = question(id);
    if (options.length < 3 || options.length > 4) throw new Error(`${id}: need 3 or 4 options`);
    const ids = ["a", "b", "c", "d"];
    q.prompt = prompt;
    q.responseType = "short_text";
    q.hints = hints;
    q.onCorrect = onCorrect;
    q.choices = options.map((o, i) => ({ id: ids[i], label: o.label }));
    q.answerAuthority = {
      kind: "text",
      acceptedIdeas: [options[correct].label],
      rejectedIdeas: [],
      exampleAnswer: options[correct].label,
    };
    q.misconceptions = options
      .map((o, i) => ({ o, i }))
      .filter(({ i }) => i !== correct)
      .map(({ o, i }) => {
        if (!o.why) throw new Error(`${id}: option ${ids[i]} needs a reason`);
        return { match: { choiceIds: [ids[i]] }, feedback: o.why };
      });
    return q;
  };
  // A new choice question that replaces an old one on a step. The old question stays in the bundle.
  const replaceWithChoice = (lessonId, stepId, newId, spec) => {
    const s = step(lessonId, stepId);
    if (s.checkQuestionId === newId) return toChoice(newId, spec); // already replaced: rerun
    const base = question(s.checkQuestionId);
    if (!bundle.questions.some((q) => q.id === newId)) {
      const copy = JSON.parse(JSON.stringify(base));
      copy.id = newId;
      bundle.questions.splice(bundle.questions.indexOf(base) + 1, 0, copy);
    }
    toChoice(newId, spec);
    s.checkQuestionId = newId;
  };
  const save = () => fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + "\n");
  return { bundle, lesson, step, question, para, setOpener, setLead, toChoice, replaceWithChoice, save };
};
