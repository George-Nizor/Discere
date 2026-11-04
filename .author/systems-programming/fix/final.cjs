// Run last. Wording pass over the introduction and the second paragraph of each opener, so the
// openers do not all end on the same "once you know X, you can Y" shape.
const { load } = require("./lib.cjs");
const t = load();
const second = {
  "bytes-integers-and-overflow":
    "Knowing how the boxes are filled lets you read the bytes of any integer and say what the same pattern means as a signed or an unsigned number. It also lets you predict what an addition does when its result is too big for the boxes it was given, a case with more than one possible outcome in Rust, since the program can panic, wrap around, stop at the largest value or report the problem, and the programmer has to choose which.",
  "layout-size-and-alignment":
    "The gap follows from a rule that is simple enough to apply on paper. Applied to any struct, it gives the size, and so the memory a million of them occupy, and it shows why swapping two field declarations can shrink a struct without removing any data.",
  "stack-and-heap":
    "That arrangement works only because the amount is known before the program runs. A value whose size is decided during a run, such as the text a user types, needs a second region that hands out blocks of whatever size is asked for, at a higher cost for each request. A Vec keeps a small fixed-size part in the first region and its elements in the second, and seeing how the two fit together explains what happens when its buffer fills up.",
  "ownership-moves-and-drop":
    "Rust rules the fault out by giving every buffer a single owner, the one variable responsible for freeing it. With that rule you can follow a program line by line and say which variable owns each value, what an assignment or a function call does to it, and when it is freed.",
  "borrowing-and-lifetimes":
    "Rust prevents the same situation when the program is compiled. A Vec can grow while a reference into it is held, just as the malloc'd buffer can, so the compiler restricts how references to one value may overlap. Those restrictions are what its error messages report, and a reader who knows them can say which one a program breaks and repair it, often by moving a single line.",
  "c-pointers-and-manual-memory":
    "A pointer is only an address, so a program can add to it, keep using it after its block has been freed, or pass it to a function that has no way to tell how long the array behind it is, and the language checks none of these. Following the arithmetic by hand shows where each pointer lands and which memory fault a fragment commits, and Rust's ownership and borrowing rule out every one of those faults.",
  "processes-and-system-calls":
    "A process is a running program that the operating system keeps apart from every other one, and creating a new process, like anything else beyond a program's own memory, needs a request to the operating system called a system call. What fork returns in each of the processes it creates decides which lines each one goes on to run, and that is enough to work out by hand how many times a line like this prints.",
  "file-descriptors-and-buffering":
    "Both come down to the file descriptor, the small number by which a process names everything it has open, and to the way the C library collects text before writing it. Between them they explain how many times a line appears after a fork, and what a shell changes when it redirects a program's output to a file.",
  "threads-and-shared-state":
    "When two threads share memory, a statement that looks like a single step can be broken up by the other thread, and a result that depends on that timing changes from run to run. Tracing what each thread does to the counter shows which results are possible and why Rust refuses to compile the racy version. A lock, together with shared ownership, makes the counter come out the same on every run.",
  "virtual-memory-and-paging":
    "That translation is arithmetic you can do by hand. The address is cut into a page number and an offset, and a table supplies a replacement for the page number, which gives the physical address behind any virtual one. A little more arithmetic shows how much the translation adds to each memory access once a small cache in the processor absorbs most of the cost.",
  "unsafe-rust-and-the-c-boundary":
    "Rust reaches that layer through unsafe. An unsafe block allows a small, fixed set of extra operations, such as calling a function written in C, and each one depends on a fact that the compiler cannot check and the programmer therefore has to. Knowing exactly which operations those are makes the unsafe code in a systems library readable and tells you what to check when you write a call into C.",
};
for (const [id, text] of Object.entries(second)) {
  const blocks = t.lesson(id).intro.hook.blocks;
  blocks[blocks.length - 1] = t.para(text);
}
t.bundle.course.introduction.paragraphs[1] =
  "The same view explains why Rust is built as it is. In C, a pointer can outlive the memory it points to, a buffer can be written past its end, and the same block can be freed twice, all without a word from the compiler. Rust's rules about ownership and borrowing exist to rule out faults like these, and once you have met the fault, each rule reads as the compiler checking something that C leaves to the programmer.";
t.bundle.course.introduction.paragraphs[2] =
  "The places a value can live extend beyond the program itself. The operating system gives each process its own address space and its own table of open files, and a program asks it for anything outside that space through a system call. The processor, for its part, keeps recently used memory in small caches, so the order in which a program touches its data changes how fast it runs. Most of this can be worked out with arithmetic on paper, which lets you say how a piece of code will behave, and why, before you run it.";

// Spread the correct option over a to d. Only questions written in this pass are moved.
const moveCorrect = (qid, to) => {
  const q = t.question(qid);
  const ids = ["a", "b", "c", "d"];
  const oldIdToLabel = Object.fromEntries(q.choices.map((c) => [c.id, c.label]));
  const correct = q.answerAuthority.acceptedIdeas[0];
  const rest = q.choices.filter((c) => c.label !== correct);
  rest.splice(to, 0, q.choices.find((c) => c.label === correct));
  q.choices = rest.map((c, i) => ({ id: ids[i], label: c.label }));
  const newId = Object.fromEntries(q.choices.map((c) => [c.label, c.id]));
  for (const m of q.misconceptions)
    m.match.choiceIds = m.match.choiceIds.map((id) => newId[oldIdToLabel[id]]);
  q.misconceptions.sort((x, y) => x.match.choiceIds[0].localeCompare(y.match.choiceIds[0]));
};
const P = "sysp-";
moveCorrect(P + "ownership-moves-and-drop-practice-1", 0);
moveCorrect(P + "borrowing-and-lifetimes-mutable-references", 0);
moveCorrect(P + "borrowing-and-lifetimes-last-number", 2);
moveCorrect(P + "threads-and-shared-state-smallest-final", 0);
moveCorrect(P + "scheduling-and-deadlock-best-order", 0);
moveCorrect(P + "scheduling-and-deadlock-smallest-locks", 0);
moveCorrect(P + "virtual-memory-and-paging-accesses-without-tlb", 0);
t.save();
