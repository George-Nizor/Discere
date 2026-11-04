const { load, save, setOpener, cutLead, makeChoice, step, q } = require("./lib.cjs");
const b = load();
const L = "resources-and-urls";
setOpener(
  b,
  L,
  "The address https://api.shop.example/v1/customers/17/orders?status=open&limit=20#top is built from parts that do different jobs. The path, /v1/customers/17/orders, names a thing, here the orders of customer 17, the query after the question mark only narrows what comes back, and the fragment at the end stays in the browser and is never sent. A **resource** is a thing of this kind that an API exposes, such as an order or a customer, and its URL is its name.",
  "The names an API gives its resources decide how easily it can be used, because a client that has seen /orders and /orders/42 can guess that the first is the set of orders and the second is one of them, and the methods from the earlier lessons then supply the verbs without any new vocabulary. Once you can read a URL this way, you can design paths for resources and collections, decide where a path should stop being nested, and see how a server matches a path to the code that handles it.",
);
for (const s of ["count-segments", "add-method", "break-safe", "three-named"]) cutLead(b, L, s);
q(b, "bacad-resources-and-urls-add-method").prompt =
  "Which method adds a new order to the collection /orders, when the server chooses the new order's address?";

const old = q(b, "bacad-resources-and-urls-three-named");
makeChoice(b, {
  id: "bacad-resources-and-urls-captured-values",
  conceptIds: old.conceptIds,
  prompt:
    "A router matches the path /customers/17/orders/42/items/7 against the template /customers/{cid}/orders/{oid}/items/{iid}. Which values does it capture?",
  difficulty: 1.2,
  hints: [
    "Only the segments in braces capture a value; the others must simply be equal.",
    "Each braces segment takes the path segment in the same position.",
  ],
  sourceIds: old.sourceIds,
  onCorrect:
    "Each braces segment captures the path segment in the same position, so the router returns cid = 17, oid = 42 and iid = 7 and hands them to the code for that template.",
  skill: old.skill,
  choices: [
    {
      id: "a",
      label: "cid = customers, oid = orders, iid = items",
      why: "Those words are the fixed segments, which have to be equal in the path and the template and capture nothing. Only the segments in braces capture, and they capture the values between the fixed words.",
    },
    {
      id: "b",
      label: "cid = 17 and oid = 42, with the last segment left unmatched",
      why: "The template has a third segment in braces, {iid}, and it captures 7. A path fits only when every segment of the template is matched, so none is left over.",
    },
    { id: "c", label: "cid = 17, oid = 42, iid = 7", correct: true },
    {
      id: "d",
      label: "cid = 7, oid = 42, iid = 17",
      why: "Captures follow position from left to right. The first segment in braces takes the first value in the same place in the path, which is 17.",
    },
  ],
});
step(b, L, "three-named").checkQuestionId = "bacad-resources-and-urls-captured-values";
save(b);
