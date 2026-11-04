const L = require("./lib.cjs");
const b = L.load();
const id = "objects-arrays-and-references";
L.setOpener(b, id, [
  "In JavaScript [1, 2] === [1, 2] is false, although both sides hold the same two numbers. The variable that names an array holds a **reference** to it, a record of where the array is, and === asks whether two references lead to the same array. Each pair of brackets above builds a new array, so the two sides lead to different ones, whereas numbers and strings are compared by their values, which is why 1 === 1 is true.",
  "Once you know what a name holds, you can say for any short piece of code which names will see a change, whether a copy still shares part of the original, and which array methods rearrange the array they are called on instead of returning a new one.",
]);
for (const s of ["push-through-alias", "which-line-throws", "copy-and-change", "sort-in-place", "sort-a-copy", "evaluate-the-chain"])
  L.cutLead(b, id, s);
L.setLead(b, id, "parseint-trap", ["parseInt takes a second argument, the radix, which is the base in which it reads the digits."]);

L.makeChoice(b, "webhcj-objects-arrays-and-references-predict-push", {
  prompt: "const s = ['x', 'y'];\nconst t = s;\nt.push('z');\nconsole.log(s.length);\nWhat does this print?",
  options: [
    { label: "3, because s and t are two names for one array", correct: true },
    { label: "2, because t is a copy and s never sees the push", why: "t is not a separate array. It is another name for the array s refers to, so the push is visible through s." },
    { label: "An error, because s is a const and cannot be changed", why: "A const fixes which array the name refers to, not what the array holds, so pushing onto it is allowed." },
  ],
  exampleAnswer: "t = s copies the reference, so s and t are two names for one array, and the push adds a third item to it.",
  hints: [
    "Does t = s make a second array?",
    "Both names point at the same array.",
  ],
  onCorrect: "An assignment of an array copies the reference, so a change made through one name is seen through the other.",
});

L.makeChoice(b, "webhcj-objects-arrays-and-references-predict-nested", {
  prompt: "const o = { x: { y: 1 } };\nconst c = { ...o };\nc.x.y = 2;\nconsole.log(o.x.y);\nWhat does this print?",
  options: [
    { label: "1, because the spread copied everything inside o as well", why: "The spread did not copy the inner object, only the reference to it, so the change reaches o." },
    { label: "undefined, because the copy has no property y of its own", why: "The copy does have x, and c.x leads to the same inner object as o.x, so y is found there and holds the new value." },
    { label: "2, because the copy and o still share the inner object", correct: true },
  ],
  exampleAnswer: "The spread copies the top level only, so c.x and o.x refer to one inner object, and the change is seen through o.",
  hints: [
    "Does the spread copy the inner object, or only the reference to it?",
    "c.x and o.x point at the same inner object.",
  ],
  onCorrect: "A spread copy is shallow: nested objects are shared and only the top level is new.",
});

L.makeChoice(b, "webhcj-objects-arrays-and-references-predict-sort", {
  prompt: "const n = [3, 1, 2];\nn.sort();\nconsole.log(n[0]);\nWhat does this print?",
  options: [
    { label: "3, because sort returns a sorted array and leaves n as it was", why: "sort works in place, so n itself is reordered and its first item is no longer 3." },
    { label: "1, because sort reorders n itself", correct: true },
    { label: "undefined, because sort returns nothing and so n is empty", why: "sort does return an array, the same one it sorted, and n still holds all three numbers in their new order." },
  ],
  exampleAnswer: "sort changes the array in place, so n now holds 1, 2, 3 and n[0] is 1.",
  hints: [
    "Does sort return a copy, or reorder the array it was called on?",
    "After sort, the array n is reordered.",
  ],
  onCorrect: "sort reorders the array it is called on and also returns that same array.",
});
L.save(b);
