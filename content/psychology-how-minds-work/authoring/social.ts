import {
  anchor,
  baseRate,
  beat,
  bystander,
  card,
  choose,
  numeric,
  tally,
  word,
  type TeachingLesson,
} from "./definition.js";

export const socialLessons: TeachingLesson[] = [
  {
    id: "base-rates",
    title: "Base rates and Bayes",
    summary:
      "Turn a test result into a probability by counting people, so the base rate cannot be ignored.",
    moduleId: "psych-thinking",
    sourceIds: ["psych-problem-solving", "psych-tversky-1974"],
    beats: [
      beat(
        "Count the people",
        "Picture 1,000 people screened for a disease that 1% have. That is 10 people; the test flags 90% of them, so 9 true positives. Of the 990 without it, the test wrongly flags 10%: 99 false positives. Turning percentages into counts of people, called natural frequencies, makes the next step almost obvious.",
        ["1% have the disease", baseRate(1000, 0.01, 0.9, 0.1, "The disease", "Screening test")],
        ["10% have the disease", baseRate(1000, 0.1, 0.9, 0.1, "The disease", "Screening test")],
      ),
      beat(
        "What a positive result means",
        "A positive result puts you among the 9 + 99 = 108 people the test flagged. Only 9 of them have the disease: 9/108 ≈ 8.3%. Most people asked this question answer near 90%, the test's hit rate. That error, judging by the test's accuracy while ignoring how rare the condition is, is base-rate neglect.",
        ["1% have the disease", baseRate(1000, 0.01, 0.9, 0.1, "The disease", "Screening test")],
        [
          "Fewer false alarms (5%)",
          baseRate(2000, 0.01, 0.9, 0.05, "The disease", "Screening test"),
        ],
      ),
      beat(
        "Change the base rate",
        "Use the same test on a clinic population where 10% have the disease. Of 1,000 people, 100 have it and 90 test positive; of 900 without it, 90 are false positives. Now a positive result means 90/180 = 50%. Nothing about the test changed. The meaning of its result depends on who is being tested.",
        ["Clinic: 10% have it", baseRate(1000, 0.1, 0.9, 0.1, "The disease", "Screening test")],
        ["Screening: 1% have it", baseRate(1000, 0.01, 0.9, 0.1, "The disease", "Screening test")],
      ),
      beat(
        "Witnesses and cabs",
        "In a city, 20% of cabs are blue. A witness says the hit-and-run cab was blue, and tests show witnesses name colours correctly 75% of the time. Among 1,000 cabs, 200 are blue and 150 of those are called blue; 800 are green and 200 of those are wrongly called blue. So P(blue | witness says blue) = 150/350 ≈ 42.9%, below even odds despite a fairly reliable witness.",
        ["20% of cabs blue", baseRate(1000, 0.2, 0.75, 0.25, "Blue cab", "Witness says blue")],
        ["Half the cabs blue", baseRate(1000, 0.5, 0.75, 0.25, "Blue cab", "Witness says blue")],
      ),
    ],
    questions: [
      numeric(
        "1,000 people are screened for a disease that 1% have. The test wrongly flags 10% of people who do not have it. How many false positives are there?",
        99,
        "1,000 − 10 = 990 people do not have the disease; 10% of 990 = 99 false positives.",
        [
          "First find how many people do not have the disease.",
          "Subtract the 1% who have it from 1,000.",
          "Take 10% of that number.",
        ],
        "people",
      ),
      numeric(
        "Of 1,000 people, 9 true positives and 99 false positives test positive. What is the probability, as a percentage, that a person who tests positive has the disease? Give one decimal place.",
        8.3,
        "9/(9 + 99) = 9/108 = 0.0833, or 8.3%.",
        [
          "Restrict attention to people who tested positive.",
          "The true positives are the people in that group who have the disease.",
          "Divide 9 by the total number of positives and round.",
        ],
        "%",
        0.051,
      ),
      numeric(
        "The same test (90% hit rate, 10% false-alarm rate) is used where 10% of 1,000 people have the disease. What percentage of positive results are true positives?",
        50,
        "100 have it and 90 test positive; 900 do not and 90 test positive; 90/180 = 50%.",
        [
          "Count the people with and without the disease first.",
          "Apply 90% to the first group and 10% to the second.",
          "Divide true positives by all positives.",
        ],
        "%",
      ),
      numeric(
        "20% of a city's cabs are blue. A witness who names colours correctly 75% of the time says the cab was blue. What is the probability, as a percentage, that it was blue? Give one decimal place.",
        42.9,
        "Per 1,000 cabs: 150 blue cabs called blue and 200 green cabs called blue; 150/350 = 42.9%.",
        [
          "Imagine 1,000 cabs: 200 blue and 800 green.",
          "The witness calls 75% of blue cabs blue and 25% of green cabs blue.",
          "Divide correct 'blue' calls by all 'blue' calls.",
        ],
        "%",
        0.051,
      ),
      numeric(
        "2,000 people are tested for a condition that 5% have. The test detects 80% of cases and gives false positives for 10% of people without it. How many people test positive in total?",
        270,
        "100 have it, 80 test positive; 1,900 do not, 190 test positive; 80 + 190 = 270.",
        [
          "5% of 2,000 have the condition.",
          "Find the true positives and the false positives separately.",
          "Add the two groups of positives.",
        ],
        "people",
      ),
      word(
        "A doctor judges a positive result from a 90%-accurate test as 90% likely to be right, ignoring that the disease is rare. What is this error called?",
        ["base-rate neglect", "base rate neglect", "base-rate fallacy", "base rate fallacy"],
        "Base-rate neglect: the prior frequency of the condition is ignored.",
        "The neglected number is how common the condition is to begin with.",
      ),
    ],
    cards: [
      card(
        "1,000 people are screened for a condition that 2% have. The test misses no cases but gives false positives for 5% of people without it. How many false positives are there?",
        49,
        "980 do not have it; 5% of 980 = 49.",
        "people",
      ),
      card(
        "A screening programme finds 12 true positives and 36 false positives. What percentage of positive results are correct?",
        25,
        "12/(12 + 36) = 12/48 = 25%.",
        "%",
      ),
    ],
  },
  {
    id: "anchors-and-intuition",
    title: "Anchors and fast thinking",
    summary:
      "Measure the pull of an anchor and the bias of availability, then check a fast intuition with a slow one.",
    moduleId: "psych-thinking",
    sourceIds: [
      "psych-problem-solving",
      "psych-tversky-1974",
      "psych-jacowitz-1995",
      "psych-frederick-2005",
    ],
    beats: [
      beat(
        "A wheel of fortune",
        "Tversky and Kahneman spun a wheel rigged to stop at 10 or 65, then asked what percentage of United Nations members were African countries. The number was plainly irrelevant, yet median estimates were 25 after 10 and 45 after 65: a gap of 20 percentage points. Anchoring bias is the pull of a starting number on an estimate, even a number known to be random.",
        [
          "Anchors 10 and 65",
          anchor("Share of UN members that are African countries (%)", 10, 25, 65, 45, 0, 100),
        ],
        [
          "Anchors 20 and 80",
          anchor("Estimated age of an oak tree (years)", 20, 35, 80, 59, 0, 100),
        ],
      ),
      beat(
        "Measure the pull",
        "Jacowitz and Kahneman's anchoring index divides the gap between median estimates by the gap between anchors. An index of 0 means the anchor was ignored; 1 means estimates moved as far as the anchors did. For anchors of 20 and 80 with medians of 35 and 59, the index is (59 − 35)/(80 − 20) = 24/60 = 0.4. For the wheel it is 20/55 ≈ 0.36.",
        [
          "Anchors 20 and 80",
          anchor("Estimated age of an oak tree (years)", 20, 35, 80, 59, 0, 100),
        ],
        [
          "Anchors 10 and 65",
          anchor("Share of UN members that are African countries (%)", 10, 25, 65, 45, 0, 100),
        ],
      ),
      beat(
        "What comes to mind",
        "Are there more English words that start with k or that have k as the third letter? Most people say start, because those words are easier to call up. Tversky and Kahneman noted that typical text has about twice as many with k third. In this illustrative sample of 600 k-words, 200 start with k: 33.3%. Judging frequency by ease of recall is the availability heuristic.",
        [
          "Words in a text",
          tally("Illustrative sample of 600 words containing k", 200, 600, "k first", "k third"),
        ],
        [
          "Words people recall",
          tally("Illustrative minute of recalled k-words", 9, 12, "k first", "k third"),
        ],
      ),
      beat(
        "Fast answer, slow check",
        "A bat and a ball cost £1.10; the bat costs £1.00 more than the ball. The answer that springs to mind, 10p, makes the total £1.20. Call the ball x: x + (x + 1.00) = 1.10, so x = 5p. Kahneman labels the quick answer System 1 and the check System 2. Treat these as names for fast and deliberate processing, not two brain organs; intuition is often right, and the skill is knowing when to check.",
        [
          "Answering at once",
          tally(
            "Illustrative group answering the bat-and-ball problem",
            26,
            40,
            "Said 10p",
            "Said 5p",
          ),
        ],
        [
          "Asked to check the total",
          tally("Illustrative group told to verify the total", 12, 40, "Said 10p", "Said 5p"),
        ],
      ),
    ],
    questions: [
      numeric(
        "After a wheel stopped on 10, the median estimate of African countries' share of UN members was 25%; after it stopped on 65, the median was 45%. By how many percentage points did the medians differ?",
        20,
        "45 − 25 = 20 percentage points.",
        [
          "Compare the two median estimates, not the anchors.",
          "The higher anchor produced the higher median.",
          "Subtract the low-anchor median from the high-anchor median.",
        ],
        "%",
      ),
      numeric(
        "With anchors of 20 and 80, median estimates of a tree's age were 35 and 59 years. What is the anchoring index, (difference in medians)/(difference in anchors)?",
        0.4,
        "(59 − 35)/(80 − 20) = 24/60 = 0.4.",
        [
          "Find the gap between the median estimates.",
          "Find the gap between the anchors.",
          "Divide the first gap by the second.",
        ],
      ),
      numeric(
        "In a sample of 600 English words containing k, 200 start with k and 400 have k as the third letter. What percentage start with k? Give one decimal place.",
        33.3,
        "200/600 = 0.333, or 33.3%: words with k third are twice as common, though harder to recall.",
        [
          "Divide words starting with k by all the k-words.",
          "The denominator is 600.",
          "Convert to a percentage and round to one decimal place.",
        ],
        "%",
        0.051,
      ),
      numeric(
        "A bat and a ball cost £1.10 together. The bat costs £1.00 more than the ball. How much does the ball cost, in pence?",
        5,
        "Ball x, bat x + 100p: 2x + 100 = 110, so x = 5p. The intuitive 10p would make the total £1.20.",
        [
          "Write the bat's price in terms of the ball's.",
          "The two prices add to 110p.",
          "Solve 2x + 100 = 110.",
        ],
        "p",
      ),
      numeric(
        "Anchors of 100 and 500 produce median estimates of 220 and 340. What is the anchoring index?",
        0.3,
        "(340 − 220)/(500 − 100) = 120/400 = 0.3.",
        [
          "The index compares how far estimates moved with how far anchors moved.",
          "Estimates moved 120.",
          "Divide by the difference between the anchors.",
        ],
      ),
      word(
        "After several news reports of shark attacks, a swimmer judges sharks a bigger risk than drowning. Judging frequency by how easily examples come to mind is which heuristic?",
        ["availability", "availability heuristic"],
        "The availability heuristic: vivid, easily recalled cases feel common.",
        "The examples are readily available in memory.",
        ["representativeness", "anchoring"],
      ),
    ],
    cards: [
      card(
        "Mould on a loaf doubles its area every day and covers the whole loaf on day 12. On which day did it cover half the loaf?",
        11,
        "Doubling means it was half the size one day earlier: day 11.",
        "day",
      ),
      card(
        "Anchors of 10 and 60 produce median estimates of 30 and 40. What is the anchoring index?",
        0.2,
        "(40 − 30)/(60 − 10) = 10/50 = 0.2.",
      ),
    ],
  },
  {
    id: "social-influence",
    title: "Conformity, obedience and bystanders",
    summary:
      "Read the classic social-influence studies by their numbers, together with what replications and critics found.",
    moduleId: "psych-thinking",
    sourceIds: [
      "psych-conformity",
      "psych-aggression",
      "psych-asch-1956",
      "psych-milgram-1963",
      "psych-burger-2009",
      "psych-perry-2013",
      "psych-darley-1968",
      "psych-manning-2007",
      "psych-philpot-2020",
      "psych-fischer-2011",
    ],
    beats: [
      beat(
        "The lines everyone misjudged",
        "Asch had people match line lengths after several confederates gave the same wrong answer. Alone, people erred on under 1% of judgements. Facing the unanimous majority, about a third of critical answers went along, and about three quarters of people conformed at least once. Read the other way, most answers stayed independent and about a quarter of people never yielded. In a replication with 216 critical answers, 72 conforming is 33.3%.",
        [
          "Critical answers",
          tally(
            "Asch's majority condition, about 37 in every 100 critical answers",
            37,
            100,
            "Went along",
            "Stayed independent",
          ),
        ],
        [
          "People",
          tally(
            "Asch's majority condition, about 75 in every 100 people",
            75,
            100,
            "Conformed at least once",
            "Never conformed",
          ),
        ],
      ),
      beat(
        "Up to 450 volts",
        "In Milgram's 1963 study, participants told to shock a learner for errors were urged on by an experimenter. 26 of 40, or 65%, continued to the final 450-volt switch, though the learner was an actor and no shocks were real. Obedience fell when the victim was closer: 16 of 40 when he sat in the same room and 12 of 40 when the participant had to press his hand onto a plate.",
        [
          "Learner in another room",
          tally("Milgram's baseline condition", 26, 40, "Went to 450 V", "Stopped earlier"),
        ],
        [
          "Same room",
          tally("Milgram's proximity condition", 16, 40, "Went to 450 V", "Stopped earlier"),
        ],
        [
          "Hand on the plate",
          tally("Milgram's touch-proximity condition", 12, 40, "Went to 450 V", "Stopped earlier"),
        ],
      ),
      beat(
        "Obedience under scrutiny",
        "Burger's 2009 partial replication stopped at 150 volts for ethical reasons: 70% were willing to continue, against 82.5% at that point in Milgram's comparable condition, a difference that was not statistically significant. Archival work by Gina Perry found Milgram's experimenters sometimes left the script and many participants doubted the shocks were real. Obedience is real; the precise percentages depend on setting and belief.",
        [
          "Milgram at 150 V",
          tally("Milgram's comparable condition at 150 V", 33, 40, "Continued", "Stopped"),
        ],
        [
          "Burger at 150 V",
          tally(
            "Burger's 2009 replication at 150 V, per 100 people",
            70,
            100,
            "Continued",
            "Stopped",
          ),
        ],
      ),
      beat(
        "More witnesses, less help?",
        "Darley and Latané staged a seizure over an intercom. 85% of people who believed they alone heard it went to help before it ended, against 31% who believed four others heard. Responsibility felt shared. If five people each act with probability 0.2, the chance at least one acts is 1 − 0.8⁵ ≈ 67.2%. The famous 38 silent witnesses to the Genovese murder is largely a myth, and CCTV of 219 real street conflicts showed someone intervened in 91%.",
        ["One witness, 85% each", bystander(1, 0.85)],
        ["Five witnesses, 20% each", bystander(5, 0.2)],
        ["Five witnesses, 40% each", bystander(5, 0.4)],
      ),
    ],
    questions: [
      numeric(
        "In a line-judgement replication 18 people each give 12 critical answers. Of those answers, 72 follow the wrong majority. What percentage of critical answers conformed? Give one decimal place.",
        33.3,
        "18 × 12 = 216 critical answers; 72/216 = 0.333, or 33.3%.",
        [
          "First find the total number of critical answers.",
          "Multiply people by critical answers each.",
          "Divide 72 by that total and convert to a percentage.",
        ],
        "%",
        0.051,
      ),
      numeric(
        "In Milgram's baseline study, 26 of 40 participants continued to 450 volts. What percentage is that?",
        65,
        "26/40 = 0.65, or 65%.",
        [
          "Divide the number who continued by the number tested.",
          "The denominator is 40.",
          "Convert 26/40 to a percentage.",
        ],
        "%",
      ),
      numeric(
        "In Milgram's studies, 26 of 40 obeyed to the end in the baseline condition and 12 of 40 in the touch-proximity condition. By how many percentage points did obedience fall?",
        35,
        "26/40 = 65% and 12/40 = 30%; 65 − 30 = 35 percentage points.",
        [
          "Turn each count into a percentage.",
          "Both conditions had 40 participants.",
          "Subtract the touch-proximity percentage from the baseline percentage.",
        ],
        "%",
      ),
      numeric(
        "Five bystanders each independently act with probability 0.2. What is the probability, as a percentage, that at least one acts? Give one decimal place.",
        67.2,
        "P(nobody acts) = 0.8⁵ = 0.32768; P(at least one) = 1 − 0.32768 = 0.67232, or 67.2%.",
        [
          "Find the chance that one person does not act.",
          "Multiply that chance by itself once per bystander.",
          "Subtract the result from 1 and convert to a percentage.",
        ],
        "%",
        0.051,
      ),
      numeric(
        "Three bystanders each independently help with probability 0.5. What is the probability, as a percentage, that at least one helps?",
        87.5,
        "P(nobody) = 0.5³ = 0.125; P(at least one) = 0.875, or 87.5%.",
        [
          "Work out the chance that nobody helps.",
          "Each bystander fails to help with probability 0.5.",
          "Subtract 0.5³ from 1 and convert to a percentage.",
        ],
        "%",
      ),
      choose(
        "Which statement fits the evidence from CCTV recordings of real public conflicts?",
        [
          "Someone usually intervenes, and more bystanders make intervention more likely",
          "Bystanders almost never intervene in public conflicts",
          "Each extra bystander halves the chance that anyone helps",
        ],
        0,
        "Philpot and colleagues (2020) found intervention in 91% of 219 conflicts, rising with the number of bystanders.",
        "The recordings counted whether anyone at all stepped in.",
      ),
    ],
    cards: [
      card(
        "In a conformity study, 21 of 60 critical answers follow the wrong majority. What percentage conformed?",
        35,
        "21/60 = 0.35, or 35%.",
        "%",
      ),
      card(
        "Two bystanders each independently act with probability 0.4. What is the probability, as a percentage, that at least one acts?",
        64,
        "1 − 0.6² = 1 − 0.36 = 0.64, or 64%.",
        "%",
      ),
    ],
  },
];
