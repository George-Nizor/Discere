const L = require("./lib.cjs");
const b = L.load();
const id = "responsive-design";
L.setOpener(b, id, [
  "A phone 360px wide and a laptop 1280px wide can be sent the same HTML and the same stylesheet and still show one column and three. The stylesheet makes the difference itself, in two ways: some of its lengths are measured from something that varies, such as a percentage of the container or a hundredth of the viewport, and some of its rules sit inside a condition, such as @media (min-width: 600px), that holds only while the viewport is at least 600px wide.",
  "Both come down to arithmetic you can do by hand, since a length is converted to pixels by multiplying from its reference and a condition on the width is either true or false at a given width. For any width you can therefore work out which rules apply and how large everything is, before testing the page on a single device.",
]);
for (const s of ["first-conversion", "compounding-em", "seven-hundred", "count-active", "apply-the-order", "breakpoints-reversed"])
  L.cutLead(b, id, s);

L.makeChoice(b, "webhcj-responsive-design-predict-rem", {
  prompt: "The root font size is 16px and a length is set to 1.25rem. How large is that length compared with 16px?",
  options: [
    { label: "About 1.25px, because the number in front is a length in pixels", why: "A rem is not a pixel count. It is a multiple of the root font size, so the number in front scales that size." },
    { label: "Slightly smaller than 16px, because a rem is a fraction of the root size", why: "One rem equals the root font size, so 1.25rem is a quarter more than the root size and not less." },
    { label: "Slightly larger than 16px, because 1.25 is a little more than one root size", correct: true },
  ],
  hints: [
    "rem is measured from the font size of the root element.",
    "How many root font sizes is 1.25rem?",
  ],
  onCorrect: "A rem is one root font size, so 1.25rem is 1.25 x 16 = 20px, and changing the root size rescales every length written in rem.",
});

L.makeChoice(b, "webhcj-responsive-design-count-blocks", {
  prompt: "The viewport is 900px wide. Which of these conditions are true: (min-width: 600px), (min-width: 768px), (min-width: 1024px), (max-width: 800px)?",
  options: [
    { label: "The third and fourth", why: "A min-width condition holds when the viewport is at least that wide, so (min-width: 1024px) needs a wider viewport than 900px, and (max-width: 800px) needs a narrower one." },
    { label: "The first and second", correct: true },
    { label: "The first, second and fourth", why: "A max-width condition holds only while the viewport is at most that wide, and 900px is wider than 800px." },
  ],
  hints: [
    "Test each condition against 900 on its own.",
    "min-width needs the viewport to be at least that wide, and max-width needs it to be at most that wide.",
  ],
  onCorrect: "900 is at least 600 and at least 768, so those two conditions hold. It is below 1024 and above 800, so the other two do not.",
});

L.makeChoice(b, "webhcj-responsive-design-check-boundary", {
  prompt: "The viewport is exactly 800px wide. Which of these conditions are true: (min-width: 600px), (min-width: 800px), (max-width: 800px), (min-width: 801px)?",
  options: [
    { label: "The first and third only", why: "The limits are included, so (min-width: 800px) is also true: a viewport that is exactly 800px wide is at least 800px wide." },
    { label: "All four", why: "(min-width: 801px) needs one more pixel than the viewport has, so it is false." },
    { label: "The second and third only", why: "(min-width: 600px) holds for any viewport at least 600px wide, which includes 800px." },
    { label: "The first, second and third", correct: true },
  ],
  hints: [
    "Are the limits in min-width and max-width included?",
    "Test each condition against 800 on its own.",
  ],
  onCorrect: "The limits are included, so a viewport exactly at a breakpoint satisfies both min-width and max-width at that value. Only (min-width: 801px) is false.",
});

const rev = L.question(b, "webhcj-responsive-design-transfer-reversed");
rev.prompt = "A stylesheet has .col { width: 100% }, then @media (min-width: 900px) { .col { width: 33% } }, then @media (min-width: 600px) { .col { width: 50% } }. All selectors have equal specificity. What width in percent does .col have on a 1000px viewport?";
L.save(b);
