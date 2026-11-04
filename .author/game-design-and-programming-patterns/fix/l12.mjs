import { setOpener, setLead, save } from "./lib.mjs";
const L = "spatial-partitioning";

setOpener(L, [
  "Every frame a game must decide which of its entities touch, and the obvious method, which is to test each one against every other, needs 499,500 tests for a thousand entities, repeated sixty times a second. Most of those tests compare things on opposite sides of the world, and no amount of faster code makes the count grow any more slowly as the crowd gets larger.",
  "Spatial partitioning avoids the pointless tests by keeping entities sorted by where they are, so that each entity is compared only with those nearby. A grid of equal cells is the simplest way to do it, and a tree that splits crowded areas into smaller squares handles worlds where the entities bunch together.",
]);

for (const id of ["count-five", "pairs-of-two-hundred", "column-of-250", "count-the-cells", "cell-size-too-small", "grid-saving"])
  setLead(L, id, []);

save();
