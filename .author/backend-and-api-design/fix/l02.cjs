const { load, save, setOpener, cutLead, makeChoice, step } = require("./lib.cjs");
const b = load();
const L = "methods-and-safety";
setOpener(
  b,
  L,
  "The first word of a request line, such as GET, PUT, POST or DELETE, tells every program that handles the request what it may do with it. A client library whose request has timed out will send a GET or a PUT again without asking anyone, yet it will not send a POST again on its own, because with no reply it cannot know whether the server received the first copy and acted on it or never saw it at all.",
  "The difference lies in what a second delivery would do. A method is **idempotent** when delivering the same request several times leaves the server as one delivery would, and GET and PUT have that property while POST does not. Sorting methods this way is what lets you say what a request does when it arrives twice, decide whether a failed request may be repeated, and see why a link that deletes something through GET is a mistake.",
);
cutLead(b, L, "post-twice");
cutLead(b, L, "put-twice");
cutLead(b, L, "delete-count");
cutLead(b, L, "crawl-the-links");

makeChoice(b, {
  id: "bacad-methods-and-safety-crawler-effect",
  conceptIds: ["safe-method", "idempotent-method", "retry-rule"],
  prompt:
    "A shop's admin page has GET links of the form /items/9/remove that delete an item, and a search crawler follows every link on the page. What happens?",
  difficulty: 1.3,
  hints: [
    "A crawler assumes that a GET changes nothing.",
    "Each link names a different item, and following it sends the request that removes that item.",
  ],
  sourceIds: ["rfc9110", "rfc9112", "mdn-http", "py-stdlib"],
  onCorrect:
    "Crawlers, caches and prefetching browsers all assume that a GET is read-only, so a GET that deletes data gets triggered by software nobody was watching.",
  skill: "classify-methods",
  choices: [
    {
      id: "a",
      label: "The crawler deletes the item behind every link it follows",
      correct: true,
    },
    {
      id: "b",
      label: "Nothing is deleted, because a crawler only reads pages",
      why: "A crawler reads a page by sending a GET request for each link, and the server carries out whatever that request does, so a link that deletes an item deletes it when the crawler follows the link.",
    },
    {
      id: "c",
      label: "Only the first item is deleted, because GET is idempotent",
      why: "Idempotence covers repeats of the same request. These links name different items, so each one is a different request and each removes its own item.",
    },
    {
      id: "d",
      label: "The server refuses the requests, because a GET may not change data",
      why: "HTTP only defines GET as read-only. Nothing stops a server from deleting on a GET, and a server that does so will carry out the deletions for any client that asks.",
    },
  ],
});
step(b, L, "crawl-the-links").checkQuestionId = "bacad-methods-and-safety-crawler-effect";
save(b);
