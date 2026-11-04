const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "shapes-and-structural-typing";

setHook(b, L, [
  "A function that greets a user needs one thing from its argument, a property called name that holds a string, and it makes no difference to the function how that argument was made, whether as an object literal, by a class or by parsing JSON. TypeScript writes that need down as an object type, such as { name: string }, which lists the properties a value must have and the type of each, so that checking a call becomes a question of whether the value handed over has what the type lists.",
  "Once you can say from the properties alone whether a value fits, you can predict which assignments the compiler will accept, and you can read its refusals, which name the property that is missing, the one it does not expect or the one that may not be assigned to.",
]);

for (const s of ["predict-the-dog", "sort-the-values", "spot-the-readonly", "merge-or-clash"]) clearLead(b, L, s);

toChoice(b, "typn-shapes-and-structural-typing-dog-fits", {
  prompt:
    'interface Named { name: string }\nclass Dog { name = "d"; bark() {} }\nconst n: Named = new Dog();\nDoes this compile?',
  options: [
    "Yes, because Dog has a string property called name, which is all that Named asks for.",
    "No, because Dog never says that it implements Named.",
    "No, because Dog has a method, bark, that Named does not list.",
    "Yes, but only after Dog is changed to say that it implements Named.",
  ],
  correct: 0,
  misconceptions: {
    1: "The compiler does not look for a declared relationship. It compares the properties each type has, and Dog has the one that Named requires.",
    2: "Extra properties never stop a value fitting a type, since everything the target needs is still present.",
    3: "The implements keyword only asks the compiler to check a class against an interface at the class itself. It is never required for a value to fit.",
  },
  onCorrect:
    "TypeScript compares shapes, so any value with a string property called name fits Named, whatever else it has and however it was declared.",
  hints: ["Ask what Named requires of a value.", "Look at what Dog has, and ignore how it was declared."],
});

toChoice(b, "typn-shapes-and-structural-typing-count-fits", {
  prompt:
    "interface Named { name: string }\nEach value below is first held in a variable and then assigned to a variable of type Named. Which one cannot be assigned?",
  options: [
    '{ name: "a", age: 3 }',
    '{ name: "c" }',
    "{ id: 7 }",
    'an instance of a class with name = "d" and a method bark()',
  ],
  correct: 2,
  misconceptions: {
    0: "The extra property age does no harm, because everything Named requires is present.",
    1: "This object has exactly the property Named requires, with the right type.",
    3: "A class instance is compared by its properties like any other value, and this one has a string name.",
  },
  onCorrect:
    "The value has no property called name, so it lacks what Named requires. Extra properties are harmless, but a missing property or one of the wrong type is not.",
  hints: ["Extra properties are allowed.", "Check that each value has name, and that it holds a string."],
});

toChoice(b, "typn-shapes-and-structural-typing-count-readonly", {
  prompt:
    "interface P { readonly x: number; y: number }\nconst p: P = { x: 1, y: 1 };\nWhich of these statements does the compiler reject?",
  options: ["p.y = p.x;", "const sum = p.x + p.y;", "p.x = p.x + 1;", "p.y = 2;"],
  correct: 2,
  misconceptions: {
    0: "p.x is only read here, and the assignment is to y, which is not read-only.",
    1: "Reading both properties is allowed. readonly forbids assigning to a property and has no effect on reading it.",
    3: "y has no modifier, so it can be assigned as often as you like.",
  },
  onCorrect:
    "The right-hand side only reads x, which is allowed, but the statement assigns to x, and TS2540 reports that it is a read-only property.",
  hints: ["readonly stops writes and allows reads.", "Look at which property is on the left of each equals sign."],
});

toChoice(b, "typn-shapes-and-structural-typing-which-merges", {
  prompt:
    "Two interfaces in one file share a name, and so do two type aliases. What does the compiler do?",
  options: [
    "It reports an error for the interfaces and merges the type aliases into one type.",
    "It merges both pairs, each into one type.",
    "It reports an error for both pairs.",
    "It merges the interfaces into one type and reports an error for the type aliases.",
  ],
  correct: 3,
  misconceptions: {
    0: "It is the other way round, since the interface is the declaration that can be added to later.",
    1: "Only one of the two kinds merges. The other treats a repeated name as a duplicate.",
    2: "One of the two kinds is designed to be declared more than once and merged.",
  },
  onCorrect:
    "Declaration merging is a feature of interfaces, so a second interface with the same name adds properties to the first, while a repeated type alias is reported as TS2300.",
  hints: ["One of the two keywords allows a type to be extended by later declarations."],
});

toChoice(b, "typn-shapes-and-structural-typing-check-readonly", {
  prompt:
    'interface P { readonly id: number; name: string }\nconst p: P = { id: 1, name: "a" };\nWhich of these statements does the compiler accept?',
  options: ["p.id = 2;", 'p.name = "b";', "p.id = p.id;", "p.id = p.id + 1;"],
  correct: 1,
  misconceptions: {
    0: "id is read-only, so any assignment to it is reported, whatever value is assigned.",
    2: "Assigning a property its own value is still an assignment, and a read-only property refuses it.",
    3: "Reading id on the right is fine, but the assignment to id on the left is what the compiler rejects.",
  },
  onCorrect: "Only name is free to change, because readonly applies to id alone and does not depend on the value assigned.",
  hints: ["A read-only property rejects every assignment.", "Look at the property on the left of each equals sign."],
});

save(b);
