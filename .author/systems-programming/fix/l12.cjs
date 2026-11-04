const { load } = require("./lib.cjs");
const t = load();
const L = "caches-and-locality";
const P = "sysp-caches-and-locality-";
t.setOpener(
  L,
  "Adding up every number in a matrix can be done by rows or by columns. Both loops perform the same additions on the same numbers and give the same total, yet on a large matrix one of them is often several times slower than the other, although nothing in the arithmetic accounts for the difference.",
  "The difference comes from memory, because the processor does not read one number at a time from the chips but a whole block, and the next read is cheap only if it falls in a block already held. Counting the blocks a loop loads is therefore a better measure of its cost than counting its additions, and it lets you say, before running anything, which of two loops will be the faster.",
);
for (const s of ["count-sequential", "stride-lines", "column-order", "sixteen-lines", "bigger-elements"]) t.setLead(L, s);
t.question(P + "big-cache").prompt =
  "A 16 by 16 matrix of four-byte integers is stored row by row, so each row is one 64-byte line. It is read column by column, with a cache that holds 16 lines and drops the least recently used line when it is full. How many misses occur?";
t.toChoice(P + "column-misses", {
  prompt:
    "An 8 by 16 matrix of four-byte integers is stored row by row, so each row is one 64-byte line. The cache holds 4 lines and drops the least recently used line when it is full. Compared with reading the matrix row by row, how many misses does reading it column by column cause?",
  options: [
    { label: "The same number, because both loops read the same integers", why: "The number of reads is the same, but the cost is counted in lines loaded. Row order loads each line once, and column order keeps coming back to lines that have already gone." },
    { label: "A few more, because a few lines are evicted before they are used again", why: "A column visits all eight lines in turn and the cache holds four, so the line needed next is always the oldest one, and it is the one evicted." },
    { label: "Far more, because each line is evicted before it is used again" },
  ],
  correct: 2,
  hints: [
    "A column read touches one integer of every row, so it touches all the lines in turn.",
    "The cache holds only half of those lines.",
    "By the time a column comes back to a line, that line has been evicted.",
  ],
  onCorrect:
    "A column cycles through more lines than the cache holds, so each line is evicted before its next use and every read misses, where row order misses only once per line.",
});
t.save();
