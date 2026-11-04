const L = require("./lib.cjs");
const b = L.load();
const id = "accessible-and-fast";
L.setOpener(b, id, [
  "Pure red, #ff0000, looks strong on a white page, yet its contrast ratio against white is 4.0 to 1, which is below the 4.5 to 1 that the Web Content Accessibility Guidelines ask for in normal-size text. The ratio comes from a formula applied to the two colours, so whether a pair passes is settled by calculation, however the page looks on one screen.",
  "The speed of a page has thresholds of the same kind. The Core Web Vitals measure how quickly the page appears, how quickly it responds to a click and how steadily it holds still, and each has a limit that a real visit either meets or misses. With the formula and the limits you can check a colour pair or a set of measurements against the standard while you build, and say which habits in the markup keep a page on the right side of them.",
]);
for (const s of ["grey-on-white", "ratio-by-hand", "count-the-tabs", "lcp-guess", "which-vital", "score-a-shift", "reserve-the-room"])
  L.cutLead(b, id, s);

const q = "webhcj-accessible-and-fast-";
L.makeChoice(b, q + "tab-count", {
  prompt: "A page has, from top to bottom, two links, a div with an onclick handler and no tabindex, and three buttons. Starting with focus at the top of the page, how many presses of Tab does it take to reach the last button?",
  options: [
    { label: "Six, because the div takes focus like the other controls", why: "A div with a click handler cannot take focus unless it is given a tabindex, so it is not a stop." },
    { label: "Five, because the div is skipped", correct: true },
    { label: "Three, because only the buttons take focus", why: "The two links also take focus, before the buttons, so they are stops as well." },
  ],
  exampleAnswer: "Only the links and buttons can take focus, so the div is skipped. Two links and three buttons make five stops.",
  hints: [
    "Which of these elements can take keyboard focus?",
    "A div with a click handler cannot, unless it is given a tabindex.",
    "Count the links and the buttons.",
  ],
  onCorrect: "Making the div a button, as in the lesson on elements, would give it a place in the Tab order.",
});

L.makeChoice(b, q + "lcp-threshold", {
  prompt: "Largest Contentful Paint times the arrival of the largest image or block of text on the screen. What is the good threshold for it, the time at or under which a page counts as good?",
  options: [
    { label: "10 seconds", why: "A page is already in the poor band at 4 seconds, so 10 seconds is far beyond the good limit." },
    { label: "0.5 seconds", why: "The good limit is longer than half a second. The scale runs up to a poor limit of 4 seconds, and good sits part of the way there." },
    { label: "2.5 seconds", correct: true },
  ],
  exampleAnswer: "A page is good for loading when its Largest Contentful Paint is 2.5 seconds or less, measured at the 75th percentile of page loads.",
  hints: [
    "It is a number of seconds, between 1 and 4.",
    "The poor limit is 4 seconds, and good is lower.",
  ],
  onCorrect: "The measure is the time at which the largest image or block of text appears, not the time the whole page has loaded.",
});

L.makeChoice(b, q + "check-contrast", {
  prompt: "Text has a contrast ratio of 4.4:1 against its background. Does it meet WCAG AA for normal text?",
  options: [
    { label: "Yes, because it is above the 3 to 1 minimum", why: "The 3 to 1 minimum applies only to large text. Normal-size text needs 4.5 to 1, and 4.4 is below it." },
    { label: "No, because normal text needs at least 4.5 to 1", correct: true },
    { label: "Yes, because 4.4 is close enough to 4.5", why: "The measure is exact, so a ratio just under the line fails even if the text looks readable." },
  ],
  exampleAnswer: "The AA minimum for normal text is 4.5:1, and 4.4 is just below it.",
  hints: [
    "Compare 4.4 with the minimum of 4.5.",
  ],
  onCorrect: "The measure is exact, so a ratio just under the line fails even if the text looks readable.",
});
L.save(b);
