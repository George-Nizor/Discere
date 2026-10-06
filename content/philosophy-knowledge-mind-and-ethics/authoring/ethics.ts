import {
  argument,
  beat,
  cardNumber,
  cardWord,
  choose,
  mean,
  numeric,
  prospects,
  trolley,
  veil,
  word,
  type TeachingLesson,
} from "./definition.js";

const thirds = ["Lowest third", "Middle third", "Top third"];
const income = "income units";
const falsePromise = argument(
  [
    "My maxim: when I need money, I will promise to repay it, knowing I cannot.",
    "If everyone acted on this maxim, no one would believe a promise to repay.",
    "If no one believed such promises, the maxim could not be acted on.",
  ],
  "I cannot will the maxim as a universal law, so the false promise is forbidden.",
);
const food = (agent: string, band: [number, number]) =>
  mean(
    "eating, for an athlete in training",
    ["too little", "the right amount", "too much"],
    "minae of food",
    [2, 10],
    agent,
    band,
  );
const courage = (agent: string, band: [number, number]) =>
  mean(
    "fear and confidence",
    ["cowardice", "courage", "rashness"],
    "degree of confidence",
    [0, 10],
    agent,
    band,
  );
const temper = (agent: string, band: [number, number]) =>
  mean(
    "anger",
    ["lack of spirit", "good temper", "irascibility"],
    "strength of anger",
    [0, 10],
    agent,
    band,
  );

