const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "inference-and-literal-types";

setHook(b, L, [
  'A TypeScript declaration can be written with no type at all, as in let a = 5, const b = 5 and let c = [1, "a"], and the compiler still gives each variable a type by reading the value on the right of the equals sign. The three types it chooses are not alike, because what the compiler concludes depends on what the value contains and on whether the variable can be changed later.',
  "Being able to predict those conclusions is what lets you read the many TypeScript files that have almost no written types, since the type of each variable there is whatever the compiler has worked out. It also tells you which types you must still write yourself, namely those the compiler has no value to learn from, such as a function's parameters before anyone has called it.",
]);

for (const s of ["predict-the-const", "widen-a-let", "freeze-two-properties", "check-the-tuples", "which-need-types"])
  clearLead(b, L, s);

toChoice(b, "typn-inference-and-literal-types-type-of-const", {
  prompt: "const b = 5;\nWhat type does the compiler infer for b?",
  options: ["number", "The literal type 5", "any", "No type, because b has no annotation and the compiler reports an error"],
  correct: 1,
  misconceptions: {
    0: "number is the type a let would get, because a let can be given another number later. A const can never change, so the compiler keeps the exact value as its type.",
    2: "any is what the compiler falls back on when it has no value to learn from, and here the value on the right is enough to give a precise type.",
    3: "An annotation is only needed where there is no value to read, and the declaration is accepted as it stands, with the type taken from the value.",
  },
  onCorrect:
    "A const can never be reassigned, so the compiler keeps the exact value as its type instead of widening it to number.",
  hints: ["Ask whether b can ever hold a different value.", "A type can be as narrow as a single value."],
});

toChoice(b, "typn-inference-and-literal-types-count-reassignable", {
  prompt:
    'const e = { kind: "circle", size: 3 } as const;\nWhich of these statements does the compiler reject?',
  options: ["console.log(e.kind);", "const next = e.size + 1;", "const copy = { ...e };", "e.size = 3;"],
  correct: 3,
  misconceptions: {
    0: "Reading a property is always allowed. as const stops a property being written to, and it leaves reading alone.",
    1: "Reading e.size to calculate with it is allowed. The property is read-only, so nothing may be assigned to it.",
    2: "Copying the properties into a new object only reads them, and the new object is a separate value.",
  },
  onCorrect:
    "as const makes every property of the object readonly, so any assignment is refused even when the new value equals the old one.",
  hints: ["as const adds a modifier to every property.", "Ask which statement writes to a property instead of reading it."],
});

toChoice(b, "typn-inference-and-literal-types-count-tuple-errors", {
  prompt: "A variable has the type [string, number]. Which of these arrays can be assigned to it?",
  options: ['["b", 2, 3]', '[4, "c"]', '["a", 1]', '["d"]'],
  correct: 2,
  misconceptions: {
    0: "The tuple allows exactly two elements, and the compiler reports Source has 3 element(s) but target allows only 2.",
    1: "The length is right, but the types are in the wrong order, and the compiler reports a mismatch at each position.",
    3: "The tuple requires two elements, and the compiler reports Source has 1 element(s) but target requires 2.",
  },
  onCorrect:
    "Only an array with exactly two elements, a string first and a number second, keeps both promises that the tuple makes.",
  hints: ["A tuple promises a length and a type at each position.", "Check the length first, then the order."],
});

toChoice(b, "typn-inference-and-literal-types-count-annotations", {
  prompt:
    "Which of these declarations needs a type written by hand, because the compiler cannot work it out from the code?",
  options: [
    "function area(r) { return r * r; }",
    "const n = 5;",
    'let s = "a";',
    "const ok = true;",
  ],
  correct: 0,
  misconceptions: {
    1: "The value 5 is enough for the compiler to give n a type.",
    2: 'The value "a" is enough for the compiler to give s the type string.',
    3: "The value true is enough for the compiler to give ok a type.",
  },
  onCorrect:
    "A parameter has no value until someone calls the function, so the compiler reports TS7006 and r needs an annotation such as r: number.",
  hints: ["Inference needs a value to read.", "Ask which declaration has nothing on the right of an equals sign."],
});

toChoice(b, "typn-inference-and-literal-types-check-members", {
  prompt: 'const dirs = ["up", "down", "left"] as const;\nWhat is the type typeof dirs[number]?',
  options: ["string", '"up" | "down" | "left"', "The type of dirs itself, a readonly tuple of three strings", "number"],
  correct: 1,
  misconceptions: {
    0: "as const keeps each exact value as a literal type, so the elements are not widened to string.",
    2: "That is the type of dirs itself. Indexing it with number picks out the type of any one element instead.",
    3: "number is the type of the index. The type of an element is what sits at that index.",
  },
  onCorrect: "Indexing the frozen tuple with number gives the union of its exact element types, so the list works as data and as a type.",
  hints: ["Think of dirs[number] as any element of dirs.", "as const keeps each exact value."],
});

save(b);
