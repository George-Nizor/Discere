const L = require("./lib.cjs");
const b = L.load();
const id = "which-rule-wins";
L.setOpener(b, id, [
  "An element can match many CSS rules at once, but a link has only one colour, so whenever two rules set it the browser has to choose. Suppose a link is matched both by a { color: blue } and by .nav a { color: red }: only one of the two declarations can apply, and the browser picks it by a fixed ranking called the **cascade**, which weighs how important each declaration is, how specific its selector is and where its rule sits in the stylesheet.",
  "The ranking can be worked out by hand, which turns a stylesheet that behaves unpredictably into one you can read, since for any rule you can say which declaration wins and why. The same ranking accounts for the values an element receives when no rule sets them at all, because it takes them from its parent.",
]);
for (const s of ["which-colour", "score-the-menu", "ten-classes", "what-passes-down", "nearest-ancestor", "read-the-variable", "where-and-is"])
  L.cutLead(b, id, s);

L.makeChoice(b, "webhcj-which-rule-wins-id-or-classes", {
  prompt: "A rule with the selector #title competes with a rule whose selector is ten class names chained together, such as .a.b.c.d.e.f.g.h.i.j. Both set the same property on one element. Which rule wins?",
  options: [
    { label: "The ten classes, because together they count for more than one id", why: "The counts are never added into one number. They are compared from the left, and the first column that differs decides, so one id outranks any number of classes." },
    { label: "The id selector", correct: true },
    { label: "Whichever rule is written later, because the selectors tie", why: "The scores are (1, 0, 0) and (0, 10, 0), which differ in the ids column, so the order of the rules is never consulted." },
  ],
  hints: [
    "Compare the columns from the left, one at a time.",
    "Does the ids column differ?",
  ],
  onCorrect: "The columns are compared, not added, so no number of classes can outrank a single id.",
});

L.makeChoice(b, "webhcj-which-rule-wins-check-winner", {
  prompt: "Rule A is #hero p { color: red } and Rule B is section.intro p.lead { color: blue }, and B is written later. A paragraph matches both. What colour is its text?",
  options: [
    { label: "Blue, because rule B is written later", why: "Order is consulted only when the scores tie. Here A scores (1, 0, 1) and B scores (0, 2, 2), so the ids column settles it before order matters." },
    { label: "Blue, because B has more classes and elements", why: "The counts are compared column by column from the left and never added up. A has an id and B has none, so that column decides first." },
    { label: "Red, because the id in rule A outranks any number of classes", correct: true },
  ],
  hints: [
    "Score both selectors.",
    "Compare the ids column first.",
  ],
  onCorrect: "Order is consulted only when the scores tie, so rule B's later position counts for nothing here.",
});
L.save(b);
