import {
  argument,
  beat,
  cardNumber,
  cardWord,
  chineseRoom,
  choose,
  drinksMachine,
  numeric,
  persistence,
  word,
  type TeachingLesson,
} from "./definition.js";

const doubt = argument(
  [
    "I can doubt that my body exists.",
    "I cannot doubt that I exist.",
    "If A is identical with B, whatever is true of A is true of B.",
  ],
  "I am not identical with my body.",
);
const maskedMan = argument(
  [
    "Lois believes that Superman can fly.",
    "Lois does not believe that Clark Kent can fly.",
    "If A is identical with B, whatever is true of A is true of B.",
  ],
  "Superman is not Clark Kent.",
);
const elisabethAtoms: Array<["p" | "q" | "r", string]> = [
  ["p", "the mind moves the body"],
  ["q", "the mind touches the body"],
  ["r", "the mind is extended"],
];
const elisabeth = argument(
  [
    ["If the mind moves the body, it touches the body.", "p → q"],
    ["If the mind touches the body, it is extended.", "q → r"],
    ["The mind is not extended.", "¬r"],
  ],
  ["The mind does not move the body.", "¬p"],
  { atoms: elisabethAtoms },
);
const reid = persistence(
  "memory_chain",
  [
    ["boy", "Boy flogged for theft", 0],
    ["officer", "Officer taking a standard", 1],
    ["general", "Old general", 2],
  ],
  [
    ["boy", "officer", "memory"],
    ["officer", "general", "memory"],
    ["boy", "officer", "body"],
    ["officer", "general", "body"],
  ],
);
const chain = persistence(
  "memory_chain",
  [
    ["a", "A, aged 10", 0],
    ["b", "B, aged 30", 1],
    ["c", "C, aged 50", 2],
    ["d", "D, aged 80", 3],
  ],
  [
    ["a", "b", "memory"],
    ["b", "c", "memory"],
    ["c", "d", "memory"],
  ],
);
const fission = persistence(
  "fission",
  [
    ["you", "You, before surgery", 0],
    ["left", "Lefty, new body", 1, -1],
    ["right", "Righty, new body", 1, 1],
  ],
  [
    ["you", "left", "memory"],
    ["you", "right", "memory"],
  ],
);
const teleporter = persistence(
  "teleporter",
  [
    ["earth", "You, on Earth", 0],
    ["mars", "Replica on Mars", 1],
  ],
  [["earth", "mars", "memory"]],
);
const branchLine = persistence(
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
);

