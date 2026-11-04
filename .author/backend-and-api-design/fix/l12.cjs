const { load, save, setOpener, cutLead, makeChoice, step, q } = require("./lib.cjs");
const b = load();
const L = "authorisation-and-input-trust";
setOpener(
  b,
  L,
  "A request for GET /invoices/18 with a valid token tells the server who is asking, and the server still has to decide whether that caller may have invoice 18. A handler that loads the invoice by its id and returns it has answered only the first question, so any logged-in caller can read every invoice by changing the number in the address. This fault is called **broken object-level authorisation**, and it heads the OWASP API Security Top 10 of 2023.",
  "Two other faults share its cause, which is trusting what a caller sends: input joined into a query, which lets the caller change the query itself, and a request body copied whole onto a stored object, which lets the caller set fields such as a role. Each has its own repair, an ownership check, a parameterised query and an allowlist of fields, and being able to name the repair lets you read a handler, point to the line that trusts too much, and say what should replace it.",
);
for (const s of ["rows-concat", "which-fix", "rows-param", "fields-copied", "invoices-returned"]) cutLead(b, L, s);

const rc = q(b, "bacad-authorisation-and-input-trust-rows-concat");
makeChoice(b, {
  id: "bacad-authorisation-and-input-trust-concat-effect",
  conceptIds: rc.conceptIds,
  prompt:
    "The users table has 3 rows. A handler builds SELECT * FROM users WHERE name = '<input>' by joining strings, and receives the input x' OR '1'='1. How many rows come back?",
  difficulty: 1.2,
  hints: [
    "Write out the query after the input has been joined into it, and read the condition as the database will.",
    "The quotation mark in the input closes the string that was meant to hold a name.",
  ],
  sourceIds: rc.sourceIds,
  onCorrect:
    "The joined query reads name = 'x' OR '1'='1', and the second condition is true for every row, so all three rows come back.",
  skill: rc.skill,
  choices: [
    {
      id: "a",
      label: "No rows",
      why: "No rows would come back if the input were compared as a name, because nobody has that name. Joined into the query, though, it becomes part of the condition, and OR '1'='1' is true for every row.",
    },
    {
      id: "b",
      label: "One row",
      why: "Nothing in the joined query picks out a single user. The added condition is true for every row, so every row matches.",
    },
    { id: "c", label: "All three rows", correct: true },
  ],
});
step(b, L, "rows-concat").checkQuestionId = "bacad-authorisation-and-input-trust-concat-effect";

const rp = q(b, "bacad-authorisation-and-input-trust-rows-param");
makeChoice(b, {
  id: "bacad-authorisation-and-input-trust-param-effect",
  conceptIds: rp.conceptIds,
  prompt:
    "A handler runs SELECT * FROM users WHERE name = ? and sends the value x' OR '1'='1 separately as a parameter. What does the database do with that value?",
  difficulty: 1.2,
  hints: [
    "Ask whether the database ever reads the value as part of the query.",
    "The value is sent separately from the query text.",
  ],
  sourceIds: rp.sourceIds,
  onCorrect:
    "The value is compared as an ordinary string, so the query looks for a user with exactly that name, and none exists.",
  skill: rp.skill,
  choices: [
    { id: "a", label: "It compares the value as an ordinary name, so no row matches", correct: true },
    {
      id: "b",
      label: "It reads the OR as part of the query, so every row matches",
      why: "That happens when the input is joined into the query text. A parameter is sent separately, so the database never treats any part of it as query syntax.",
    },
    {
      id: "c",
      label: "It rejects the query as malformed because of the quotation mark",
      why: "The quotation mark is only a character in the value. The database does not parse the value as part of the query, so nothing about it is malformed.",
    },
  ],
});
step(b, L, "rows-param").checkQuestionId = "bacad-authorisation-and-input-trust-param-effect";

const ir = q(b, "bacad-authorisation-and-input-trust-invoices-returned");
makeChoice(b, {
  id: "bacad-authorisation-and-input-trust-which-invoices",
  conceptIds: ir.conceptIds,
  prompt:
    "Invoices 17, 18, 19 and 20 belong to users 4, 9, 4 and 9 in that order. User 9 requests all four, and the handler checks the owner on each request. Which invoices are returned?",
  difficulty: 1.2,
  hints: [
    "The check compares each invoice's owner with the caller, user 9.",
    "A request for an invoice that fails the check is refused.",
  ],
  sourceIds: ir.sourceIds,
  onCorrect:
    "The check passes only where the owner is the caller, which is invoices 18 and 20. The requests for 17 and 19 are refused.",
  skill: ir.skill,
  choices: [
    {
      id: "a",
      label: "All four, because user 9 is logged in",
      why: "Being logged in only says who is asking. The check compares each invoice's owner with the caller, and user 4 owns 17 and 19.",
    },
    { id: "b", label: "Invoices 18 and 20", correct: true },
    {
      id: "c",
      label: "Invoices 17 and 19",
      why: "Those belong to user 4. The check lets a caller through only for invoices that the caller owns, and the caller here is user 9.",
    },
    {
      id: "d",
      label: "None, because the first request already failed the check",
      why: "Each request is checked on its own, so a request that fails the check does not stop the others from passing it.",
    },
  ],
});
step(b, L, "invoices-returned").checkQuestionId = "bacad-authorisation-and-input-trust-which-invoices";
save(b);
