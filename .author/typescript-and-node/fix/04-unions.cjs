const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "unions-and-narrowing";

setHook(b, L, [
  "Take a function whose parameter x has the type string | number, and whose body asks for x.length. The checker refuses with TS2339, because x might be a number and a number has no length, and it will go on refusing until the code finds out which type x has. A test such as typeof x === \"string\" finds out, and inside the test the checker treats x as a string, while after a test that returns it treats x as the number that is left.",
  "That one mechanism covers most of what you do with unions, such as a function that accepts text or a number, or a result that is either a value or an error. Once the checker can follow your tests, a function can accept all of those forms and still be checked against each one, and a form you forgot becomes an error where you wrote the code instead of a crash for whoever supplies it.",
]);

for (const s of ["predict-the-union", "count-what-is-left", "predict-the-gap", "name-the-leftover", "chain-it"])
  clearLead(b, L, s);

toChoice(b, "typn-unions-and-narrowing-count-allowed", {
  prompt:
    "function f(x: string | number) {\n  x.toString();\n  x.valueOf();\n  x.toUpperCase();\n}\nWhich of the three calls does the compiler reject?",
  options: ["x.toString()", "x.valueOf()", "x.toUpperCase()", "None of them: all three compile"],
  correct: 2,
  misconceptions: {
    0: "Every string and every number has a toString method, so the call is valid whichever one x turns out to be.",
    1: "Both strings and numbers have a valueOf method, so the call is valid for either member of the union.",
    3: "One of the calls uses a method that only one member of the union has, and the checker refuses it until x is narrowed.",
  },
  onCorrect:
    "A string has toUpperCase and a number does not, so the checker reports TS2339 for it, while the other two methods exist on both members.",
  hints: ["An operation is allowed only if it is valid for every member of the union.", "Ask whether a number has each of the methods."],
});

toChoice(b, "typn-unions-and-narrowing-count-remaining", {
  prompt:
    'function f(x: string | number | boolean) {\n  if (typeof x === "string") return 1;\n  if (typeof x === "number") return 2;\n  return x;\n}\nWhat type does x have on the last line?',
  options: [
    "string | number | boolean, because a check only narrows x inside its own branch.",
    "boolean, because each if returns, so the type it checked for is gone afterwards.",
    "number | boolean, because only the first check removes its type from the code that follows.",
    "never, because both checks have already returned.",
  ],
  correct: 1,
  misconceptions: {
    0: "A branch that returns does not fall through, so the code after the if can only be reached by values that failed the check, and the checker removes the type that was tested.",
    2: "The second check works in the same way as the first: it returns for every number, so numbers cannot reach the last line either.",
    3: "A value that is neither a string nor a number can still arrive, and it passes both checks without matching either, so one type is left.",
  },
  onCorrect: "Each return removes the type its check was looking for, so only the third member of the union can reach the last line.",
  hints: ["Remove one type each time an if returns.", "Ask which values get past both checks."],
});

toChoice(b, "typn-unions-and-narrowing-missing-code", {
  prompt:
    "A type Shape is a union of circle, rect and tri. A function declared to return number handles only circle and rect in a switch on s.kind, and has no default branch. What does tsc report for the function?",
  options: [
    "No error, because a switch does not have to cover every member of a union.",
    "An error that the kind property does not exist on type Shape.",
    "An error that a switch must always end with a default branch.",
    "An error that the function can end without returning a number.",
  ],
  correct: 3,
  misconceptions: {
    0: "The function is declared to return a number, and for a tri it would return nothing, which is what the checker reports.",
    1: "kind is a property that every member of Shape has, so reading it is allowed.",
    2: "A default branch is optional, and what the checker objects to is the path that reaches the end of the function with no value.",
  },
  onCorrect:
    "The tri case falls out of the switch and reaches the end of the function with nothing returned, which tsc reports as TS2366.",
  hints: ["Follow a tri value through the switch.", "The declared return type promises a number on every path."],
});

toChoice(b, "typn-unions-and-narrowing-check-leftover", {
  prompt:
    'type U = "a" | "b" | "c";\nA switch on a value u of type U handles only case "a", and its default branch contains const x: never = u;\nThe error says the leftover type is not assignable to never. What is the leftover type?',
  options: ["All three members of U", '"b" | "c"', 'Only "a"', "never"],
  correct: 1,
  misconceptions: {
    0: 'The case for "a" has been handled, so the checker has removed that member before the default branch.',
    2: 'It is the handled member, "a", that is removed, and the unhandled ones are what remain in the default branch.',
    3: "If every member had been handled the leftover would be never and the line would compile, but two members have not been handled.",
  },
  onCorrect: "The default branch sees every member that no case has dealt with, and two of the three are still there.",
  hints: ["Remove each member that has a case.", "The default branch sees whatever is left."],
});

save(b);
