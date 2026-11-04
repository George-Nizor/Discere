import { setOpener, setLead, save } from "./lib.mjs";
const L = "pools-and-sharing";

setOpener(L, [
  "A game can be unable to create an object even though the total amount of free memory is more than enough, because the free memory is scattered in gaps and none of them is large enough. The gaps appear when a game creates and frees small objects in no particular order, as a shooter does with every bullet it fires and every bullet that lands, and each request for memory also costs a little time.",
  "A pool avoids the requests altogether by creating a fixed set of objects once and reusing them, and a flyweight attacks a different cost, the memory taken by many objects that each hold a copy of the same data, by keeping a single copy that they all share.",
]);

for (const id of ["three-slots", "pool-of-four", "shared-forest", "pick-the-shared-part", "trees-with-sway"])
  setLead(L, id, []);

save();
