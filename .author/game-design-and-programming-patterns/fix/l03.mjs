import { setOpener, setLead, toChoice, save } from "./lib.mjs";
const L = "challenge-flow-and-difficulty";

setOpener(L, [
  "The same level can absorb a player during their first hour of play and bore them in the next, though nothing in the level has changed. The player has changed: after an hour of practice the jumps that once demanded attention are made without thought, so the level asks less of them than it did, and the part of the experience that came from effort has drained away.",
  "A designer who wants to keep a player engaged has to keep the demands of the game in step with the player's growing ability. The psychologist Mihaly Csikszentmihalyi called the state in which the two are matched flow, and a simple version of his picture, with the player's skill on one axis and the challenge of the level on the other, shows when a player will be bored, when anxious and when absorbed. It gives a designer a way to decide how quickly challenge should rise, and whether every player should meet the same difficulty, choose their own, or have the game adjust it as they play.",
]);

for (const id of ["skill-drifts", "relief-level", "name-the-adaptive-approach", "spot-the-risk", "two-adjustments"])
  setLead(L, id, []);

toChoice("gamdpp-challenge-flow-and-difficulty-check-anxiety", {
  prompt: "A player of low skill faces a level of very high challenge. In the flow model, which state is the player in?",
  options: [
    { label: "Anxiety" },
    {
      label: "Boredom",
      why: "Boredom is the opposite case, where the challenge is far below the player's skill. Here the challenge is far above it.",
    },
    {
      label: "Flow",
      why: "Flow needs the challenge to lie within the channel around the player's skill, and a very high challenge against low skill is far outside it.",
    },
  ],
  correct: 0,
  onCorrect: "Challenge far above skill puts the player over the channel, where demands outrun ability.",
  hints: ["The challenge is far above the skill."],
});

save();
