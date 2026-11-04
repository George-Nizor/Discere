const { load } = require("./lib.cjs");
const t = load();
const L = "stack-and-heap";
t.setOpener(
  L,
  "In a program where main calls f and f calls g, the processor has to keep the variables of every call and remember where each call returns to. It does both in one region of memory that grows by a fixed amount at every call and shrinks by the same amount at every return, which makes it one of the cheapest things a program does.",
  "That arrangement works only because the amount is known before the program runs. A value whose size is decided during a run, such as the text a user types, needs a second region that hands out blocks of whatever size is asked for, at a higher cost for each request. Knowing which values live in which region lets you say what a Vec keeps in each of them, and what happens when its buffer fills up.",
);
for (const s of ["count-frames", "name-the-region", "what-push-does", "borrowed-text", "room-to-grow"]) t.setLead(L, s);
t.question("sysp-stack-and-heap-frames-in-g").prompt =
  "A program's main calls f, and f calls g. How many frames exist on the stack while g is running?";
t.toChoice("sysp-stack-and-heap-capacity-after-fifth-push", {
  prompt:
    "A Vec<i32> is created with room for 4 elements, and five values are pushed one after another. After the fifth push, how does its capacity compare with the five elements it now holds?",
  options: [
    { label: "It is exactly the number of elements, because the Vec grows one slot at a time", why: "Growing by one slot would mean copying every element on each push, so the library makes room for several more pushes at once." },
    { label: "It is larger than the number of elements, so that later pushes need no copying" },
    { label: "It is still the original capacity, because capacity is fixed when the Vec is created", why: "A full Vec allocates a new, larger buffer instead of refusing the element, which is how it can hold more elements than it was created with room for." },
  ],
  correct: 1,
  hints: [
    "The buffer is full, so the fifth push has to get a new one.",
    "The standard library does not grow by one slot at a time.",
  ],
  onCorrect:
    "The standard library doubles a full buffer, so capacity went from 4 to 8, which makes later pushes cheap on average.",
});
t.save();
