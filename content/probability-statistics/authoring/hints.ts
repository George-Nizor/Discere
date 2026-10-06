/** Each calculated question has a subject-specific ladder beyond its first orienting hint. */
export const numericHints: Record<string, [string, string]> = {
  "counting-outcomes-1": [
    "Each first-roll value can pair with every second-roll value.",
    "Multiply the number of first-roll choices by the number of second-roll choices.",
  ],
  "counting-outcomes-3": [
    "List the pairs for totals 10, 11 and 12, including reversed pairs.",
    "There are three pairs for 10, two for 11 and one for 12; divide their combined count by the full grid count.",
  ],
  "counting-outcomes-4": [
    "The events below 10 and at least 10 partition the full grid.",
    "Subtract the six pairs at least 10 from the full count, then divide by the full count.",
  ],
  "counting-outcomes-5": [
    "The pairs (1,4) and (4,1) are distinct; include both middle pairs too.",
    "Divide the four matching pairs by four first choices times four second choices.",
  ],
  "when-the-condition-changes-1": [
    "The condition keeps two first-roll values; all second-roll values remain possible.",
    "Multiply the two surviving rows by the six cells in each row.",
  ],
  "when-the-condition-changes-2": [
    "Each eligible row has three matching second-roll values.",
    "Divide two rows times three matches by two rows times six eligible values.",
  ],
  "when-the-condition-changes-3": [
    "In the row for first roll 1, only second roll 6 qualifies. In row 2, second rolls 5 and 6 qualify.",
    "Divide the three matching cells by the count in two complete eligible rows.",
  ],
  "when-the-condition-changes-4": [
    "Only the first row remains; ask which second-roll value reaches the target.",
    "One second-roll value qualifies among all six eligible second-roll values.",
  ],
  "when-the-condition-changes-5": [
    "Subtract the fixed first roll from the target sum to find the minimum second roll.",
    "The qualifying second rolls are 4, 5 and 6; divide their count by all six possibilities.",
  ],
  "independent-repetitions-1": [
    "Each individual roll passes for three of its six possible values.",
    "Multiply three-sixths by three-sixths, then simplify the resulting fraction.",
  ],
  "independent-repetitions-2": [
    "The matching cells form a two-by-two square.",
    "Divide the area of that square by the six-by-six full outcome count.",
  ],
  "independent-repetitions-4": [
    "Its complement is both rolls at most 3.",
    "Subtract nine matching low-low pairs from the full grid and divide by the full count.",
  ],
  "independent-repetitions-5": [
    "Keep HT and TH separate when listing the possible pairs.",
    "Divide the one heads-heads outcome by the full ordered outcome count.",
  ],
  "centre-and-outliers-2": [
    "There are five observations, including repeated values.",
    "Divide the sum of all observations by their count.",
  ],
  "centre-and-outliers-3": [
    "An odd-sized sorted dataset has a single middle position.",
    "With five values, take the third value of the sorted list.",
  ],
  "centre-and-outliers-4": [
    "The even-sized sorted list has two middle positions.",
    "Take the average of the second and third values, 4 and 6.",
  ],
  "centre-and-outliers-5": [
    "There are five values, so the denominator is five.",
    "Add 1 + 3 + 3 + 5 + 18 and divide the sum by five.",
  ],
  "same-centre-different-spread-2": [
    "Repeated values do not change which endpoints are smallest and largest.",
    "Subtract the smallest endpoint, 2, from the largest endpoint, 6.",
  ],
  "same-centre-different-spread-3": [
    "The mean is 4; square each observation's distance from it.",
    "Average the four squared distances using the population count, then take a square root.",
  ],
  "same-centre-different-spread-4": [
    "The mean is 4; compute the squared distance of each 0 and each 8.",
    "Add those four squared distances and divide by the whole-population count of four.",
  ],
  "same-centre-different-spread-5": [
    "The interior values do not affect a range calculation.",
    "Use only the maximum 13 and the minimum 3.",
  ],
  "samples-and-populations-1": [
    "The population includes the members without check marks too.",
    "Add the morning group's size to the evening group's size.",
  ],
  "samples-and-populations-2": [
    "Count each of the two group values six times.",
    "Use (6 × 2 + 6 × 8) divided by the total number of members.",
  ],
  "samples-and-populations-4": [
    "The group sizes are equal, so both contribute the same weight.",
    "Use (6 × 4 + 6 × 10) divided by the combined group count.",
  ],
};
