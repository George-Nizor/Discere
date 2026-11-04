const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "errors-and-concurrency";

setHook(b, L, [
  "Start three requests at once and let the second fail, and the program has to decide what to do with the other two, which may already have succeeded. Giving up on the whole group at the first failure is one answer, and it is what Promise.all does, while Promise.allSettled keeps every outcome so that the program can sort the successes from the failures, and the right choice depends on what one failure should mean for the group.",
  "The same care applies to the mistakes that make asynchronous code fail without a message, because a promise that nobody waits for does not announce itself. A forEach with an async callback finishes before its work has, a loop that awaits one task after another is slower than it needs to be, and a rejection that nobody handles ends a Node process, and each of these can be found by reading once you know what JavaScript does with a promise at the point where the code stops looking at it.",
]);

for (const s of [
  "predict-the-catch",
  "count-the-rejections",
  "time-the-loop",
  "trace-the-foreach",
  "read-the-exit-code",
  "name-the-abort",
])
  clearLead(b, L, s);

toChoice(b, "typn-errors-and-concurrency-catch-message", {
  prompt:
    'const slow = new Promise(r => setTimeout(r, 100));\ntry {\n  await Promise.all([Promise.resolve(1), Promise.reject(new Error("boom")), slow]);\n} catch (e) {\n  console.log(e.message);\n}\nWhat is printed?',
  options: ["1", "boom", "undefined", "Nothing is printed"],
  correct: 1,
  misconceptions: {
    0: "The first promise fulfils, but Promise.all does not give the catch block a value. It rejects with the error of the promise that failed.",
    2: "The catch block receives the error itself and not an array of results, and the error has a message.",
    3: "Promise.all rejects when any one promise rejects, so the await throws and the catch block runs.",
  },
  onCorrect:
    "Promise.all rejects with the error of the first promise to reject, so the catch block receives that error and the results of the others are lost.",
  hints: ["Ask what Promise.all does when one of its promises rejects.", "What does the catch block receive?"],
});

toChoice(b, "typn-errors-and-concurrency-count-rejected", {
  prompt:
    "const results = await Promise.allSettled([a(), b(), c(), d()]);\nTasks a and c fulfil, and tasks b and d reject. What happens?",
  options: [
    "The await throws the error from b, and the results of a and c are lost.",
    "results is an array of four entries, two with the status \"fulfilled\" and two with the status \"rejected\".",
    "results is an array of two entries, the ones that fulfilled.",
    "The await throws an array holding the errors from b and d.",
  ],
  correct: 1,
  misconceptions: {
    0: "That is what Promise.all does. allSettled never rejects, and it waits until every promise has settled.",
    2: "allSettled reports every promise, including the ones that rejected, and gives each an entry with its status.",
    3: "allSettled never rejects, so nothing is thrown. The failures appear in the array with the status \"rejected\".",
  },
  onCorrect:
    "allSettled waits for every promise and describes each outcome, so the program can sort the successes from the failures itself.",
  hints: ["allSettled never rejects.", "It describes every promise, whatever happened to it."],
});

toChoice(b, "typn-errors-and-concurrency-exit-code", {
  prompt:
    "node -e \"Promise.reject(new Error('x'))\"\nNo handler is registered anywhere. What happens?",
  options: [
    "The error is printed and the process ends with a non-zero exit code.",
    "The error is printed, but the process ends with exit code 0.",
    "Nothing is reported, and the process ends with exit code 0.",
    "Node waits for a handler to be added, and the process keeps running.",
  ],
  correct: 0,
  misconceptions: {
    1: "An unhandled rejection is treated as an uncaught error, which ends the process with a failure code, and a successful exit code would hide it from a shell or a build.",
    2: "Node does report an unhandled rejection, and since Node 15 it ends the process.",
    3: "Once the loop has moved on without a consumer for the rejection, Node treats it as uncaught and does not wait.",
  },
  onCorrect:
    "Since Node 15 the default is to print the error and end the process with exit code 1, which turns a forgotten await into a visible crash.",
  hints: ["Think about what Node does with an error that nothing catches.", "Look at the default since Node 15."],
});

save(b);
