import {
  choose,
  distribution,
  number,
  numericCard,
  population,
  type TeachingLesson,
  termCard,
} from "./definition.js";
export const statisticsLessons: TeachingLesson[] = [
  {
    id: "centre-and-outliers",
    title: "Centre and outliers",
    summary:
      "Calculate the mean and median, and see how one extreme observation changes them differently.",
    moduleId: "stats-data",
    sourceId: "nist-location",
    beats: [
      {
        title: "Move one observation",
        text: "The five observations are 2, 4, 4, 5 and 5. The green point is editable. Move it to 25 and watch the two centre markers. Before moving it, predict whether both markers will shift by the same amount.",
        diagram: distribution([2, 4, 4, 5, 5]),
      },
      {
        title: "The mean shares the total",
        text: "For the original values, the total is 20. Sharing that total equally across five observations gives a mean of 4. Every value contributes to the total, so replacing the final 5 with 25 increases the mean even though the other values stay fixed.",
        diagram: distribution([2, 4, 4, 5, 25]),
      },
      {
        title: "The median uses position",
        text: "Sort the values before finding the middle. For 2, 4, 4, 5 and 25, the middle value is 4. Increasing the largest observation further leaves that position unchanged. This resistance has limits: changing a central observation can change the median.",
        diagram: distribution([2, 4, 4, 5, 25]),
      },
      {
        title: "An even-sized dataset",
        text: "With an even number of observations, average the two middle values. For 2, 4, 6 and 10, they are 4 and 6. Sorting matters; the middle pair comes from numerical order, not the order in which values were collected.",
        diagram: distribution([2, 4, 6, 10]),
      },
    ],
    questions: [
      choose(
        "Replacing 5 with 25 in 2, 4, 4, 5, 5 does what to the centre measures?",
        [
          "Both remain unchanged",
          "The mean rises and the median stays 4",
          "The median rises to 25",
        ],
        1,
        "Compare the total with the position of the middle value.",
      ),
      number(
        "What is the mean of 2, 4, 4, 5 and 5?",
        4,
        "The total is 20 across five observations, so the mean is 20/5 = 4.",
        "Add all five values, then divide by five.",
        "",
      ),
      number(
        "What is the median of 2, 4, 4, 5 and 25?",
        4,
        "The five sorted values have 4 in the third, middle position.",
        "Find the middle position after sorting.",
        "",
      ),
      number(
        "What is the median of 2, 4, 6 and 10?",
        5,
        "The middle pair is 4 and 6; its average is (4 + 6)/2 = 5.",
        "Average the middle pair, not the endpoints.",
        "",
      ),
      number(
        "What is the mean of 1, 3, 3, 5 and 18?",
        6,
        "The total is 30, so the mean is 30/5 = 6.",
        "Every observation contributes to the total.",
        "",
      ),
      choose(
        "Which statement about the median is accurate?",
        [
          "It is always an observed value",
          "It is always the largest value",
          "For an even count it averages the two sorted middle values",
        ],
        2,
        "An even-sized dataset has two middle positions.",
      ),
    ],
    cards: [
      numericCard(
        "What is the median of 2, 7, 8 and 15?",
        7.5,
        "The sorted middle values are 7 and 8, so their average is 7.5.",
        "",
      ),
      termCard(
        "Which centre measure uses the total divided by the observation count?",
        "mean",
        "The arithmetic mean uses the total divided by the number of observations.",
      ),
    ],
  },
  {
    id: "same-centre-different-spread",
    title: "Same centre, different spread",
    summary:
      "Compare datasets with the same mean, and distinguish range from population variance and standard deviation.",
    moduleId: "stats-data",
    sourceId: "nist-spread",
    beats: [
      {
        title: "An average can hide the spread",
        text: "Four values of 4 all sit at one position. Compare them with 2, 2, 6 and 6: both datasets have mean 4. Move the final observation to see why a centre value alone cannot describe how far the observations lie apart.",
        diagram: distribution([4, 4, 4, 4], 12, true),
      },
      {
        title: "Measure the endpoints",
        text: "For 2, 2, 6 and 6, the range is 6 minus 2. Range uses only the extreme values. Moving an interior value may leave it unchanged, even though the distribution within those endpoints has changed.",
        diagram: distribution([2, 2, 6, 6], 12, true),
      },
      {
        title: "Use every distance",
        text: "Treat these four values as the whole population for this teaching example. Each is 2 from the mean of 4. Their squared distances are all 4, giving population variance 4. The square root restores the original units: population standard deviation is 2.",
        diagram: distribution([2, 2, 6, 6], 12, true),
      },
      {
        title: "A wider population",
        text: "The new whole population is 0, 0, 8 and 8. Its mean is still 4, but every value is 4 from the mean. Compare its spread with the earlier case. Estimating variance from a sample uses a different denominator; these examples use the entire stated population.",
        diagram: distribution([0, 0, 8, 8], 12, true),
      },
    ],
    questions: [
      choose(
        "The datasets 4,4,4,4 and 2,2,6,6 have what relationship?",
        [
          "The same mean, different spread",
          "Different means, the same spread",
          "Identical distributions",
        ],
        0,
        "Compute each mean and compare where the points sit.",
      ),
      number(
        "What is the range of 2, 2, 6 and 6?",
        4,
        "The largest value is 6 and the smallest is 2; the range is 6 − 2 = 4.",
        "Subtract the minimum from the maximum.",
        "",
      ),
      number(
        "For the whole population 2,2,6,6, what is the population standard deviation?",
        2,
        "All four squared distances from the mean 4 are 4. Variance is 16/4 = 4; its square root is 2.",
        "Average squared distances using four as the population count, then take the square root.",
        "",
      ),
      number(
        "For the whole population 0,0,8,8, what is the population variance?",
        16,
        "Each squared distance from mean 4 is 16. Their average is 64/4 = 16.",
        "Square each distance from the mean of 4.",
        "",
      ),
      number(
        "What is the range of 3, 4, 4, 7 and 13?",
        10,
        "The maximum minus the minimum is 13 − 3 = 10.",
        "Only the two endpoints determine the range.",
        "",
      ),
      choose(
        "Which distinction matters when calculating variance?",
        [
          "Variance never uses a denominator",
          "A whole-population variance divides by its count; the usual unbiased sample estimate divides by one less",
          "Population variance divides only by the largest value",
        ],
        1,
        "Identify whether all values of the stated population were measured.",
      ),
    ],
    cards: [
      numericCard(
        "What is the range of 1, 2, 7 and 11?",
        10,
        "The range is the maximum minus the minimum: 11 − 1 = 10.",
        "",
      ),
      termCard(
        "Which spread measure is the square root of variance?",
        "standard deviation",
        "Standard deviation is the square root of variance and has the original data units.",
      ),
    ],
  },
  {
    id: "samples-and-populations",
    title: "Samples and populations",
    summary:
      "Identify a population, compare selection methods and explain why a large biased sample can still mislead.",
    moduleId: "stats-data",
    sourceId: "statcan-sampling",
    beats: [
      {
        title: "Who made it into the sample?",
        text: "This small population has six morning members with value 2 and six evening members with value 8. Only the checked members enter the sample. Switch between the fixed samples and compare their mean with the mean of the entire population.",
        diagram: population(),
      },
      {
        title: "Selection changes the picture",
        text: "Sampling all six morning members gives a mean of 2, while the whole population mean is 5. Collecting more from the same group cannot reveal the evening group. A larger sample does not repair a method that systematically excludes part of the target population.",
        diagram: population(),
      },
      {
        title: "Agreement is not a guarantee",
        text: "The balanced example selects three members from each group and matches the population mean here. That agreement comes from this constructed dataset. It does not prove the selection method is unbiased in a new population, or representative of every characteristic.",
        diagram: population(),
      },
      {
        title: "Apply the selection question",
        text: "The group values now change to 4 and 10. The selection buttons still choose the same members. Calculate the whole-population mean, then consider a survey that reaches only one group. Define who you want to learn about before deciding whom to measure.",
        diagram: population(4, 10),
      },
    ],
    questions: [
      number(
        "How many members are in the whole teaching population?",
        12,
        "The population contains six morning and six evening members: 6 + 6 = 12.",
        "Count both groups, including unselected members.",
        "",
      ),
      number(
        "For six values of 2 and six values of 8, what is the population mean?",
        5,
        "The total is 6 × 2 + 6 × 8 = 60; 60/12 = 5.",
        "Use every member of the population.",
        "",
      ),
      choose(
        "A sample matches the population mean in one constructed example. What follows?",
        [
          "It proves the method is unbiased in every population",
          "It shows agreement here, without guaranteeing agreement elsewhere",
          "It proves there is no sampling error",
        ],
        1,
        "One observed match cannot establish a general guarantee.",
      ),
      number(
        "A population has six values of 4 and six values of 10. What is its mean?",
        7,
        "The total is 6 × 4 + 6 × 10 = 84; 84/12 = 7.",
        "The two groups have equal size.",
        "",
      ),
      choose(
        "A survey of a whole city reaches only weekday visitors to one gym. What is the main limitation?",
        [
          "Too many people were asked",
          "Other parts of the target population are systematically excluded",
          "Every city resident has the same inclusion chance",
        ],
        1,
        "Compare the target population with the people the survey can reach.",
      ),
      choose(
        "Which description fits a probability sample?",
        [
          "Any sample collected quickly",
          "Selection by chance with known, nonzero inclusion probabilities",
          "Only volunteers who already agree",
        ],
        1,
        "Known inclusion probabilities do not have to be equal.",
      ),
    ],
    cards: [
      numericCard(
        "A whole population has four values of 3 and four values of 9. What is its mean?",
        6,
        "The total is 4 × 3 + 4 × 9 = 48 over eight members; the mean is 6.",
        "",
      ),
      termCard(
        "What term names the full set of people or items a statistical question concerns?",
        "population",
        "The population is the full target set; a sample is a subset of it.",
      ),
    ],
  },
];
