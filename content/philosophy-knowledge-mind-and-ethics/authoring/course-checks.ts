import type { CourseCheckVisual, PhilosophyModel } from "../../../packages/contracts/src/index.js";
import { authors } from "../../_authoring/course-checks.js";
import {
  argument,
  bayes,
  chineseRoom,
  drinksMachine,
  knowledge,
  mean,
  persistence,
  prospects,
  trolley,
  veil,
} from "./definition.js";
import { philosophyLessons } from "./lessons.js";

const {
  numeric: n,
  choice: c,
  sets,
} = authors(
  "philosophy-knowledge-mind-and-ethics",
  philosophyLessons.map((l) => ({
    id: l.id,
    conceptIds: ["phil-" + l.id],
    sourceIds: l.sourceIds,
  })),
);
const v = (model: PhilosophyModel): CourseCheckVisual => ({ type: "philosophy", model });
const pq = (p: string, q: string): Array<["p" | "q", string]> => [
  ["p", p],
  ["q", q],
];
const thirds = ["Lowest third", "Middle third", "Top third"];
const chain = persistence(
  "memory_chain",
  [
    ["a", "A, aged 12", 0],
    ["b", "B, aged 35", 1],
    ["c", "C, aged 60", 2],
    ["d", "D, aged 85", 3],
  ],
  [
    ["a", "b", "memory"],
    ["b", "c", "memory"],
    ["c", "d", "memory"],
  ],
);

