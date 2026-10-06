import { choose, grid, number, numericCard, type TeachingLesson, termCard } from "./definition.js";
export const probabilityLessons: TeachingLesson[] = [
  {
    id: "counting-outcomes",
    title: "Count what can happen",
    summary:
      "Use equally likely ordered outcomes to calculate a probability, and avoid treating possible sums as equally likely.",
    moduleId: "stats-chance",
    sourceId: "psu-probability",
    beats: [
      {
        title: "Start with the possible pairs",
        text: "Roll two fair six-sided dice independently. A row gives the first roll; a column gives the second. Each cell is one ordered pair. Move the target sum to see which pairs qualify before you calculate a probability.",
        diagram: grid("sum_equals", 7),
      },
      {
        title: "A sum can have several routes",
        text: "A total of 7 can come from 1 and 6, or from 6 and 1. These are different ordered outcomes. A total of 2 has only the pair 1 and 1. Count cells rather than giving every possible sum the same weight.",
        diagram: grid("sum_equals", 2),
      },
      {
        title: "Count the whole event",
        text: "An event can collect many outcomes. For a total of at least 10, include totals 10, 11 and 12. Count the green cells once each. The denominator still includes every possible ordered pair.",
        diagram: grid("sum_at_least", 10),
      },
      {
        title: "Turn the question around",
        text: "A total either reaches 10 or falls below it. These two events cover the grid without overlap. Changing the target lets you test this split. Use the complement to answer a new question without recounting every other cell.",
        diagram: grid("sum_at_least", 10),
      },
    ],
    questions: [
      number(
        "How many ordered outcomes are possible for two independent six-sided dice?",
        36,
        "There are 6 first rolls and 6 second rolls, giving 6 × 6 = 36 ordered outcomes.",
        "Count the rows, then the cells in each row.",
        "",
      ),
      choose(
        "Why is a total of 7 more likely than a total of 2?",
        [
          "Every possible sum is equally likely",
          "More ordered pairs make 7 than make 2",
          "The second die always makes large totals",
        ],
        1,
        "Compare how many cells match each total.",
      ),
      number(
        "What is the probability of a total of at least 10? Give a fraction or decimal.",
        1 / 6,
        "Totals 10, 11 and 12 have 3 + 2 + 1 = 6 outcomes; 6/36 = 1/6.",
        "Count only matching pairs, then divide by all 36 pairs.",
        "probability",
      ),
      number(
        "What is the probability that the total is below 10? Give a fraction or decimal.",
        5 / 6,
        "The complement has 36 − 6 = 30 outcomes, so 30/36 = 5/6.",
        "Subtract the probability of at least 10 from 1.",
        "probability",
      ),
      number(
        "For two fair four-sided dice, what is the probability of a total of 5?",
        1 / 4,
        "Four pairs make 5: (1,4), (2,3), (3,2), (4,1). There are 16 pairs, so 4/16 = 1/4.",
        "List the pairs that sum to 5; the changed dice have four sides each.",
        "probability",
      ),
      choose(
        "When may you calculate probability by counting favourable outcomes over all outcomes?",
        [
          "Whenever the outcomes are equally likely",
          "Whenever outcomes have numerical names",
          "Only when the event is certain",
        ],
        0,
        "Counting gives each outcome the same weight.",
      ),
    ],
    cards: [
      numericCard(
        "Two fair six-sided dice are rolled independently. What is the probability of a total of 3?",
        1 / 18,
        "The pairs (1,2) and (2,1) give 3, so the probability is 2/36 = 1/18.",
        "probability",
      ),
      termCard(
        "What is the name for the event consisting of all outcomes outside event A?",
        "complement",
        "The complement of A consists of the outcomes where A does not occur.",
      ),
    ],
  },
  {
    id: "when-the-condition-changes",
    title: "When the condition changes",
    summary: "Restrict the possible outcomes before computing a conditional probability.",
    moduleId: "stats-chance",
    sourceId: "mit-conditional",
    beats: [
      {
        title: "Some outcomes are ruled out",
        text: "You learn that the first die showed 1 or 2. The faded rows no longer belong to the conditional sample space. Adjust the target for the second roll. Count possible outcomes inside the surviving rows before answering.",
        diagram: grid("second_at_most", 3, 2),
      },
      {
        title: "Use the surviving denominator",
        text: "There are two eligible rows, each with six second rolls. For a second roll at most 3, half of each row qualifies. Both the numerator and denominator must refer to the same condition.",
        diagram: grid("second_at_most", 3, 2),
      },
      {
        title: "A condition can change the chance",
        text: "Now ask about the sum rather than the second roll. Given a first roll at most 2, only the pairs (1,6), (2,5) and (2,6) reach 7. The same target without that condition uses the full grid and gives a different probability.",
        diagram: grid("sum_at_least", 7, 2),
      },
      {
        title: "A narrower clue",
        text: "The new clue is that the first die showed 1. One row survives. A sum of 7 needs a second roll of 6, so one eligible pair qualifies. Restrict the outcomes first; then count the event inside them.",
        diagram: grid("sum_equals", 7, 1),
      },
    ],
    questions: [
      number(
        "Given that the first roll is at most 2, how many ordered outcomes remain possible?",
        12,
        "Two first-roll values remain, each with six second rolls: 2 × 6 = 12.",
        "Count only the two eligible rows.",
        "",
      ),
      number(
        "Given a first roll at most 2, what is the probability of a second roll at most 3?",
        1 / 2,
        "There are 6 matching pairs among 12 eligible pairs, so 6/12 = 1/2.",
        "Restrict both counts to the surviving rows.",
        "probability",
      ),
      number(
        "Given a first roll at most 2, what is the probability of a sum of at least 7?",
        1 / 4,
        "The matching pairs are (1,6), (2,5) and (2,6), so 3/12 = 1/4.",
        "Count pairs in the two eligible rows that sum to at least 7.",
        "probability",
      ),
      number(
        "Given a first roll of 1, what is the probability of a sum of 7?",
        1 / 6,
        "Only (1,6) qualifies among the six possible pairs in the first row: 1/6.",
        "A first roll of 1 fixes the row.",
        "probability",
      ),
      number(
        "Given a first roll of 1 on a fair six-sided die, what is the probability that the sum is at least 5?",
        1 / 2,
        "The second roll must be 4, 5 or 6. Three of six eligible outcomes qualify: 1/2.",
        "Which second rolls reach 5 when the first is 1?",
        "probability",
      ),
      choose(
        "A clue rules out some outcomes. Which denominator belongs in the conditional probability?",
        [
          "All outcomes before the clue",
          "Only outcomes compatible with the clue",
          "Only the favourable outcomes",
        ],
        1,
        "The clue changes what is still possible.",
      ),
    ],
    cards: [
      numericCard(
        "Two fair dice are rolled independently. Given a first roll of 1, what is the probability of a sum of 4?",
        1 / 6,
        "Only a second roll of 3 gives 4. One of the six eligible outcomes qualifies: 1/6.",
        "probability",
      ),
      termCard(
        "What kind of probability uses a sample space restricted by a known event?",
        "conditional",
        "Conditional probability restricts the possible outcomes to those compatible with the given event.",
      ),
    ],
  },
  {
    id: "independent-repetitions",
    title: "Independent repetitions",
    summary:
      "Distinguish independent events from mutually exclusive events, and calculate a joint probability.",
    moduleId: "stats-chance",
    sourceId: "mit-independence",
    beats: [
      {
        title: "Half of each roll",
        text: "Each fair die has three values at most 3. Green cells require both rolls to meet that limit. Move the limit to see the square of matching pairs expand. The second roll keeps the same chances whichever first roll occurred.",
        diagram: grid("both_at_most", 3),
      },
      {
        title: "Two filters at once",
        text: "For a limit of 2, two first rolls and two second rolls qualify. The grid has four matching pairs. Because the rolls are independent, the probability of both filters passing is the product of their individual probabilities.",
        diagram: grid("both_at_most", 2),
      },
      {
        title: "Independent does not mean separate",
        text: "The event that the first roll is small and the event that the second roll is small can happen together. Independence means knowing one result does not change the other event's chance. Mutually exclusive events cannot both occur in the same trial.",
        diagram: grid("both_at_most", 3),
      },
      {
        title: "At least one is a different event",
        text: "For at least one roll above 3, exclude the green square where both rolls are at most 3. Every remaining pair qualifies. This complement avoids double-counting pairs where both rolls are high.",
        diagram: grid("both_at_most", 3),
      },
    ],
    questions: [
      number(
        "What is the probability that both independent fair six-sided rolls are at most 3?",
        1 / 4,
        "Each roll qualifies with probability 3/6 = 1/2; the joint probability is 1/2 × 1/2 = 1/4.",
        "Count the 3 by 3 square among all 36 pairs.",
        "probability",
      ),
      number(
        "What is the probability that both rolls are at most 2?",
        1 / 9,
        "There are 2 × 2 = 4 matching pairs, so 4/36 = 1/9.",
        "Each individual probability is 2/6.",
        "probability",
      ),
      choose(
        "Which statement defines independence?",
        [
          "The events cannot happen together",
          "Knowing one event does not change the probability of the other",
          "Both events have probability one half",
        ],
        1,
        "Independence concerns how a condition affects a probability.",
      ),
      number(
        "What is the probability that at least one of the two rolls is above 3?",
        3 / 4,
        "Both rolls at most 3 has probability 1/4. Subtracting this from 1 gives 3/4.",
        "Subtract the chance that both rolls are low from 1.",
        "probability",
      ),
      number(
        "Two fair coins are tossed independently. What is the probability of two heads?",
        1 / 4,
        "The four equally likely ordered outcomes are HH, HT, TH and TT. Only HH qualifies: 1/4.",
        "List ordered coin outcomes.",
        "probability",
      ),
      choose(
        "On a single die roll, the events 'roll 1' and 'roll 2' are which kind of pair?",
        ["Independent", "Mutually exclusive", "Identical"],
        1,
        "Can both events occur in one roll?",
      ),
    ],
    cards: [
      numericCard(
        "Two fair six-sided rolls are independent. What is the probability that both equal 6?",
        1 / 36,
        "Each roll has probability 1/6, so both have probability 1/6 × 1/6 = 1/36.",
        "probability",
      ),
      termCard(
        "What term describes two events that cannot both happen in the same trial?",
        "mutually exclusive",
        "Mutually exclusive events cannot happen together; that is different from independence.",
      ),
    ],
  },
];
