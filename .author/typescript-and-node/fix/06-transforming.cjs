const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "transforming-types";

setHook(b, L, [
  "Here is a type, interface User { id: number; name: string; email?: string }. A form that creates a user needs the same fields without id, a request that updates one needs every field to be optional, and a list view needs only id and name. Each could be written out in full as a new type, but then each is a copy of User that has to be edited whenever User is, and sooner or later one of the copies is left behind.",
  "A derived type avoids this, because it is defined by the type it came from: Partial<User> is User with every field optional for as long as User exists. TypeScript supplies operators for deriving one type from another, and a set of built-in utility types made with them, so that a change to User is made in one place and every type derived from it follows.",
]);

for (const s of [
  "predict-keyof",
  "check-the-keys",
  "look-up-email",
  "name-the-utility",
  "count-the-values",
  "count-the-record",
])
  clearLead(b, L, s);

toChoice(b, "typn-transforming-types-keyof-count", {
  prompt:
    "type U = { id: number; name: string; email?: string };\ntype K = keyof U;\nWhat can a variable of type K hold?",
  options: [
    'Only "id" and "name", because email is optional.',
    "Any string at all.",
    "A number, a string or undefined, which are the types of the properties.",
    'Any of the three strings "id", "name" or "email".',
  ],
  correct: 3,
  misconceptions: {
    0: "An optional property is still a property of the type, so its name is one of the keys.",
    1: "keyof gives a union of the names themselves as string literals, so other strings are rejected.",
    2: "Those are the types of the properties, which indexed access reads. keyof gives their names.",
  },
  onCorrect: "keyof turns the property names into a union of string literals, optional properties included.",
  hints: ["keyof produces names, and the types of the properties are a different matter.", "An optional property still has a name."],
});

toChoice(b, "typn-transforming-types-valid-keys", {
  prompt:
    'type U = { id: number; name: string; email?: string };\nlet key: keyof U = "name";\nWhich of these assignments does the compiler reject?',
  options: ['key = "Name";', 'key = "email";', 'key = "id";'],
  correct: 0,
  misconceptions: {
    1: "email is an optional property, and an optional property still has a name that belongs to keyof U.",
    2: "id is one of the three property names, so it is a member of keyof U.",
  },
  onCorrect:
    "Property names are case-sensitive, so a string that differs only in a capital letter is not a member of keyof U.",
  hints: ["List the three strings that keyof U allows.", "Compare each candidate letter by letter."],
});

toChoice(b, "typn-transforming-types-count-values", {
  prompt:
    "const Sizes = { s: 10, m: 20, l: 30 } as const;\ntype V = typeof Sizes[keyof typeof Sizes];\nWhat is the type V?",
  options: [
    "number",
    '"s" | "m" | "l"',
    "10 | 20 | 30",
    "The type of the object itself, with all three properties",
  ],
  correct: 2,
  misconceptions: {
    0: "as const keeps each value as a literal type, so indexing the object's type gives the exact values.",
    1: "Those are the keys, which keyof typeof Sizes gives. Indexing the type by them gives the values stored there.",
    3: "Indexing a type by its keys reads the type of each property, so the result is the union of the property types.",
  },
  onCorrect:
    "keyof typeof Sizes is the union of the keys, and indexing the type of Sizes by that union gives the union of the values stored under them.",
  hints: ["keyof typeof Sizes gives the keys.", "Indexing by a key gives the type of the value stored there."],
});

toChoice(b, "typn-transforming-types-record-keys", {
  prompt:
    'const r: Record<"a" | "b" | "c", string> = { a: "x", b: "y" };\nWhat does the compiler report?',
  options: [
    "Nothing, because Record makes every property optional.",
    "An error saying that property c is missing.",
    "An error saying that Record accepts only one key at a time.",
    "An error saying that Record cannot be used with a union of keys.",
  ],
  correct: 1,
  misconceptions: {
    0: "Record requires one property for each key in the union, and it does not make any of them optional.",
    2: "Record is designed to take a union of keys and to build one property for each of them.",
    3: "A union of string literals is the usual key type for Record, and it builds one property per member.",
  },
  onCorrect:
    "Record builds one required property for each key in the union, so an object that gives only two of the three reports TS2741 for the third.",
  hints: ["Record<K, V> has one property for each member of K.", "Count the keys in the union and compare them with the object."],
});

toChoice(b, "typn-transforming-types-check-keys", {
  prompt:
    "const Dirs = { up: 1, down: 2, left: 3, right: 4 } as const;\ntype K = keyof typeof Dirs;\nWhat is the type K?",
  options: ["The values 1 | 2 | 3 | 4", "number", "string", '"up" | "down" | "left" | "right"'],
  correct: 3,
  misconceptions: {
    0: "Those are the values stored in the object. keyof gives the names of its properties.",
    1: "keyof does not give the type of the values, and it does not widen the keys to a general type.",
    2: "as const keeps each key as a literal, so keyof gives the exact names and does not widen them to string.",
  },
  onCorrect: "keyof typeof Dirs is the union of the object's property names, each kept as an exact string literal.",
  hints: ["keyof takes the names of the properties.", "typeof Dirs is the type of the frozen object."],
});

save(b);
