const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "serving-http";

setHook(b, L, [
  "An HTTP request is a few lines of text, the first of which is something like GET /users/42 HTTP/1.1, and the response that comes back is a few more, beginning with a status line such as HTTP/1.1 200 OK and continuing with headers and a body. The whole of an HTTP service in Node is a function that turns one into the other, which is why a handler can be read closely enough to say what a client will receive.",
  "Most of the bugs in such a function sit in the details around the edges, in a status that was never set, a response that was never finished or a body that arrived in pieces, and none of them raises an error inside the handler, since it is the client that notices. Knowing what Node does by default at each of those points lets you read a handler and say what the client sees, and whether that is the answer the client should have been given.",
]);

for (const s of [
  "predict-the-segment",
  "parse-the-route",
  "status-for-bad-body",
  "find-the-missing-end",
  "name-the-parser",
  "the-quiet-failure",
])
  clearLead(b, L, s);

toChoice(b, "typn-serving-http-raw-segment-length", {
  prompt:
    '// req.url is "/users/42?x=1"\nconst id = req.url.split("/")[2];\nWhat does id contain?',
  options: [
    '"42", the id on its own.',
    '"users", the piece before the id.',
    '"42?x=1", the id followed by the query string.',
    '"undefined", because the URL has only two slashes.',
  ],
  correct: 2,
  misconceptions: {
    0: "split cuts only at the slashes, and req.url includes the query string, so nothing removes the part after the question mark.",
    1: "Splitting gives an empty first piece, then users, then the last piece, and indexes start at 0, so index 2 is the last piece.",
    3: "Two slashes divide the string into three pieces, so index 2 exists.",
  },
  onCorrect:
    "req.url holds everything after the host, query string included, so the last piece is the id together with the query string.",
  hints: ["Write out the pieces that split produces, starting with the empty one before the first slash.", "req.url includes the query string."],
});

toChoice(b, "typn-serving-http-status-for-bad-json", {
  prompt:
    "A client sends a POST whose body is not valid JSON, and the handler cannot parse it. Which status should the server return?",
  options: [
    "404, because the body could not be found.",
    "400, because the client sent a request that the server cannot understand.",
    "500, because the handler could not do its work.",
    "200, because the request reached the handler.",
  ],
  correct: 1,
  misconceptions: {
    0: "404 says that the resource asked for does not exist, and here the resource is fine and the body is the problem.",
    2: "500 says that the server is at fault, and here the mistake was in what the client sent.",
    3: "200 tells the client that the request succeeded, and clients and caches read the status and not the body.",
  },
  onCorrect:
    "The mistake is the client's, so the status is in the 4xx class, and 400 is the code for a malformed request.",
  hints: ["Decide who made the mistake, the client or the server.", "The 4xx codes mean the request was at fault."],
});

save(b);
