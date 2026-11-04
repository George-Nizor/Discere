const { load, save, setOpener, cutLead, makeChoice, step, q } = require("./lib.cjs");
const b = load();
const L = "rate-limits-and-retries";
setOpener(
  b,
  L,
  "When a client sends requests faster than a service allows, the service answers HTTP/1.1 429 Too Many Requests, and it may add a Retry-After header giving the number of seconds to wait. That reply is the visible end of a **rate limit**, a rule that stops one client from using capacity that every client shares, and the rule is usually applied by giving each client something it can spend and refilling it at a fixed pace.",
  "The refusal is only half of the arrangement. A client that has been refused, or whose request failed for another reason, has to decide whether to try again and how long to wait, and a client that retries at once makes a struggling service worse. Tracing how many requests a limit lets through, and working out how long each wait should be, are short pieces of arithmetic, and together they let you say what a server should send when its limit is reached and how a client should retry without making matters worse.",
);
for (const s of ["burst", "bucket-4", "which-retry", "fifth-delay", "count-retries"]) cutLead(b, L, s);

const bu = q(b, "bacad-rate-limits-and-retries-burst");
makeChoice(b, {
  id: "bacad-rate-limits-and-retries-burst-outcome",
  conceptIds: bu.conceptIds,
  prompt:
    "A bucket holds at most 3 tokens, refills at 1 token a second and starts full. Each allowed request spends one token. Four requests arrive at the same instant. What happens?",
  difficulty: 1,
  hints: [
    "Ask how many tokens the bucket holds when the first request arrives.",
    "No time passes between the four requests, so nothing is added to the bucket.",
  ],
  sourceIds: bu.sourceIds,
  onCorrect:
    "The full bucket holds 3 tokens and no time passes, so the first three requests spend them and the fourth finds the bucket empty.",
  skill: bu.skill,
  choices: [
    {
      id: "a",
      label: "All four are allowed, because the bucket refills as the requests arrive",
      why: "The refill adds tokens only as time passes, at 1 a second. Four requests at the same instant leave no time for any to be added.",
    },
    {
      id: "b",
      label: "Only one is allowed, because the refill rate is 1 token a second",
      why: "The refill rate sets the long-run pace. A bucket that starts full has 3 tokens to spend at once, so a burst of up to its capacity gets through.",
    },
    { id: "c", label: "Three are allowed and the fourth is refused", correct: true },
  ],
});
step(b, L, "burst").checkQuestionId = "bacad-rate-limits-and-retries-burst-outcome";

const cr = q(b, "bacad-rate-limits-and-retries-count-retries");
makeChoice(b, {
  id: "bacad-rate-limits-and-retries-which-results-retry",
  conceptIds: cr.conceptIds,
  prompt:
    "A client sent six idempotent requests and got these results: 200, 400, 429, 503, 404 and a timeout. Which of them are worth retrying after a wait?",
  difficulty: 1.2,
  hints: [
    "A request that succeeded needs no retry, and a request that is wrong will fail the same way again.",
    "The failures that may clear with time are a timeout, a 429 and a 503.",
  ],
  sourceIds: cr.sourceIds,
  onCorrect:
    "The 429, the 503 and the timeout may succeed later. The 200 needs no retry, and the 400 and the 404 will fail again until the request itself changes.",
  skill: cr.skill,
  choices: [
    {
      id: "a",
      label: "429 and 503 only",
      why: "A timeout is also worth retrying, because the request may simply have been lost and a later attempt can succeed. For an idempotent request a repeat is safe.",
    },
    {
      id: "b",
      label: "400, 404 and the timeout",
      why: "A 400 and a 404 fail in the same way every time until the request is changed, so retrying them only adds load. The 429 and the 503 clear with time.",
    },
    {
      id: "c",
      label: "Every result except the 200",
      why: "A 400 means the request was malformed and a 404 means nothing exists at that address. Neither will change by waiting, so retrying them only adds load.",
    },
    { id: "d", label: "429, 503 and the timeout", correct: true },
  ],
});
step(b, L, "count-retries").checkQuestionId = "bacad-rate-limits-and-retries-which-results-retry";
save(b);
