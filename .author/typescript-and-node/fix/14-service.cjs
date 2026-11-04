const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "a-typed-service";

setHook(b, L, [
  'Here is a request body, {"name":"Ada","age":"x"}, sent to a service whose handler is typed to receive a CreateUser, an object with a string name and a numeric age. The compiler has checked every line of the handler, and still nothing at run time asks whether age is a number, because the types were erased before the service started. Whether the service then rejects the request, stores a nonsense value or fails somewhere deeper depends on where, if anywhere, someone decided to look.',
  "A service that decides this once, at the edge where data enters, can let every line after it rely on its types, and the same holds for its configuration, which is outside data as well and can be checked once at startup. Adding a stop that finishes the requests already begun, instead of cutting them off, gives the shape that most Node services share, which is why it is worth being able to read one and say where each of its guarantees comes from.",
]);

for (const s of [
  "predict-the-problems",
  "what-number-gives",
  "what-the-cast-checks",
  "count-the-valid",
  "predict-the-shutdown",
  "place-the-pool",
  "name-the-signal",
])
  clearLead(b, L, s);

toChoice(b, "typn-a-typed-service-count-problems", {
  prompt:
    'function readConfig(env) {\n  const problems = [];\n  if (!Number.isInteger(Number(env.PORT ?? 3000))) problems.push("PORT must be an integer");\n  if (!env.DATABASE_URL) problems.push("DATABASE_URL is required");\n  if (problems.length > 0) throw new Error(problems.join("; "));\n}\nreadConfig({ PORT: "abc" });\nWhat is the message of the error that is thrown?',
  options: [
    "PORT must be an integer",
    "DATABASE_URL is required",
    "PORT must be an integer; DATABASE_URL is required",
    "Nothing is thrown, because a PORT was given.",
  ],
  correct: 2,
  misconceptions: {
    0: "The function does not stop at the first problem. It collects every problem in a list and throws once at the end, so the missing database URL is reported as well.",
    1: "The port is a problem too, since Number(\"abc\") is NaN and NaN is not an integer.",
    3: "A value was given for PORT, but it is not a number, and a missing DATABASE_URL is a problem in itself.",
  },
  onCorrect:
    "Both checks fail, so the list holds two problems and the single error names them together, which lets whoever starts the service fix them in one go.",
  hints: ["Check each condition separately.", "The function throws once, after both checks have run."],
});

toChoice(b, "typn-a-typed-service-cast-checks", {
  prompt: "What does the cast in JSON.parse(text) as CreateUser check about the value at run time?",
  options: [
    "Nothing: the cast is erased and only changes what the compiler believes.",
    "That the value has every property of CreateUser.",
    "That each property has the type that CreateUser gives it.",
    "That the value is an object and not null.",
  ],
  correct: 0,
  misconceptions: {
    1: "A cast adds no code, so no property is looked for when the program runs.",
    2: "A cast adds no code, so no property is tested for its type when the program runs.",
    3: "A cast adds no code, so the value is not tested at all.",
  },
  onCorrect: "The cast compiles to the bare value, so every check of the shape has to be written as code that runs.",
  hints: ["Recall what an assertion compiles to.", "Types are erased before the program runs."],
});

toChoice(b, "typn-a-typed-service-count-ok", {
  prompt:
    "A parser accepts a body only if name is a string and age is a number. Which of these bodies does it refuse?",
  options: [
    '{ name: "Ada", age: 36 }',
    '{ name: "Cy", age: 0 }',
    '{ name: "Di", age: 1, admin: true }',
    '{ name: "Bo" }',
  ],
  correct: 3,
  misconceptions: {
    0: "Both fields are present and have the right types, so the parser accepts it.",
    1: "0 is a number, so the test for a numeric age passes even though 0 is falsy.",
    2: "The extra property admin is not part of the parser's two rules, so it does not stop the body being accepted.",
  },
  onCorrect: "There is no age, and typeof of a missing property is \"undefined\", so the test for a number fails.",
  hints: ["Check both rules for each body.", "Extra properties do not break a rule that does not mention them."],
});

toChoice(b, "typn-a-typed-service-shutdown-time", {
  prompt:
    "A request takes 300 ms to answer. 50 ms after it starts, the process gets SIGTERM, and its handler calls server.close() and does not call process.exit(). When is the response delivered?",
  options: [
    "At about 50 ms, when the signal cuts the request off.",
    "Never, because closing the server closes the connection too.",
    "At 300 ms as usual, because close() lets requests already in flight finish.",
    "After 300 ms plus a delay added by the shutdown.",
  ],
  correct: 2,
  misconceptions: {
    0: "server.close() stops new connections from being accepted, and it does not interrupt the requests that are already being served.",
    1: "server.close() leaves the open connections alone until their requests complete, and only then are they closed.",
    3: "The shutdown adds no delay of its own. The request goes on as it would have done and finishes when it was going to.",
  },
  onCorrect: "close() refuses new connections and lets the open ones complete, so the request finishes when it was always going to.",
  hints: ["Ask what close() does to a connection that is already open.", "Nothing in the handler ends the process early."],
});

toChoice(b, "typn-a-typed-service-pool-position", {
  prompt:
    "A graceful shutdown has four steps: A stop accepting new connections, B wait for requests in flight, C close the database pool, D exit with code 0. A service does step C first, as soon as the signal arrives. What goes wrong?",
  options: [
    "Nothing, because the pool can be closed at any point.",
    "The requests still in flight lose the pool they need, so they fail.",
    "The service keeps accepting new connections, so it never stops.",
    "The process exits with a non-zero code, because the steps are out of order.",
  ],
  correct: 1,
  misconceptions: {
    0: "A resource can be closed safely only when nothing is left that uses it, and requests in flight still need the pool.",
    2: "Closing the pool has no effect on accepting connections, which is a separate step, though new requests would find no pool.",
    3: "The exit code is chosen by the service, and the real problem is that unfinished requests have lost their database.",
  },
  onCorrect:
    "A resource is closed only when nothing is left to use it, so the pool comes after the wait for requests in flight.",
  hints: ["Ask which steps still need the pool.", "A resource is closed last, after its users have finished."],
});

toChoice(b, "typn-a-typed-service-check-members", {
  prompt:
    "type Result<T> = { ok: true; value: T } | { ok: false; error: string };\nfunction f(r: Result<number>) { return r.value; }\nWhat does the compiler report?",
  options: [
    "Nothing, because the successful member has a value.",
    "An error, because the failed member has no property called value.",
    "An error, because Result needs a constraint on T.",
    "An error, because r.ok has not been declared.",
  ],
  correct: 1,
  misconceptions: {
    0: "The union allows only what every member has, and the failed member has no value, so the read is refused until r.ok is tested.",
    2: "T can be any type here, and the error comes from reading a property that only one member of the union has.",
    3: "ok is declared in both members of the union, and it is what the code should test before reading value.",
  },
  onCorrect:
    "A property read is allowed only if every member of the union has it, so r.value needs a test of r.ok first, and the caller is forced to deal with failure.",
  hints: ["Think of Result as a union of two object types.", "Which member lacks value?"],
});

save(b);
