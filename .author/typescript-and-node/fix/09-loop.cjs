const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "the-node-event-loop";

setHook(b, L, [
  "Write a Node script that logs from five places, directly in the main code, in a nextTick callback, in a promise callback, in a zero-delay timer and in a setImmediate callback, and the lines will not appear in the order in which the code is written. Node does not run them at random, though, since every callback waits in a queue and the loop takes the queues in a fixed order, which is why the same calls can print in one order from the main script and in another from inside a file-read callback.",
  "All of this follows from the fact that Node runs your JavaScript on one thread, with callbacks taking turns. Knowing the order of the queues tells you which of two pieces of code will run first, and knowing that there is only one thread tells you why a timer can run late and what it costs a server when a long computation is left in a request handler.",
]);

for (const s of [
  "predict-the-order",
  "place-the-timer",
  "immediate-or-timer",
  "how-late-is-the-timer",
  "name-the-module",
])
  clearLead(b, L, s);

toChoice(b, "typn-the-node-event-loop-promise-position", {
  prompt:
    '// CommonJS\nsetTimeout(() => console.log("timeout"), 0);\nprocess.nextTick(() => console.log("tick"));\nPromise.resolve().then(() => console.log("promise"));\nconsole.log("sync");\nIn what order does the program print its four lines?',
  options: [
    "timeout, tick, promise, sync",
    "sync, timeout, tick, promise",
    "sync, tick, promise, timeout",
    "sync, promise, tick, timeout",
  ],
  correct: 2,
  misconceptions: {
    0: "The lines do not appear in the order of the code, because the synchronous code always finishes before any callback runs.",
    1: "A zero-delay timer still waits for the loop to reach the timers phase, and the nextTick and promise queues are emptied before the loop goes on.",
    3: "In a CommonJS file the nextTick queue is emptied before the promise queue, and only an ES module reverses the two.",
  },
  onCorrect:
    "The synchronous line runs first, then the nextTick queue, then the promise queue, and the timer only when the loop reaches its timers phase.",
  hints: ["The running code finishes before any callback starts.", "Two queues are emptied before the loop moves to its phases."],
});

toChoice(b, "typn-the-node-event-loop-position-b", {
  prompt:
    '// CommonJS\nconsole.log("a");\nsetTimeout(() => console.log("b"), 0);\nPromise.resolve().then(() => console.log("c"));\nprocess.nextTick(() => console.log("d"));\nconsole.log("e");\nIn what order does the program print its five lines?',
  options: ["a, e, b, c, d", "a, e, c, d, b", "a, e, d, c, b", "a, b, c, d, e"],
  correct: 2,
  misconceptions: {
    0: "The timer callback waits for the loop to reach its timers phase, which comes after both the nextTick and the promise queues have been emptied.",
    1: "In a CommonJS file the nextTick queue is emptied before the promise queue, so d comes before c.",
    3: "Callbacks never run in the middle of the running code, so both synchronous lines come first.",
  },
  onCorrect:
    "The two synchronous lines run first, then the nextTick queue, then the promise queue, and the timer is last.",
  hints: ["Place the two console.log calls in the main code first.", "Then empty the nextTick queue, then the promise queue."],
});

toChoice(b, "typn-the-node-event-loop-check-position", {
  prompt:
    '// CommonJS\nPromise.resolve().then(() => console.log("p"));\nprocess.nextTick(() => console.log("n"));\nconsole.log("s");\nIn what order does the program print its three lines?',
  options: ["p, n, s", "s, p, n", "n, p, s", "s, n, p"],
  correct: 3,
  misconceptions: {
    0: "The synchronous line runs before any callback does, and the nextTick queue is emptied before the promise queue.",
    1: "In a CommonJS file the nextTick queue is emptied before the promise queue, so n comes before p.",
    2: "Callbacks wait until the running code has finished, so the synchronous line comes first.",
  },
  onCorrect: "After the synchronous line, a CommonJS file empties the nextTick queue and then the promise queue.",
  hints: ["Synchronous code finishes first.", "Then the nextTick queue, then the promise queue."],
});

save(b);

// The opener no longer lists the order, so the worked example names its script by the first question.
{
  const b2 = load();
  const s = b2.lessons.find((l) => l.id === L).steps.find((x) => x.id === "trace-the-queues");
  s.headline = "Trace the four-line script from the first question through the queues.";
  save(b2);
}
