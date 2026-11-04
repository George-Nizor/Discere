const { load, save, para, lesson, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "generics";

// Keep the first paragraph of the opener; rewrite the second.
const hook = lesson(b, L).intro.hook;
hook.blocks[1] = para(
  "A **type parameter** gives the function a name for the type it is working with, so that the function is written once and each call fills in the type, which keeps the link between what goes in and what comes out. It is the feature behind the signatures of most libraries, and once you can substitute what a call supplies into a signature such as <T extends { length: number }>(a: T, b: T), you can say what the call produces and which calls the compiler will refuse.",
);

for (const s of ["predict-the-result", "count-the-union", "which-calls-fail", "id-and-literals", "unwrap-the-promise"])
  clearLead(b, L, s);

toChoice(b, "typn-generics-type-of-first", {
  prompt:
    "function first<T>(xs: T[]): T | undefined { return xs[0]; }\nconst a = first([1, 2]);\nWhat is the type of a?",
  options: ["any", "T | undefined", "number | undefined", "number"],
  correct: 2,
  misconceptions: {
    0: "The point of the type parameter is that the compiler keeps what it knows about the list, so the result is not any.",
    1: "T is a name that each call fills in. The type of a is what you get after substituting what the list supplies.",
    3: "The signature says the function may return undefined, for example when the list is empty, so that is part of the result type.",
  },
  onCorrect:
    "The list holds numbers, so T is number, and the signature then gives the result as that type together with undefined.",
  hints: ["Replace T with the type of the list's elements.", "Read the whole return type, including what follows T."],
});

toChoice(b, "typn-generics-count-members", {
  prompt:
    'function first<T>(xs: T[]): T | undefined { return xs[0]; }\nconst c = first(["a", 1]);\nWhat is the type of c?',
  options: ["string | undefined", "string | number | undefined", "any", "number | undefined"],
  correct: 1,
  misconceptions: {
    0: "The list has a number as well as a string, and T has to cover every element.",
    2: "The compiler infers T from the elements of the list, so it has a precise type to substitute and does not fall back to any.",
    3: "The list has a string as well as a number, and T has to cover every element.",
  },
  onCorrect:
    "The elements are of two kinds, so T is string | number, and the result adds undefined to that union.",
  hints: ["First work out T from the elements of the list.", "Then substitute it into T | undefined."],
});

toChoice(b, "typn-generics-count-bad-calls", {
  prompt:
    "function longest<T extends { length: number }>(a: T, b: T) { ... }\nBoth arguments of a call must have a numeric length. Which of these calls is rejected because its two arguments do not agree on a single T?",
  options: [
    'longest("ab", [1])',
    'longest("ab", "c")',
    "longest([1], [2, 3])",
    "longest({ length: 2 }, { length: 5 })",
  ],
  correct: 0,
  misconceptions: {
    1: "Both arguments are strings, so T can be string for both parameters.",
    2: "Both arguments are arrays of numbers, so T can be number[] for both parameters.",
    3: "Both arguments are objects with a numeric length, so one T covers both.",
  },
  onCorrect:
    "A string and an array each have a length, but the two parameters share one T, which the compiler takes from the first argument and then rejects the second.",
  hints: ["Both parameters use the same T.", "Look for the call whose arguments are of different kinds."],
});

toChoice(b, "typn-generics-id-literal", {
  prompt:
    "function id<T>(x: T): T { return x; }\nconst r = id(5);\nWhat is the type of r?",
  options: ["number", "T", "unknown", "The literal type 5"],
  correct: 3,
  misconceptions: {
    0: "The call supplies the argument's type for T, and the argument is the literal value in a const, so the compiler does not widen it.",
    1: "T is a name in the signature, and each call replaces it with what the argument supplies.",
    2: "unknown would discard what the call tells the compiler, and a type parameter keeps that information.",
  },
  onCorrect:
    "T is filled in from the argument, the literal is not widened because r is a const, and the result type is T, so r has the exact type of the value passed in.",
  hints: ["The result type is T, and the call fills in T from its argument.", "Recall how a const treats a literal."],
});

save(b);
