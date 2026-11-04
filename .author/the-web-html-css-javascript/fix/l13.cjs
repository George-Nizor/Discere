const L = require("./lib.cjs");
const b = L.load();
const id = "storing-state-and-trusting-input";
L.setOpener(b, id, [
  "A call such as localStorage.setItem('theme', 'dark') keeps a value in the browser, and the page finds it again after a reload and after the browser has been closed. Cookies keep data in the browser as well, and the places differ in how long the data lasts, whether it is sent to the server and which code can read it.",
  "Data also travels the other way. A comment typed by a stranger or a name taken from a link arrives from outside the page, and how it is put into the page decides whether it is shown as text or runs as code. Once you know where each kind of data is kept and how text is inserted, you can say what a page reads back from storage, where a login token should live, and why one way of inserting text is safe while another lets an attacker run code.",
]);
for (const s of ["store-a-number", "a-missing-key", "hide-the-token", "the-cookie-flag", "predict-textcontent-children", "textcontent-children", "the-fix", "parsed-children", "a-stored-flag"]) {
  try { L.cutLead(b, id, s); } catch (e) { if (!/no step/.test(e.message)) throw e; }
}

const q = "webhcj-storing-state-and-trusting-input-";
L.makeChoice(b, q + "predict-storage", {
  prompt: "localStorage.setItem('n', 5);\nconsole.log(localStorage.getItem('n') + 1);\nWhat is printed?",
  options: [
    { label: "NaN, because the number 5 cannot be stored", why: "setItem accepts the 5 and stores it as text. It does not fail, and the text is read back as '5'." },
    { label: "6, because getItem returns the number 5", why: "Web storage keeps strings, so getItem returns the text '5', and a + with a string on one side joins instead of adding." },
    { label: "51, because storage returns the text '5' and the + joins it to 1", correct: true },
  ],
  exampleAnswer: "Storage keeps strings, so getItem returns the string '5', and adding 1 to a string joins, giving 51.",
  hints: [
    "What type does getItem return?",
    "Recall what + does when one side is a string.",
  ],
  onCorrect: "Everything in web storage is a string, so a number has to be converted with Number(...) when it is read.",
});

L.makeChoice(b, q + "missing-key", {
  prompt: "console.log(localStorage.getItem('never-set'));\nWhat is printed?",
  options: [
    { label: "An empty string, because nothing was stored", why: "An empty string is a stored value, and getItem would return it only for a key that had been set to ''. A key that was never stored gives a different result." },
    { label: "null, because getItem reports a missing key with null", correct: true },
    { label: "undefined, because that is how JavaScript reports a missing value", why: "undefined is the usual answer for a missing property, but getItem reports a key that was never stored with null." },
  ],
  exampleAnswer: "getItem returns null for a key that has never been stored.",
  hints: [
    "A missing key does not give undefined or an empty string.",
  ],
  onCorrect: "That null is why code that reads a stored number usually checks for it before converting.",
});

L.makeChoice(b, q + "predict-children", {
  prompt: "const x = document.createElement('div');\nx.textContent = '<b>hi</b>';\nconsole.log(x.children.length);\nWhat is printed?",
  options: [
    { label: "0, because textContent inserts the characters as text and builds no element", correct: true },
    { label: "1, because the b tag becomes an element", why: "That is what innerHTML would give. textContent does not turn the tags into an element." },
    { label: "2, because the b element and its text both count", why: "children counts elements only, and no b element is built here. The tags are just characters inside a text node." },
  ],
  exampleAnswer: "textContent inserts the characters as text, so the tags are not parsed and the div has no child elements.",
  hints: [
    "textContent never parses markup.",
    "The tags become characters in a text node.",
    "Text nodes are not elements.",
  ],
  onCorrect: "The text is displayed as typed, with the angle brackets visible.",
});

L.makeChoice(b, q + "boolean-in-storage", {
  prompt: "localStorage.setItem('dark', false);\nconsole.log(localStorage.getItem('dark') ? 'on' : 'off');\nWhat is printed?",
  options: [
    { label: "off, because the value that was stored is false", why: "Storage keeps strings, so the stored value is the text 'false', and any non-empty string counts as true in a condition." },
    { label: "on, because the stored text 'false' is a non-empty string", correct: true },
    { label: "An error, because false cannot be stored", why: "setItem accepts any value and converts it to text, so storing false is allowed and stores the string 'false'." },
  ],
  exampleAnswer: "Storage keeps the string 'false', and every non-empty string is truthy, so the condition is true and 'on' prints.",
  hints: [
    "What does getItem return after storing false?",
    "Is a non-empty string truthy?",
  ],
  onCorrect: "A stored flag has to be compared with the string, as in getItem('dark') === 'true'.",
});

L.makeChoice(b, q + "check-draft", {
  prompt: "A form draft should survive a reload of the tab but be forgotten when the tab is closed. Where should it be kept?",
  options: [
    { label: "In sessionStorage, which lasts until the tab is closed", correct: true },
    { label: "In localStorage, which survives a reload", why: "localStorage also keeps the draft after the tab or the browser is closed, so the draft would not be forgotten." },
    { label: "In either, because both survive a reload", why: "Both do survive a reload, but only sessionStorage is cleared when the tab closes, and that is the part this draft needs." },
  ],
  exampleAnswer: "sessionStorage lasts until the tab closes, which fits a draft kept for one tab's lifetime.",
  hints: [
    "Which of the two is cleared when the tab closes?",
  ],
  onCorrect: "localStorage would keep the draft across browser restarts, which suits preferences better.",
});
L.save(b);
