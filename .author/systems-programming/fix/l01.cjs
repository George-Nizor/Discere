const { load } = require("./lib.cjs");
const t = load();
const L = "bytes-integers-and-overflow";
t.setOpener(
  L,
  "The Rust statement let x: u32 = 258; puts a number in memory, which is a long row of numbered boxes that can each hold a single value from 0 to 255. Because 258 is too large for one box, a u32 takes four consecutive boxes, and they contain 2, 1, 0 and 0, with the 2 first. The number exists in memory only as those four small values, and what it means depends on their order and on the type used to read them.",
  "Once you know how the boxes are filled, you can read the bytes of any integer, say what the same pattern means as a signed or an unsigned number, and predict what an addition does when its result is too big for the boxes it was given. In Rust that last case has more than one possible outcome, since the program can panic, wrap around, stop at the largest value or report the problem, and the programmer has to choose which.",
);
for (const s of ["convert-1f4", "largest-i16", "offset-one", "which-method", "signed-wrap", "wrap-around"])
  t.setLead(L, s);
t.toChoice("sysp-bytes-integers-and-overflow-wrapping-250-plus-10", {
  prompt:
    "In the program shown, a u8 holds 250, and the first println! prints a.wrapping_add(10), which keeps only the bits that fit in a u8. What does it print?",
  options: [
    { label: "260, the exact sum", why: "A u8 has no pattern for 260, because its eight bits end at 255, so the sum cannot be stored as it stands." },
    { label: "255, the largest value a u8 holds", why: "Stopping at the largest value is what saturating_add does, on the second line. wrapping_add keeps the bits that fit." },
    { label: "4, because the count wraps past the largest value and starts again", why: "" },
    { label: "An error, because the sum does not fit", why: "wrapping_add never reports a problem, and a plain + would be the one to panic in a debug build. This method simply drops the bit that does not fit." },
  ].map((o, i) => (i === 2 ? { ...o, why: undefined } : o)),
  correct: 2,
  hints: [
    "A u8 has no pattern for 260, so think of an eight-bit counter that starts again after its largest value.",
    "Counting up ten from 250, the counter runs out of room after five steps and carries on from the start.",
  ],
  onCorrect:
    "wrapping_add keeps the result modulo 256, so 250 + 10 = 260 becomes 260 − 256 = 4.",
});
t.save();
