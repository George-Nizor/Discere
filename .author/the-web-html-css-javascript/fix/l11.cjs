const L = require("./lib.cjs");
const b = L.load();
const id = "the-dom-and-events";
L.setOpener(b, id, [
  "The browser builds a tree from the markup <p>Hello <b>world</b></p> in which the paragraph has two children, the text Hello with its trailing space and the element b, and the b has one child of its own, the text world. JavaScript reaches that tree through the **DOM**, and every item in it, text as well as elements, is a node, so a script that searches a page, reads it, changes it or counts its parts is working on nodes.",
  "An event such as a click travels through the same structure, and the order in which the listeners along its route fire, and which element each of them sees as the source, follow from the route it takes. Once you know how nodes are counted and how the route runs, you can say how many nodes sit under an element, which listeners fire when something is clicked, and in what order.",
]);
for (const s of ["whitespace-count", "four-line-items", "add-an-item", "which-order", "capture-listener", "stop-the-event", "which-element", "click-inside-the-item"])
  L.cutLead(b, id, s);

L.makeChoice(b, "webhcj-the-dom-and-events-predict-childnodes", {
  prompt: "A ul is written over four lines:\n<ul>\n  <li>A</li>\n  <li>B</li>\n</ul>\nThe spaces and line breaks are kept by the parser. How does ul.childNodes.length compare with the number of li elements, which is two?",
  options: [
    { label: "It is 2, because only the li elements are nodes", why: "That is the count for ul.children. The property childNodes also counts the whitespace text nodes." },
    { label: "It is 4, because each li adds a node for its opening tag and another for its closing tag", why: "A tag is not a node: the two tags together make one li element, which is a single node. The extra nodes come from the text between the tags." },
    { label: "It is larger than 2, because the line breaks and spaces between the tags are text nodes too", correct: true },
  ],
  exampleAnswer: "The ul has two li elements and three text nodes of whitespace: one before the first li, one between them and one after the last, so 5 in all.",
  hints: [
    "The line breaks and spaces between the tags are part of the document.",
    "Whitespace between tags becomes text nodes.",
  ],
  onCorrect: "childNodes includes text nodes, so the ul has two li elements and three whitespace text nodes, 5 in all, and formatting the markup over several lines changes the count.",
});

L.makeChoice(b, "webhcj-the-dom-and-events-predict-bubble", {
  prompt: "A button sits in div#inner, which sits in div#outer. Each of the three has one click listener that logs its id (button, inner, outer). The button is clicked. What is logged, in order?",
  options: [
    { label: "outer, inner, button", why: "Listeners added in the usual way run as the event travels back up from the target, so the clicked element's own listener comes first." },
    { label: "button, inner, outer", correct: true },
    { label: "button only, because the click was on the button", why: "A click is not delivered to the clicked element alone. It travels through every ancestor too, and each ancestor's listener hears it." },
  ],
  exampleAnswer: "The click reaches the button first and then bubbles up through its ancestors in order.",
  hints: [
    "Which element is clicked?",
    "The event then moves outwards to each ancestor in turn.",
  ],
  onCorrect: "A click is not delivered to the clicked element alone: it travels upward through every ancestor.",
});

// These two prompts referred to "the same three elements" from the screen before; each now stands alone.
L.question(b, "webhcj-the-dom-and-events-capture-order").prompt =
  "A button sits in div#inner, which sits in div#outer. Each of the three has a bubbling click listener that logs its id (button, inner, outer), and div#outer also has a capture click listener that logs outer-capture. The button is clicked. What is logged, in order? Write the four ids with spaces.";
L.question(b, "webhcj-the-dom-and-events-stop-propagation").prompt =
  "A button sits in div#inner, which sits in div#outer. Each of the three has a bubbling click listener that logs its id (button, inner, outer), and the inner listener also calls event.stopPropagation(). The button is clicked. What is logged, in order? Write the ids with spaces.";
L.save(b);
