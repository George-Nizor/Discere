const { load, save, setHook, clearLead, toChoice } = require("./lib.cjs");
const b = load();
const L = "what-node-is";

setHook(b, L, [
  "The expression Math.max(3, 7) gives 7 in a browser's console and in Node alike, because both run the same language. A line that reads a file from the disk works only in Node, though, and a line that changes the page works only in the browser, since each platform places its own set of objects and functions around the engine that runs the JavaScript. Node's set is built for a program that has no page: it reads files, listens on a network port and can see the environment it was started in.",
  "That is why servers, tools and build scripts are written for Node, and it shows in the first lines of nearly every such program, which load other modules and read settings from the environment. Node has two module systems and passes its settings in as text, so knowing both is what lets you read a Node file and tell which names it may use and what the values it reads will look like.",
]);

for (const s of [
  "which-globals",
  "predict-dirname",
  "replace-dirname",
  "sort-the-specifiers",
  "predict-env",
  "empty-port",
])
  clearLead(b, L, s);

toChoice(b, "typn-what-node-is-count-undefined", {
  prompt: 'In Node, which of these expressions gives the string "undefined"?',
  options: ["typeof process", "typeof document", "typeof fetch", "typeof setTimeout"],
  correct: 1,
  misconceptions: {
    0: "process is Node's object for the running program and its environment, so it exists and typeof gives \"object\".",
    2: "fetch exists in Node as well as in a browser, since both platforms provide it, and typeof gives \"function\".",
    3: "The timer functions exist on both platforms, and typeof gives \"function\".",
  },
  onCorrect:
    "document belongs to the page that a browser provides, and Node has no page, so it is undefined there, along with window.",
  hints: ["Ask which of these names belong to a web page.", "Some names exist on both platforms."],
});

toChoice(b, "typn-what-node-is-count-builtins", {
  prompt: "Which of these imports loads a built-in module of Node?",
  options: [
    'import express from "express";',
    'import { path } from "./path.js";',
    'import http from "node:http";',
    'import lodash from "lodash";',
  ],
  correct: 2,
  misconceptions: {
    0: "A bare name is a package, which Node searches for in the node_modules folders.",
    1: "A path that starts with a dot is a file of your own, whatever its name looks like.",
    3: "A bare name is a package, which Node searches for in the node_modules folders.",
  },
  onCorrect: "The node: prefix marks a built-in module that comes with Node, so no package is involved.",
  hints: ["Look at the form of each specifier, not at the names.", "One prefix marks the built-in modules."],
});

toChoice(b, "typn-what-node-is-env-typeof", {
  prompt: "process.env.N = 5;\nconsole.log(typeof process.env.N);\nWhat is printed?",
  options: ["string", "number", "undefined", "Nothing, because Node throws a TypeError"],
  correct: 0,
  misconceptions: {
    1: "Environment variables are text, so a value assigned to process.env is converted to text when it is stored.",
    2: "The assignment sets the entry, so it exists, but as text.",
    3: "The assignment is accepted, and the value is converted to text.",
  },
  onCorrect: "Every entry of process.env is a string, so the number is converted to the text of that number when it is stored.",
  hints: ["Think about what an environment variable is in the operating system."],
});

save(b);

// The remaining lead on missing-port is an instruction ("Run a line that..."); the question states the setup.
{
  const b2 = load();
  clearLead(b2, L, "missing-port");
  save(b2);
}
