import { bundle, setOpener, setLead, toChoice, save, question } from "./lib.mjs";
const L = "mechanics-dynamics-aesthetics";
const Q = (s) => `gamdpp-${L}-${s}`;

setOpener(L, [
  "In Tetris, a row of ten squares that has been filled completely disappears, and everything above it drops down by one row. That is a single sentence of rules, yet it is enough to produce a game in which players learn to keep their stack flat, panic as it climbs, and feel relief when a long piece arrives at the right moment. Nobody wrote \"keep the stack flat\" or \"feel relief\" into the program, because those arise from the rule once a person starts to play.",
  "Designers have words for the distance between what is written and what is felt. In a framework presented in 2004, the **mechanics** are the rules that were written, the **dynamics** are the behaviour that appears once people play by them, and the **aesthetics** are the feelings that behaviour produces. A designer can write only the mechanics, so everything the player eventually feels has to be reached by choosing rules and predicting what people will do with them.",
]);

for (const id of ["pieces-for-rows", "name-the-behaviour", "classify-the-racing-statement", "unlock-interval"])
  setLead(L, id, []);

toChoice(Q("column-open"), {
  prompt:
    "A Tetris player keeps the rightmost column empty for several moves, waiting for a long piece. In MDA, which layer does this behaviour belong to?",
  options: [
    {
      label: "A mechanic",
      why: "A mechanic is a rule or a piece of data that a program could check, and no rule of Tetris mentions an empty column. The habit appears only when people play.",
    },
    { label: "A dynamic" },
    {
      label: "An aesthetic",
      why: "An aesthetic is a feeling the player has, such as challenge. Leaving a column empty is something the player does, and any feeling it produces is a separate matter.",
    },
  ],
  correct: 1,
  onCorrect: "No rule asks for it. Players adopt the habit because of how the rules reward a complete row.",
  hints: [
    "Does any rule of the game say to keep a column empty?",
    "Is the empty column something the game does, something the player does, or something the player feels?",
  ],
});

toChoice(Q("check-stamina"), {
  prompt: "A game has a stamina bar. Which of these statements describes a mechanic?",
  options: [
    {
      label: "Players save their stamina for the boss fight.",
      why: "Saving stamina for a particular fight is behaviour that appears when people play, which makes it a dynamic. No rule asks players to do it.",
    },
    {
      label: "The tension of running low on stamina in mid-air.",
      why: "Tension is a feeling the player has, so it is an aesthetic. A rule can make the feeling more likely but cannot state it.",
    },
    { label: "A jump costs 10 stamina." },
  ],
  correct: 2,
  onCorrect: "It is a rule with a number in it, which a program can check on every jump.",
  hints: ["A mechanic is a rule or a piece of data that a program could check."],
});

save();
