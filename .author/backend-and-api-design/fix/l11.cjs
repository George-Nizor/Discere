const { load, save, setOpener, cutLead } = require("./lib.cjs");
const b = load();
const L = "identity-and-sessions";
setOpener(
  b,
  L,
  "HTTP carries no memory from one request to the next, so a GET /orders that arrives with a cookie holding a long random string says nothing by itself about who sent it. The server has to decide from that string whether the caller is user 7, an attacker, or nobody it knows, and the work of deciding is called **authentication**. It is a separate question from whether the caller may do what it asks, which is authorisation and is settled afterwards.",
  "There are two common ways to answer the first question. A server can keep a table of the ids it has issued and look each one up, or it can put the facts, such as the user number, in the token and sign them, so that it can check a token without a table. Knowing how each works, and what each exposes, lets you tell authentication from authorisation, judge what belongs in a token, and work out how long an attacker needs to guess a password against a fast hash and against a slow one.",
);
for (const s of ["no-token", "which-flag", "pin-time", "slow-hash", "who-reads"]) cutLead(b, L, s);
save(b);
