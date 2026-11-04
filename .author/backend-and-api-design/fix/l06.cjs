const { load, save, setOpener, cutLead, makeChoice, step, q } = require("./lib.cjs");
const b = load();
const L = "json-representations";
setOpener(
  b,
  L,
  'The text {"id": "42", "item": "pen", "qty": 3} describes order 42, and it is what a server sends when a client asks for that order, because nobody sends the order itself over a network. What travels is a **representation**, an encoding of the order\'s current state, and the encoding most APIs use is JSON, which a program reads by following a strict grammar and then either accepts the whole text or rejects it.',
  "A person forgives a stray character and a parser does not, so the rules for writing a body are stricter than they first appear. Some values also fail to survive the journey: a price that is exact on paper may not be exact in a parser's number type, and a field that is missing from a body can mean something different from one that is empty. Knowing where these rules bite lets you judge whether a text is valid, design a body whose names and types stay stable, and carry money and large identifiers without losing a digit.",
);
for (const s of ["count-valid", "which-word", "cents-of-425", "patch-states"]) cutLead(b, L, s);

const cv = q(b, "bacad-json-representations-count-valid");
makeChoice(b, {
  id: "bacad-json-representations-trailing-comma",
  conceptIds: cv.conceptIds,
  prompt: 'A program passes the text {"a":1,} to a JSON parser. What does the parser do?',
  difficulty: 1,
  hints: [
    "Ask whether the grammar has any room for a comma that separates nothing from nothing.",
    "A parser works on the text as a whole, and it has to give one answer for it.",
  ],
  sourceIds: cv.sourceIds,
  onCorrect:
    "JSON allows a comma only between two members, so the trailing comma makes the whole text invalid and no part of it is used.",
  skill: cv.skill,
  choices: [
    {
      id: "a",
      label: "It accepts the text and ignores the extra comma",
      why: "Some programming languages tolerate a trailing comma, but the JSON grammar does not. The comma separates two members, and here there is no second member.",
    },
    { id: "b", label: "It rejects the whole text as invalid", correct: true },
    {
      id: "c",
      label: "It reads a = 1 and discards the rest of the text",
      why: "A JSON parser has no partial credit: the text is either valid or it is not, and an invalid text yields no object at all, not even the part before the fault.",
    },
  ],
});
step(b, L, "count-valid").checkQuestionId = "bacad-json-representations-trailing-comma";

const pf = q(b, "bacad-json-representations-patch-fields");
makeChoice(b, {
  id: "bacad-json-representations-patch-result",
  conceptIds: pf.conceptIds,
  prompt:
    'A profile holds nick "ann", bio "hi" and city "Rome". A PATCH sends {"nick": null, "bio": ""}. What does the profile hold afterwards?',
  difficulty: 1.3,
  hints: [
    "Null, an empty string and a field left out are three different instructions.",
    "A field that is left out of a PATCH body is not mentioned, so it is left as it was.",
  ],
  sourceIds: pf.sourceIds,
  onCorrect:
    "Null clears the nickname, the empty string is a value of its own, and city was not mentioned, so it keeps its old value.",
  skill: pf.skill,
  choices: [
    {
      id: "a",
      label: 'nick null, bio null, city "Rome"',
      why: "An empty string is not null. {\"bio\": \"\"} sets the bio to a string with no characters, which is a value, whereas null would clear it.",
    },
    {
      id: "b",
      label: 'nick "ann", bio "", city "Rome"',
      why: "A null in a PATCH clears the field it names, so the nickname is cleared rather than left as it was.",
    },
    {
      id: "c",
      label: 'nick null, bio "", city null',
      why: "A field that is left out of the body is not mentioned, so city keeps the value it had. Only fields named in the body change.",
    },
    { id: "d", label: 'nick null, bio "", city "Rome"', correct: true },
  ],
});
step(b, L, "patch-states").checkQuestionId = "bacad-json-representations-patch-result";
save(b);