export const ethicsLessons: TeachingLesson[] = [
  {
    id: "consequentialism",
    title: "Counting consequences",
    summary:
      "Rank acts by their expected outcomes, and see where summing welfare across people gives troubling verdicts.",
    moduleId: "phil-ethics",
    sourceIds: ["os-consequentialism", "sep-consequentialism", "mill-utilitarianism"],
    beats: [
      beat(
        "Expected utility",
        "Consequentialism judges an act by its outcomes. When outcomes are uncertain, the standard tool is expected utility: weight each outcome's value by its probability and add. A 60% chance of 100 units and a 40% chance of nothing gives 0.6 × 100 + 0.4 × 0 = 60, more than a sure 50. An expected-utility maximiser takes the gamble; a cautious agent might not.",
        [
          "Sure thing or gamble",
          prospects(
            "welfare units",
            ["A: sure option", [["certain result", 1, 50]]],
            [
              "B: gamble",
              [
                ["success", 0.6, 100],
                ["failure", 0.4, 0],
              ],
            ],
          ),
        ],
        [
          "Two gambles",
          prospects(
            "welfare units",
            [
              "A: modest gamble",
              [
                ["success", 0.9, 60],
                ["failure", 0.1, 20],
              ],
            ],
            [
              "B: bold gamble",
              [
                ["success", 0.5, 120],
                ["failure", 0.5, 0],
              ],
            ],
          ),
        ],
      ),
      beat(
        "Losses count too",
        "Bad outcomes enter with negative values. A vaccination programme that gives 20 units of benefit with probability 0.9 and causes 30 units of harm with probability 0.1 has expected utility 18 − 3 = 15, so it beats doing nothing, which scores 0. Mill's greatest happiness principle supplies the values: acts are right in proportion as they tend to promote happiness.",
        [
          "Vaccination",
          prospects(
            "welfare units",
            [
              "Run the programme",
              [
                ["works", 0.9, 20],
                ["side effects", 0.1, -30],
              ],
            ],
            ["Do nothing", [["status quo", 1, 0]]],
          ),
        ],
        [
          "Riskier programme",
          prospects(
            "welfare units",
            [
              "Run the programme",
              [
                ["works", 0.6, 20],
                ["side effects", 0.4, -30],
              ],
            ],
            ["Do nothing", [["status quo", 1, 0]]],
          ),
        ],
      ),
      beat(
        "The switch",
        "The trolley case comes from Philippa Foot (1967), recast by Judith Jarvis Thomson: a runaway trolley will kill five workers unless you pull a lever that sends it onto a side track, where it will kill one. Counting lives, pulling saves four net. Most people asked about this case judge that pulling is permitted. The utilitarian verdict and common opinion agree here; the next lesson shows a case where they part company.",
        ["Five ahead, one on the side", trolley("switch", 5, 1)],
        ["Three ahead, one on the side", trolley("switch", 3, 1)],
      ),
      beat(
        "Summing across people",
        "Utilitarianism adds welfare across people: each to count for one. T. M. Scanlon's transmitter-room case tests that. Jones is trapped and receiving painful shocks; freeing him means cutting a World Cup broadcast to millions for an hour. Summed, the viewers' small losses can outweigh Jones's suffering, so the theory may tell you to wait. Critics say aggregation ignores the separateness of persons.",
        [
          "Transmitter room",
          prospects(
            "thousand welfare units",
            ["Cut the broadcast now", [["millions miss an hour", 1, -60]]],
            ["Wait an hour", [["Jones suffers an hour", 1, -40]]],
          ),
        ],
        [
          "Fewer viewers",
          prospects(
            "thousand welfare units",
            ["Cut the broadcast now", [["thousands miss an hour", 1, -6]]],
            ["Wait an hour", [["Jones suffers an hour", 1, -40]]],
          ),
        ],
      ),
    ],
    questions: [
      numeric(
        "Option B gives a 60% chance of 100 welfare units and a 40% chance of 0. What is its expected utility, in welfare units?",
        60,
        "0.6 × 100 + 0.4 × 0 = 60 units.",
        [
          "Multiply each outcome's value by its probability.",
          "The failure outcome contributes nothing.",
          "Add the weighted values.",
        ],
      ),
      numeric(
        "A programme gives 20 units of benefit with probability 0.9 and causes 30 units of harm with probability 0.1. What is its expected utility?",
        15,
        "0.9 × 20 + 0.1 × (−30) = 18 − 3 = 15 units.",
        [
          "Give the harm a negative value.",
          "Weight each outcome by its probability.",
          "Add the two weighted values.",
        ],
      ),
      numeric(
        "A runaway trolley will kill five people on the main track unless you pull a lever sending it onto a side track, where it will kill one. Counting lives only, how many more people survive if you pull?",
        4,
        "Not pulling: five die. Pulling: one dies. 5 − 1 = 4 more survive.",
        ["Count the deaths if you do nothing.", "Count the deaths if you pull.", "Subtract."],
      ),
      word(
        "Scanlon's transmitter room: a utilitarian may let Jones suffer an hour of shocks rather than interrupt a broadcast, because millions of small losses add up. Name the feature of utilitarianism that produces this verdict.",
        "aggregation",
        ["aggregating", "aggregative", "summing", "sum-ranking", "aggregate"],
        "Aggregation: summing welfare across people, so many small losses can outweigh one great harm.",
        [
          "Ask how utilitarianism combines the viewers' losses.",
          "The word for adding many small quantities into one total.",
        ],
      ),
      choose(
        "Who wrote that it is 'better to be Socrates dissatisfied than a fool satisfied'?",
        ["John Stuart Mill", "Jeremy Bentham", "Immanuel Kant"],
        0,
        "Mill, in chapter II of Utilitarianism (1861), defending a distinction between higher and lower pleasures.",
        "The line defends higher pleasures within utilitarianism.",
      ),
      numeric(
        "Policy X gives three people +4, +4 and −5 welfare units. Policy Y gives each of them +2. By how many units does Y's total exceed X's?",
        3,
        "X totals 4 + 4 − 5 = 3. Y totals 2 + 2 + 2 = 6. 6 − 3 = 3 units.",
        [
          "Add the effects of X across the three people.",
          "Add the effects of Y.",
          "Subtract X's total from Y's.",
        ],
      ),
    ],
    cards: [
      cardNumber(
        "An act has a 25% chance of producing 80 units of welfare and a 75% chance of producing −4. What is its expected utility?",
        17,
        "0.25 × 80 + 0.75 × (−4) = 20 − 3 = 17 units.",
      ),
      cardWord(
        "Which philosopher wrote that nature has placed mankind under two sovereign masters, pain and pleasure?",
        "bentham",
        ["jeremy bentham"],
        "Jeremy Bentham, An Introduction to the Principles of Morals and Legislation (1789).",
      ),
    ],
  },
  {
    id: "kant-and-the-footbridge",
    title: "Duty, persons and the footbridge",
    summary:
      "Apply Kant's universal-law and humanity formulations, and compare the switch and footbridge cases.",
    moduleId: "phil-ethics",
    sourceIds: ["os-deontology", "sep-kant-moral", "sep-double-effect", "kant-groundwork"],
    beats: [
      beat(
        "The footbridge",
        "Judith Jarvis Thomson's variant: you stand on a footbridge beside a heavy stranger. Pushing him onto the track would stop the trolley and save the five; he would die. The arithmetic matches the switch case, four lives saved, yet most people judge that pushing is wrong. A theory that only counts outcomes cannot tell the cases apart.",
        ["Footbridge", trolley("footbridge", 5, 1)],
        ["Switch", trolley("switch", 5, 1)],
      ),
      beat(
        "Persons as ends",
        "Kant's categorical imperative has several formulations. One says: act so that you treat humanity, in your own person or another's, always at the same time as an end and never merely as a means. Pushing the stranger uses his body as a tool to stop the trolley. In the switch case the one dies as a side effect: the plan would work just as well if he were not there.",
        ["Footbridge", trolley("footbridge", 5, 1)],
        ["Switch", trolley("switch", 5, 1)],
      ),
      beat(
        "Universal law",
        "The first formulation: act only on a maxim you can at the same time will to become a universal law. Kant's example is a false promise to repay a loan. If everyone made such promises, nobody would believe them. The maxim would defeat itself. The test is not that universal lying would have bad results; it is that the maxim cannot even be consistently universalised.",
        ["False promise", falsePromise],
        [
          "Keeping a promise",
          argument(
            [
              "My maxim: when I borrow money, I will repay it as promised.",
              "If everyone acted on this maxim, promises to repay would remain credible.",
            ],
            "I can will this maxim as a universal law.",
          ),
        ],
      ),
      beat(
        "Means or side effect",
        "The doctrine of double effect, traced to Aquinas, permits an act with a foreseen bad effect only if the good outweighs the bad effect and the bad effect is not intended as an end or as a means. It allows the switch and forbids the footbridge. Thomson's loop case strains it: the side track rejoins the main line, so the one person's body is what stops the trolley.",
        ["Switch", trolley("switch", 5, 1)],
        ["Loop", trolley("loop", 5, 1)],
      ),
    ],
    questions: [
      numeric(
        "From a footbridge you could push a heavy stranger onto the track; his body would stop a trolley that will otherwise kill five. Counting lives only, how many more people survive if you push?",
        4,
        "Not pushing: five die. Pushing: the stranger dies. 5 − 1 = 4, the same as the switch case.",
        ["Count deaths if you do nothing.", "Count deaths if you push.", "Subtract."],
      ),
      word(
        "Kant's formulation that you must never treat a person merely as a means is called the formula of ___. Fill the gap with one word.",
        "humanity",
        ["end in itself", "ends in themselves"],
        "The formula of humanity.",
        [
          "Kant says we must treat it, in ourselves and others, always as an end.",
          "The word names what all persons share, in Kant's sense of rational nature.",
        ],
      ),
      word(
        "Kant tests the maxim 'make a false promise to get a loan' by asking whether it could hold for everyone; universal false promising would make such promises impossible. Which formulation of the categorical imperative is this?",
        "universal law",
        [
          "universalisability",
          "universalizability",
          "universalisation",
          "universalization",
          "law of nature",
        ],
        "The formula of universal law.",
        [
          "The test imagines the maxim adopted by everyone.",
          "Its name says the maxim must be able to become a law for all.",
        ],
      ),
      word(
        "Name the doctrine, traced to Aquinas, that may permit a foreseen harm as a side effect of a good act but forbids intending harm as a means.",
        "double effect",
        ["doctrine of double effect", "principle of double effect", "DDE"],
        "The doctrine of double effect.",
        [
          "One act, two effects: one intended, one merely foreseen.",
          "Its name counts the effects.",
        ],
      ),
      choose(
        "'If you want to be trusted, keep your promises.' What kind of imperative is this, in Kant's terms?",
        ["Hypothetical", "Categorical", "Universal"],
        0,
        "It binds only someone who has the stated goal of being trusted, so it is hypothetical. A categorical imperative binds whatever you want.",
        "Does the command depend on a goal you happen to have?",
      ),
      word(
        "In Thomson's loop case the side track rejoins the main line, so only the one person's body stops the trolley. Is that person's death a means or a side effect of saving the five?",
        "means",
        ["a means", "as a means"],
        "A means: if the one were not on the loop, the trolley would come round and kill the five.",
        [
          "Ask whether the plan would still work if the one person were absent.",
          "If the plan needs his body, his death is part of how it works.",
        ],
        ["side effect"],
      ),
    ],
    cards: [
      cardWord(
        "What kind of imperative, in Kant's terms, binds you whatever your desires or goals?",
        "categorical",
        ["categorical imperative"],
        "A categorical imperative.",
        ["hypothetical"],
      ),
      cardNumber(
        "A switch case has three people ahead and one on the side track. Counting lives only, how many more survive if you divert the trolley?",
        2,
        "3 − 1 = 2 more survive.",
      ),
    ],
  },
  {
    id: "virtue-and-the-mean",
    title: "Character and the mean",
    summary:
      "Locate a virtue between two vices, distinguish the mean relative to us from an arithmetic midpoint, and see how virtue is acquired.",
    moduleId: "phil-ethics",
    sourceIds: ["os-virtue", "sep-aristotle-ethics", "aristotle-ethics-text"],
    beats: [
      beat(
        "Relative to us",
        "Aristotle defines virtue of character as a settled state of choosing the mean relative to us. If ten minae of food is too much and two too little, six is the arithmetic midpoint, but a trainer will not order six for everyone: it would be too little for the wrestler Milo and too much for a beginner. The right amount depends on the person and the situation.",
        ["Anger at a passing slight", temper("someone jostled in a queue", [1, 3])],
        ["Anger at real harm", temper("a parent protecting a child", [6, 8])],
      ),
      beat(
        "Two vices for each virtue",
        "Each virtue concerns a sphere of feeling or action and lies between a vice of deficiency and a vice of excess. Courage concerns fear and confidence, with cowardice and rashness on either side. Temperance concerns bodily pleasures. Generosity concerns giving money, between meanness and prodigality. Aristotle notes that one vice usually lies further from the virtue: cowardice is more opposed to courage than rashness is.",
        ["Courage, a firefighter", courage("a trained firefighter", [6, 8])],
        ["Courage, a passer-by", courage("an untrained passer-by", [3, 5])],
      ),
      beat(
        "Virtue by practice",
        "Virtues of thought grow mostly by teaching; virtues of character come from habit. We become just by doing just acts and brave by doing brave ones, as a builder learns by building. A beginner's courage occupies a different band from a veteran's because practice reshapes what each can rightly face. The aim is to act well and to find doing so natural.",
        ["Courage, a passer-by", courage("an untrained passer-by", [3, 5])],
        ["Courage, a firefighter", courage("a trained firefighter", [6, 8])],
      ),
      beat(
        "Back to the training table",
        "Return to Aristotle's own example and measure it. The arithmetic midpoint between two and ten minae is fixed; the mean relative to us moves. For Milo the right amount lies above the midpoint, for a beginner below it. Practical wisdom, phronesis, is the capacity to see where the mean lies in a particular case.",
        ["Milo, a champion", food("Milo the wrestler", [7, 9])],
        ["A beginner", food("a beginner in training", [3, 5])],
      ),
    ],
    questions: [
      numeric(
        "Aristotle supposes that ten minae of food is too much and two minae too little. What amount, in minae, is the arithmetic mean of the two?",
        6,
        "(2 + 10) / 2 = 6 minae. Aristotle's point is that the mean relative to us need not be this amount.",
        [
          "The arithmetic mean lies halfway between the two amounts.",
          "Add the two amounts.",
          "Halve the sum.",
        ],
        "minae",
      ),
      word(
        "Generosity concerns giving money. Its vice of excess is prodigality. Name its vice of deficiency.",
        "meanness",
        ["stinginess", "miserliness", "illiberality", "stingy", "miserly", "avarice"],
        "Meanness, also translated stinginess or illiberality.",
        [
          "The deficient person gives too little and takes too much.",
          "Think of the everyday word for someone who will not spend.",
        ],
      ),
      word(
        "According to Aristotle, do we acquire virtues of character mainly by teaching or by habit?",
        "habit",
        ["habituation", "practice", "habits"],
        "By habit: we become brave by doing brave acts.",
        [
          "Aristotle compares virtue with learning to build or to play the lyre.",
          "Teaching produces virtues of thought; something else produces virtues of character.",
        ],
        ["teaching"],
      ),
      numeric(
        "On a scale from 2 to 10 minae of food, a beginner's right amount runs from 3 to 5 minae. How many minae below the arithmetic mean of the scale is the top of the beginner's range?",
        1,
        "The arithmetic mean is (2 + 10) / 2 = 6 minae. The top of the beginner's range is 5, which is 6 − 5 = 1 mina below it.",
        [
          "Find the midpoint of the whole scale first.",
          "The top of the beginner's range is its larger number.",
          "Subtract the top of the range from the midpoint.",
        ],
        "minae",
      ),
      choose(
        "Ten minae is too much and two too little. For Milo, a champion wrestler, Aristotle says six minae would be:",
        ["Too little", "Exactly right", "Too much"],
        0,
        "Too little. Aristotle says six would be too little for Milo and too much for a beginner.",
        "Milo is a champion athlete with a large body to feed.",
      ),
      word(
        "What Greek word, often translated 'happiness' or 'flourishing', names the highest human good for Aristotle?",
        "eudaimonia",
        ["eudaemonia", "eudaimonía"],
        "Eudaimonia: living well and doing well, an activity of the soul in accordance with virtue.",
        [
          "It begins with the Greek prefix for 'good'.",
          "Its second part is daimon, a guiding spirit.",
        ],
      ),
    ],
    cards: [
      cardWord(
        "In Aristotle's ethics, what is the vice of deficiency for courage?",
        "cowardice",
        ["cowardly"],
        "Cowardice: too much fear and too little confidence.",
        ["rashness"],
      ),
      cardWord(
        "What Greek term does Aristotle use for the practical wisdom that discerns the mean in a particular case?",
        "phronesis",
        ["phronēsis"],
        "Phronesis.",
      ),
    ],
  },
  {
    id: "the-social-contract",
    title: "The social contract",
    summary:
      "Compare Hobbes's and Locke's social contracts, then choose principles behind Rawls's veil of ignorance with maximin and averages.",
    moduleId: "phil-ethics",
    sourceIds: ["os-legitimacy", "sep-original-position", "hobbes-leviathan"],
    beats: [
      beat(
        "The state of nature",
        "Hobbes asks what life would be without any common power to keep people in awe. People are roughly equal in their power to kill one another, and competition, fear and pride drive them into conflict. The result is a war of every man against every man, in which life is 'solitary, poor, nasty, brutish, and short'. Rational people would covenant to obey a sovereign to escape it. Locke's state of nature already has a law of nature, so his government needs consent and keeps limits.",
        [
          "Hobbes",
          argument(
            [
              "Without a common power, each person may do whatever preserves himself.",
              "Even the weakest can kill the strongest, by plot or alliance.",
              "Competition, fear and pride make conflict likely.",
            ],
            "Without a sovereign, life is a war of all against all.",
          ),
        ],
        [
          "Locke",
          argument(
            [
              "In the state of nature a law of nature already forbids harming others.",
              "People leave it only to secure their lives, liberties and property.",
            ],
            "Government is legitimate only by consent, and only within those limits.",
          ),
        ],
      ),
      beat(
        "Behind the veil",
        "John Rawls asks which principles you would choose for society if a veil of ignorance hid your place in it: your class, talents and conception of the good. Society A pays its three equal groups 10, 40 and 70 income units; society B pays 25, 30 and 35. If each position is equally likely, A's average is (10 + 40 + 70) / 3 = 40. B's is 30.",
        [
          "A against B",
          veil(income, thirds, [
            ["Society A", [10, 40, 70]],
            ["Society B", [25, 30, 35]],
          ]),
        ],
        [
          "A against C",
          veil(income, thirds, [
            ["Society A", [10, 40, 70]],
            ["Society C", [20, 45, 95]],
          ]),
        ],
      ),
      beat(
        "Maximin",
        "Rawls argued that under the veil, with so much at stake and no basis for probabilities, the rational rule is maximin: choose the option whose worst outcome is best. A's worst-off group gets 10, B's gets 25, so maximin picks B even though A has the higher average. Critics, John Harsanyi among them, argued that a rational chooser would maximise expected utility, which here picks A.",
        [
          "A against B",
          veil(income, thirds, [
            ["Society A", [10, 40, 70]],
            ["Society B", [25, 30, 35]],
          ]),
        ],
        [
          "A against C",
          veil(income, thirds, [
            ["Society A", [10, 40, 70]],
            ["Society C", [20, 45, 95]],
          ]),
        ],
      ),
      beat(
        "Unequal group sizes",
        "Real societies do not split into equal groups. When a quarter of people are in one position and three quarters in another, the average weights each value by its share. Maximin ignores the shares and looks only at the worst position. That is the strongest objection to it: it would trade a large gain for most people against a tiny loss to a few.",
        [
          "C against D",
          veil(
            income,
            ["A quarter", "Three quarters"],
            [
              ["Society C", [20, 60]],
              ["Society D", [30, 50]],
            ],
            [0.25, 0.75],
          ),
        ],
        [
          "D against E",
          veil(
            income,
            ["A quarter", "Three quarters"],
            [
              ["Society D", [30, 50]],
              ["Society E", [29, 90]],
            ],
            [0.25, 0.75],
          ),
        ],
      ),
    ],
    questions: [
      word(
        "Who wrote that, without a common power, the life of man would be 'solitary, poor, nasty, brutish, and short'?",
        "hobbes",
        ["thomas hobbes"],
        "Thomas Hobbes, Leviathan (1651), chapter 13.",
        ["He wrote Leviathan during the English Civil War."],
      ),
      numeric(
        "Society A pays its three equal-sized groups 10, 40 and 70 income units. If you are equally likely to land in any group, what is your expected income in A?",
        40,
        "(10 + 40 + 70) / 3 = 40 income units.",
        [
          "Each group has probability one third.",
          "Add the three incomes.",
          "Divide by the number of groups.",
        ],
      ),
      word(
        "Behind the veil you choose between society A (10, 40, 70) and society B (25, 30, 35), three equal groups each. Which society does the maximin rule choose? Answer A or B.",
        "b",
        ["society b"],
        "Society B: its worst-off group receives 25, against 10 in A.",
        [
          "Maximin looks only at each society's worst position.",
          "Compare the lowest income in each society.",
        ],
      ),
      numeric(
        "In society D, a quarter of people receive 30 income units and three quarters receive 50. What is the average income?",
        45,
        "0.25 × 30 + 0.75 × 50 = 7.5 + 37.5 = 45 income units.",
        [
          "Weight each income by the share of people who receive it.",
          "Multiply 30 by a quarter and 50 by three quarters.",
          "Add the two weighted amounts.",
        ],
      ),
      word(
        "Locke held that legitimate political power rests on the ___ of the governed. Fill the gap with one word.",
        "consent",
        ["agreement", "consented"],
        "Consent: people leave the state of nature by agreeing to form a political society.",
        [
          "Locke's citizens make themselves members of a society by their own act.",
          "The word for agreeing to something.",
        ],
      ),
      choose(
        "Rawls's difference principle permits social and economic inequalities only when:",
        [
          "They work to the greatest benefit of the least advantaged",
          "Everyone receives exactly the same income",
          "They raise the average income",
        ],
        0,
        "Inequalities must benefit the least advantaged, and attach to positions open to all under fair equality of opportunity.",
        "The principle is the institutional cousin of maximin.",
      ),
    ],
    cards: [
      cardWord(
        "Name Rawls's device that hides your place in society from you while you choose principles of justice.",
        "veil of ignorance",
        ["veil", "original position"],
        "The veil of ignorance, part of the original position.",
      ),
      cardNumber(
        "Society E pays three equal groups 12, 20 and 40 income units; society F pays 15, 18 and 21. What is the lowest income in the society that maximin chooses?",
        15,
        "E's worst-off group gets 12 and F's gets 15. Maximin chooses F, whose lowest income is 15.",
      ),
    ],
  },
];
