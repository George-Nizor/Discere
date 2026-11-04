const { load } = require("./lib.cjs");
const t = load();
const L = "ownership-moves-and-drop";
const P = "sysp-ownership-moves-and-drop-";
t.setOpener(
  L,
  "A String is a handle of three words on the stack that points to a buffer on the heap, so copying the handle byte for byte would leave two variables pointing at one buffer. When both went out of scope, each would free it, and the same block would be returned to the allocator twice. In C this is a classic fault known as a double free, and it damages the records the allocator keeps about which blocks are free, often long before the program visibly fails.",
  "Rust rules the fault out by giving every buffer a single owner, the one variable responsible for freeing it. Once you can apply that rule you can follow a program line by line and say which variable owns each value, what an assignment or a function call does to it, and when it is freed.",
);
for (const s of ["will-it-compile", "bytes-in-a-move", "error-code", "drop-order", "an-i32-copy"]) t.setLead(L, s);

t.question(P + "compile-or-print").prompt =
  "A program creates a String a holding the text x, assigns it to b with let b = a;, and then prints both a and b. What happens when it is compiled?";
t.question(P + "drop-order-inner-block").prompt =
  "The type Noisy prints a line such as drop c when it is dropped. In main, a and then b are declared. An inner block then declares c and prints inner, and after the block main prints end. What does the program print?";

t.toChoice(P + "copy-type", {
  prompt:
    "A program declares let x: i32 = 7; and let y = x;, and then prints x + y. What happens?",
  options: [
    { label: "It prints 14, because x is copied and stays valid" },
    { label: "It is rejected, because x was moved into y", why: "A move is what happens to a type that owns a heap buffer. An i32 owns nothing on the heap, so the assignment copies it and x stays usable." },
    { label: "It is rejected unless the assignment is written let y = x.clone();", why: "A clone is only needed when a second owner of a buffer is wanted. An i32 is Copy, so the plain assignment already leaves x valid." },
  ],
  correct: 0,
  hints: [
    "An i32 is small and its whole value is copied.",
    "Ask whether an i32 owns a buffer that two owners could both free.",
  ],
  onCorrect:
    "An i32 is Copy, so let y = x duplicates the value and leaves x valid, and the two variables hold 7 each.",
});

t.toChoice(P + "practice-1", {
  prompt:
    "A program declares Noisy x and then Noisy y in main. An inner block then creates Noisy z and ends, and afterwards main prints end. Noisy prints drop and its name when it is dropped. In what order do the lines appear?",
  options: [
    { label: "end, drop z, drop x, drop y", why: "z belongs to the inner block, so it is dropped when that block ends, before main prints end. At the end of main the later declaration goes first." },
    { label: "drop z, end, drop y, drop x" },
    { label: "drop z, end, drop x, drop y", why: "Within main the last value declared is dropped first, so y is dropped before x." },
    { label: "end, drop z, drop y, drop x", why: "z is dropped as soon as its inner block ends, and that happens before main prints end." },
  ],
  correct: 1,
  hints: [
    "z is dropped first, because its block ends first.",
    "end is printed after the inner block and before main finishes.",
  ],
  onCorrect:
    "z is dropped when its inner block ends, and y and x are dropped at the end of main in reverse declaration order.",
});

t.toChoice(P + "practice-2", {
  prompt:
    "A program has five lines. 1: let a = String::from(\"x\");  2: let b = a;  3: let c = b.len();  4: println!(\"{}\", a);  5: println!(\"{}\", b);  Which is the first line that the compiler rejects?",
  options: [
    { label: "Line 2, where a is assigned to b", why: "Moving a value is allowed. The assignment hands the String to b, and an error only arises when a is used afterwards." },
    { label: "Line 3, where b.len() is called", why: "The method len only borrows b to measure it, and b still owns the String at that point." },
    { label: "Line 5, where b is printed", why: "b is the owner after line 2, and printing only borrows it, so this line is allowed." },
    { label: "Line 4, where a is printed" },
  ],
  correct: 3,
  hints: [
    "Find the line that moves a value.",
    "Which names are still valid after that line?",
  ],
  onCorrect:
    "Line 2 moved the String into b, so a is no longer valid, and line 4 is the first line that tries to use it.",
});
t.save();
