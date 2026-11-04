const L = require("./lib.cjs");
const b = L.load();
const id = "layout-with-flexbox-and-grid";
L.setOpener(b, id, [
  "Three boxes sit in a row inside a container 600px wide, each box is 100px wide, and the 300px that is left over has to go somewhere. Flexbox and grid are the two modern layout modes in CSS, and each answers that question with a rule that can be written as a short sum: flexbox shares the leftover space among the items according to numbers set on them, and grid divides a row's width among columns that are declared in advance.",
  "Once you know the sums you can predict the width of every item before you open the browser, and you can say which of the two modes suits a given layout.",
]);
for (const s of ["a-guess-at-grow", "three-wide-items", "size-another-grid", "which-tool", "the-tag-list", "a-weighted-case"])
  L.cutLead(b, id, s);

L.makeChoice(b, "webhcj-layout-with-flexbox-and-grid-predict-grow", {
  prompt: "A 500px flex row holds two items, each with flex-basis 100px. The first has flex-grow 1 and the second has flex-grow 2. After the row has been laid out, how do the two widths compare?",
  options: [
    { label: "Both items are the same width, because they have the same basis", why: "Equal widths would need equal grow factors. The second item has the larger factor, so it takes a larger share of the free space." },
    { label: "The second item is wider, because it takes a larger share of the free space", correct: true },
    { label: "The first item is wider, because it has the smaller grow factor", why: "A grow factor counts shares of the free space, and a larger factor means more shares. The smaller factor therefore leaves the first item with less." },
  ],
  hints: [
    "Each item starts at its basis. What happens to the space that is left over?",
    "A larger grow factor takes a larger share of that space.",
  ],
  onCorrect: "The free space is 500 - 200 = 300px and is shared in the ratio 1 to 2, so the second item takes 200px of it on top of its 100px basis and ends up 300px wide.",
});

L.makeChoice(b, "webhcj-layout-with-flexbox-and-grid-tag-list", {
  prompt: "A list of tags of different widths should flow along a line and wrap onto the next line when it is full. Which layout mode suits that?",
  options: [
    { label: "Grid, because the tags have to sit in aligned columns", why: "Tags of different widths do not need a column to stay the same width on every row. Each line is arranged on its own, which is how flexbox wraps." },
    { label: "Grid, because it is the newer of the two modes", why: "Which mode is newer does not decide it. The test is how many dimensions have to line up, and tags flowing along a line need only one." },
    { label: "Flexbox, because each tag takes the width of its content along a single line", correct: true },
  ],
  hints: [
    "Count how many dimensions have to line up.",
    "Do the tags on the second line need to sit under the tags on the first?",
  ],
  onCorrect: "Tags that flow along a line need only one dimension to line up, and that is what flexbox is for.",
});
L.save(b);