export const mindLessons: TeachingLesson[] = [
  {
    id: "mind-and-body",
    title: "Mind and body",
    summary:
      "Assess Descartes' case for dualism, Elisabeth's interaction problem and the physicalist alternatives.",
    moduleId: "phil-mind",
    sourceIds: ["os-self", "sep-dualism", "descartes-meditations"],
    beats: [
      beat(
        "An argument from doubt",
        "One reading of Descartes runs: I can doubt my body exists; I cannot doubt that I exist; whatever is identical shares every property; so I am not my body. The third premise is Leibniz's law. The masked-man argument has the same shape and a false conclusion, since Superman is Clark Kent. 'Being believed by Lois to fly' describes Lois's state of mind rather than a property of the man. 'Being doubted by me' looks the same.",
        ["Descartes", doubt],
        ["The masked man", maskedMan],
      ),
      beat(
        "Elisabeth's question",
        "In 1643 Princess Elisabeth of Bohemia asked Descartes how a thinking substance with no extension could move a body, when, as she understood motion, moving something requires contact and contact requires extension. Set out as premises, her challenge is a valid argument against mind-body causation. Descartes must reject a premise. His reply compared the mind's action to the way heaviness was once thought to move a body, and it did not persuade her.",
        ["Elisabeth's argument", elisabeth],
        ["Descartes on doubt", doubt],
      ),
      beat(
        "Testing the interaction argument",
        "Three atomic sentences give eight rows. The premise ¬r leaves the four rows where the mind is unextended. In those, q → r is true only when q is false. Then p → q is true only when p is false. One row keeps all three premises true, and in it the conclusion ¬p holds. The argument is valid, so the dualist's quarrel is with a premise.",
        ["Elisabeth's argument", elisabeth],
        [
          "Dropping the third premise",
          argument(
            [
              ["If the mind moves the body, it touches the body.", "p → q"],
              ["If the mind touches the body, it is extended.", "q → r"],
            ],
            ["The mind does not move the body.", "¬p"],
            { atoms: elisabethAtoms },
          ),
        ],
      ),
      beat(
        "Physicalist options",
        "Physicalism holds that everything, minds included, is physical. U. T. Place and J. J. C. Smart proposed the identity theory in the 1950s: each type of mental state, such as pain, just is a type of brain state, as lightning just is electrical discharge. A weaker view, property dualism, keeps one physical substance but says mental properties are not physical properties. The causal closure argument pushes towards physicalism.",
        [
          "Causal closure",
          argument(
            [
              "Every physical event that has a cause has a sufficient physical cause.",
              "Some mental events cause physical events.",
              "Those physical events are not caused twice over.",
            ],
            "Those mental events are physical events.",
          ),
        ],
        ["Elisabeth's argument", elisabeth],
      ),
    ],
    questions: [
      word(
        "'Lois believes Superman can fly. Lois does not believe Clark Kent can fly. So Superman is not Clark Kent.' The premises are true in the story and the conclusion is false. Is the argument valid or invalid?",
        "invalid",
        [],
        "Invalid: true premises with a false conclusion is exactly a counterexample. 'Being believed by Lois to fly' is not a property that Leibniz's law carries across.",
        [
          "Recall the definition: can the premises be true while the conclusion is false?",
          "The story itself supplies the situation you need.",
        ],
        ["valid"],
      ),
      word(
        "Princess Elisabeth of Bohemia asked Descartes how an unextended mind could move an extended body. What is this objection to substance dualism called? Answer in one or two words.",
        "interaction",
        ["interaction problem", "mind-body interaction", "causal interaction"],
        "The interaction problem: how two substances with nothing in common could causally affect each other.",
        [
          "The problem concerns causation running between mind and body.",
          "Its name describes the two substances acting on each other.",
        ],
      ),
      numeric(
        "Elisabeth's argument as 'p → q, q → r, ¬r, so ¬p' has eight truth-table rows. In how many are all three premises true?",
        1,
        "¬r leaves the rows with r false; q → r then needs q false; p → q then needs p false. One row remains, and ¬p is true in it.",
        [
          "Start with ¬r: keep only rows where r is false.",
          "Among those, q → r needs q to be false.",
          "Then check p → q with q false.",
        ],
      ),
      word(
        "U. T. Place and J. J. C. Smart held that each type of mental state, such as pain, is a type of brain state. Name their view.",
        "identity theory",
        [
          "type identity",
          "type-identity",
          "mind-brain identity",
          "identity thesis",
          "type physicalism",
        ],
        "The mind-brain identity theory, also called type physicalism.",
        [
          "The view says mental states and brain states are not two things but one.",
          "Its name uses the relation expressed by 'is the same thing as'.",
        ],
      ),
      choose(
        "Which statement is Leibniz's law, the indiscernibility of identicals?",
        [
          "If x is identical with y, then x and y share every property",
          "If x and y share every property, then x is identical with y",
          "No two distinct things share any property",
        ],
        0,
        "Leibniz's law runs from identity to shared properties. The converse, from shared properties to identity, is the identity of indiscernibles.",
        "The law goes from identity to properties, not the other way.",
      ),
      word(
        "Name the view that there is only one kind of substance, physical, but that mental properties are not physical properties.",
        "property dualism",
        ["property-dualism", "dual-aspect theory"],
        "Property dualism.",
        [
          "It is a form of dualism, but not about substances.",
          "The duality lies in the properties things have.",
        ],
        ["substance dualism"],
      ),
    ],
    cards: [
      cardWord(
        "Which philosopher held that the mind is a thinking, unextended substance distinct from the extended body?",
        "descartes",
        ["rene descartes", "cartesius"],
        "René Descartes.",
      ),
      cardWord(
        "Name the principle that if x is identical with y, then x and y have exactly the same properties.",
        "leibniz",
        ["indiscernibility of identicals"],
        "Leibniz's law, the indiscernibility of identicals.",
      ),
    ],
  },
  {
    id: "functionalism-and-the-chinese-room",
    title: "Function and the Chinese Room",
    summary:
      "Model a mental state by its causal role, see why one role can have many realisers and weigh Searle's Chinese Room.",
    moduleId: "phil-mind",
    sourceIds: ["sep-functionalism", "sep-chinese-room", "os-self"],
    beats: [
      beat(
        "A state defined by its role",
        "Functionalism identifies a mental state by its causal role: what typically causes it and what it causes, including its effects on other states. Ned Block's drinks machine shows the idea in miniature. The state '10p credited' is whatever state turns a further 10p into a can. Insert 10p three times from the start: the machine moves to 10p credited, back to nothing owed with a can, then to 10p credited again.",
        ["Gears and levers", drinksMachine("mechanism")],
        ["Silicon chips", drinksMachine("silicon")],
      ),
      beat(
        "Running the table",
        "A machine table fixes every response: for each state and input, the next state and output. With 20p, 10p, 20p from nothing owed, the first coin buys a can and leaves nothing owed; the 10p sets up a credit; the second 20p buys a can and returns 10p change. Nothing in the table mentions what the machine is made of.",
        ["Gears and levers", drinksMachine("mechanism")],
        ["Neurons", drinksMachine("neurons")],
      ),
      beat(
        "Many realisers",
        "Hilary Putnam argued in 1967 that pain could be realised by human neurons or by an octopus's very different nervous system, and in principle by silicon. If pain were identical with one brain state, creatures without that state could not feel pain. Functionalism avoids the problem: the same table can be implemented by gears, neurons or chips, so the same mental kind can have many physical realisers.",
        ["Gears and levers", drinksMachine("mechanism")],
        ["Neurons", drinksMachine("neurons")],
        ["Silicon chips", drinksMachine("silicon")],
      ),
      beat(
        "Searle's room",
        "In 1980 John Searle imagined himself in a room, matching incoming Chinese characters to outgoing ones by an English rulebook. To people outside, the room converses fluently; Searle understands no Chinese. If running the right program sufficed for understanding, he would understand. His slogan is that syntax is not sufficient for semantics. The systems reply says the whole room understands; Searle answers that he could memorise the rules and still understand nothing.",
        ["Searle with the rulebook", chineseRoom("rulebook")],
        ["The same table in silicon", chineseRoom("silicon")],
      ),
    ],
    questions: [
      numeric(
        "Ned Block's drinks machine sells a can for 20p, takes 10p and 20p coins and starts with nothing owed. Someone inserts 10p, then 10p, then 10p. How many cans come out?",
        1,
        "10p sets a credit; the second 10p completes 20p and releases a can; the third sets a new credit. One can.",
        [
          "Track the state after each coin: nothing owed or 10p credited.",
          "A can comes out only when the total reaches 20p.",
          "Count the coins that complete a 20p total.",
        ],
      ),
      numeric(
        "The same machine starts with nothing owed. Someone inserts 20p, then 10p, then 20p. How many cans come out?",
        2,
        "20p buys a can at once; 10p sets a credit; 20p with 10p credited buys a can and returns 10p. Two cans.",
        [
          "A 20p coin with nothing owed buys a can immediately.",
          "Track the credit left after each coin.",
          "A 20p coin with 10p already credited overpays by 10p but still buys a can.",
        ],
      ),
      word(
        "Name the thesis, used by Putnam against the identity theory, that a single mental kind such as pain can be realised in very different physical systems.",
        "multiple realisability",
        [
          "multiple realizability",
          "multiple realisation",
          "multiple realization",
          "multiply realisable",
          "multiply realizable",
        ],
        "Multiple realisability.",
        [
          "Think of pain in humans, octopuses and possible robots.",
          "The thesis says one kind can be 'realised' in many ways.",
        ],
      ),
      word(
        "Searle says the man in the room understands no Chinese. Name the reply that the whole room, including the man, the rulebook and the papers, understands.",
        "systems reply",
        ["system reply", "the systems reply"],
        "The systems reply.",
        [
          "The reply moves understanding from the man to something larger.",
          "It is named after what the man, the book and the papers form together.",
        ],
      ),
      word(
        "Two machines, one of gears and one of silicon chips, share the same machine table and receive the same coins. Do they end in different functional states? Answer yes or no.",
        "no",
        [],
        "No. Functional states are fixed by the table, which is identical; only the realisers differ.",
        [
          "A functional state is defined by its place in the table.",
          "Does the table mention gears or chips?",
        ],
        ["yes"],
      ),
      choose(
        "What conclusion does Searle draw from the Chinese Room?",
        [
          "Running a program is not by itself sufficient for understanding",
          "No computer can ever behave as if it understands",
          "Only biological brains can run programs",
        ],
        0,
        "Searle grants the behaviour. He denies that implementing the program is enough for understanding.",
        "Searle grants that the room's replies are fluent.",
      ),
    ],
    cards: [
      cardWord(
        "Who devised the Chinese Room argument against strong artificial intelligence (1980)?",
        "searle",
        ["john searle"],
        "John Searle.",
      ),
      cardNumber(
        "In the 20p drinks machine, 10p is already credited and someone inserts a 20p coin. How many pence of change come out?",
        10,
        "20p plus the 10p credit is 30p for a 20p can, so 10p change.",
      ),
    ],
  },
  {
    id: "personal-identity",
    title: "What makes you you",
    summary:
      "Apply Locke's memory criterion, Reid's transitivity objection and Parfit's fission and teleporter cases.",
    moduleId: "phil-mind",
    sourceIds: ["locke-essay", "sep-identity-personal", "os-self"],
    beats: [
      beat(
        "Locke's memory criterion",
        "Locke held that personal identity reaches as far back as consciousness can be extended to past actions. On the direct reading, a later stage is the same person as an earlier stage just when it remembers that stage's experiences from the inside. Thomas Reid's brave officer was flogged as a boy, remembers the flogging as an officer, and as an old general remembers taking the standard but not the flogging.",
        ["Reid's brave officer", reid],
        ["A long life", chain],
      ),
      beat(
        "Identity is transitive",
        "If a is b and b is c, then a is c. On the direct memory criterion the general is the officer and the officer is the boy, yet the general is not the boy, because he does not remember the flogging. The criterion violates transitivity, so it cannot be a criterion of identity. The usual repair counts overlapping chains of memory: continuity rather than direct connection.",
        ["Reid's brave officer", reid],
        ["A long life", chain],
      ),
      beat(
        "Fission",
        "Suppose each hemisphere of your brain is transplanted into a different body, and each survivor remembers your past as well as you do. Both are psychologically continuous with you. They cannot both be you, since they are not one another. Continuity theorists add a non-branching clause; Derek Parfit concluded instead that identity is not what matters, and that what matters is psychological connectedness and continuity, which he called Relation R.",
        ["Fission", fission],
        ["A long life", chain],
      ),
      beat(
        "The teleporter",
        "A scanner records every cell, destroys your body on Earth and builds an exact replica on Mars. The replica remembers your life, so a psychological criterion says you travelled. The bodily criterion says you died and someone new began. Parfit's branch-line case adds a twist: the scanner fails to destroy you, and now you and the replica both exist.",
        ["Teleporter", teleporter],
        ["Branch line", branchLine],
      ),
    ],
    questions: [
      numeric(
        "Reid's brave officer: the officer remembers being flogged as a boy; the old general remembers taking the standard as an officer but has forgotten the flogging. On Locke's direct memory criterion, with how many of the two earlier stages is the general identical?",
        1,
        "One: the officer, whose actions he remembers. He does not remember the boy's flogging, so on the direct criterion he is not the boy.",
        [
          "The direct criterion counts only what a stage itself remembers.",
          "Check the officer stage, then the boy stage.",
          "Count the earlier stages the general remembers from the inside.",
        ],
      ),
      word(
        "Reid's case yields general = officer and officer = boy, but general ≠ boy. Which logical property of identity does the direct memory criterion violate?",
        "transitivity",
        ["transitive", "transitivity of identity"],
        "Transitivity: if a = b and b = c, then a = c.",
        [
          "Look at how the three equations chain together.",
          "The property lets you pass along a chain of identities.",
        ],
      ),
      numeric(
        "Each half of your brain is transplanted into a new body, and both survivors remember your past equally well. On a psychological continuity criterion with no extra clause, how many future people are continuous with you?",
        2,
        "Both survivors are psychologically continuous with you, so two people satisfy the criterion. Identity is one-one, which is the problem.",
        [
          "Psychological continuity does not care which body holds the memories.",
          "Count the survivors who remember your past from the inside.",
          "Each survivor is a separate candidate.",
        ],
      ),
      word(
        "A teleporter destroys your body on Earth and builds an exact replica on Mars that remembers your life. On the bodily criterion of personal identity, do you survive? Answer yes or no.",
        "no",
        [],
        "No. No body continues from Earth to Mars, so on the bodily criterion the replica is a new person.",
        [
          "The bodily criterion asks whether the same living body continues.",
          "What happened to the body on Earth?",
        ],
        ["yes"],
      ),
      numeric(
        "Stage A is a child of 10. B, aged 30, remembers A's experiences; C, aged 50, remembers B's but not A's; D, aged 80, remembers C's but not B's or A's. On the continuity view, which counts overlapping chains of memory, how many of B, C and D are the same person as A?",
        3,
        "All three: A–B, B–C and C–D are linked, so the chain connects each later stage to A.",
        [
          "Continuity follows chains, not just direct links.",
          "Trace the links from A forward.",
          "Count every later stage the chain reaches.",
        ],
      ),
      choose(
        "In Parfit's branch-line case the scanner copies you to Mars but fails to destroy your body on Earth. Which survivor does the bodily criterion count as you?",
        ["The person on Earth", "The replica on Mars", "Both of them"],
        0,
        "Only the person on Earth has your body. The replica has psychological continuity without bodily continuity.",
        "Follow the body, not the memories.",
      ),
    ],
    cards: [
      cardWord(
        "Who held that personal identity reaches as far back as consciousness can be extended to past actions?",
        "locke",
        ["john locke"],
        "John Locke, Essay Concerning Human Understanding, Book II, chapter 27.",
      ),
      cardWord(
        "Who argued from fission and teleporter cases that identity is not what matters in survival?",
        "parfit",
        ["derek parfit"],
        "Derek Parfit.",
      ),
    ],
  },
];
