const { load } = require("./lib.cjs");
const t = load();
const L = "virtual-memory-and-paging";
const P = "sysp-virtual-memory-and-paging-";
t.setOpener(
  L,
  "Two programs can both read the address 0x1000 and each find its own data there. Neither is overwritten, and neither can reach the other's memory, though they run on one machine with one set of memory chips. The addresses a program uses are not the addresses the hardware sees, and the translation between them happens on every load and every store.",
  "That translation is arithmetic you can do by hand. The address is cut into a page number and an offset, and a table supplies a replacement for the page number, so you can find the physical address behind any virtual one, and you can work out how much the translation adds to a memory access once a small cache in the processor absorbs most of the cost.",
);
for (const s of ["count-offset-bits", "translate-the-address", "table-size-mib", "loads-without-tlb", "eat-120", "higher-hit-ratio"]) t.setLead(L, s);
t.toChoice(P + "accesses-without-tlb", {
  prompt:
    "The page table is a single array in ordinary memory, and nothing speeds up the translation. Compared with a machine that needs no translation, how long does a load of one data value take?",
  options: [
    { label: "About the same, because the hardware translates addresses instantly", why: "The table sits in ordinary memory, so finding the frame means reading an entry from it, and that read costs a memory access of its own." },
    { label: "About twice as long, because the table entry has to be read from memory before the data" },
    { label: "Many times as long, because the processor must search the whole table", why: "The page number indexes the table directly, so one read finds the entry, and a single-level table adds one access, not many." },
  ],
  correct: 1,
  hints: [
    "The page table lives in memory too.",
    "The processor must read the table entry before it knows the physical address.",
    "Then it can read the data.",
  ],
  onCorrect:
    "One access reads the page table entry and a second reads the data, which is why a cache of translations is needed.",
});
t.save();
