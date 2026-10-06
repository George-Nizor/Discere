import {
  assignment,
  beat,
  card,
  choose,
  correlated,
  effect,
  numeric,
  scatter,
  tally,
  term,
  word,
  type TeachingLesson,
} from "./definition.js";

const sleep = correlated(24, -0.6, { mean: 7, sd: 1.1 }, { mean: 310, sd: 34 }, 11);
const practice = correlated(24, 0.4, { mean: 6, sd: 2.4 }, { mean: 64, sd: 11 }, 23);
const allDays = correlated(28, 0.75, { mean: 12, sd: 5 }, { mean: 4, sd: 1.6 }, 31, {
  mean: 18,
  sd: 7,
});
const warmDays = correlated(20, 0, { mean: 17, sd: 2.2 }, { mean: 5.5, sd: 1.2 }, 37, {
  mean: 22,
  sd: 0.5,
});
const exercise = correlated(24, 0.3, { mean: 4, sd: 2 }, { mean: 60, sd: 12 }, 43);
const swap = (points: Array<{ x: number; y: number }>) => points.map((p) => ({ x: p.y, y: p.x }));

export const methodsLessons: TeachingLesson[] = [
  {
    id: "correlation-and-cause",
    title: "Correlation is not a cause",
    summary:
      "Read the sign and strength of a correlation, then look for what else could produce it.",
    moduleId: "psych-methods",
    sourceIds: ["psych-research-findings"],
    beats: [
      beat(
        "Strength and direction",
        "A correlation coefficient r runs from −1 to +1. Its sign gives the direction: people who slept more had lower, faster reaction times, so r is negative. Its size gives the strength, so −0.6 is a stronger relationship than +0.4. Squaring r gives the share of variation the two measures have in common: 0.6² = 0.36, or 36%. The other 64% of the differences in reaction time are unrelated to sleep in this sample.",
        ["Sleep and reaction time", scatter("Sleep (hours)", "Reaction time (ms)", sleep)],
        ["Practice and test score", scatter("Practice (hours)", "Test score", practice)],
      ),
      beat(
        "Look for a third variable",
        "Ice-cream sales and pool rescues climb together, yet neither causes the other. Colour the days by temperature and the pattern explains itself: hot days bring both. A variable that drives both measures is a confound. Hold it roughly fixed, as in the second case where every day was 21–23 °C, and the correlation between sales and rescues disappears.",
        [
          "Every day of the year",
          scatter("Ice-cream sales (£100s)", "Pool rescues", allDays, "Temperature (°C)"),
        ],
        [
          "Only days at 21–23 °C",
          scatter("Ice-cream sales (£100s)", "Pool rescues", warmDays, "Temperature (°C)"),
        ],
      ),
      beat(
        "Which way does the arrow point?",
        "Swapping the axes leaves r exactly the same, because correlation is symmetric. The data cannot say whether exercise lifts mood or whether people in a good mood go out and exercise. That second reading is reverse causation. Only a design that controls who exercises, such as an experiment, can separate the two directions.",
        [
          "Exercise on the horizontal axis",
          scatter("Exercise (hours a week)", "Mood score", exercise),
        ],
        [
          "Mood on the horizontal axis",
          scatter("Mood score", "Exercise (hours a week)", swap(exercise)),
        ],
      ),
      beat(
        "A pattern that is not there",
        "Staff often remember the chaotic full-moon shifts and forget the quiet ones. Count them all and 6 of 20 full-moon shifts were busy, 30%, exactly the same as 30 of 100 other shifts. The difference is zero. Believing in a relationship the counts do not show is an illusory correlation, and the cure is to compare rates in every cell rather than recall vivid cases.",
        [
          "Full-moon shifts",
          tally(
            "Emergency-department shifts under a full moon",
            6,
            20,
            "Busy shifts",
            "Quiet shifts",
          ),
        ],
        [
          "All other shifts",
          tally(
            "Emergency-department shifts on other nights",
            30,
            100,
            "Busy shifts",
            "Quiet shifts",
          ),
        ],
      ),
    ],
    questions: [
      numeric(
        "Sleep and reaction time correlate at r = −0.6. What percentage of the variation in reaction time do they share?",
        36,
        "Shared variance is r² = (−0.6)² = 0.36, so 36%. Squaring removes the sign.",
        [
          "The shared share of variation comes from squaring r.",
          "A negative number squared is positive.",
          "Square 0.6 and convert the decimal to a percentage.",
        ],
        "%",
      ),
      word(
        "Ice-cream sales and pool rescues rise together because hot weather increases both. What do psychologists call a variable like temperature that produces a misleading correlation?",
        [
          "confound",
          "confounding",
          "confounding variable",
          "third variable",
          "third-variable",
          "lurking variable",
        ],
        "Temperature is a confound: a third variable that drives both measures.",
        "It is a hidden third variable that affects both measured variables.",
      ),
      choose(
        "Across a sample, weekly exercise and mood correlate at r = 0.3. Which statement is a reverse-causation explanation?",
        [
          "People in a better mood are more likely to go out and exercise",
          "Exercise raises mood by releasing endorphins",
          "Sunny weather increases both exercise and mood",
        ],
        0,
        "Reverse causation runs the arrow from mood to exercise. Sunny weather would be a confound, and endorphins assume the original direction.",
        "Reverse causation flips which variable is the cause.",
      ),
      numeric(
        "6 of 20 full-moon shifts were busy, and 30 of 100 other shifts were busy. By how many percentage points does the busy rate differ between the two kinds of shift?",
        0,
        "6/20 = 30% and 30/100 = 30%, so the difference is 0 percentage points. The remembered link is an illusory correlation.",
        [
          "Turn each count into a rate before comparing.",
          "Divide busy shifts by all shifts in each group.",
          "Subtract one percentage from the other.",
        ],
        "%",
      ),
      numeric(
        "Daily screen time and sleep quality correlate at r = −0.3. What percentage of the variation in sleep quality is shared with screen time?",
        9,
        "r² = 0.3² = 0.09, so 9%. A modest correlation leaves 91% of the variation to other causes.",
        [
          "Use the square of the correlation coefficient.",
          "The minus sign disappears when you square.",
          "Square 0.3 and convert to a percentage.",
        ],
        "%",
      ),
      word(
        "A researcher records 'aggression' as the number of seconds a participant holds down a button that blasts noise at an opponent. What do we call a definition that turns a concept into a precise measurement like this?",
        ["operational definition", "operational", "operationalisation", "operationalization"],
        "It is an operational definition: it states exactly how aggression will be measured.",
        "The definition tells you the operation used to measure the concept.",
      ),
    ],
    cards: [
      card(
        "Two measures correlate at r = 0.7. What percentage of their variation do they share?",
        49,
        "r² = 0.7² = 0.49, so 49%.",
        "%",
      ),
      term(
        "Towns with more fire engines at a fire record more damage, because larger fires bring more engines and cause more damage. What is fire size in this relationship?",
        [
          "confound",
          "confounding",
          "confounding variable",
          "third variable",
          "third-variable",
          "lurking variable",
        ],
        "Fire size is a confound: it drives both the number of engines and the damage.",
      ),
    ],
  },
  {
    id: "experiments-and-assignment",
    title: "Random assignment",
    summary: "See why only random assignment to conditions lets an experiment rule out confounds.",
    moduleId: "psych-methods",
    sourceIds: ["psych-research-findings"],
    beats: [
      beat(
        "Who chooses the group?",
        "When volunteers pick their own condition, the keenest pick the new programme. Here the four most active people, at 9, 8, 8 and 7 hours a week, chose it; the rest averaged 2 hours. The treatment group starts 8 − 2 = 6 hours ahead before anything is done to it, so any later difference in fitness could be that head start. Self-selection builds a confound into the design.",
        [
          "Volunteers choose",
          assignment("Weekly exercise (hours)", [9, 3, 8, 2, 8, 2, 7, 1], "self_selected"),
        ],
        [
          "A random draw",
          assignment("Weekly exercise (hours)", [9, 3, 8, 2, 8, 2, 7, 1], "random", 12),
        ],
      ),
      beat(
        "Shuffle and compare",
        "Random assignment gives every participant an equal chance of landing in either group. It does not make the groups identical in one small study; draw again and the gap moves around. What it guarantees is that no characteristic, measured or not, systematically favours one group. With larger samples the chance gaps shrink, which is one reason sample size matters.",
        [
          "Draw 1",
          assignment("Prior fitness score", [5, 9, 4, 7, 6, 3, 8, 6, 5, 7, 4, 8], "random", 3),
        ],
        [
          "Draw 2",
          assignment("Prior fitness score", [5, 9, 4, 7, 6, 3, 8, 6, 5, 7, 4, 8], "random", 21),
        ],
        [
          "Draw 3",
          assignment("Prior fitness score", [5, 9, 4, 7, 6, 3, 8, 6, 5, 7, 4, 8], "random", 58),
        ],
      ),
      beat(
        "Cause and measurement",
        "The variable the experimenter sets is the independent variable: here, whether a person does the programme. The variable measured afterwards to see its effect is the dependent variable: resting heart rate. Its value is expected to depend on the condition. Naming both before data arrive stops a study from hunting through many outcomes for one that happens to differ.",
        [
          "Programme group",
          assignment(
            "Resting heart rate (beats/min)",
            [72, 64, 70, 66, 75, 61, 68, 69],
            "random",
            5,
          ),
        ],
        [
          "Larger sample",
          assignment(
            "Resting heart rate (beats/min)",
            [72, 64, 70, 66, 75, 61, 68, 69, 74, 63, 67, 71, 65, 73, 62, 70],
            "random",
            5,
          ),
        ],
      ),
      beat(
        "Control for expectation",
        "People improve partly because they expect to. A placebo group receives an identical-looking pill with no active ingredient, so expectation is equal across groups. If the drug group improves 12 points and the placebo group 8, the active ingredient accounts for 12 − 8 = 4 points. In a double-blind trial neither participants nor the people measuring them know who got what.",
        ["Drug against placebo", effect("Placebo", 8, 6, "Drug", 12, 6, "points")],
        ["Drug against no pill", effect("No pill", 3, 6, "Drug", 12, 6, "points")],
      ),
    ],
    questions: [
      numeric(
        "Four volunteers who exercise 9, 8, 8 and 7 hours a week choose the new programme; the other four exercise 3, 2, 2 and 1 hours. How many hours higher is the programme group's mean before the programme starts?",
        6,
        "Programme mean = (9 + 8 + 8 + 7)/4 = 8; other mean = (3 + 2 + 2 + 1)/4 = 2; the head start is 6 hours.",
        [
          "Find each group's mean separately.",
          "Add the four values in a group and divide by four.",
          "Subtract the comparison group's mean from the programme group's mean.",
        ],
      ),
      word(
        "Random assignment gives every participant an equal what of being placed in each condition? Answer in one word.",
        ["chance", "probability", "likelihood"],
        "An equal chance: assignment depends on the draw, never on the person.",
        "Think of a coin toss deciding each person's group.",
      ),
      word(
        "In a trial, researchers assign people to a programme or not, then measure resting heart rate. Is resting heart rate the independent or the dependent variable?",
        ["dependent", "DV", "outcome"],
        "Resting heart rate is the dependent variable: it is measured to see the programme's effect.",
        "Ask which variable the researchers set and which they measure.",
        ["independent"],
      ),
      numeric(
        "In a drug trial the drug group improves by 12 points and the placebo group by 8 points. How many points of improvement can be attributed to the drug's active ingredient?",
        4,
        "12 − 8 = 4 points. The placebo group shows how much improvement expectation and time alone produce.",
        [
          "The placebo group improves without any active ingredient.",
          "Remove the improvement that both groups share.",
          "Subtract the placebo improvement from the drug improvement.",
        ],
        "points",
      ),
      numeric(
        "A random draw puts people with prior fitness scores 4, 6, 5 and 7 in the treatment group, and 6, 5, 4 and 5 in the control group. What is the treatment mean minus the control mean?",
        0.5,
        "Treatment mean = 22/4 = 5.5; control mean = 20/4 = 5; the chance gap is 0.5.",
        [
          "Find the mean of each group of four.",
          "The treatment scores add to 22.",
          "Subtract the control mean from the treatment mean.",
        ],
      ),
      word(
        "In a trial, neither the participants nor the researchers who measure them know who received the real treatment. What is this design called?",
        ["double-blind", "double blind", "doubly blind"],
        "It is a double-blind design: both sides are kept unaware of the conditions.",
        "Count how many parties are kept unaware.",
        ["single-blind", "single blind"],
      ),
    ],
    cards: [
      card(
        "A therapy group improves by 15 points and a placebo group by 9 points. How many points of improvement are due to the therapy beyond the placebo response?",
        6,
        "15 − 9 = 6 points.",
        "points",
      ),
      term(
        "What procedure gives each participant an equal chance of being placed in any condition of an experiment?",
        [
          "random assignment",
          "randomisation",
          "randomization",
          "randomly assigned",
          "random allocation",
        ],
        "Random assignment.",
      ),
    ],
  },
  {
    id: "effect-size-and-replication",
    title: "How big, and will it replicate?",
    summary:
      "Compute Cohen's d and the sample a study needs, then read failed replications as evidence.",
    moduleId: "psych-methods",
    sourceIds: [
      "psych-research-findings",
      "psych-lehr-1992",
      "psych-osc-2015",
      "psych-hagger-2016",
      "psych-ranehill-2015",
      "psych-doyen-2012",
    ],
    beats: [
      beat(
        "Standardise the difference",
        "A 6-point gain means little until you know how spread out scores are. Cohen's d divides the difference between means by the standard deviation: (106 − 100)/15 = 0.4. Doubling the gain to 12 points gives d = 0.8, and the curves visibly separate. Cohen's rough labels are 0.2 small, 0.5 medium and 0.8 large; he warned they are no substitute for knowing the field.",
        ["Gain of 6 points", effect("Control", 100, 15, "Training", 106, 15, "points")],
        ["Gain of 12 points", effect("Control", 100, 15, "Training", 112, 15, "points")],
      ),
      beat(
        "Pool unequal spreads",
        "When two groups of equal size have different standard deviations, d uses the pooled value: the square root of the mean of the two variances. With SDs of 7 and 17, pooled SD = √[(49 + 289)/2] = √169 = 13. A difference of 6.5 points is then d = 6.5/13 = 0.5. Averaging the SDs directly would give 12 and overstate d.",
        ["SDs 7 and 17", effect("Group A", 40, 7, "Group B", 46.5, 17, "points")],
        ["SDs 13 and 13", effect("Group A", 40, 13, "Group B", 46.5, 13, "points")],
      ),
      beat(
        "How many people does a study need?",
        "Statistical power is the chance a study detects an effect that is really there. A rule of thumb from Lehr gives about 16/d² participants per group for 80% power at α = 0.05. For d = 0.5 that is 64 per group; for d = 0.4 it is 100; for d = 0.2 it is 400. Small studies chasing small effects mostly miss them, and the few that succeed overstate the effect.",
        ["Medium effect, d = 0.5", effect("Control", 50, 10, "Treatment", 55, 10)],
        ["Small effect, d = 0.2", effect("Control", 50, 10, "Treatment", 52, 10)],
      ),
      beat(
        "When the effect shrinks to nothing",
        "Ego depletion, the claim that self-control runs down like a fuel, had an average d of about 0.6 in published studies. A preregistered replication across 23 laboratories and 2,141 people found d = 0.04. The Open Science Collaboration repeated 100 studies: 97 originals were significant, but only 35 of those 97 replications were. Power posing and the slow walking said to follow elderly-related words also failed careful replications.",
        ["Published estimate", effect("Control", 50, 10, "Depleted", 56.2, 10)],
        ["Multi-lab replication", effect("Control", 50, 10, "Depleted", 50.4, 10)],
      ),
    ],
    questions: [
      numeric(
        "A control group has mean 100 and a training group mean 106, both with standard deviation 15. What is Cohen's d?",
        0.4,
        "d = (106 − 100)/15 = 6/15 = 0.4.",
        [
          "Cohen's d is a difference measured in standard deviations.",
          "Find the difference between the two means.",
          "Divide that difference by 15.",
        ],
      ),
      numeric(
        "Two equal-sized groups have means 40 and 46.5 with standard deviations 7 and 17. Using the pooled SD √[(SD₁² + SD₂²)/2], what is Cohen's d?",
        0.5,
        "Pooled SD = √[(49 + 289)/2] = √169 = 13; d = 6.5/13 = 0.5.",
        [
          "Square each standard deviation before averaging.",
          "Average 49 and 289, then take the square root.",
          "Divide the 6.5-point difference by the pooled SD.",
        ],
      ),
      numeric(
        "Using the rule of thumb n ≈ 16/d² per group for 80% power at α = 0.05, how many participants per group does a study of an effect of d = 0.4 need?",
        100,
        "16/0.4² = 16/0.16 = 100 per group.",
        [
          "Square the effect size first.",
          "0.4 squared is 0.16.",
          "Divide 16 by the squared effect size.",
        ],
        "participants",
      ),
      numeric(
        "A multi-lab replication finds means of 50.4 (depleted) and 50.0 (control), both with standard deviation 10. What is Cohen's d?",
        0.04,
        "d = (50.4 − 50.0)/10 = 0.04, close to zero and far below the published average of about 0.6.",
        [
          "Divide the difference between means by the standard deviation.",
          "The difference between the means is under one point.",
          "Divide 0.4 by 10.",
        ],
      ),
      numeric(
        "Of 97 original studies with significant results, 35 replications were significant. What percentage replicated? Give one decimal place.",
        36.1,
        "35/97 = 0.3608, or 36.1%.",
        [
          "Divide the successful replications by the studies attempted.",
          "Use 97 as the denominator, since only significant originals count.",
          "Convert 35/97 to a percentage and round to one decimal place.",
        ],
        "%",
        0.051,
      ),
      choose(
        "Which claim failed a large preregistered replication and should be treated as a cautionary case, not established fact?",
        [
          "Holding a power pose for two minutes raises testosterone",
          "Random assignment balances groups on average",
          "Squaring r gives the shared variance",
        ],
        0,
        "Ranehill and colleagues (2015) found no hormonal effect of power poses in 200 people. The other two statements are mathematical facts.",
        "Two of the options are definitions or arithmetic; one is an empirical claim.",
      ),
    ],
    cards: [
      card(
        "Two groups have means 24 and 30, both with standard deviation 12. What is Cohen's d?",
        0.5,
        "d = (30 − 24)/12 = 0.5.",
      ),
      card(
        "Using n ≈ 16/d² per group, how many participants per group are needed to detect d = 0.8 with 80% power?",
        25,
        "16/0.8² = 16/0.64 = 25 per group.",
        "participants",
      ),
    ],
  },
];
