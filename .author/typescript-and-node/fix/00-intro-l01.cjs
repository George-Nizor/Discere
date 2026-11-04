const { load, save, setHook, clearLead, question } = require("./lib.cjs");
const b = load();

b.course.introduction.paragraphs = [
  "Call a JavaScript function that adds up prices with a list of names instead of numbers and the call goes ahead, with nothing complaining until the total comes out as nonsense, perhaps in front of a user. TypeScript is JavaScript with labels added to the code, such as price: number, together with a compiler that reads the labels before the program runs and reports the bad call where it is written. The labels are removed again when the JavaScript is written, so they cost nothing while the program runs, and what they give you is a way to find a whole class of mistakes in how values fit together by reading the code instead of waiting for it to fail.",
  "Node.js is the program that runs JavaScript outside a browser, which lets the same language read files, answer network requests and start other programs. It runs your code on a single thread, and an event loop decides which waiting callback goes next, so a server that handles many requests at once is mostly a program that waits, and one slow calculation holds up every request behind it. Because the order of callbacks follows fixed rules, and because a stream moves a large file through memory in chunks instead of all at once, you can work out from the code alone what a Node program will print, when it will print it and whether it will hold a whole file in memory.",
  "The two meet where data enters a program. A type is a promise the author makes about a value, and because the labels are gone by the time the program runs, nothing checks that promise for a request body, a file or an environment variable, all of which arrive as text or bytes. A typed Node service is therefore only as reliable as the point at which it checks what comes in, and knowing which of its guarantees come from the compiler and which have to be tested while it runs is what lets you read such a service and say where it can still fail.",
];

const L = "what-types-are-for";
setHook(b, L, [
  "Run this line of JavaScript, let n = 5; n = \"five\";, and it works without complaint, because a JavaScript variable may hold a number at one moment and a string the next. The same two lines in TypeScript, with n labelled as a number, are rejected before they ever run: error TS2322: Type 'string' is not assignable to type 'number'. The label is the whole difference, and the price of it is a second tool, the TypeScript compiler (tsc), that reads your code before JavaScript runs it.",
  "That tool works in two stages: a checker that reads the labels and reports every mistake it finds, and an emitter that writes the JavaScript which Node or a browser will actually run. The stages are separate, so the checker can reject the second line while the file is still only text, long before any user could reach it. Keeping them apart is also the reason a program with errors can still run, and the reason a type can never be looked at while the program does.",
]);
for (const s of [
  "find-the-error",
  "guess-the-output",
  "count-the-parameters",
  "check-an-interface",
  "after-the-error",
  "name-the-option",
  "trust-the-label",
]) clearLead(b, L, s);
question(b, "typn-what-types-are-for-print-undefined").prompt =
  "This program is compiled and then run with Node. What does it print?\n\ninterface User { name: string }\nconst u: User = JSON.parse('{\"id\": 7}');\nconsole.log(u.name);";
save(b);

// A count of parameters tests nothing the code does not already show; ask for the compiled function instead.
{
  const { toChoice: tc } = require("./lib.cjs");
  const b2 = load();
  tc(b2, "typn-what-types-are-for-count-params", {
    prompt:
      "A TypeScript file contains\nexport function add(a: number, b: number): number { return a + b; }\nWhich function does the compiled JavaScript contain?",
    options: [
      "export function add() { return a + b; }",
      "export function add(a, b) { return a + b; }",
      "export function add(a: number, b: number) { return a + b; }",
    ],
    correct: 1,
    misconceptions: {
      0: "The names a and b are not types, and the body still uses them, so they stay. Erasure removes the labels that follow the names and leaves the parameters.",
      2: "The return type is erased, and so are the labels on the parameters, because a JavaScript engine would reject them as a syntax error.",
    },
    onCorrect: "Erasure removes labels and leaves behaviour alone, so the parameters and the body come through as written.",
    hints: ["Rewrite the function with every label that follows a colon deleted.", "The names inside the parentheses are not types."],
  });
  save(b2);
}
