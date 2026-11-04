const { load } = require("./lib.cjs");
const t = load();
const L = "processes-and-system-calls";
const P = "sysp-processes-and-system-calls-";
t.setOpener(
  L,
  "In the C line fork(); fork(); printf(\"x\\n\"); there is a single printf, yet the program prints more than one line. Each call to fork makes a copy of the process that calls it, and the copy carries on from the same place, so the printf is run by every process that exists when it is reached.",
  "A process is a running program that the operating system keeps apart from every other one, and creating a new process, like anything else beyond a program's own memory, needs a request to the operating system called a system call. Once you know what fork returns in each of the processes it creates, you can work out by hand which lines each one goes on to run, and so how many times a line like this prints.",
);
for (const s of ["which-switches", "return-in-child", "two-forks", "three-forks", "changing-x"]) t.setLead(L, s);

t.toChoice(P + "child-return", {
  prompt: "A process calls fork and the call succeeds. What does fork return in the child process?",
  options: [
    { label: "0" },
    { label: "The child's own pid", why: "The child's pid is what the parent receives, so that the parent can refer to the child. The child gets a different value." },
    { label: "The parent's pid", why: "Neither process is given the parent's pid by fork: the parent receives the child's pid, and the child receives a value that is not a valid pid." },
  ],
  correct: 0,
  hints: [
    "The parent and the child run the same code after fork, and need a way to tell themselves apart.",
    "The parent receives the child's pid, which is never zero.",
  ],
  onCorrect:
    "fork returns the child's pid in the parent and zero in the child, so an if on the result sends each down its own branch.",
});

t.toChoice(P + "two-forks", {
  prompt:
    "A C program calls fork() twice in a row, with no conditions, and then calls printf once to print a line. Every process that exists after a fork continues to the next line. How many lines does the program print?",
  options: [
    { label: "One line", why: "The printf appears once in the code, but every process that exists after the two forks runs it, and there is more than one." },
    { label: "Two lines", why: "That counts the forks. The child made by the first fork also calls the second, so the second fork is run by two processes." },
    { label: "Three lines", why: "That is the original process plus one child per fork. The child of the first fork also reaches the second fork and makes a child of its own." },
    { label: "Four lines" },
  ],
  correct: 3,
  hints: [
    "Each fork is called by every process that exists at that moment.",
    "After the first fork there are two processes, and both call the second fork.",
  ],
  onCorrect:
    "Every fork doubles the number of processes, so two forks leave four, and each prints one line.",
});
t.save();
