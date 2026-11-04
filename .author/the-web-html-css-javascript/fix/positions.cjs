// Moves the correct option of questions this pass wrote into a chosen slot, so the answers
// do not cluster. Only questions turned into choices here are listed; no earlier choice is touched.
const L = require("./lib.cjs");
const b = L.load();
const P = "webhcj-";
const target = {
  "what-the-browser-receives-count-p": 3,
  "structure-and-meaning-transfer-tab": 0,
  "the-box-and-the-flow-predict-border-box": 0,
  "layout-with-flexbox-and-grid-predict-grow": 0,
  "values-types-and-coercion-plus-and-minus": 3,
  "values-types-and-coercion-typeof-null": 0,
  "objects-arrays-and-references-predict-sort": 0,
  "the-dom-and-events-predict-bubble": 0,
  "talking-to-servers-predict-stringify": 3,
};
const letters = ["a", "b", "c", "d"];
for (const [short, to] of Object.entries(target)) {
  const q = L.question(b, P + short);
  const label = q.answerAuthority.acceptedIdeas[0];
  const from = q.choices.findIndex((c) => c.label === label);
  if (from < 0) throw new Error("no correct option: " + short);
  if (from === to) continue;
  const labels = q.choices.map((c) => c.label);
  const feedbackByOld = new Map();
  for (const m of q.misconceptions) for (const id of m.match.choiceIds || []) feedbackByOld.set(id, m.feedback);
  [labels[from], labels[to]] = [labels[to], labels[from]];
  const oldChoices = q.choices;
  const oldIdAt = (label0) => oldChoices.find((c) => c.label === label0).id;
  q.choices = labels.map((l, i) => ({ id: letters[i], label: l }));
  q.misconceptions = labels
    .map((l, i) => (i === (to) ? null : { match: { choiceIds: [letters[i]] }, feedback: feedbackByOld.get(oldIdAt(l)) }))
    .filter(Boolean);
  // the option that moved out of slot `to` now sits at `from`; the loop above already mapped it by label
}
L.save(b);