export const philosophyChecks = sets(
  [
    n(
      0,
      "Read: 'The museum must close early today, because the heating has failed and the insurer forbids opening an unheated gallery.' How many premises does it state?",
      v(
        argument(
          ["The heating has failed.", "The insurer forbids opening an unheated gallery."],
          "The museum must close early today.",
          {
            passage:
              "The museum must close early today, because the heating has failed and the insurer forbids opening an unheated gallery.",
          },
        ),
      ),
      2,
      "Two premises follow 'because': the heating has failed, and the insurer forbids opening an unheated gallery.",
    ),
    c(
      1,
      "'If the reactor overheats, the alarm sounds. The alarm did not sound. So the reactor did not overheat.' Is the argument valid or invalid?",
      v(
        argument(
          [
            ["If the reactor overheats, the alarm sounds.", "p → q"],
            ["The alarm did not sound.", "¬q"],
          ],
          ["The reactor did not overheat.", "¬p"],
          { atoms: pq("the reactor overheats", "the alarm sounds") },
        ),
      ),
      ["Valid", "Invalid"],
      0,
      "Valid: it is modus tollens, and no row makes both premises true with the conclusion false.",
    ),
    c(
      2,
      "'You can't trust Dr Lee's figures on air pollution; she drives a large car.' Which fallacy is this?",
      v(
        argument(
          ["Dr Lee presents figures on air pollution.", "Dr Lee drives a large car."],
          "Dr Lee's figures can be dismissed.",
        ),
      ),
      ["Ad hominem", "Straw man", "False dilemma"],
      0,
      "Ad hominem: her car has no bearing on whether her figures are accurate.",
    ),
    n(
      3,
      "Maya hears on the radio that today's match ended 2–1 and believes it. The station was in fact replaying last year's final, which also ended 2–1. Today's match did end 2–1. How many of the three JTB conditions does her belief meet?",
      v(
        knowledge(
          "Maya",
          "Today's match ended 2–1.",
          "A usually reliable radio station announced a 2–1 result.",
          "The broadcast was last year's final; today's match also ended 2–1.",
          { evidenceConnected: false },
        ),
      ),
      3,
      "All three: true, believed and justified. Her evidence concerns last year's match, so this is a Gettier case.",
    ),
    n(
      4,
      "Moore's form infers q from the premises p → q and p. In how many of the four truth-table rows are both premises true?",
      v(
        argument(
          [
            ["If I know I have hands, I know I am not deceived by a demon.", "p → q"],
            ["I know I have hands.", "p"],
          ],
          ["I know I am not deceived by a demon.", "q"],
          { atoms: pq("I know I have hands", "I know I am not deceived by a demon") },
        ),
      ),
      1,
      "Only the row with p and q both true; q is true there, so the form is valid.",
    ),
    n(
      5,
      "Of 1,000 people, 50% have a condition. A test is positive for 80% of those with it and 20% of those without. What percentage of positives have the condition?",
      v(bayes(1000, 0.5, 0.8, 0.2)),
      80,
      "400 true positives and 100 false positives: 400 / 500 = 80%.",
      "%",
    ),
    c(
      6,
      "Elisabeth of Bohemia's objection to Descartes, that an unextended mind could not move a body, is known as which problem?",
      v(
        argument(
          [
            ["If the mind moves the body, it touches the body.", "p → q"],
            ["If the mind touches the body, it is extended.", "q → r"],
            ["The mind is not extended.", "¬r"],
          ],
          ["The mind does not move the body.", "¬p"],
          {
            atoms: [
              ["p", "the mind moves the body"],
              ["q", "the mind touches the body"],
              ["r", "the mind is extended"],
            ],
          },
        ),
      ),
      [
        "The interaction problem",
        "The problem of other minds",
        "The hard problem of consciousness",
      ],
      0,
      "The interaction problem: how an unextended mind and an extended body could act on each other.",
    ),
    n(
      7,
      "Block's drinks machine sells a can for 20p and starts with nothing owed. Someone inserts 10p, then 20p, then 10p. How many cans come out?",
      v(drinksMachine("silicon")),
      1,
      "10p sets a credit; 20p buys a can and returns 10p; the last 10p sets a new credit. One can.",
    ),
    n(
      8,
      "A at 12, B at 35, C at 60 and D at 85: each stage remembers only the stage just before it. On Locke's direct memory criterion, with how many earlier stages is D identical?",
      v(chain),
      1,
      "D remembers only C's experiences, so on the direct criterion D is identical with C alone.",
    ),
    n(
      9,
      "An act has a 30% chance of producing 50 welfare units and a 70% chance of producing 10. What is its expected utility?",
      v(
        prospects(
          "welfare units",
          [
            "The act",
            [
              ["good result", 0.3, 50],
              ["modest result", 0.7, 10],
            ],
          ],
          ["Doing nothing", [["status quo", 1, 0]]],
        ),
      ),
      22,
      "0.3 × 50 + 0.7 × 10 = 15 + 7 = 22 units.",
    ),
    c(
      10,
      "Which of the two trolley cases does the doctrine of double effect forbid?",
      v(trolley("footbridge", 5, 1)),
      ["Pushing in the footbridge case", "Pulling the lever in the switch case"],
      0,
      "The footbridge: the stranger's death is intended as the means of stopping the trolley.",
    ),
    n(
      11,
      "Suppose twelve hours of exercise a week is too much and four hours too little. How many hours is the arithmetic mean?",
      v(
        mean(
          "weekly exercise",
          ["too little", "the right amount", "too much"],
          "hours a week",
          [4, 12],
          "a keen amateur runner",
          [7, 10],
        ),
      ),
      8,
      "(4 + 12) / 2 = 8 hours. The mean relative to a particular person may differ.",
      "hours",
    ),
    n(
      12,
      "Society P pays three equal groups 5, 50 and 95 income units; society Q pays 20, 30 and 40. What is the lowest income in the society that maximin chooses?",
      v(
        veil("income units", thirds, [
          ["Society P", [5, 50, 95]],
          ["Society Q", [20, 30, 40]],
        ]),
      ),
      20,
      "P's worst-off group gets 5, Q's gets 20. Maximin chooses Q, whose lowest income is 20.",
    ),
  ],
  [
    n(
      0,
      "Read: 'The reservoir is below 30%, so a hosepipe ban is likely; a hosepipe ban would close the car wash, so the car wash will probably close.' How many conclusions, intermediate and final, does it draw?",
      v(
        argument(
          ["A hosepipe ban is likely.", "A hosepipe ban would close the car wash."],
          "The car wash will probably close.",
          {
            passage:
              "The reservoir is below 30%, so a hosepipe ban is likely; a hosepipe ban would close the car wash, so the car wash will probably close.",
          },
        ),
      ),
      2,
      "Two: the likely hosepipe ban, and the probable closure of the car wash.",
    ),
    n(
      1,
      "How many of the four truth-table rows are counterexamples to 'p ∨ q, p, so ¬q'?",
      v(
        argument(
          [
            ["The museum or the gallery is open.", "p ∨ q"],
            ["The museum is open.", "p"],
          ],
          ["The gallery is not open.", "¬q"],
          { atoms: pq("the museum is open", "the gallery is open") },
        ),
      ),
      1,
      "With p and q both true, both premises are true and ¬q is false. 'Or' does not exclude both.",
    ),
    c(
      2,
      "'Only man is rational. No woman is a man. So no woman is rational.' Which fallacy is this?",
      v(argument(["Only man is rational.", "No woman is a man."], "No woman is rational.")),
      ["Equivocation", "Ad hominem", "Begging the question"],
      0,
      "Equivocation: 'man' means humankind in the first premise and male human in the second.",
    ),
    c(
      3,
      "A belief that is true, held and justified, but true only by luck relative to the evidence, is called what?",
      v(
        knowledge(
          "Smith",
          "Either Jones owns a Ford or Brown is in Barcelona.",
          "Jones has always driven a Ford.",
          "Jones owns no Ford; by chance, Brown is in Barcelona.",
          { evidenceConnected: false },
        ),
      ),
      ["A Gettier case", "A sound argument", "A base-rate error"],
      0,
      "A Gettier case: all three JTB conditions hold, but the truth is not connected to the evidence.",
    ),
    n(
      4,
      "How many counterexample rows does the sceptic's form 'p → q, ¬q, so ¬p' have?",
      v(
        argument(
          [
            ["If I know I have hands, I know I am not a brain in a vat.", "p → q"],
            ["I do not know I am not a brain in a vat.", "¬q"],
          ],
          ["I do not know I have hands.", "¬p"],
          { atoms: pq("I know I have hands", "I know I am not a brain in a vat") },
        ),
      ),
      0,
      "None: the only row with both premises true has p false, so ¬p is true. Modus tollens is valid.",
    ),
    n(
      5,
      "Of 1,000 people, 5% have a condition. A test is positive for 10% of those without it. How many false positives are there?",
      v(bayes(1000, 0.05, 0.9, 0.1)),
      95,
      "950 people lack the condition, and 10% of them test positive: 95.",
    ),
    c(
      6,
      "Which view holds that each type of mental state is a type of brain state?",
      v(
        argument(
          [
            "Every physical event that has a cause has a sufficient physical cause.",
            "Some mental events cause physical events.",
            "Those physical events are not caused twice over.",
          ],
          "Those mental events are physical events.",
        ),
      ),
      ["The identity theory", "Property dualism", "Substance dualism"],
      0,
      "The identity theory of Place and Smart.",
    ),
    c(
      7,
      "Searle's Chinese Room is meant to show that syntax is not sufficient for what?",
      v(chineseRoom("rulebook")),
      ["Semantics", "Fluent behaviour", "Following a rulebook"],
      0,
      "Semantics: manipulating symbols by their shapes does not give them meaning for the manipulator.",
    ),
    n(
      8,
      "A teleporter copies you to Mars but fails to destroy you on Earth. On a psychological continuity criterion with no extra clause, how many later people are continuous with you?",
      v(
        persistence(
          "teleporter",
          [
            ["earth", "You, on Earth", 0],
            ["stay", "You, still on Earth", 1, -1],
            ["mars", "Replica on Mars", 1, 1],
          ],
          [
            ["earth", "stay", "memory"],
            ["earth", "stay", "body"],
            ["earth", "mars", "memory"],
          ],
        ),
      ),
      2,
      "Both the person on Earth and the replica remember your past, so both are psychologically continuous with you.",
    ),
    n(
      9,
      "A programme gives 25 units of benefit with probability 0.8 and causes 40 units of harm with probability 0.2. What is its expected utility?",
      v(
        prospects(
          "welfare units",
          [
            "Programme",
            [
              ["works", 0.8, 25],
              ["harm", 0.2, -40],
            ],
          ],
          ["Do nothing", [["status quo", 1, 0]]],
        ),
      ),
      12,
      "0.8 × 25 + 0.2 × (−40) = 20 − 8 = 12 units.",
    ),
    c(
      10,
      "'Do not lie, whatever you happen to want.' In Kant's terms, what kind of imperative is this?",
      v(
        argument(
          [
            "Lying would serve my present purpose.",
            "The moral law forbids lying whatever my purposes.",
          ],
          "I must not lie.",
        ),
      ),
      ["Categorical", "Hypothetical"],
      0,
      "Categorical: it does not depend on any goal the agent has.",
    ),
    n(
      11,
      "Suppose nine hours of practice a day is too much and one hour too little. How many hours is the arithmetic mean?",
      v(
        mean(
          "daily practice",
          ["too little", "the right amount", "too much"],
          "hours a day",
          [1, 9],
          "a professional violinist",
          [5, 7],
        ),
      ),
      5,
      "(1 + 9) / 2 = 5 hours.",
      "hours",
    ),
    n(
      12,
      "In a society, 40% of people receive 20 income units and 60% receive 70. What is the average income?",
      v(
        veil(
          "income units",
          ["40% of people", "60% of people"],
          [
            ["Society G", [20, 70]],
            ["Society H", [40, 45]],
          ],
          [0.4, 0.6],
        ),
      ),
      50,
      "0.4 × 20 + 0.6 × 70 = 8 + 42 = 50 income units.",
    ),
  ],
  [
    n(
      0,
      "Read: 'Because the lease forbids pets, because Ola signed the lease, and because a hamster is a pet, Ola may not keep a hamster.' How many premises does it state?",
      v(
        argument(
          ["The lease forbids pets.", "Ola signed the lease.", "A hamster is a pet."],
          "Ola may not keep a hamster.",
          {
            passage:
              "Because the lease forbids pets, because Ola signed the lease, and because a hamster is a pet, Ola may not keep a hamster.",
          },
        ),
      ),
      3,
      "Three 'because' clauses, each a premise.",
    ),
    n(
      1,
      "How many of the four truth-table rows are counterexamples to 'p → q, q → p, so p ↔ q'?",
      v(
        argument(
          [
            ["If the light is on, the switch is up.", "p → q"],
            ["If the switch is up, the light is on.", "q → p"],
          ],
          ["The light is on if and only if the switch is up.", "p ↔ q"],
          { atoms: pq("the light is on", "the switch is up") },
        ),
      ),
      0,
      "Both premises are true only when p and q agree, and then p ↔ q is true. The form is valid.",
    ),
    c(
      2,
      "'Either you support the new motorway or you want the town to die.' Which fallacy is this?",
      v(
        argument(
          [
            "Either you support the motorway or you want the town to die.",
            "You do not want the town to die.",
          ],
          "You should support the motorway.",
        ),
      ),
      ["False dilemma", "Equivocation", "Straw man"],
      0,
      "False dilemma: many positions lie between the two offered.",
    ),
    n(
      3,
      "Tom believes his train leaves at 9:00 because the printed timetable says so. The timetable has a misprint, and the train leaves at 8:00. How many of the three JTB conditions does his belief meet?",
      v(
        knowledge(
          "Tom",
          "My train leaves at 9:00.",
          "The printed timetable lists a 9:00 departure.",
          "A misprint: the train leaves at 8:00.",
          { beliefTrue: false, evidenceConnected: false },
        ),
      ),
      2,
      "Belief and justification hold; truth fails. So it is not knowledge, and not a Gettier case either.",
    ),
    c(
      4,
      "Which premise of the sceptic's closure argument do Dretske and Nozick reject?",
      v(
        argument(
          [
            ["If I know I have hands, I know I am not a brain in a vat.", "p → q"],
            ["I do not know I am not a brain in a vat.", "¬q"],
          ],
          ["I do not know I have hands.", "¬p"],
          { atoms: pq("I know I have hands", "I know I am not a brain in a vat") },
        ),
      ),
      [
        "If I know I have hands, I know I am not a brain in a vat",
        "I do not know I am not a brain in a vat",
      ],
      0,
      "They reject the closure premise and accept that you cannot know you are not envatted.",
    ),
    n(
      5,
      "Of 1,000 people, 25% have a condition. A test is positive for 90% of those with it and 10% of those without. What percentage of positives have the condition?",
      v(bayes(1000, 0.25, 0.9, 0.1)),
      75,
      "225 true positives and 75 false positives: 225 / 300 = 75%.",
      "%",
    ),
    c(
      6,
      "Which view holds that mind and body are two distinct substances, one thinking and unextended, one extended?",
      v(
        argument(
          [
            "I can doubt that my body exists.",
            "I cannot doubt that I exist.",
            "If A is identical with B, whatever is true of A is true of B.",
          ],
          "I am not identical with my body.",
        ),
      ),
      ["Substance dualism", "Property dualism", "The identity theory"],
      0,
      "Substance dualism, Descartes' view.",
    ),
    n(
      7,
      "Block's drinks machine sells a can for 20p and starts with nothing owed. Someone inserts 20p, 20p, 10p and 10p. How many cans come out?",
      v(drinksMachine("neurons")),
      3,
      "Each 20p buys a can; the two 10p coins together buy a third. Three cans.",
    ),
    n(
      8,
      "A at 12, B at 35, C at 60 and D at 85: each stage remembers only the stage just before it. On the direct memory criterion, how many of B, C and D are identical with A?",
      v(chain),
      1,
      "Only B remembers A's experiences directly. Continuity through the chain would count all three.",
    ),
    n(
      9,
      "Policy X gives three people 9, 9 and 0 welfare units; policy Y gives each of them 6. By how many units does X's total exceed Y's?",
      v(
        veil(
          "welfare units",
          ["Person 1", "Person 2", "Person 3"],
          [
            ["Policy X", [9, 9, 0]],
            ["Policy Y", [6, 6, 6]],
          ],
        ),
      ),
      0,
      "X totals 9 + 9 + 0 = 18 and Y totals 18. The difference is 0, though the distributions differ sharply.",
    ),
    n(
      10,
      "In a loop case, four people are ahead and one person is on the loop. Counting lives only, how many more people survive if you divert the trolley?",
      v(trolley("loop", 4, 1)),
      3,
      "4 − 1 = 3 more survive. The arithmetic is the same as in the switch case.",
    ),
    c(
      11,
      "According to Aristotle, how do we become brave?",
      v(
        mean(
          "fear and confidence",
          ["cowardice", "courage", "rashness"],
          "degree of confidence",
          [0, 10],
          "a new recruit",
          [4, 6],
        ),
      ),
      ["By doing brave acts", "By studying ethics", "By reading about heroes"],
      0,
      "By habituation: doing brave acts makes us brave.",
    ),
    n(
      12,
      "Society R pays three equal groups 8, 60 and 100; society S pays 12, 15 and 18; society T pays 10, 40 and 70. What is the lowest income in the society that maximin chooses?",
      v(
        veil("income units", thirds, [
          ["Society R", [8, 60, 100]],
          ["Society S", [12, 15, 18]],
          ["Society T", [10, 40, 70]],
        ]),
      ),
      12,
      "The worst-off groups get 8, 12 and 10. Maximin chooses S, whose lowest income is 12.",
    ),
  ],
  [
    "Thirteen problems across arguments, knowledge, mind and ethics. Find which ideas need attention.",
    "A fresh problem from every lesson. Answer them all before any marking is shown.",
    "A week later, new cases from every lesson, to show what has lasted.",
  ],
);
