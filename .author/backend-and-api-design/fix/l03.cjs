const { load, save, setOpener, cutLead, makeChoice } = require("./lib.cjs");
const b = load();
const L = "status-codes";
setOpener(
  b,
  L,
  "Every HTTP response begins with a line such as HTTP/1.1 404 Not Found or HTTP/1.1 503 Service Unavailable, and the three-digit **status code** in it is written to be read by software. The first digit sorts the outcome: 2 says the request worked, 4 says the request was at fault, and 5 says the server was. A retry library or a monitoring dashboard can act on that digit without ever opening the body, which is why the code has to be chosen to match what happened.",
  "Within a class the exact code says more. A 401 and a 403 both refuse a request, but one tells the caller to identify itself and the other tells it that identifying itself again will not help, and a 400 and a 409 both reject a request, but one reports that it could not be read and the other that it clashes with what the server already holds. Knowing these distinctions lets you choose, for any outcome, the code that tells a client what to change, and lets you read the code in a response and say which side has to act.",
);
for (const s of ["created-code", "no-content", "not-allowed", "unexpected", "which-4xx", "transfer-200"]) cutLead(b, L, s);

makeChoice(b, {
  id: "bacad-status-codes-created-code",
  prompt:
    "A POST to /orders has just created order 42, and the server sends a Location header with its address. Which status line should it send?",
  hints: [
    "The code belongs to the class for success, which starts with the digit 2.",
    "One of the success codes reports that something new was made, and its reason phrase says so.",
  ],
  onCorrect:
    "201 says that a resource was created, and its Location header gives the new address.",
  choices: [
    {
      id: "a",
      label: "HTTP/1.1 200 OK",
      why: "A 200 reports plain success. A request that created something has a code of its own, which tells the client to look at Location.",
    },
    { id: "b", label: "HTTP/1.1 201 Created", correct: true },
    {
      id: "c",
      label: "HTTP/1.1 204 No Content",
      why: "A 204 means success with nothing to return. Here the new address is returned in Location, which is what the creation code is for.",
    },
  ],
});

makeChoice(b, {
  id: "bacad-status-codes-not-allowed",
  prompt:
    "A request carries a valid token for user A and asks for user B's private invoice. Which status code reports that A is not allowed?",
  hints: [
    "The server knows who the caller is.",
    "Identity is established, and the permission is missing. The code for a missing or invalid token is a different one.",
  ],
  onCorrect:
    "403 means the caller is identified but not permitted, whereas 401 is for credentials that are missing or invalid.",
  choices: [
    {
      id: "a",
      label: "401, because the caller has not been identified",
      why: "401 means the credentials are missing or invalid, and here the token is valid. The caller is known and simply not permitted.",
    },
    {
      id: "b",
      label: "404, because the invoice is not at that address",
      why: "404 would say the invoice does not exist, which is not what is being reported. The caller has been identified and refused.",
    },
    {
      id: "c",
      label: "400, because the request could not be understood",
      why: "400 says the request could not be read, and this one is well formed. The fault lies in who is asking, not in what was asked.",
    },
    {
      id: "d",
      label: "403, because the caller is identified but not allowed",
      correct: true,
    },
  ],
});
save(b);
