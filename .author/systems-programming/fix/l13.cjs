const { load } = require("./lib.cjs");
const t = load();
const L = "unsafe-rust-and-the-c-boundary";
const P = "sysp-unsafe-rust-and-the-c-boundary-";
t.setOpener(
  L,
  "Every Rust program already depends on code that is not Rust. When println! prints a line, the standard library eventually calls the operating system's write, and on Linux it does so through the C library, which is a layer that Rust's own rules do not cover.",
  "Rust reaches that layer through unsafe. An unsafe block allows a small, fixed set of extra operations, such as calling a function written in C, and each one depends on a fact that the compiler cannot check and the programmer therefore has to. Knowing exactly what those operations are lets you read the unsafe code in a systems library and write a call into C whose requirements you can state.",
);
for (const s of ["which-operation", "name-e0133", "call-abs", "strlen-another-word"]) t.setLead(L, s);
t.question(P + "strlen-systems").prompt =
  "With strlen declared as unsafe extern \"C\", what does unsafe { strlen(b\"systems\\0\".as_ptr() as *const c_char) } return?";
t.toChoice(P + "abs-minus-three", {
  prompt:
    "A Rust program declares C's abs as fn abs(x: i32) -> i32; inside an unsafe extern \"C\" block and then calls abs(-3) inside an unsafe block. What happens?",
  options: [
    { label: "It is rejected, because the compiler cannot see the C source of abs", why: "The declaration is all the compiler needs. The linker connects the name to the C library, and the unsafe block is where the programmer accepts that the function cannot be checked." },
    { label: "It calls the C library's abs and evaluates to 3" },
    { label: "It compiles, but the call returns -3, because values cross into C unchanged", why: "The C function runs exactly as it would in a C program, so it returns the absolute value of its argument and not the argument itself." },
  ],
  correct: 1,
  hints: [
    "abs is C's absolute value function.",
    "The declaration tells Rust the name and the type, and the linker finds the function in the C library.",
  ],
  onCorrect:
    "abs returns the number without its sign, so the declaration makes it behave as the C function does.",
});
t.save();
