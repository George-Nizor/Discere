const L = require("./lib.cjs");
const b = L.load();
const id = "structure-and-meaning";
L.setOpener(b, id, [
  "Take the top of a news page, with a header, a menu of links and a story. Written with a div for each, the page has three boxes that the HTML does not tell apart, and written with a header, a nav and an article it has three parts that each say what they are. A browser draws the two identically from the same CSS, but a screen reader, a search engine and the browser's reader mode make sense of only the second, because none of them sees what a page looks like and each can use only what its elements say it contains.",
  "An element is therefore a statement about what its content is, and software works from that statement. A header, a nav and a main let a screen reader jump from one part of a page to the next, the levels of the headings give it an outline to move through, and the label on a control or the alt text on an image gives it a name to announce. Each of these is information that a person who can see the page takes from its layout and that anyone who cannot has to take from the elements, so for any piece of content you can ask which element says what it is and what a screen reader would announce for it.",
]);
for (const s of ["before-the-idea", "name-the-main", "count-the-gaps", "a-flourish", "the-home-link", "tabs-and-panels"])
  L.cutLead(b, id, s);

// The predict screen's setup now lives in the question.
const del = L.question(b, "webhcj-structure-and-meaning-delete-control");
del.prompt = "A table has a delete control on each row. Which element should that control be, so that a keyboard user and a screen reader can both use it without extra work?";

L.makeChoice(b, "webhcj-structure-and-meaning-count-skips", {
  prompt: "A page's headings, in order, are h1, h2, h4, h2, h3, h3, h5. Which of them skip a level compared with the heading before?",
  options: [
    { label: "The h4 only", why: "The h5 also skips a level. It follows an h3, and a heading may go at most one level deeper than the one before it." },
    { label: "The h4, the second h2 and the h5", why: "Going back from the h4 to an h2 is allowed, because a heading may return to any shallower level. The rule limits only how far a heading may go deeper." },
    { label: "The h4 and the h5", correct: true },
    { label: "The first h3 and the h5", why: "The first h3 comes straight after an h2, which is one level deeper and allowed. The h4 that follows the first h2 is the other heading that skips." },
  ],
  hints: [
    "Compare each heading with the one just before it, not with the first heading.",
    "A heading may go at most one level deeper than the heading before it, and may return to any shallower level.",
  ],
  onCorrect: "The h4 follows an h2 and the h5 follows an h3, so each is two levels deeper than the heading before it. Every other heading stays level, goes one deeper or returns to a shallower level.",
});

L.makeChoice(b, "webhcj-structure-and-meaning-check-no-name", {
  prompt: "A page has three controls: <button>Add</button>, <button><img src=\"plus.png\" alt=\"\"></button>, and an <input id=\"q\"> with no label and no hint text. Which of them have no accessible name?",
  options: [
    { label: "The image button and the input", correct: true },
    { label: "Only the input", why: "The button that holds only an image with an empty alt has no name either, because its content supplies no text for one." },
    { label: "None of them", why: "A button takes its name from its content, and an image with an empty alt adds none, while an input with no label and no hint text has nothing to take a name from." },
    { label: "All three", why: "The button holding the text Add takes its name from that text, so it is named Add." },
  ],
  hints: [
    "A button takes its name from its content. What does each button contain?",
    "An input has no content, so its name has to come from a label.",
  ],
  onCorrect: "Only the first button has text to take a name from. The empty alt gives the second button nothing, and the input has no label.",
});

L.makeChoice(b, "webhcj-structure-and-meaning-transfer-tab", {
  prompt: "A control reveals a hidden panel on the same page and goes nowhere. Which element should it be?",
  options: [
    { label: "An a element, since it is clicked like a link", why: "An a element promises that activating it goes somewhere. This control goes nowhere and instead does something on the page, which is the job of a button." },
    { label: "A button element", correct: true },
    { label: "A div with a click handler", why: "A div has no keyboard focus, no role and no activation by Enter or Space until each is added by hand, while a button comes with all three." },
  ],
  hints: [
    "Ask whether the control goes somewhere or does something on the current page.",
    "A link goes somewhere. Which element is for doing something?",
  ],
  onCorrect: "A control that does something on the current page is a button, and it comes with keyboard focus and activation by Enter and Space.",
});
L.save(b);
