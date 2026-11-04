const { load } = require("./lib.cjs");
const t = load();
const L = "scheduling-and-deadlock";
const P = "sysp-scheduling-and-deadlock-";
t.setOpener(
  L,
  "Three jobs needing 8, 4 and 2 units of processor time are ready together, and a single processor has to run them one after another. The last job finishes at time 14 whatever the order, because the total work is 14 units, but the earlier jobs finish at very different times depending on which goes first, and so the average time a job waits for its result depends on the order as well.",
  "The scheduler makes that choice, and the cost of each policy it might use can be worked out by hand, which lets you compare policies by what they give up. Order matters in a second way when threads take locks, because two threads that hold one lock each and wait for the other's can never continue, and agreeing on one order for taking locks rules this out.",
);
for (const s of ["fcfs-turnaround", "shortest-first", "rr-two-jobs", "break-the-ring", "fewest-locks"]) t.setLead(L, s);

t.replaceWithChoice(L, "shortest-first", P + "best-order", {
  prompt:
    "Three jobs with run lengths 8, 4 and 2 arrive together on one processor and run one after another. Which order gives the lowest mean turnaround time?",
  options: [
    { label: "Longest job first", why: "Running the 8 first finishes the jobs at 8, 12 and 14, so the two short jobs wait for the long one and the mean is 11.33." },
    { label: "Shortest job first" },
    { label: "All orders give the same mean", why: "The last job finishes at 14 in every order, but the earlier jobs do not, and the mean counts all three completion times." },
  ],
  correct: 1,
  hints: [
    "The turnaround time of a job is the time at which it completes, because all of them arrive at time 0.",
    "A job that runs early makes every job behind it wait, so ask which jobs should be made to wait.",
  ],
  onCorrect:
    "In the order 2, 4, 8 the jobs finish at 2, 6 and 14, which sum to 22, and 22 divided by 3 is 7.33, lower than any other order.",
});

t.toChoice(P + "smallest-locks", {
  prompt: "Which of these setups can make two threads deadlock?",
  options: [
    { label: "Both threads take the same single lock", why: "A thread holding the only lock is waiting for nothing, so it finishes and releases it, and the other thread can then take it. Each thread must hold one lock while it waits for another." },
    { label: "Two locks, taken in opposite orders by the two threads" },
    { label: "Two locks, taken in the same order by both threads", why: "The thread that takes the first lock is the only one that can reach the second, so the waiting never forms a ring." },
  ],
  correct: 1,
  hints: [
    "Each thread must hold one lock while it waits for another.",
    "Two threads that need the same single lock cannot hold one each.",
    "The waiting must form a ring, with each thread waiting for a lock the next one holds.",
  ],
  onCorrect:
    "Each thread holds one lock and waits for the one the other holds, and that needs two distinct locks taken in opposite orders.",
});
t.save();
