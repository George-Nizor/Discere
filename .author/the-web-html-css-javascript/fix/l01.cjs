const L = require("./lib.cjs");
const b = L.load();
const id = "what-the-browser-receives";
L.setOpener(b, id, [
  "Here is a web address: https://shop.example.com:8443/items/42?color=red&size=m#reviews. It is 63 characters long and looks like a single string, yet the browser reads it as six parts, each of which answers a different question about where to go and what to ask for when it gets there.",
  "Some of the parts tell the browser which machine to contact and others say what to request from it, and the reply it receives is text, which the browser reads into a tree of elements before anything appears on screen. Knowing what each part does and what the reply contains lets you take an address and a short piece of HTML and say what will be requested and what tree will be built, before you open anything in a browser.",
]);
for (const s of ["which-part-stays", "count-the-pairs", "a-404", "follow-the-redirect", "two-paragraphs", "the-first-child", "mixed-closing-tags"])
  L.cutLead(b, id, s);
L.makeChoice(b, "webhcj-what-the-browser-receives-count-p", {
  prompt: "The parser reads <p>One<p>Two with no closing tags. What tree does it build?",
  options: [
    { label: "One p element holding One, with a second p nested inside it that holds Two.", why: "A p element cannot contain another p. A new p start tag closes any p that is still open, so the second one is not nested." },
    { label: "Two p elements side by side, one holding One and one holding Two.", correct: true },
    { label: "A single p element holding the text One and Two.", why: "Each p start tag begins its own element, so a second tag means a second p element and not more text in the first." },
    { label: "No p elements, because the markup is invalid.", why: "The parser never refuses a page. The standard defines a tree for any text, including text with end tags missing." },
  ],
  hints: [
    "A p element cannot contain another p element.",
    "What happens to an open p when a new p starts?",
  ],
  onCorrect: "A new p start tag closes any p still open, so the missing end tags change nothing about the tree.",
});
L.save(b);
