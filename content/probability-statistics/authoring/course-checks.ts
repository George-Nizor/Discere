import { authors, series, statements, table } from "../../_authoring/course-checks.js";

const lessons = [
  "counting-outcomes",
  "when-the-condition-changes",
  "independent-repetitions",
  "centre-and-outliers",
  "same-centre-different-spread",
  "samples-and-populations",
];
const sources = [
  ["psu-probability"],
  ["mit-conditional"],
  ["mit-independence"],
  ["nist-location"],
  ["nist-spread"],
  ["statcan-selection", "statcan-sampling", "statcan-nonprob"],
];
const {
  numeric: n,
  choice: c,
  sets,
} = authors(
  "probability-statistics",
  lessons.map((id, i) => ({ id, conceptIds: ["stats-" + id], sourceIds: sources[i]! })),
);
export const statisticsCourseChecks = sets(
  [
    n(
      0,
      "Two fair spinners are independent. What is the probability that their numbers sum to 5? Give a fraction or decimal.",
      table(
        ["Spinner", "Equally likely labels"],
        [
          ["First", "1, 2, 3"],
          ["Second", "1, 2, 3, 4"],
        ],
      ),
      1 / 4,
      "There are 3 × 4 = 12 equally likely ordered pairs. (1,4), (2,3) and (3,2) sum to 5, giving 3/12 = 1/4.",
      "probability",
    ),
    n(
      1,
      "A person is selected uniformly from the evening group. What is the probability they passed?",
      table(
        ["Group", "Passed", "Did not pass"],
        [
          ["Morning", "6", "4"],
          ["Evening", "9", "11"],
        ],
      ),
      9 / 20,
      "The condition restricts the denominator to the 20 evening members. Nine passed, so the probability is 9/20.",
      "probability",
    ),
    n(
      2,
      "Assume the two sensors work independently. What is the probability that both work?",
      table(
        ["Sensor", "Probability of working"],
        [
          ["A", "0.8"],
          ["B", "0.6"],
        ],
      ),
      0.48,
      "Independence permits multiplying the two probabilities: 0.8 × 0.6 = 0.48.",
      "probability",
    ),
    n(
      3,
      "What is the median of these five observations?",
      series("Observed values", ["Dataset", [5, 11, 4, 8, 7]]),
      7,
      "Sorting gives 4, 5, 7, 8, 11. The middle observation is 7.",
      "",
    ),
    n(
      4,
      "These four values are the entire population. What is their population variance?",
      series("Entire population", ["Values", [3, 3, 9, 9]]),
      9,
      "The mean is 6. Each squared deviation is 9, so their sum 36 divided by the population size 4 gives variance 9.",
      "",
    ),
    c(
      5,
      "The target population is all town commuters. What is the main limitation of this survey?",
      statements("Survey plan", [
        "Interview people waiting at one bus stop.",
        "Ask about their usual commuting time.",
      ]),
      [
        "A larger sample at this same stop must remove all selection bias.",
        "Commuters using other routes or transport may have no chance to be included.",
        "Every bus rider must give a false answer.",
      ],
      1,
      "The sampling frame misses commuters elsewhere, including those who walk, drive or use other routes. Increasing the count at that stop does not fix the exclusion.",
    ),
  ],
  [
    c(
      3,
      "The largest observation changes from 14 to 34. What happens to the mean and median?",
      series("Before and after", ["Before", [2, 6, 8, 10, 14]], ["After", [2, 6, 8, 10, 34]]),
      [
        "Both rise by 20.",
        "The mean rises by 4; the median stays 8.",
        "The median rises by 4; the mean stays 8.",
      ],
      1,
      "The total rises by 20 across five observations, so the mean rises by 4. The sorted middle value remains 8.",
    ),
    c(
      2,
      "A single fair spinner selects exactly one sector. Are 'red' and 'blue' independent?",
      table(
        ["Colour", "Equal sectors"],
        [
          ["Red", "3"],
          ["Blue", "2"],
        ],
      ),
      [
        "Yes, because a fair spinner is random.",
        "No: their joint probability is 0, while (3/5) × (2/5) is positive.",
        "Yes, because the events cannot occur together.",
      ],
      1,
      "The events are mutually exclusive and each has positive probability. Their joint probability is 0, not the product 6/25, so they are not independent.",
    ),
    n(
      0,
      "Roll two independent fair six-sided dice. What is the probability of a total of 9 or 10?",
      table(
        ["Die", "Faces"],
        [
          ["First", "1, 2, 3, 4, 5, 6"],
          ["Second", "1, 2, 3, 4, 5, 6"],
        ],
      ),
      7 / 36,
      "Four ordered pairs total 9 and three total 10. These cases do not overlap, giving 7 favourable pairs out of 36.",
      "probability",
    ),
    n(
      5,
      "The table describes every member of a small population. What is the population mean value?",
      table(
        ["Group", "Members", "Value per member"],
        [
          ["A", "3", "2"],
          ["B", "9", "6"],
        ],
      ),
      5,
      "The total is 3 × 2 + 9 × 6 = 60 across 12 members. The mean is 60/12 = 5; averaging the two group values without their sizes would give the wrong weight.",
      "",
    ),
    n(
      1,
      "Choose one tile uniformly from all tiles, then learn that it is triangular. What is the probability it is red?",
      table(
        ["Colour", "Triangles", "Squares"],
        [
          ["Red", "3", "2"],
          ["Blue", "1", "4"],
        ],
      ),
      3 / 4,
      "There are four triangular tiles and three are red. The square tiles are outside the conditioned sample space.",
      "probability",
    ),
    n(
      4,
      "Use all four values as the entire population. What is the population variance?",
      series("Entire population", ["Values", [2, 4, 4, 6]]),
      2,
      "The mean is 4. Squared deviations are 4, 0, 0 and 4. Their sum 8 divided by all four population members gives variance 2.",
      "",
    ),
  ],
  [
    n(
      0,
      "One of the 15 codes is chosen uniformly. What is the probability its letter is B or its number is 5?",
      table(
        ["Part", "Possible labels"],
        [
          ["Letter", "A, B, C"],
          ["Number", "1, 2, 3, 4, 5"],
        ],
      ),
      7 / 15,
      "The five B codes and the three codes ending in 5 overlap at B5. Count it once: 5 + 3 - 1 = 7 favourable codes out of 15.",
      "probability",
    ),
    n(
      4,
      "These are the complete four readings for a batch. What is their population standard deviation?",
      series("Whole batch", ["Readings", [7, 7, 13, 13]]),
      3,
      "The mean is 10 and every reading is 3 away. Population variance is 9, whose square root is 3.",
      "",
    ),
    c(
      5,
      "Every household has a known, nonzero selection probability, but some probabilities are larger. Which statement is justified?",
      statements("Sampling design", [
        "All households are in the sampling frame.",
        "A random procedure gives each household a known, positive chance of selection.",
      ]),
      [
        "This cannot be a probability sample because the chances differ.",
        "It is a probability sample, but unequal chances can require weighting for population estimates.",
        "Every resulting sample must match every population characteristic exactly.",
      ],
      1,
      "A probability sample requires known, nonzero chances, not identical ones. Unequal probabilities matter when estimating population quantities; no one realised sample is guaranteed to match everything.",
    ),
    n(
      2,
      "In this model, rainy days are independent, each with probability 1/4. What is the probability of rain on at least one of two days?",
      table(
        ["Day", "Rain probability"],
        [
          ["Day 1", "1/4"],
          ["Day 2", "1/4"],
        ],
      ),
      7 / 16,
      "No rain on either day has probability (3/4) × (3/4) = 9/16. Its complement is 1 - 9/16 = 7/16. Independence is a stated model assumption, not a claim about real weather.",
      "probability",
    ),
    n(
      3,
      "Six waiting times are shown. What is their median, in minutes?",
      series("Waiting times in minutes", ["Times", [3, 4, 5, 6, 7, 41]]),
      5.5,
      "The ordered middle values are 5 and 6. Their average is 5.5 minutes; the longest wait does not change which pair is central.",
      "",
    ),
    n(
      1,
      "Select a tested item uniformly, then learn that it failed. What is the probability it came from line B?",
      table(
        ["Line", "Passed", "Failed"],
        [
          ["A", "18", "2"],
          ["B", "9", "1"],
        ],
      ),
      1 / 3,
      "There are three failed items in total, one from line B. Conditioning on failure gives 1/3; the total number tested is no longer the denominator.",
      "probability",
    ),
  ],
  [
    "Six problems about chance, data and sampling. Use the stated assumptions and see which lessons will help.",
    "Combine counting with conditions and compare datasets. Results appear after all six responses.",
    "Apply the ideas to codes, measurements and sampling after a week. These cases are new.",
  ],
);
