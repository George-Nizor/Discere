const { load, save, setOpener, cutLead, makeChoice, step, q } = require("./lib.cjs");
const b = load();
const L = "describing-an-api-with-openapi";
setOpener(
  b,
  L,
  "A description of the operation POST /orders, written as data and not as prose, says that the operation is called createOrder, that its request body must match a schema named Order, which requires an item and a quantity, and that it answers either 201 or 400. A file of such descriptions is an **OpenAPI document**, and because a program can read it as easily as a person can, the same file can produce reference documentation, a client library in any language, a mock server and a set of tests.",
  "A page of documentation can be misread, whereas a description can be checked: a request body either matches its schema or it does not, and a server whose answers differ from the file is shown to be wrong. Once you can read one, you can say from the file alone which fields a request must carry, which responses a client has to handle, and whether a given body is valid.",
);
for (const s of ["which-body", "operation-id", "count-valid-1", "two-errors"]) cutLead(b, L, s);

const cv = q(b, "bacad-describing-an-api-with-openapi-count-valid-1");
makeChoice(b, {
  id: "bacad-describing-an-api-with-openapi-reject-one",
  conceptIds: cv.conceptIds,
  prompt:
    'The Order schema requires item (string) and qty (integer), and note (string) is optional. Properties the schema does not list are allowed. Which of these bodies does a validator reject?',
  difficulty: 1.2,
  hints: [
    "Check each required property for presence, and then each property that is present for its declared type.",
    "A property that the schema does not list is not an error.",
  ],
  sourceIds: cv.sourceIds,
  onCorrect:
    'The qty is the string "two", where the schema declares an integer, so the validator reports a type error even though both required properties are present.',
  skill: cv.skill,
  choices: [
    {
      id: "a",
      label: '{"item":"pen","qty":3,"colour":"red"}',
      why: "Both required properties are present with the right types, and a property the schema does not list is allowed, so this body passes.",
    },
    { id: "b", label: '{"item":"ink","qty":"two"}', correct: true },
    {
      id: "c",
      label: '{"item":"pen","qty":3,"note":"gift"}',
      why: "The optional note is a string, as declared, and both required properties are present and correctly typed, so this body passes.",
    },
    {
      id: "d",
      label: '{"qty":2,"item":"ink"}',
      why: "The order in which properties appear does not matter. Both required properties are present with the right types, so this body passes.",
    },
  ],
});
step(b, L, "count-valid-1").checkQuestionId = "bacad-describing-an-api-with-openapi-reject-one";

const te = q(b, "bacad-describing-an-api-with-openapi-errors-count-2");
makeChoice(b, {
  id: "bacad-describing-an-api-with-openapi-faults-reported",
  conceptIds: te.conceptIds,
  prompt:
    'The Order schema requires item (string) and qty (integer). A validator reports every fault it finds in the body {"qty":"3"}. What does it report?',
  difficulty: 1.3,
  hints: [
    "Check each required property for presence first.",
    "Then check each property that is present for its declared type.",
  ],
  sourceIds: te.sourceIds,
  onCorrect:
    "The body has two separate faults, a missing required property and a value of the wrong type, and a validator reports each of them so that the client can fix both at once.",
  skill: te.skill,
  choices: [
    {
      id: "a",
      label: "Only that item is missing",
      why: "The missing item is one fault, but the qty is the string \"3\" where an integer is declared, which is a second fault. A validator reports each fault it finds.",
    },
    {
      id: "b",
      label: "Only that qty is a string where an integer is declared",
      why: "The wrong type of qty is one fault, but item is required and absent, which is a second fault. A validator reports each fault it finds.",
    },
    {
      id: "c",
      label: "Nothing, because a body may leave out properties",
      why: "Properties listed under required must be present. The optional ones may be left out, and item is not optional.",
    },
    {
      id: "d",
      label: "Both faults: item is missing, and qty is a string where an integer is declared",
      correct: true,
    },
  ],
});
step(b, L, "two-errors").checkQuestionId = "bacad-describing-an-api-with-openapi-faults-reported";
save(b);
