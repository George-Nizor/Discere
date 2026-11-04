import { setOpener, setLead, setPrompt, save } from "./lib.mjs";
const L = "gamdpp-state-machines";

setOpener(L, [
  "Suppose a character's behaviour is stored as one true-or-false flag for each thing it can do: isJumping, isDucking and isDiving. Each flag is easy to set and to read, but nothing in the flags themselves prevents isJumping and isDucking from both being true, and every rule about what may follow what, such as that a dive is possible only from a jump or that nothing is possible while the character is stunned, becomes another condition in each place that reads them.",
  "A **state machine** avoids this by naming the states the character can really be in, listing the events that move it from one to another, and allowing exactly one state to be true at a time, so that the question whether the character is jumping and ducking at once never arises.",
]);

for (const id of ["count-the-flags", "four-flags-try", "table-size", "name-the-hook", "arrows-with-two-events"])
  setLead(L, id, []);

setPrompt(
  "gamdpp-gamdpp-state-machines-four-flags",
  "A character has the flags isJumping, isDucking and isDiving, and a fourth flag, isFiring, is added. How many different combinations of values can the four flags hold?",
);

save();
