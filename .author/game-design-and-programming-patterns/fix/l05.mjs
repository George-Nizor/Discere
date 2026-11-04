import { bundle, setOpener, setLead, step, save } from "./lib.mjs";
const L = "prototype-and-playtest";

setOpener(L, [
  "Every design decision is a prediction about how people will play, such as that the coins earned in a card game will neither pile up nor run out, and a prediction is settled only by trying it. Building a whole game to try one is slow and costly, so designers build the smallest version that can answer a single question, called a prototype, which for a question about numbers like these can be nothing more than paper cards and tokens.",
  "Questions about people need a different test, a playtest, in which players who have never seen the game are watched while they play. A game can also log what its players do, and this record, called telemetry, extends the same watching to thousands of them, with counts that show at which step they hesitate or leave.",
]);

for (const id of ["paper-test", "pick-the-question", "funnel-share", "retest"]) setLead(L, id, []);

// The predict asked for 45 / 90, which needs no method. It now asks the intuition the next screen turns on.
const qid = "gamdpp-prototype-and-playtest-hardest-step";
bundle.questions = bundle.questions.filter((q) => q.id !== qid);
const old = bundle.questions.find((q) => q.id === "gamdpp-prototype-and-playtest-funnel-predict");
bundle.questions.push({
  id: qid,
  conceptIds: old.conceptIds,
  prompt:
    "In a game, 200 players start, 150 finish the tutorial, 90 beat level 1 and 45 beat level 2. Which step keeps the smallest share of the players who reach it?",
  responseType: "short_text",
  difficulty: 1,
  hints: [
    "Count the players who reach each step: all 200 reach the tutorial, but only 150 reach level 1.",
    "Compare what each step loses with the number who reached it, not with the 200 who started.",
  ],
  sourceIds: old.sourceIds,
  onCorrect: "Level 2 keeps 45 of the 90 players who reach it, half, against three fifths at level 1 and three quarters at the tutorial.",
  skill: old.skill,
  calculator: "off",
  answerAuthority: { kind: "text", acceptedIdeas: ["Level 2"], rejectedIdeas: [], exampleAnswer: "Level 2" },
  choices: [
    { id: "a", label: "The tutorial" },
    { id: "b", label: "Level 1" },
    { id: "c", label: "Level 2" },
  ],
  misconceptions: [
    {
      match: { choiceIds: ["a"] },
      feedback: "The tutorial loses 50 of the 200 players who reach it, a quarter, so it keeps three quarters, the largest share of the three steps.",
    },
    {
      match: { choiceIds: ["b"] },
      feedback: "Level 1 loses the most players, 60, but it was reached by 150. It keeps 90 of them, three fifths, a larger share than the final step keeps of its 90.",
    },
  ],
});
const s = step(L, "funnel-share");
s.checkQuestionId = qid;
s.reveal = [
  {
    kind: "paragraph",
    text: "The next screen sets the steps side by side, and shows why the step that loses the most players need not be the one that keeps the smallest share.",
  },
];

save();
