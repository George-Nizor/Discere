const L = require("./lib.cjs");
const b = L.load();
const id = "values-types-and-coercion";
L.setOpener(b, id, [
  "The 7 in an expression and the '7' in quotes look alike on screen, but the first is a number and the second a string, and JavaScript treats them as different values: 7 === '7' is false, and a form field that contains the text 7 hands your code the string. Every value has a type, and an operator decides what to do from the types on its two sides. When they do not suit the operator, JavaScript converts one or both values to a type that does and carries on, a step called **coercion**.",
  "Most of what looks unpredictable in JavaScript is a conversion that you did not know was happening, together with the way numbers are stored, and each follows a rule that the language applies in the same way every time. With the rules you can read an expression and say what it evaluates to, instead of running it and hoping.",
]);
for (const s of ["add-two-booleans", "how-many-falsy", "which-comparison", "null-and-undefined", "compare-the-sum"])
  L.cutLead(b, id, s);
// predict screens whose lead retold the question
L.cutLead(b, id, "five-plus-three");
L.cutLead(b, id, "null-type");
// the sort screen's lead holds a fact the question needs and the lesson does not teach elsewhere
L.setLead(b, id, "default-sort", ["The default sort converts the values it compares to strings."]);

L.makeChoice(b, "webhcj-values-types-and-coercion-plus-and-minus", {
  prompt: "What does console.log('5' + 3, '5' - 3) print?",
  options: [
    { label: "8 2", why: "The + would add only if both operands were numbers. Here one operand is a string, so the operator does something else with it." },
    { label: "53 53", why: "Only one of the two operators joins text. The other has no meaning for text, so it converts both operands to numbers." },
    { label: "53 2", correct: true },
    { label: "An error, because a string and a number cannot be combined", why: "JavaScript does not refuse to combine them. It converts one or both operands to a type that the operator can use and carries on." },
  ],
  hints: [
    "Decide separately what each operator does when one operand is a string.",
    "One of the two operators joins text.",
  ],
  onCorrect: "The two operators treat a string differently: + joins, and - always works on numbers.",
});

L.makeChoice(b, "webhcj-values-types-and-coercion-typeof-null", {
  prompt: "The typeof operator returns a string naming the type of its operand. What does typeof null return?",
  options: [
    { label: "'null'", why: "That is what the list of types suggests, but typeof reports 'object' for null. This is an error in the first version of the language that was kept because pages depended on it." },
    { label: "'object'", correct: true },
    { label: "'undefined'", why: "undefined is a separate value, and typeof undefined is 'undefined'. null is reported differently, as 'object'." },
  ],
  hints: [
    "null is a primitive, but typeof does not report it that way.",
    "It shares an answer with arrays and plain objects.",
  ],
  exampleAnswer: "typeof null is 'object', a quirk from the first version of the language that was kept for compatibility.",
  onCorrect: "To test for null, compare with === null. typeof cannot tell null from an object.",
});

L.makeChoice(b, "webhcj-values-types-and-coercion-count-falsy", {
  prompt: "Which of these six values are truthy: 0, '0', [], '', null, NaN?",
  options: [
    { label: "The string '0' and the empty array", correct: true },
    { label: "Only the string '0'", why: "An empty array is an object, and every object is truthy, so [] is truthy as well." },
    { label: "The string '0', the empty array and the empty string", why: "The empty string is one of the eight falsy values, whatever the string might otherwise look like." },
    { label: "The number 0, the empty string and null", why: "Those are three of the falsy values. A condition reads each of them as false." },
  ],
  exampleAnswer: "The falsy ones are 0, the empty string, null and NaN. The string '0' and the empty array are truthy.",
  hints: [
    "Recall the short list of falsy values. Everything else is truthy.",
    "A non-empty string is truthy, whatever it says, and an empty array is an object.",
  ],
  onCorrect: "Only eight values are falsy: false, 0, -0, 0n, the empty string, null, undefined and NaN. The string '0' and the empty array are truthy, and 0, '', null and NaN are the four falsy values here.",
});
L.save(b);
