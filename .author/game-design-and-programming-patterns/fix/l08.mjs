import { setOpener, setLead, toChoice, save } from "./lib.mjs";
const L = "commands-and-undo";

setOpener(L, [
  "Take the simplest way of handling input: if the key pressed is Space, the player jumps. Once that line has run, nothing remains of what happened except its effect, so the game cannot undo the jump, replay it later or let an enemy make the same jump, and moving jump to another key means finding every place where the key is tested.",
  "Wrapping each action in an object removes those limits, because an object can be kept after it has run, handed to a different caller and asked to reverse itself. A key can then be tied to a different object without touching the code that does the work, and the arrangement is known as the command pattern.",
]);

for (const id of ["rebind-design", "recording-size", "undo-twice", "execute-e", "history-size"]) setLead(L, id, []);

toChoice("gamdpp-commands-and-undo-undo-two", {
  prompt:
    "A game stores the commands a player executes so that they can be undone. Commands A, B, C and D are executed in that order, and the player then undoes twice. Which commands are still applied?",
  options: [
    {
      label: "A, B and C",
      why: "That is the result of undoing once. Two undos reverse two commands, so one more has gone than this.",
    },
    {
      label: "C and D",
      why: "Undo reverses the most recent command first, so D goes first and then C. The oldest commands are the ones that stay applied.",
    },
    {
      label: "A, B, C and D",
      why: "That is the state before any undo. Each undo reverses one command, so after two undos two commands are no longer applied.",
    },
    { label: "A and B" },
  ],
  correct: 3,
  onCorrect: "C and D are not deleted yet: they sit in a redo list until a new command is executed.",
  hints: [
    "Each undo reverses one command.",
    "Which command does an undo reverse first, the oldest or the most recent?",
  ],
});

save();
