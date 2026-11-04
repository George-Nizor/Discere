const { load, save, para, lesson, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "types-at-the-edges";

const hook = lesson(b, L).intro.hook;
hook.blocks[1] = para(
  "Everything that comes into a program from outside, from a file, a request or a form, has the same problem, so the types you have learned so far reach only as far as the data that was already typed. Some of TypeScript's tools check a value at that boundary and others only change what the compiler believes about it, and knowing which is which lets you place the checking where the data arrives, so that a bad value is reported there and not at some distant line that happens to use it.",
);

for (const s of [
  "predict-unknown",
  "choose-the-type",
  "what-does-it-print",
  "type-of-the-index",
  "read-satisfies",
  "the-bug-it-hides",
])
  clearLead(b, L, s);

toChoice(b, "typn-types-at-the-edges-count-unknown", {
  prompt:
    "A function declares its parameter as input: unknown. Before the function has checked the value with typeof or a similar test, what may it do with input?",
  options: [
    "Call any method on it, because unknown accepts every value.",
    "Read its properties, but not call methods on it.",
    "Nothing that depends on what kind of value it is, such as calling a method or reading a property.",
    "Anything that is valid for a string, since strings are the commonest unknown values.",
  ],
  correct: 2,
  misconceptions: {
    0: "That is what any allows. unknown accepts every value but allows nothing to be done with it until its kind has been proved.",
    1: "Reading a property is refused as well, because the checker does not yet know that the value has one.",
    3: "The checker makes no assumption about the kind of value, so an operation valid only for strings is refused until a check proves that it is one.",
  },
  onCorrect:
    "unknown accepts any value, but until a check has narrowed it the checker allows no property access, no call and no assignment to a more specific type.",
  hints: ["Compare unknown with any.", "Ask what the checker knows about the value before any test."],
});

save(b);
