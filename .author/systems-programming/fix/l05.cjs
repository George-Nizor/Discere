const { load } = require("./lib.cjs");
const t = load();
const L = "borrowing-and-lifetimes";
const P = "sysp-borrowing-and-lifetimes-";
t.setOpener(
  L,
  "In C, a program can take the address of the first element of an array stored in a malloc'd buffer, then call realloc to make the buffer bigger. If the allocator moves the data to a new block, the old block is freed and the saved address points at memory that belongs to nobody. Nothing in the language stops the program from reading it, and it often appears to work until the day the freed block is reused.",
  "Rust prevents the same situation when the program is compiled. A Vec can grow while a reference into it is held, just as the malloc'd buffer can, so the compiler restricts how references to one value may overlap, and once you know those restrictions you can read an error message, say which of them the program breaks, and repair it, often by moving a single line.",
);
for (const s of ["which-error", "one-mutable", "what-a-does", "borrow-ends", "tied-parameters"]) t.setLead(L, s);

t.replaceWithChoice(L, "which-error", P + "which-rule", {
  prompt:
    "A program creates a Vec v holding one number, takes a shared reference f to its first element, pushes a second number onto v, and then prints f. Which rule does it break?",
  options: [
    { label: "A shared borrow and a mutable borrow of one value may not be alive together" },
    { label: "A moved value may not be used again", why: "Nothing is moved here. v keeps its value throughout, and the push borrows v mutably without taking it." },
    { label: "Two mutable borrows of one value may not be alive together", why: "There is only one mutable borrow, made by the push. The conflict is between that borrow and the shared reference f, which is still going to be used." },
    { label: "A reference may not outlive the value it points to", why: "v lives to the end of the program, so f never refers to a dropped value. The danger is that the push may move the buffer that f points into." },
  ],
  correct: 0,
  hints: [
    "The program holds a shared reference and then changes the Vec through its owner.",
    "Compare what the push needs with what the reference f is still going to be used for.",
  ],
  onCorrect:
    "The push needs mutable access to v while f, a shared borrow, is still going to be used on the next line, which the rule forbids. The compiler reports it as E0502.",
});

t.toChoice(P + "mutable-references", {
  prompt: "Which of these sets of borrows of one value may all be alive at the same time?",
  options: [
    { label: "Two mutable borrows", why: "A mutable borrow must be the only way to reach the value while it lasts, so a second one is refused with E0499." },
    { label: "Three shared borrows" },
    { label: "One shared borrow and one mutable borrow", why: "The holder of the shared borrow would see the value change under it, which is the conflict E0502 reports." },
  ],
  correct: 1,
  hints: [
    "Reading does not interfere with reading.",
    "A mutable borrow changes the value, so no other borrow may be alive to see it half changed.",
  ],
  onCorrect:
    "Any number of shared borrows may coexist, because none of them changes the value, whereas a mutable borrow has to be the only borrow alive.",
});

t.toChoice(P + "last-number", {
  prompt:
    "A program creates a Vec v holding the number 1, takes a shared reference f to its first element, and prints f. It then pushes 2 onto v and prints v.len(). What happens?",
  options: [
    { label: "It is rejected, because the push happens while f still exists", why: "A borrow lasts only until its last use. f is last used on the print before the push, so no borrow is alive when the push needs mutable access." },
    { label: "It compiles and prints 1, then 2" },
    { label: "It compiles, but the push moves the buffer out from under f", why: "The push may move the buffer, but f is not used afterwards, so nothing can read the stale address." },
  ],
  correct: 1,
  hints: [
    "Follow the program in order, and ask whether the borrow f is still needed when the push runs.",
    "f is last used on the line that prints it, which comes before the push.",
  ],
  onCorrect:
    "The borrow ended at its last use, so the push is accepted, and the Vec then has two elements.",
});

t.toChoice(P + "tied-to", {
  prompt:
    "In fn pick<'a>(x: &'a str, y: &'a str, z: &str) -> &'a str, which parameters is the returned reference tied to?",
  options: [
    { label: "Only x", why: "y carries the same name 'a, so the result may refer to y as well as x and is valid only while both are alive." },
    { label: "x, y and z", why: "z has no name in common with the result, so the signature promises nothing about it, and the body cannot return anything borrowed from z." },
    { label: "Only z", why: "z is the parameter that does not carry the name 'a, which is why the result is not tied to it." },
    { label: "x and y" },
  ],
  correct: 3,
  hints: [
    "The result is tied to the parameters that carry the same lifetime name as the result.",
    "Look for the parameter that has no name written after its ampersand.",
  ],
  onCorrect:
    "The result carries 'a, and x and y carry it too, so it is valid only while both are alive. z has no name, so the result is not tied to it.",
});
t.save();
