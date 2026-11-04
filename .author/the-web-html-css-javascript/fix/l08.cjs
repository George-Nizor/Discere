const L = require("./lib.cjs");
const b = L.load();
const id = "functions-scope-and-closures";
L.setOpener(b, id, [
  "A function can use a name that it never declares itself. In let rate = 0.2; function tax(price) { return price * rate; }, the name rate is not declared inside tax, so JavaScript looks for it in the code around the function and finds the variable on the first line. The search always runs outward from where the code is written, whether the function is called there or from somewhere else entirely, and this one rule, called **lexical scope**, decides what every name in a program refers to.",
  "A function that is returned from the code that made it finds its names in the same way, which is why it can keep using variables after the code that declared them has finished running, and the same lookup explains why a var inside a loop behaves differently from a let. Once you can follow it, you can say for any name which variable it refers to and what a function or a callback will print when it runs later.",
]);
for (const s of ["a-counter", "which-x", "two-counters-try", "typeof-before", "which-throws", "three-timers", "double-each", "later-change"])
  L.cutLead(b, id, s);

L.makeChoice(b, "webhcj-functions-scope-and-closures-predict-counter", {
  prompt: "function makeCounter() { let n = 0; return () => ++n; }\nconst c = makeCounter();\nc(); c();\nconsole.log(c());\nWhat does this print?",
  options: [
    { label: "1, because each call starts again with n at 0", why: "n is not reset between calls. The returned function keeps using the same n, so each call adds one more to it." },
    { label: "3, because n keeps its value between calls", correct: true },
    { label: "An error, because n cannot be seen once makeCounter has returned", why: "The returned function was created inside makeCounter, so it can still reach n there, and n stays alive for as long as that function does." },
  ],
  exampleAnswer: "Each call of c adds 1 to the same n, which makeCounter's inner function keeps. The third call returns 3.",
  hints: [
    "Does n start again from 0 at each call of c?",
    "The inner function keeps using the same n.",
  ],
  onCorrect: "The variable n outlives the call of makeCounter that created it, because the returned function still refers to it.",
});

L.makeChoice(b, "webhcj-functions-scope-and-closures-typeof-hoist", {
  prompt: "console.log(typeof f, typeof g);\nfunction f() {}\nvar g = function () {};\nWhat is printed?",
  options: [
    { label: "undefined undefined", why: "A function declaration is hoisted with its whole body, so f is already a function when the first line runs." },
    { label: "function function", why: "Only the function declaration is hoisted with its body. g is a var, which is set up early but holds undefined until the line that assigns it has run." },
    { label: "It throws a ReferenceError", why: "Both names have been set up before the first line runs, so neither use throws. Only a let or a const would throw there." },
    { label: "function undefined", correct: true },
  ],
  exampleAnswer: "The function declaration f is available from the start, while g exists but holds undefined until its line runs.",
  hints: [
    "Think about what each declaration has done before the first line runs.",
    "A var is set up early with the value undefined.",
  ],
  onCorrect: "A function declaration is hoisted with its body, whereas a var is hoisted without its value.",
});

L.makeChoice(b, "webhcj-functions-scope-and-closures-var-loop", {
  prompt: "for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);\nWhat is printed, in order, on its three lines?",
  options: [
    { label: "0 1 2", why: "That would need a separate i for each callback. With var the loop has one i, and it has reached 3 before any callback runs." },
    { label: "2 2 2", why: "The loop stops only when i reaches 3, and the callbacks run after it has stopped, so the variable they read holds 3 and not the last value used inside the body." },
    { label: "3 3 3", correct: true },
  ],
  exampleAnswer: "The callbacks run after the loop has finished, and they all read the one shared i, which is 3.",
  hints: [
    "When do the callbacks run, before or after the loop ends?",
    "How many variables named i exist when var is used?",
  ],
  onCorrect: "A var belongs to the function and not to the loop body, so every callback sees the final value.",
});
L.save(b);
