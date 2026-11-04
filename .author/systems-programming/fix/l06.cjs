const { load } = require("./lib.cjs");
const t = load();
const L = "c-pointers-and-manual-memory";
const P = "sysp-c-pointers-and-manual-memory-";
t.setOpener(
  L,
  "In C, the expression p[2] is defined to mean *(p + 2), and nothing in the language checks that the array behind p has a third element. The same program that reads its own data correctly with p[1] reads whatever happens to lie next in memory with p[5], and the compiler produces code for both without comment.",
  "A pointer is only an address, so a program can add to it, keep using it after its block has been freed, or pass it to a function that has no way to tell how long the array behind it is, and the language checks none of these. Once you can follow what the arithmetic does, you can read a short C fragment, say where each pointer lands and name the memory fault it commits, and each of those faults is one that Rust's ownership and borrowing rule out.",
);
for (const s of ["write-through-p", "deref-offset", "sizeof-in-a-function", "sizeof-own-scope", "name-the-fault", "second-fragment"]) t.setLead(L, s);
t.toChoice(P + "sizeof-parameter", {
  prompt:
    "void f(int a[]) { printf(\"%zu\", sizeof(a)); } is called with an int array of 10 elements, on a 64-bit Linux target where an int is 4 bytes. What does it print?",
  options: [
    { label: "40, the size of the whole array", why: "That is sizeof of the array where it is declared. In a parameter, int a[] is adjusted to int *a, so sizeof reports the pointer." },
    { label: "10, the number of elements", why: "sizeof reports bytes, never an element count, and the parameter no longer carries the length at all." },
    { label: "4, the size of one int", why: "a is not an int. It is a pointer to the first int, and a pointer has the size of an address." },
    { label: "8, the size of one address" },
  ],
  correct: 3,
  hints: [
    "Think about what the compiler really receives when an array is passed to a function.",
    "A function parameter written int a[] is adjusted to another type.",
    "The type is a pointer, and every pointer has the same fixed size on a given target.",
  ],
  onCorrect:
    "The parameter a is really an int *, so sizeof(a) is the size of a pointer, 8 bytes here, whatever the array's length.",
});
t.save();
