// Spreads the position of the correct option across a to d for the questions rewritten in this pass.
const { load, save, question } = require("./lib.cjs");
const b = load();
const letters = ["a", "b", "c", "d"];
function moveCorrect(id, to) {
  const q = question(b, id);
  const labels = q.choices.map((c) => c.label);
  const from = labels.indexOf(q.answerAuthority.acceptedIdeas[0]);
  if (from === to) return;
  const next = labels.slice();
  [next[from], next[to]] = [next[to], next[from]];
  // old letter -> new letter
  const map = {};
  labels.forEach((label, i) => (map[letters[i]] = letters[next.indexOf(label)]));
  q.choices = next.map((label, i) => ({ id: letters[i], label }));
  for (const m of q.misconceptions) m.match.choiceIds = m.match.choiceIds.map((c) => map[c]);
  q.misconceptions.sort((x, y) => x.match.choiceIds[0].localeCompare(y.match.choiceIds[0]));
}
const to3 = [
  "typn-inference-and-literal-types-type-of-const",
  "typn-shapes-and-structural-typing-check-readonly",
  "typn-generics-count-members",
  "typn-transforming-types-record-keys",
  "typn-serving-http-status-for-bad-json",
];
const to0 = [
  "typn-inference-and-literal-types-check-members",
  "typn-what-node-is-count-undefined",
  "typn-errors-and-concurrency-count-rejected",
  "typn-a-typed-service-check-members",
  "typn-errors-and-concurrency-catch-message",
];
for (const id of to3) moveCorrect(id, 3);
for (const id of to0) moveCorrect(id, 0);
save(b);
