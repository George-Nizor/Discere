import { setOpener, setLead, setPrompt, toChoice, save } from "./lib.mjs";
const L = "balance-by-the-numbers";

setOpener(L, [
  "A sword does 50 damage, and one hit in ten is a critical hit that does triple damage. The sword has to be priced, compared with a bow and matched against an enemy's health before a single player has swung it, and each of those jobs needs one number that says how strong the sword is.",
  "With that number, multiplying by the swings each second gives the rate at which the sword wears an enemy down, which fixes how long a fight lasts, and a rule for how the price of an upgrade rises with level gives the cost of each step. A few short calculations of this kind produce the first draft of a game's numbers, and a playtest then shows where the draft is wrong.",
]);

for (const id of ["expected-before", "with-a-miss", "level-three-cost", "coins-held", "when-does-it-pass-500"])
  setLead(L, id, []);

toChoice("gamdpp-balance-by-the-numbers-expected-predict", {
  prompt:
    "A sword hits for 50 damage, and one hit in ten is a critical hit that does triple damage. Roughly how much damage does a hit do on average?",
  options: [
    {
      label: "About 150",
      why: "150 is the damage of a critical hit alone, and only one hit in ten is critical. The other nine do 50.",
    },
    {
      label: "About 100",
      why: "100 would be about right only if ordinary and critical hits were equally common. Nine hits in ten are ordinary, so the average stays much nearer 50.",
    },
    { label: "A little more than 50" },
    {
      label: "Exactly 50",
      why: "One hit in ten does 150, which is 100 more than an ordinary hit, so the average must lie above 50 even though no single hit does more than that on most swings.",
    },
  ],
  correct: 2,
  onCorrect:
    "Only one hit in ten is critical, so the average is pulled a little above the ordinary 50 and no further.",
  hints: [
    "Most hits are ordinary hits.",
    "A critical hit does 100 more than an ordinary hit, but it happens only one time in ten.",
  ],
});

setPrompt(
  "gamdpp-balance-by-the-numbers-expected-with-miss",
  "A sword hits for 50 damage. It misses 20 percent of the time, and 10 percent of its hits are critical hits that do 150. What is the expected damage per swing?",
);

save();
