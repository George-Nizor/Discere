const { load } = require("./lib.cjs");
const t = load();
const L = "threads-and-shared-state";
const P = "sysp-threads-and-shared-state-";
t.setOpener(
  L,
  "Run the statement counter += 1 a million times in each of two threads, and you might expect to find two million in the counter. A C program that does this typically ends well below that figure, and a different one each time it runs, with no warning from the language, the compiler or the machine.",
  "When two threads share memory, a statement that looks like a single step can be broken up by the other thread, and a result that depends on that timing changes from run to run. Tracing what each thread does to the counter lets you say which results are possible and why Rust refuses to compile the racy version, and a lock together with shared ownership makes the counter come out the same on every run.",
);
for (const s of ["smallest-final", "stale-value", "name-the-code", "three-by-five", "which-type", "share-a-vec"]) t.setLead(L, s);

t.toChoice(P + "smallest-final", {
  prompt:
    "Two threads each run counter += 1 once on a shared counter that starts at 0, with no synchronisation. Which final values can the program produce?",
  options: [
    { label: "Only 2, because each thread adds one", why: "Each thread does add one, but if both read the counter before either writes it back, the second write replaces the first and only one addition survives." },
    { label: "Either 1 or 2, depending on how the threads interleave" },
    { label: "0, 1 or 2, depending on how the threads interleave", why: "Every store writes a value one greater than the one that was loaded, so the counter cannot end at its starting value." },
  ],
  correct: 1,
  hints: [
    "The increment is not a single indivisible step.",
    "It reads the counter, adds, and writes back, and the two threads can interleave those steps.",
    "Suppose both threads read before either writes.",
  ],
  onCorrect:
    "If both threads read the counter before either writes, both write the same new value and one update is lost, so the result is 1 when the steps interleave and 2 when they do not.",
});

t.toChoice(P + "vec-length", {
  prompt:
    "Three threads each push one number into an Arc<Mutex<Vec<i32>>>, and the main thread waits for all of them. What does the Vec hold afterwards?",
  options: [
    { label: "Fewer than three numbers, because pushes at the same moment can overwrite each other", why: "Each push happens while its thread holds the lock, so no two pushes overlap and none can overwrite another." },
    { label: "The program is rejected, because a Vec cannot be shared between threads", why: "A Vec can be shared when it sits inside a Mutex that is owned through an Arc, which is the pattern used for the counter." },
    { label: "All three numbers, in whichever order the threads ran" },
  ],
  correct: 2,
  hints: [
    "The order in which the threads push is not fixed.",
    "Each thread pushes once, and the main thread waits for every one of them.",
    "The mutex ensures that no push is lost.",
  ],
  onCorrect:
    "The order may vary, but the mutex means every push takes effect, so the Vec holds one number from each thread.",
});
t.save();
