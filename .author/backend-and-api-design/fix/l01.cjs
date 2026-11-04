const { load, save, setOpener, cutLead, makeChoice, step } = require("./lib.cjs");
const b = load();
const L = "anatomy-of-an-http-exchange";
setOpener(
  b,
  L,
  'A browser that asks a shop to create an order sends text that begins POST /orders HTTP/1.1, continues with lines such as Content-Type: application/json, and ends with the order itself, {"item":"pen","qty":3}. The server replies with text of the same layout, starting HTTP/1.1 201 Created and ending with a body of its own, {"id":812,"status":"new"}. An **HTTP exchange** is that pair of messages, one request and the response to it.',
  "Both messages are built from the same parts in the same order, a first line, header fields, a blank line and a body, so a server can read one line by line and know at each point what it is looking at. Once you can read those lines, you can take any request and say what it asks for, what it carries and how large it is, and you can trace each behaviour of the APIs in the rest of the course, such as whether a request may be repeated or a response stored, to a particular line of one of these messages.",
);
cutLead(b, L, "which-line");
cutLead(b, L, "name-the-header");
cutLead(b, L, "read-the-response");

// count-the-pairs: a fencepost count becomes a judgement about how the query splits.
makeChoice(b, {
  id: "bacad-anatomy-of-an-http-exchange-split-the-query",
  conceptIds: ["request", "response", "header"],
  prompt:
    "The request line is GET /items?tag=red&tag=large&sort=price HTTP/1.1. Which list gives the name=value pairs in its query?",
  difficulty: 1,
  hints: [
    "The query is everything after the question mark, and an ampersand separates one pair from the next.",
    "Ask whether a name that appears twice is joined into one pair or kept as two.",
  ],
  sourceIds: ["rfc9110", "rfc9112", "mdn-http", "py-stdlib"],
  onCorrect:
    "A name may repeat, as tag does here, and each repetition is its own pair. That is how a client sends several values for one parameter.",
  skill: "parse-a-request",
  choices: [
    {
      id: "a",
      label: "tag=red,large and sort=price",
      why: "The query is not merged: each occurrence of tag is written out as its own pair, and the server decides what to do with the two values.",
    },
    {
      id: "b",
      label: "/items?tag=red, tag=large and sort=price",
      why: "The path /items and the question mark come before the query. The query is only what follows the question mark.",
    },
    {
      id: "c",
      label: "tag=red and tag=large and sort=price",
      correct: true,
    },
    {
      id: "d",
      label: "tag=red and sort=price",
      why: "The second tag=large is a pair too. A repeated name does not cancel the first one, so the query holds three pairs.",
    },
  ],
});
step(b, L, "count-the-pairs").checkQuestionId = "bacad-anatomy-of-an-http-exchange-split-the-query";
cutLead(b, L, "count-the-pairs");
save(b);
