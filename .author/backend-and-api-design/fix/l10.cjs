const { load, save, setOpener, cutLead, makeChoice, step, q } = require("./lib.cjs");
const b = load();
const L = "versioning-and-change";
setOpener(
  b,
  L,
  'Renaming the field name to full_name in a response such as {"id": 7, "name": "Ana"} takes a moment, and every program that was written to read name finds nothing there afterwards. The programs that read it may be apps on phones, scripts on other companies\' servers and tools that nobody remembers writing, and the team that owns the API cannot update any of them on demand. A change is **breaking** when a client written against the old contract can fail because of it.',
  "Changes differ in what they do to an old client, and the difference can be found by asking what that client would do with the response it now receives. Once you can ask that of any change, you can sort proposals into those that can go out at once and those that need a migration, and you can plan a rename or a removal so that clients have time to move.",
);
for (const s of ["which-safe", "count-breaking", "clients-fail", "six-fields"]) cutLead(b, L, s);

const cb = q(b, "bacad-versioning-and-change-count-breaking");
makeChoice(b, {
  id: "bacad-versioning-and-change-which-breaking",
  conceptIds: cb.conceptIds,
  prompt:
    "Five changes are proposed. (a) add an optional response field nick. (b) remove the response field name. (c) change id from integer to string. (d) add the endpoint /orders/{id}/notes. (e) make the request field currency required, though it was optional. Which of these lists contains every breaking change?",
  difficulty: 1,
  hints: [
    "Ask for each change whether a client written against the old contract could fail.",
    "Removing, retyping and newly requiring are the three kinds to look for, and additions do not break old clients.",
  ],
  sourceIds: cb.sourceIds,
  onCorrect:
    "Removing a field, changing its type and making a request field required each make a client written against the old contract fail, whereas the new optional field and the new endpoint are additions.",
  skill: cb.skill,
  choices: [
    {
      id: "a",
      label: "Removing name, changing the type of id and requiring currency",
      correct: true,
    },
    {
      id: "b",
      label: "Only removing name",
      why: "Changing id from an integer to a string also breaks a client that reads it as an integer, and requiring currency breaks every caller that used to leave it out.",
    },
    {
      id: "c",
      label: "Removing name and changing the type of id",
      why: "Making currency required breaks callers that used to leave it out, so it belongs with the breaking changes.",
    },
    {
      id: "d",
      label: "All five, because every change alters the contract",
      why: "The new optional field nick and the new endpoint are additions. A client ignores what it has never heard of, so neither breaks anything.",
    },
  ],
});
step(b, L, "count-breaking").checkQuestionId = "bacad-versioning-and-change-which-breaking";

const cf = q(b, "bacad-versioning-and-change-clients-fail");
makeChoice(b, {
  id: "bacad-versioning-and-change-who-fails",
  conceptIds: cf.conceptIds,
  prompt:
    "Five client apps use an API. Three read the field qty, and two read only id and name. The server removes qty and adds quantity in the same version. Which clients fail?",
  difficulty: 1,
  hints: [
    "Ask which clients depend on the field that has gone.",
    "A client that never reads a field does not notice that it has changed.",
  ],
  sourceIds: cf.sourceIds,
  onCorrect:
    "A client fails when it relies on something that is gone, and only the three that read qty rely on it. The new field quantity does not help them, because they were never written to look for it.",
  skill: cf.skill,
  choices: [
    {
      id: "a",
      label: "All five, because the contract changed",
      why: "The two clients that read only id and name do not depend on qty, so they keep working.",
    },
    {
      id: "b",
      label: "The two that read only id and name, because a new field appeared",
      why: "A client ignores a field it has never heard of, so the addition of quantity breaks nothing. The removal of qty is what causes failures.",
    },
    {
      id: "c",
      label: "None, because quantity carries the same value as qty",
      why: "The three old clients look for qty by name, and the same value under a new name does not help them. They find nothing where they expect it.",
    },
    { id: "d", label: "The three that read qty", correct: true },
  ],
});
step(b, L, "clients-fail").checkQuestionId = "bacad-versioning-and-change-who-fails";

const sf = q(b, "bacad-versioning-and-change-six-fields");
makeChoice(b, {
  id: "bacad-versioning-and-change-failing-fields-six",
  conceptIds: sf.conceptIds,
  prompt:
    "An old response has six fields: id, name, qty, price, note and status. The new one drops note, renames status to state, changes price from an integer to a string, and adds a field tags. Which old fields fail the compatibility check?",
  difficulty: 1.3,
  hints: [
    "An old field fails if it is missing or if its type has changed.",
    "A renamed field is missing under its old name, and a field that was added is not an old field.",
  ],
  sourceIds: sf.sourceIds,
  onCorrect:
    "Each old field is checked for presence and type: note and status are missing and price has changed type, while id, name and qty are untouched and adding tags breaks nothing.",
  skill: sf.skill,
  choices: [
    { id: "a", label: "note, status and price", correct: true },
    {
      id: "b",
      label: "note and status only",
      why: "Changing price from an integer to a string also fails the check, because a client that reads it as a number can no longer do so.",
    },
    {
      id: "c",
      label: "price only",
      why: "A field that is dropped or renamed is missing under its old name, and a client that reads it finds nothing, so note and status fail as well.",
    },
    {
      id: "d",
      label: "note, status, price and tags",
      why: "The field tags is an addition. The check is made on the old fields, and an extra field in the new response fails nothing.",
    },
  ],
});
step(b, L, "six-fields").checkQuestionId = "bacad-versioning-and-change-failing-fields-six";
save(b);
