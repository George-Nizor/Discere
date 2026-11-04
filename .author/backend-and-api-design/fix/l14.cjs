const { load, save, setOpener, cutLead, makeChoice, step, q } = require("./lib.cjs");
const b = load();
const L = "layers-and-background-work";
setOpener(
  b,
  L,
  "A request to confirm an order has to charge the customer, update the stock, record the order and send an email, and each of those can fail in a different way. If every step is written in one function that reads the request, runs the SQL and calls the mail server, then a failure at any point leaves the system in a state nobody planned, and no part of the function can be tested without all the others. The remedy is to give each job a layer of its own and to move the work that can wait out of the request, onto a **queue**.",
  "Each of these choices changes what a failure leaves behind. A rule that sits among SQL and status codes is hard to test, a pair of related changes made without a transaction can be left half done by a crash, and a message on a queue that retries can be delivered twice. Knowing where each job belongs lets you place code in the right layer, say what a crash or a retry will leave behind, and make a consumer safe against duplicates.",
);
for (const s of ["where-rule", "which-layer", "crash-total", "count-emails-3", "which-endpoint", "counter-30"]) cutLead(b, L, s);

const ce = q(b, "bacad-layers-and-background-work-count-emails-3");
makeChoice(b, {
  id: "bacad-layers-and-background-work-which-orders-emailed",
  conceptIds: ce.conceptIds,
  prompt:
    "A worker sends one email per order, the first time it sees a paid event for that order. The events arrive as (4, paid), (4, paid), (5, paid), (5, paid), (5, paid), (6, created) and (7, paid). Which orders are emailed?",
  difficulty: 1.2,
  hints: [
    "A created event is not a paid event, so it sends no email.",
    "The worker remembers the orders it has already handled, and skips a repeat.",
  ],
  sourceIds: ce.sourceIds,
  onCorrect:
    "Orders 4, 5 and 7 each have a paid event, and the worker emails each one only on its first. The repeats are skipped, and the created event for order 6 sends nothing.",
  skill: ce.skill,
  choices: [
    {
      id: "a",
      label: "Orders 4, 4, 5, 5, 5 and 7, once for every paid event",
      why: "A queue that retries delivers some messages more than once, and a worker that emailed on every delivery would send duplicates. This worker remembers the orders it has handled and skips a repeat.",
    },
    { id: "b", label: "Orders 4, 5 and 7", correct: true },
    {
      id: "c",
      label: "Orders 4, 5, 6 and 7",
      why: "Order 6 has only a created event, and the worker sends an email on a paid event. A created event sends nothing.",
    },
    {
      id: "d",
      label: "Orders 4 and 7",
      why: "Order 5 has paid events too, and the worker emails it on the first of them. Several deliveries of one event still count as one email, not none.",
    },
  ],
});
step(b, L, "count-emails-3").checkQuestionId = "bacad-layers-and-background-work-which-orders-emailed";
save(b);
