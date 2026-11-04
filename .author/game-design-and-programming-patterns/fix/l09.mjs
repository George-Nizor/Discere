import { setOpener, setLead, setPrompt, save } from "./lib.mjs";
const L = "components";

setOpener(L, [
  "A monster that flies and a monster that poisons are each easy to write as a class. A monster that does both is harder, because it belongs under neither class, so code has to be copied from one into the other, or a shared ancestor invented that has no natural meaning, and the same trouble returns with every new combination of traits.",
  "Game programmers instead build a monster from parts, giving it a component for each thing it can do, and in the entity component system those parts become plain data held in arrays. Storing them that way also suits the processor, which reads memory in blocks and so finds packed data far cheaper to fetch than objects scattered across the heap.",
]);

for (const id of ["count-the-classes", "more-traits", "name-the-behaviour-holder", "positions-per-line", "soa-line-count"])
  setLead(L, id, []);

setPrompt(
  "gamdpp-components-four-traits",
  "A monster can have any of four independent traits: flies, swims, poisons, breathes fire. If every combination of traits needs its own class, how many monster classes are there, counting the monster with no trait?",
);

save();
