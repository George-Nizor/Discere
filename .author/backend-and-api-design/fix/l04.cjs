const { load, save, setOpener, cutLead, makeChoice, step } = require("./lib.cjs");
const b = load();
const L = "caching-and-conditional-requests";
setOpener(
  b,
  L,
  "A response can carry the header Cache-Control: max-age=300, which allows any program between the server and the reader to keep a copy and reuse it for the next 300 seconds without asking the server again. A **cache** is a program that does this, and the saving can be large: a product list of 48,000 bytes that a thousand people request in an hour would otherwise be built and sent a thousand times, which is 48,000,000 bytes of identical output, although the data may have changed only twice in that hour.",
  "Once the 300 seconds have passed the copy is not thrown away, because the cache can ask the server whether it is still current, and if it is, the server answers with a short reply and no body. Whether a copy is still fresh, and how many requests still reach the server, are matters of simple arithmetic, so you can work out for any series of requests which ones a cache will answer itself, and you can choose how long a response may be kept.",
);
makeChoice(b, {
  id: "bacad-caching-and-conditional-requests-reuse-at-95",
  conceptIds: b.questions.find((q) => q.id === "bacad-caching-and-conditional-requests-remaining").conceptIds,
  prompt:
    "A response with Cache-Control: max-age=120 was stored by a cache at t = 0 seconds. A request for the same resource arrives at t = 95 seconds. What does the cache do?",
  difficulty: 1,
  hints: [
    "max-age=120 allows the copy to be reused for 120 seconds after it was generated.",
    "Compare the 95 seconds that have passed with the 120 seconds allowed.",
  ],
  sourceIds: b.questions.find((q) => q.id === "bacad-caching-and-conditional-requests-remaining").sourceIds,
  onCorrect:
    "The copy is 95 seconds old and its lifetime is 120, so it is still fresh for another 25 seconds and the origin is not contacted.",
  skill: b.questions.find((q) => q.id === "bacad-caching-and-conditional-requests-remaining").skill,
  choices: [
    {
      id: "a",
      label: "It sends the request to the origin, because a cache must check every request",
      why: "A cache checks only when a copy is stale. This one is 95 seconds old and its lifetime is 120 seconds, so it is fresh and can be reused without any contact.",
    },
    {
      id: "b",
      label: "It sends the request to the origin, because 95 seconds is close to 120",
      why: "Freshness has no margin: a copy is fresh for as long as its age is below its lifetime. At 95 seconds the copy has 25 seconds left, so no check is needed yet.",
    },
    {
      id: "c",
      label: "It answers from the stored copy without contacting the origin",
      correct: true,
    },
  ],
});
step(b, L, "remaining").checkQuestionId = "bacad-caching-and-conditional-requests-reuse-at-95";
for (const s of ["remaining", "remaining-2", "code-304", "which-directive", "bytes-saved"]) cutLead(b, L, s);
save(b);
