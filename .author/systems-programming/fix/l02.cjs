const { load } = require("./lib.cjs");
const t = load();
const L = "layout-size-and-alignment";
t.setOpener(
  L,
  "The struct { a: u8, b: u32 } has a one-byte field and a four-byte field, so its data adds up to five bytes, yet Rust reports its size as eight. The three extra bytes are inserted by the compiler after a, so that b starts at an address divisible by four, which is where a processor can load a four-byte value in a single step.",
  "The gap follows from a rule, and once you know the rule you can work out the size of any struct on paper, estimate how much memory a million of them occupy, and see why swapping two field declarations can shrink a struct without removing any data.",
);
for (const s of ["next-address", "pack-the-bytes", "big-first", "changed-fields"]) t.setLead(L, s);
t.question("sysp-layout-size-and-alignment-big-first-size").prompt =
  "The fields of #[repr(C)] struct T { a: u8, b: u64, c: u16 } are reordered as #[repr(C)] struct T2 { b: u64, c: u16, a: u8 }. What is the size of T2?";
t.toChoice("sysp-layout-size-and-alignment-reordered-size", {
  prompt:
    "The struct S { a: u8, b: u32, c: u8 } in the worked example is 12 bytes with #[repr(C)]. The program declares the same three fields in the order a, c, b. How does its size compare with 12?",
  options: [
    { label: "Larger than 12, because c now sits between a and b", why: "c is a single byte with alignment 1, so it fits straight after a, and b still starts at the next multiple of 4, which leaves less padding than before." },
    { label: "The same, because the struct holds the same fields", why: "The size depends on where the padding falls as well as on the fields. In the order a, b, c there are three bytes of padding before b and three after c, and a different order places them differently." },
    { label: "Smaller than 12, because the two u8 fields can share the space before b" },
    { label: "Equal to the sum of the field sizes, 6", why: "b is still a u32, so it must start at a multiple of 4, and the struct is then rounded up to a multiple of 4 as well. Some padding remains." },
  ],
  correct: 2,
  hints: [
    "Lay the fields out in the order written: a is at offset 0, and the next free byte is 1.",
    "Check whether c can start at byte 1 without padding, and where b has to start after that.",
  ],
  onCorrect:
    "Both u8 fields fit in the first four bytes, so b starts at offset 4 and only two bytes of padding remain, which makes the struct 8 bytes long.",
});
t.step(L, "pack-the-bytes").reveal = [
  t.para("Both u8 fields fit in the first four bytes, so only two bytes of padding remain before b, and the struct is smaller than the one in the worked example."),
];
t.save();
