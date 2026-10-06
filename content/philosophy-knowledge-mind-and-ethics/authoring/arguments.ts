import {
  argument,
  beat,
  cardNumber,
  cardWord,
  choose,
  numeric,
  word,
  type TeachingLesson,
} from "./definition.js";

const bridge =
  "Since the bridge was built before 1950, and every bridge built before 1950 must be inspected this year, the bridge must be inspected this year.";
const field =
  "The council should not sell the playing field. After all, it is the only open space in the ward, and selling a ward's only open space breaks the council's own planning policy.";
const rain: Array<["p" | "q", string]> = [
  ["p", "it rained overnight"],
  ["q", "the pavement is wet"],
];

export const argumentLessons: TeachingLesson[] = [
  {
    id: "reconstructing-arguments",
    title: "Finding the argument",
    summary:
      "Separate premises from conclusion, write an argument in standard form and supply a missing premise.",
    moduleId: "phil-arguments",
    sourceIds: ["forallx-ch1", "os-arguments"],
    beats: [
      beat(
        "Words that signal support",
        "An argument is a set of claims, the premises, offered as reasons for another claim, the conclusion. 'Since' introduces a reason, and the final clause states what is being concluded. The bridge passage offers two reasons: the bridge's date and the inspection rule. Standard form lists each premise on its own line, then the conclusion, so the support can be judged before anyone argues about whether the premises are true.",
        [
          "The bridge",
          argument(
            [
              "The bridge was built before 1950.",
              "Every bridge built before 1950 must be inspected this year.",
            ],
            "The bridge must be inspected this year.",
            { passage: bridge },
          ),
        ],
        [
          "The quorum",
          argument(
            [
              "The quorum for a valid vote is twelve members.",
              "Only nine members attended the vote.",
            ],
            "The vote is not valid.",
            {
              passage:
                "The vote is not valid, for the quorum is twelve members and only nine attended.",
            },
          ),
        ],
      ),
      beat(
        "The conclusion can come first",
        "Writers often state the conclusion first and defend it afterwards. 'After all' announces that reasons follow, so the opening sentence is the claim being defended. A reliable test: ask what the passage wants you to believe, then ask which sentences are offered as grounds for it. The rest of the passage answers 'why?'.",
        [
          "Playing field",
          argument(
            [
              "The playing field is the only open space in the ward.",
              "Selling a ward's only open space breaks the council's planning policy.",
            ],
            "The council should not sell the playing field.",
            { passage: field },
          ),
        ],
        [
          "Late train",
          argument(
            [
              "The 8:10 train has been cancelled.",
              "The next train arrives after the meeting starts.",
            ],
            "You will be late for the meeting.",
            {
              passage:
                "You will be late to the meeting: the 8:10 has been cancelled, and the next train arrives after it starts.",
            },
          ),
        ],
      ),
      beat(
        "The premise nobody said",
        "The traditional name for an argument with an unstated premise is an enthymeme, from a term in Aristotle's Rhetoric. 'Mira is a solicitor, so she has a law degree' needs a bridge such as 'every solicitor has a law degree'. Supplying it exposes a problem: in England and Wales many solicitors qualified after a degree in another subject. A fair reconstruction might use 'most solicitors have a law degree', which supports the conclusion strongly but no longer guarantees it.",
        [
          "Mira",
          argument(
            ["Every solicitor has a law degree.", "Mira is a solicitor."],
            "Mira has a law degree.",
            { passage: "Mira is a solicitor, so she has a law degree.", unstated: [0] },
          ),
        ],
        [
          "The kettle",
          argument(
            [
              "If the kettle is switched on at the wall and works, it heats the water.",
              "The kettle is switched on at the wall.",
              "The water is cold after five minutes.",
            ],
            "The kettle does not work.",
            {
              passage:
                "The kettle is switched on at the wall, yet the water is cold after five minutes. So the kettle is broken.",
              unstated: [0],
            },
          ),
        ],
      ),
      beat(
        "Arguments inside arguments",
        "A long argument often draws an intermediate conclusion and then uses it as a premise. In the freezer passage the first 'so' concludes that the bottle will crack; that claim then joins a new premise to support the final conclusion. Mapping the chain shows where an objection would bite: if the bottle is plastic, the first step fails and everything after it loses its support.",
        [
          "The freezer",
          argument(
            [
              "A full, sealed glass bottle of water will crack in the freezer.",
              "A cracked bottle leaks.",
            ],
            "The freezer will need cleaning.",
            {
              passage:
                "Water expands when it freezes, so a full, sealed glass bottle left in the freezer will crack; and a cracked bottle leaks, so the freezer will need cleaning.",
            },
          ),
        ],
        [
          "The bridge again",
          argument(
            [
              "The bridge was built before 1950.",
              "Every bridge built before 1950 must be inspected this year.",
            ],
            "The bridge must be inspected this year.",
            { passage: bridge },
          ),
        ],
      ),
    ],
    questions: [
      numeric(
        "Read: 'Since the bridge was built before 1950, and every bridge built before 1950 must be inspected this year, the bridge must be inspected this year.' How many premises does this argument state?",
        2,
        "Two: the bridge's date of construction, and the rule that bridges of that age must be inspected this year. The final clause is the conclusion.",
        [
          "Find the claim the passage wants you to accept; that is the conclusion.",
          "'Since' introduces the reasons. List each separate claim it introduces.",
          "Count the claims offered as reasons, leaving out the conclusion.",
        ],
      ),
      choose(
        "Which sentence is the conclusion of: 'The council should not sell the playing field. After all, it is the only open space in the ward, and selling a ward's only open space breaks the council's own planning policy.'?",
        [
          "The council should not sell the playing field",
          "The field is the only open space in the ward",
          "Selling a ward's only open space breaks planning policy",
        ],
        0,
        "'After all' introduces the reasons, so the opening sentence is the claim they support.",
        "Ask which sentence the others are offered to support.",
      ),
      word(
        "What is the traditional name for an argument that leaves one of its premises unstated?",
        "enthymeme",
        ["enthymemes", "enthymematic"],
        "An enthymeme: an argument with a suppressed premise, such as 'Mira is a solicitor, so she has a law degree'.",
        [
          "The term comes from Greek and is used of everyday arguments that skip an obvious step.",
          "It begins with 'enthy-'.",
        ],
      ),
      numeric(
        "Read: 'Water expands when it freezes, so a full, sealed glass bottle left in the freezer will crack; and a cracked bottle leaks, so the freezer will need cleaning.' How many conclusions, intermediate and final, does it draw?",
        2,
        "Two. The bottle will crack (concluded from expansion), and the freezer will need cleaning (concluded from the crack and the leak).",
        [
          "Each 'so' introduces a conclusion.",
          "A conclusion can be used again as a premise for a later step.",
          "Count every claim that follows a 'so'.",
        ],
      ),
      numeric(
        "Read: 'Because all reptiles are cold-blooded and every snake is a reptile, and because cold-blooded animals bask in the morning sun, snakes bask in the morning sun.' How many premises does it state?",
        3,
        "Three premises: reptiles are cold-blooded; snakes are reptiles; cold-blooded animals bask in the morning sun. The final clause is the conclusion.",
        [
          "Find the conclusion first; it comes at the end.",
          "Each 'because' clause can contain more than one claim joined by 'and'.",
          "Count the separate claims offered as reasons.",
        ],
      ),
      word(
        "In 'We should cancel the picnic, since the forecast says thunderstorms', which single word signals the premise?",
        "since",
        [],
        "'Since' introduces the reason, the forecast; the conclusion is that we should cancel.",
        ["Look for the word that could be replaced by 'because'."],
      ),
    ],
    cards: [
      cardNumber(
        "In 'The film was dubbed, so it was not shown in its original language; anything not shown in its original language loses some jokes, hence the film lost some jokes', how many words mark a conclusion?",
        2,
        "Two: 'so' and 'hence'. The first marks an intermediate conclusion, the second the final one.",
      ),
      cardWord(
        "Name the kind of argument in which one premise is left unstated.",
        "enthymeme",
        ["enthymemes"],
        "An enthymeme.",
      ),
    ],
  },
  {
    id: "validity-and-soundness",
    title: "Valid, sound and counterexamples",
    summary:
      "Test validity by searching for a counterexample row, and separate a valid argument from a sound one.",
    moduleId: "phil-arguments",
    sourceIds: ["forallx-ch2", "forallx-ch12", "os-inferences"],
    beats: [
      beat(
        "Form, not content",
        "An argument is valid when no possible situation makes every premise true and the conclusion false. 'If it rained overnight, the pavement is wet; the pavement is wet; so it rained' fails that test: a burst water main wets the pavement on a dry night. That pattern is called affirming the consequent. Its neighbour, modus ponens, has no such situation, whatever p and q are about.",
        [
          "Affirming the consequent",
          argument(
            [
              ["If it rained overnight, the pavement is wet.", "p → q"],
              ["The pavement is wet.", "q"],
            ],
            ["It rained overnight.", "p"],
            { atoms: rain },
          ),
        ],
        [
          "Modus ponens",
          argument(
            [
              ["If it rained overnight, the pavement is wet.", "p → q"],
              ["It rained overnight.", "p"],
            ],
            ["The pavement is wet.", "q"],
            { atoms: rain },
          ),
        ],
      ),
      beat(
        "Counting the rows",
        "A truth table lists every way of assigning true and false to the atomic sentences. For 'p → q, q, so p', both premises are true in two rows: p true with q true, and p false with q true. In the second row the conclusion p is false. That single row is a counterexample, and one counterexample is enough to show the form invalid.",
        [
          "p → q, q ⊢ p",
          argument(
            [
              ["If it rained overnight, the pavement is wet.", "p → q"],
              ["The pavement is wet.", "q"],
            ],
            ["It rained overnight.", "p"],
            { atoms: rain },
          ),
        ],
        [
          "p → q, ¬q ⊢ ¬p",
          argument(
            [
              ["If it rained overnight, the pavement is wet.", "p → q"],
              ["The pavement is not wet.", "¬q"],
            ],
            ["It did not rain overnight.", "¬p"],
            { atoms: rain },
          ),
        ],
      ),
      beat(
        "Valid is not the same as true",
        "Validity concerns the link between premises and conclusion, not whether the premises are true. 'All metals are magnetic; copper is a metal; so copper is magnetic' is valid: if both premises were true, the conclusion would have to be. The first premise is false, since a magnet does not pick up copper. A sound argument is valid and has only true premises; this one is valid and unsound.",
        [
          "Copper",
          argument(["All metals are magnetic.", "Copper is a metal."], "Copper is magnetic."),
        ],
        [
          "Whales",
          argument(["All mammals breathe air.", "Whales are mammals."], "Whales breathe air."),
        ],
      ),
      beat(
        "Three letters, eight rows",
        "With three atomic sentences the table has eight rows. 'p → q, q → r, so p → r' has no counterexample row, so it is valid. Swap the second premise for 'r → q' and the conclusion fails only where p is true and r false; the first premise then needs q true, and 'r → q' is true there too. That one row breaks the inference.",
        [
          "Chained conditionals",
          argument(
            [
              ["If the alarm sounds, the guard wakes.", "p → q"],
              ["If the guard wakes, the gate is locked.", "q → r"],
            ],
            ["If the alarm sounds, the gate is locked.", "p → r"],
            {
              atoms: [
                ["p", "the alarm sounds"],
                ["q", "the guard wakes"],
                ["r", "the gate is locked"],
              ],
            },
          ),
        ],
        [
          "Shared consequent",
          argument(
            [
              ["If the alarm sounds, the guard wakes.", "p → q"],
              ["If the gate is locked, the guard wakes.", "r → q"],
            ],
            ["If the alarm sounds, the gate is locked.", "p → r"],
            {
              atoms: [
                ["p", "the alarm sounds"],
                ["q", "the guard wakes"],
                ["r", "the gate is locked"],
              ],
            },
          ),
        ],
      ),
    ],
    questions: [
      word(
        "Premises: 'If it rained overnight, the pavement is wet' and 'The pavement is wet'. Conclusion: 'It rained overnight'. Is the argument valid or invalid?",
        "invalid",
        [],
        "Invalid: a burst water main on a dry night makes both premises true and the conclusion false.",
        [
          "Look for a possible situation in which both premises are true and the conclusion is false.",
          "Could the pavement be wet for some other reason?",
        ],
        ["valid"],
      ),
      numeric(
        "For the form 'p → q, q, so p', in how many of the four truth-table rows are both premises true?",
        2,
        "Both premises are true when p and q are both true, and when p is false and q true. In the second of those rows the conclusion is false.",
        [
          "List the four rows: TT, TF, FT, FF for p and q.",
          "The second premise, q, removes every row where q is false.",
          "Check p → q in the rows that remain.",
        ],
      ),
      numeric(
        "In 'All metals are magnetic; copper is a metal; so copper is magnetic', which premise is false? Answer with its number, 1 or 2.",
        1,
        "Premise 1 is false: copper is a metal but is not attracted by a magnet. The argument is valid and unsound.",
        [
          "Validity is not in question here; check each premise against the facts.",
          "Is copper a metal?",
          "Does a fridge magnet stick to a copper pipe?",
        ],
      ),
      numeric(
        "How many of the eight truth-table rows are counterexamples to 'p → q, r → q, so p → r'?",
        1,
        "The conclusion is false only when p is true and r false. Then p → q needs q true, and r → q is true because r is false. One row: p true, q true, r false.",
        [
          "Start from the conclusion: when is p → r false?",
          "In those rows, which value of q makes the first premise true?",
          "Check the second premise in the row that remains.",
        ],
      ),
      choose(
        "A valid argument has a false conclusion. What must be the case?",
        [
          "At least one premise is false",
          "Every premise is false",
          "The argument is not valid after all",
        ],
        0,
        "If every premise were true, validity would force a true conclusion. So at least one premise is false, though not necessarily all.",
        "Suppose every premise were true. What would validity then require?",
      ),
      numeric(
        "A complete truth table for an argument with four different atomic sentences has how many rows?",
        16,
        "Each atomic sentence doubles the rows: 2 × 2 × 2 × 2 = 16.",
        [
          "One atomic sentence gives two rows, true and false.",
          "Each new atomic sentence doubles the number of rows.",
          "Calculate 2 raised to the power of the number of atomic sentences.",
        ],
      ),
    ],
    cards: [
      cardWord(
        "What is a valid argument whose premises are all true called?",
        "sound",
        ["soundness"],
        "A sound argument: valid, with every premise true, so its conclusion is true as well.",
        ["unsound"],
      ),
      cardNumber(
        "How many counterexample rows does 'p ∨ q, ¬p, so q' have in its four-row truth table?",
        0,
        "None. Both premises are true only when p is false and q true, and there q is true. The form, disjunctive syllogism, is valid.",
      ),
    ],
  },
  {
    id: "fallacies-and-charity",
    title: "Fallacies and charity",
    summary:
      "Name common informal fallacies and reconstruct an opponent's argument in its most plausible form.",
    moduleId: "phil-arguments",
    sourceIds: ["os-fallacies", "forallx-ch1"],
    beats: [
      beat(
        "Answering the person",
        "Rejecting an argument because of who offers it is the ad hominem fallacy. Dr Okafor's load calculations can be checked whatever her history with the firm. A motive matters in a different case: when we have only someone's say-so, their interest in the outcome is a reason to seek confirmation. That is a judgement about testimony, not a refutation of an argument whose premises are on the table.",
        [
          "The councillor's reply",
          argument(
            [
              "Dr Okafor says the bridge design is unsafe.",
              "Dr Okafor once lost a contract to the design firm.",
            ],
            "Her claim that the design is unsafe can be dismissed.",
          ),
        ],
        [
          "Testimony alone",
          argument(
            [
              "The only support for the claim is an anonymous source's say-so.",
              "The source profits if the rival design is chosen.",
            ],
            "The claim needs independent confirmation before we rely on it.",
          ),
        ],
      ),
      beat(
        "Attacking a weaker claim",
        "A straw man replaces an opponent's position with a weaker or more extreme one and refutes that instead. Ana proposed 20 mph near schools. Ben's reply attacks a national 20 mph limit, which nobody proposed. His economic argument may be sound and still leave Ana's actual proposal untouched. The repair is to restate the opponent's view in terms they would accept before criticising it.",
        [
          "Ben's reply",
          argument(
            [
              "Ana wants every car in the country to drive at 20 mph.",
              "A national 20 mph limit would badly damage the economy.",
            ],
            "Ana's proposal should be rejected.",
          ),
        ],
        [
          "A fair reply",
          argument(
            [
              "Ana proposes a 20 mph limit on roads beside schools.",
              "Buses on those roads would then miss their timetables.",
            ],
            "Ana's proposal needs a change to the bus timetables.",
          ),
        ],
      ),
      beat(
        "One word, two meanings",
        "Equivocation shifts the meaning of a word between premises. In the feather argument 'light' means 'not heavy' in the first premise and 'pale' in the second. Fix one meaning throughout and a premise becomes false: a feather is not heavy, but being not heavy has nothing to do with colour. The argument only looks valid because the word stays the same while the claim changes.",
        [
          "The feather",
          argument(
            ["A feather is light.", "Whatever is light is not dark."],
            "A feather is not dark.",
          ),
        ],
        [
          "The bank",
          argument(
            ["The robbers met at the bank.", "A bank is the side of a river."],
            "The robbers met beside a river.",
          ),
        ],
      ),
      beat(
        "The principle of charity",
        "The principle of charity asks you to reconstruct an argument in its most plausible form before judging it. For 'smoking causes cancer, so you shouldn't smoke', the missing premise could be 'everyone who smokes gets cancer', which is false, or 'you should avoid what greatly raises your risk of a serious disease', which is plausible and makes the argument valid. Criticising the weaker version would itself be a straw man.",
        [
          "Smoking",
          argument(
            [
              "You should avoid what greatly raises your risk of a serious disease.",
              "Smoking greatly raises the risk of lung cancer.",
            ],
            "You should not smoke.",
            {
              passage: "Smoking causes cancer, so you shouldn't smoke.",
              unstated: [0],
            },
          ),
        ],
        [
          "Library",
          argument(
            [
              "Either the council closes the library or the council goes bankrupt.",
              "The council must not go bankrupt.",
            ],
            "The council must close the library.",
          ),
        ],
      ),
    ],
    questions: [
      word(
        "Dr Okafor argues that a bridge design is unsafe. A councillor replies: 'She once lost a contract to that firm, so we can ignore her.' Name the fallacy.",
        "ad hominem",
        ["personal attack", "argumentum ad hominem"],
        "Ad hominem: the reply targets the arguer's history instead of her calculations.",
        [
          "Does the reply engage with the reasons about the bridge, or with something else?",
          "The fallacy has a Latin name meaning 'to the person'.",
        ],
      ),
      word(
        "Ana: 'Speed limits beside schools should drop to 20 mph.' Ben: 'Ana wants every car in the country crawling along at 20, which would wreck the economy.' Name Ben's fallacy.",
        "straw man",
        ["strawman", "straw-man", "straw person", "straw figure"],
        "A straw man: Ben attacks a national limit that Ana never proposed.",
        [
          "Compare Ana's actual proposal with the one Ben criticises.",
          "The fallacy is named after a figure that is easy to knock down.",
        ],
      ),
      word(
        "'A feather is light. Whatever is light is not dark. So a feather is not dark.' Name the fallacy.",
        "equivocation",
        ["equivocating", "equivocate", "ambiguity"],
        "Equivocation: 'light' means 'not heavy' in one premise and 'pale' in the other.",
        [
          "Ask whether 'light' means the same thing in both premises.",
          "The fallacy's name comes from Latin for 'equal voice': one word, two senses.",
        ],
      ),
      choose(
        "Someone says: 'Smoking causes cancer, so you shouldn't smoke.' Which added premise gives the most charitable reconstruction?",
        [
          "You should avoid what greatly raises your risk of a serious disease",
          "Everyone who smokes gets cancer",
          "Anything that causes something bad should be banned",
        ],
        0,
        "It is plausible and makes the argument valid. The other two are false or much stronger than the speaker needs.",
        "Choose the premise that is believable and still connects the reason to the conclusion.",
      ),
      word(
        "'This newspaper never prints falsehoods. We know this because its front page says so, and that statement must be true, since the paper never prints falsehoods.' Name the fallacy.",
        "begging the question",
        [
          "circular reasoning",
          "circular argument",
          "circularity",
          "circular",
          "petitio principii",
          "begs the question",
        ],
        "Begging the question: the conclusion is used to support the premise offered for it.",
        [
          "Trace where the support for 'never prints falsehoods' comes from.",
          "The argument travels in a circle back to its starting claim.",
        ],
      ),
      word(
        "'Either we close the library or the council goes bankrupt.' The council in fact has several other ways to save money. Name the fallacy.",
        "false dilemma",
        ["false dichotomy", "false choice", "either-or fallacy", "black-and-white thinking"],
        "A false dilemma: two options are presented as the only ones when others exist.",
        [
          "Count the options the speaker offers, then the options that really exist.",
          "The fallacy is named after a forced choice between two horns.",
        ],
      ),
    ],
    cards: [
      cardWord(
        "Name the fallacy of rejecting an argument because of some fact about the person who offers it.",
        "ad hominem",
        ["argumentum ad hominem", "personal attack"],
        "Ad hominem.",
      ),
      cardWord(
        "Name the principle of reconstructing an opponent's argument in its most plausible form before criticising it.",
        "charity",
        ["charitable", "principle of charity"],
        "The principle of charity.",
      ),
    ],
  },
];
