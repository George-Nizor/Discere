import { setOpener, setLead, save } from "./lib.mjs";
const L = "events-and-queues";

setOpener(L, [
  "When the player dies, four systems need to know: the audio plays a sound, the interface shows a message, the achievements count the death and the analytics log it. The simplest code calls all four from the few lines in the damage calculation that decide the player has died, which makes that function depend on every one of them, so that adding a fifth system means editing it again and testing it means having all four present.",
  "The way out is to let the damage code announce that the player has died and leave the other systems to listen for it. An announcement passed straight to every system that has asked to hear it is the observer pattern, while one stored to be delivered later is an event queue, and the choice between them depends on how long a listener takes and when its work should be done.",
]);

for (const id of ["slow-listener", "lapsed", "queue-or-observer", "trace-the-tail", "total-wait"]) setLead(L, id, []);

save();
