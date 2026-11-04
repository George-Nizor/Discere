const { load, save, setOpener, cutLead, makeChoice, step, q } = require("./lib.cjs");
const b = load();
const L = "errors-and-idempotency";
setOpener(
  b,
  L,
  "A header named Idempotency-Key, carrying a unique value that the client chooses for each operation, lets a server recognise that a POST it has received is a repeat of one it has already carried out, and answer with the stored result instead of acting a second time. Without an **idempotency key** a client that retries a charge after a timeout has no safe way to ask again, because nothing in a plain POST tells the server whether it has met this request before.",
  "The other half of a failed request is what the server says about it. An error body with a stable, machine-readable type and a short explanation lets a client decide what to do and lets a person see what happened, and RFC 9457 defines a JSON shape for it. With these two pieces you can make a POST safe to retry, and shape an error that tells the caller what to change without exposing the server's internals.",
);
for (const s of ["three-no-key", "four-with-key", "total-30", "which-member", "dont-show"]) cutLead(b, L, s);

const old = q(b, "bacad-errors-and-idempotency-three-no-key");
makeChoice(b, {
  id: "bacad-errors-and-idempotency-no-key-effect",
  conceptIds: old.conceptIds,
  prompt:
    "A balance is 100. A client sends POST /charges for 30 and, after two timeouts, sends the same request twice more, so the server receives it three times. The server does nothing to recognise repeats. What is the balance afterwards?",
  difficulty: 1,
  hints: [
    "Ask what the server has to go on when the third copy arrives.",
    "A plain POST carries nothing that says it is a repeat.",
  ],
  sourceIds: old.sourceIds,
  onCorrect:
    "With no way to recognise a repeat, the server carries out each copy as a new charge, so 100 - 30 - 30 - 30 leaves 10.",
  skill: old.skill,
  choices: [
    { id: "a", label: "10, because the server carries out all three copies", correct: true },
    {
      id: "b",
      label: "70, because the server charges once however many copies arrive",
      why: "Nothing in a plain POST tells the server that it has seen the request before, so each copy is carried out as a new charge. Charging once is what an idempotency key makes possible.",
    },
    {
      id: "c",
      label: "100, because the server rejects a request it has already seen",
      why: "A server keeps no memory of requests it has seen unless it is built to. Without a key or a similar record it treats every copy as new and carries it out.",
    },
  ],
});
step(b, L, "three-no-key").checkQuestionId = "bacad-errors-and-idempotency-no-key-effect";
save(b);
