import { setOpener, setLead, save } from "./lib.mjs";
const L = "the-game-loop";

setOpener(L, [
  "A ball that moves 5 pixels each time the main loop of a game runs covers 300 pixels in a second when the loop runs 60 times per second, and it covers more on a machine that runs the loop faster. The code is the same everywhere, but the game is not, because the ball's speed has come to depend on how fast the processor happens to be, and a game that behaves differently on every machine cannot be tested, tuned or shared, while a competitive one cannot be fair.",
  "Tying the speed of the game to a clock instead of to the processor means advancing the simulation in steps of a fixed length and spending the real time that has passed on whole steps, using a running total called the accumulator, so that a given sequence of inputs produces the same result on every machine.",
]);

for (const id of ["ball-on-fast-machine", "step-at-thirty", "updates-in-a-frame", "draw-position", "stall-with-cap"])
  setLead(L, id, []);

save();
