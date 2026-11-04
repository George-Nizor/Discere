const { load, save, step, q, lesson, makeChoice } = require("./lib.cjs");
const b = load();

// methods-and-safety: delete-count
{
  const old = q(b, "bacad-methods-and-safety-delete-count");
  makeChoice(b, {
    id: "bacad-methods-and-safety-delete-state",
    conceptIds: old.conceptIds,
    prompt:
      "A shop has 5 orders, numbered 1 to 5. The request DELETE /orders/4 is delivered three times. Which orders does the shop hold afterwards?",
    difficulty: 1,
    hints: [
      "Order 4 can be removed only once.",
      "Ask what the second and third deliveries find when they look for order 4.",
    ],
    sourceIds: old.sourceIds,
    onCorrect:
      "The state after three deliveries is the state after one. Only the response differs, a 404 for the later ones, because order 4 is no longer there to remove.",
    skill: old.skill,
    choices: [
      {
        id: "a",
        label: "Only two orders, because each of the three deliveries removes one",
        why: "Each delivery names order 4, and only the first finds it. The later ones have nothing to remove, so they cannot take any other order away.",
      },
      {
        id: "b",
        label: "All five orders, because the later deliveries restore what the first removed",
        why: "A DELETE only removes. Nothing in the later deliveries puts order 4 back, so it stays gone.",
      },
      {
        id: "c",
        label: "Orders 1, 2, 3 and 5, the same as after one delivery",
        correct: true,
      },
    ],
  });
  step(b, "methods-and-safety", "delete-count").checkQuestionId = "bacad-methods-and-safety-delete-state";
}

const swap = (lessonId, oldId, newId) => {
  const l = lesson(b, lessonId);
  const i = l.questionIds.indexOf(oldId);
  if (i < 0) throw new Error(`${oldId} not in ${lessonId}`);
  l.questionIds[i] = newId;
};

// describing-an-api-with-openapi: practice-2
{
  const old = q(b, "bacad-describing-an-api-with-openapi-practice-2");
  makeChoice(b, {
    id: "bacad-describing-an-api-with-openapi-accepted-body",
    conceptIds: old.conceptIds,
    prompt:
      "The Order schema requires item (string) and qty (integer), and note (string) is optional. Which of these bodies does a validator accept?",
    difficulty: 1.3,
    hints: [
      "Check each required property for presence, and then each property that is present for its declared type.",
      "A string with no characters is still a string, and zero is still an integer.",
    ],
    sourceIds: old.sourceIds,
    onCorrect:
      "Both required properties are present, and an empty string is still a string and 0 is still an integer, so the body matches the schema.",
    skill: old.skill,
    choices: [
      {
        id: "a",
        label: '{"item":"cup","qty":2.5}',
        why: "The number 2.5 is not an integer, so qty fails its declared type.",
      },
      {
        id: "b",
        label: '{"item":7,"qty":1}',
        why: "The number 7 is not a string, so item fails its declared type.",
      },
      { id: "c", label: '{"item":"","qty":0}', correct: true },
      {
        id: "d",
        label: '{"item":"cup"}',
        why: "The property qty is listed under required, so a body without it is invalid.",
      },
    ],
  });
  swap("describing-an-api-with-openapi", "bacad-describing-an-api-with-openapi-practice-2", "bacad-describing-an-api-with-openapi-accepted-body");
}

// layers-and-background-work: practice-1
{
  const old = q(b, "bacad-layers-and-background-work-practice-1");
  makeChoice(b, {
    id: "bacad-layers-and-background-work-emailed-in-order",
    conceptIds: old.conceptIds,
    prompt:
      "A worker sends one email per order the first time it sees a paid event for that order. The events arrive as (10, paid), (11, created), (10, paid), (12, paid), (12, paid) and (11, paid). Which orders are emailed, and in what order?",
    difficulty: 1.3,
    hints: [
      "A created event sends no email, and it does not use up the order's one email.",
      "Go through the events in order, and note each order at its first paid event.",
    ],
    sourceIds: old.sourceIds,
    onCorrect:
      "Order 10 is emailed at its first paid event, order 12 at its first, and order 11 only at its paid event, which comes last, since its created event sent nothing.",
    skill: old.skill,
    choices: [
      {
        id: "a",
        label: "Orders 10, 11 and 12, in that order",
        why: "Order 11 first appears in a created event, which sends no email. Its paid event comes after the first paid event for order 12, so it is emailed last.",
      },
      {
        id: "b",
        label: "Orders 10, 12 and 11, in that order",
        correct: true,
      },
      {
        id: "c",
        label: "Orders 10 and 12 only, because order 11 was only created",
        why: "Order 11 has a paid event at the end of the stream, and nothing has been sent for it before then, so that event sends its email.",
      },
      {
        id: "d",
        label: "Orders 10, 10, 12, 12 and 11, once for every paid event",
        why: "A worker that emailed on every delivery would send duplicates. This one remembers the orders it has handled and skips a repeat.",
      },
    ],
  });
  swap("layers-and-background-work", "bacad-layers-and-background-work-practice-1", "bacad-layers-and-background-work-emailed-in-order");
}

// versioning-and-change: practice-1
{
  const old = q(b, "bacad-versioning-and-change-practice-1");
  makeChoice(b, {
    id: "bacad-versioning-and-change-only-breaking",
    conceptIds: old.conceptIds,
    prompt: "Which of these groups of changes contains only breaking changes?",
    difficulty: 1.3,
    hints: [
      "A change is breaking if a client written against the old contract can fail because of it.",
      "Additions, such as a new endpoint or an optional field, do not break old clients.",
    ],
    sourceIds: old.sourceIds,
    onCorrect:
      "Renaming a field, newly requiring a request field and changing a type each make an old client fail, whereas the additions in the other groups do not.",
    skill: old.skill,
    choices: [
      {
        id: "a",
        label:
          "Renaming a response field, making an optional request field required and changing a field from integer to string",
        correct: true,
      },
      {
        id: "b",
        label:
          "Adding an endpoint, adding an optional response field and adding an optional query parameter",
        why: "All three are additions, and a client ignores what it has never heard of, so none of them breaks an old client.",
      },
      {
        id: "c",
        label:
          "Renaming a response field, adding an endpoint and adding an optional response field",
        why: "The rename breaks clients that read the old name, but the endpoint and the optional field are additions that break nothing.",
      },
      {
        id: "d",
        label:
          "Adding an optional query parameter, making an optional request field required and lowering a length limit",
        why: "Making a field required and lowering a length limit break callers that used to succeed, but a new optional query parameter breaks nobody.",
      },
    ],
  });
  swap("versioning-and-change", "bacad-versioning-and-change-practice-1", "bacad-versioning-and-change-only-breaking");
}
save(b);
