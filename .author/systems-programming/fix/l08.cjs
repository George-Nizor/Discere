const { load } = require("./lib.cjs");
const t = load();
const L = "file-descriptors-and-buffering";
const P = "sysp-file-descriptors-and-buffering-";
t.setOpener(
  L,
  "The two lines printf(\"hi\\n\"); fork(); print hi once when the program runs at a terminal, yet with its output sent to a file the same program prints it a different number of times, although the source has not changed. The difference lies in where the text waits before it leaves the process, and in what the process uses to refer to its output at all.",
  "Both come down to the file descriptor, the small number by which a process names everything it has open, and to the way the C library collects text before writing it. Knowing them lets you say how many times a line appears after a fork, and what a shell is changing when it redirects a program's output to a file.",
);
for (const s of ["standard-error", "reuse-after-close", "hi-twice", "count-characters", "closed-zero"]) t.setLead(L, s);
t.toChoice(P + "hi-in-a-file", {
  prompt:
    "A C program runs printf(\"hi\\n\"); fork(); and then both processes exit. Its output is redirected to a file. How many times does hi appear in the file?",
  options: [
    { label: "Not at all", why: "Text still in the buffer is written when a process exits, so it is not lost, and both processes exit." },
    { label: "Once", why: "printf ran once, but the fork copied the process's memory, buffer included, and each process writes its own copy when it exits." },
    { label: "Twice" },
  ],
  correct: 2,
  hints: [
    "When output goes to a file, the C library collects it in a buffer and writes it later.",
    "The fork happens before the buffer is written.",
    "Each process holds a copy of the buffer when it exits.",
  ],
  onCorrect:
    "The text is still in the buffer at the fork, so both processes hold it and each writes it when it exits.",
});
t.save();
