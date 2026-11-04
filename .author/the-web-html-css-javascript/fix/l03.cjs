const L = require("./lib.cjs");
const b = L.load();
const id = "the-box-and-the-flow";
L.setOpener(b, id, [
  "Open a browser's developer tools and select any element, and it is drawn as a set of nested rectangles: the content in the middle, then the padding, the border and the margin around it. A rule such as width: 200px gives the size of one of those rectangles, and which one it gives decides how much room the element takes, so that two elements with the same declared width can occupy quite different amounts of space.",
  "A handful of rules say how the layers add up and how neighbouring rectangles stack, and with them you can work out an element's size and the gap between two elements by arithmetic, before anything has been drawn.",
]);
for (const s of ["guess-the-width", "shrink-the-content", "which-display", "stacked-paragraphs", "apply-the-larger", "a-stack-of-three"])
  L.cutLead(b, id, s);

L.makeChoice(b, "webhcj-the-box-and-the-flow-predict-border-box", {
  prompt: "An element has width: 300px, padding: 15px on every side, border: 3px solid and box-sizing: content-box. How wide is its border box?",
  options: [
    { label: "Exactly 300px, the declared width", why: "Under content-box the declared width describes the content alone, and the padding and the border are added outside it, so the border box is wider than 300px." },
    { label: "More than 300px, because the padding and the border are added to the width", correct: true },
    { label: "Less than 300px, because the padding and the border use up part of the width", why: "That is what box-sizing: border-box does. Under content-box the 300px covers only the content, and the layers around it make the border box wider." },
  ],
  hints: [
    "Under content-box, which part of the box does width describe?",
    "Does the padding sit inside the declared width or outside it?",
  ],
  onCorrect: "The declared width covers only the content, and the padding and border are added on both sides of it, so the border box is 300 + 2 x 15 + 2 x 3 = 336px.",
});

L.makeChoice(b, "webhcj-the-box-and-the-flow-predict-gap", {
  prompt: "Paragraph A has margin-bottom: 30px and the paragraph below it, B, has margin-top: 20px. Both are normal block siblings. What is the gap between them?",
  options: [
    { label: "20px, the same as the smaller margin", why: "The upper margin is the larger of the two. Where two vertical margins meet they share the space, and the larger one sets the gap." },
    { label: "50px, the two margins added together", why: "Adjoining vertical margins in normal flow overlap and do not add, so the gap is set by the larger one." },
    { label: "30px, the same as the larger margin", correct: true },
  ],
  hints: [
    "Think about whether two margins that meet add or overlap.",
    "When margins overlap, the space is shared between them.",
  ],
  onCorrect: "The two margins share the same space, so the larger one sets the gap.",
});
L.save(b);
