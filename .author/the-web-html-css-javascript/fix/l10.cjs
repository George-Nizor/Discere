const L = require("./lib.cjs");
const b = L.load();
const id = "the-event-loop-and-promises";
L.setOpener(b, id, [
  "If a script keeps the browser busy for two seconds, a button clicked during that time does nothing until the script is done, and then its handler runs. JavaScript runs one piece of code at a time, to the end, and anything that happens in the meantime, such as a click, a timer running out or a reply arriving from a server, leaves a callback waiting for its turn.",
  "Which waiting callback runs next is decided by a fixed rule, called the **event loop**, which keeps more than one queue and takes from them in a set order. Once you know the order you can read any short program that mixes ordinary code, timers, promises and await, and say what it prints.",
]);
for (const s of ["timer-zero", "slow-and-fast", "promise-and-timer", "count-before-e", "trace-the-await", "microtask-after-each-task"])
  L.cutLead(b, id, s);

L.makeChoice(b, "webhcj-the-event-loop-and-promises-predict-timer", {
  prompt: "console.log('x');\nsetTimeout(() => console.log('y'), 0);\nconsole.log('z');\nWhat is printed, in order?",
  options: [
    { label: "x y z", why: "A delay of 0 does not make the callback run at once. It is only queued, and it waits until the running script has finished." },
    { label: "x z y", correct: true },
    { label: "y x z", why: "The timer cannot run before the script has started, and it waits until the script has finished, so it comes last." },
  ],
  exampleAnswer: "The timer callback is queued as a task and runs only after the script has finished, so z prints before y.",
  hints: [
    "Does a delay of 0 run the callback at once?",
    "The callback waits until the running script is done.",
  ],
  onCorrect: "A zero delay means as soon as possible after the current code, and never in the middle of it.",
});

L.makeChoice(b, "webhcj-the-event-loop-and-promises-predict-promise", {
  prompt: "console.log(1);\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);\nWhat is printed, in order?",
  options: [
    { label: "1 2 3 4", why: "The script runs to the end before any callback does, so 4 is printed before the timer's 2 and the promise's 3." },
    { label: "1 4 2 3", why: "Both callbacks wait until the script has finished, but they do not wait in the same queue. The promise callback is taken first even though the timer was written earlier." },
    { label: "1 3 4 2", why: "A promise callback does not run at the moment it is registered. It waits for the script to finish, so 4 is printed before 3." },
    { label: "1 4 3 2", correct: true },
  ],
  exampleAnswer: "The script prints 1 and 4. The promise callback is a microtask and runs next, printing 3, and the timer task runs last, printing 2.",
  hints: [
    "The script itself runs to the end first.",
    "Between the script and the next task, the microtasks run.",
  ],
  onCorrect: "Microtasks are emptied before the next task is taken, so a promise callback beats a zero-delay timer even if it was queued later.",
});

// The count of lines before the timer tested remembering to count c and d; the full order tests the idea.
const old = L.question(b, "webhcj-the-event-loop-and-promises-count-before-timer");
const nq = {
  id: "webhcj-the-event-loop-and-promises-order-six",
  conceptIds: old.conceptIds,
  prompt: "console.log('a');\nconsole.log('b');\nPromise.resolve().then(() => console.log('c'));\nqueueMicrotask(() => console.log('d'));\nsetTimeout(() => console.log('e'), 0);\nconsole.log('f');\nWhat is printed, in order? Write the six letters with spaces.",
  responseType: "short_text",
  difficulty: 1.3,
  hints: [
    "List the script's own logs first.",
    "Both microtasks run before the timer, in the order they were queued.",
  ],
  sourceIds: old.sourceIds,
  onCorrect: "queueMicrotask adds a microtask in the same way as a promise callback does, so c and d both run before the timer prints e.",
  misconceptions: [],
  skill: old.skill,
  calculator: "off",
  answerAuthority: {
    kind: "text",
    acceptedIdeas: ["a b f c d e"],
    acceptedAlternatives: ["a, b, f, c, d, e", "a,b,f,c,d,e", "abfcde"],
    rejectedIdeas: [],
    exampleAnswer: "The script prints a, b and f. Then both microtasks run, printing c and d. Only then does the timer print e.",
  },
};
if (!b.questions.some((q) => q.id === nq.id)) b.questions.push(nq);
else Object.assign(b.questions.find((q) => q.id === nq.id), nq);
L.step(b, id, "count-before-e").checkQuestionId = nq.id;
const lessonObj = L.lesson(b, id);
console.log("questionIds has old:", lessonObj.questionIds.includes(old.id), "step ids:", lessonObj.steps.map((s) => s.checkQuestionId).filter(Boolean).length);
L.save(b);
