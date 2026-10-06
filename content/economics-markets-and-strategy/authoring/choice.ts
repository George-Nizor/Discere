import {
  beat,
  card,
  choose,
  margin,
  numeric,
  ppf,
  type TeachingLesson,
  trade,
  word,
} from "./definition.js";

const bowed: Array<[number, number]> = [
  [0, 100],
  [20, 90],
  [40, 70],
  [60, 40],
  [80, 0],
];
const workshopA: Array<[number, number]> = [
  [0, 20],
  [60, 0],
];
const cafeBenefits = [90, 70, 55, 40, 30];
const cafeCosts = [30, 35, 45, 50, 60];

export const choiceLessons: TeachingLesson[] = [
  {
    id: "opportunity-cost-and-the-frontier",
    title: "What it really costs",
    summary:
      "Measure opportunity cost along a production possibilities frontier, and see why it usually rises.",
    moduleId: "econ-choice",
    sourceIds: ["econ-ppf", "econ-budget", "econ-what-is"],
    beats: [
      beat(
        "Read the trade-off",
        "Opportunity cost is the value of the best alternative given up. Workshop A's week can produce 60 chairs or 20 tables, so each table uses the time that would have made 60 ÷ 20 = 3 chairs. On a straight frontier that rate never changes, and the frontier's slope is the trade-off itself. Workshop B, whose week makes only 40 chairs, gives up 2 chairs per table.",
        ["Workshop A", ppf("Chairs", "Tables", workshopA)],
        [
          "Workshop B",
          ppf("Chairs", "Tables", [
            [0, 20],
            [40, 0],
          ]),
        ],
      ),
      beat(
        "Inside, on or beyond",
        "Making 30 chairs uses half of Workshop A's week, which leaves time for 10 tables. Producing only 5 means idle time or waste: the point lies inside the frontier, and more of one good is available without giving up any of the other. Points on the frontier are productively efficient. A point such as 45 chairs with 12 tables lies beyond it and cannot be reached with today's workers, tools and methods.",
        ["30 chairs, 5 tables", ppf("Chairs", "Tables", workshopA, [30, 5])],
        ["30 chairs, 10 tables", ppf("Chairs", "Tables", workshopA, [30, 10])],
        ["45 chairs, 12 tables", ppf("Chairs", "Tables", workshopA, [45, 12])],
      ),
      beat(
        "Why the frontier bows",
        "Resources differ in what they are good at. The first food comes from farmland and farm workers who were never much use in a factory, so few machines are lost. Later food pulls engineers and factory sites onto farms. Each extra 20 units of food costs 10, then 20, then 30, then 40 machines. That rising cost bends the frontier outward. A straight frontier would mean every resource is equally suited to both goods.",
        ["Bowed frontier", ppf("Food", "Machines", bowed, [40, 70])],
        [
          "Straight frontier",
          ppf(
            "Food",
            "Machines",
            [
              [0, 100],
              [80, 0],
            ],
            [40, 50],
          ),
        ],
      ),
      beat(
        "Price the next step",
        "Divide what is lost by what is gained: 40 machines for 20 food is 2 machines per unit of food. The first step cost 10 machines for 20 food, only 0.5 each. An average over the whole frontier, 100 machines for 80 food, hides this. Decisions are about the next step, so the cost of the next step is the one to measure.",
        ["Start at 60 food", ppf("Food", "Machines", bowed, [60, 40])],
        ["Move to 80 food", ppf("Food", "Machines", bowed, [80, 0])],
      ),
    ],
    questions: [
      numeric(
        "Workshop A can make at most 60 chairs or 20 tables a week, trading one for the other at a constant rate. How many chairs does each extra table cost?",
        3,
        "60 chairs ÷ 20 tables = 3 chairs per table.",
        [
          "Both maximums use the same week of work.",
          "Ask how many chairs one table's share of the week could have made.",
          "Divide the maximum number of chairs by the maximum number of tables.",
        ],
        "chairs",
      ),
      choose(
        "Workshop A can make at most 60 chairs or 20 tables a week at a constant rate. It makes 30 chairs and 5 tables. Where does that point lie?",
        ["Inside the frontier", "On the frontier", "Beyond the frontier"],
        0,
        "Thirty chairs leave time for 10 tables, so 5 tables wastes capacity: the point is inside the frontier.",
        "Work out how many tables the time left after 30 chairs could make.",
      ),
      numeric(
        "A country's frontier passes through (40 food, 70 machines) and (60 food, 40 machines). Moving between them, how many machines are given up?",
        30,
        "Machines fall from 70 to 40: 70 − 40 = 30 machines for 20 more food.",
        [
          "Only the machines column matters for what is given up.",
          "Find machines at both points.",
          "Subtract the later figure from the earlier one.",
        ],
        "machines",
      ),
      numeric(
        "On the same frontier, food rises from 60 to 80 units while machines fall from 40 to 0. What is the opportunity cost per unit of food, measured in machines?",
        2,
        "40 machines ÷ 20 food = 2 machines per unit of food.",
        [
          "Find the machines lost on this step.",
          "Find the food gained on this step.",
          "Divide the loss by the gain.",
        ],
        "machines",
      ),
      numeric(
        "Priya has 12 hours of study time. An essay takes her 3 hours and a problem set takes 1.5 hours. What is the opportunity cost of one essay, measured in problem sets?",
        2,
        "3 ÷ 1.5 = 2 problem sets per essay. The 12-hour total does not change the rate.",
        [
          "An essay uses up a fixed block of time.",
          "Ask how many problem sets fit into that same block.",
          "Divide the essay's time by the time for one problem set.",
        ],
        "problem sets",
      ),
      choose(
        "A production possibilities frontier bows outward from the origin. What does that shape show?",
        ["Increasing opportunity cost", "Constant opportunity cost", "Falling opportunity cost"],
        0,
        "Each extra unit of one good costs more of the other, as resources less suited to it are moved across.",
        "Compare how steep the frontier is near each axis.",
      ),
    ],
    cards: [
      card(
        "A country can make at most 300 cars or 900 bicycles, at a constant rate of exchange between them. What is the opportunity cost of one car, in bicycles?",
        3,
        "900 ÷ 300 = 3 bicycles per car.",
        "bicycles",
      ),
      card(
        "A frontier passes through (0 food, 50 tools), (10, 45), (20, 35), (30, 20) and (40, 0). Between 30 and 40 units of food, what is the opportunity cost per unit of food, in tools?",
        2,
        "Tools fall from 20 to 0 while food rises by 10: 20 ÷ 10 = 2 tools per unit of food.",
        "tools",
      ),
    ],
  },
  {
    id: "comparative-advantage",
    title: "Who should make what",
    summary:
      "Find comparative advantage from opportunity costs and show that specialisation and trade benefit both sides.",
    moduleId: "econ-choice",
    sourceIds: ["econ-trade", "econ-ppf"],
    beats: [
      beat(
        "Faster is not the point",
        "Ana is faster at both goods: she has an absolute advantage in each. That does not settle who should bake what. A cake costs Ana 12 ÷ 6 = 2 loaves of forgone bread; it costs Ben 6 ÷ 4 = 1.5 loaves. Cakes are cheaper, in what is given up, when Ben makes them, even though Ana makes more cakes in a day.",
        ["Ana and Ben", trade("Cakes", "Loaves", ["Ana", 6, 12], ["Ben", 4, 6])],
        ["Cleo and Dev", trade("Cakes", "Loaves", ["Cleo", 2, 10], ["Dev", 4, 4])],
      ),
      beat(
        "Compare the costs",
        "Comparative advantage means the lower opportunity cost. Ben's cake costs 1.5 loaves and Ana's costs 2, so Ben has the comparative advantage in cakes. The mirror image follows: a loaf costs Ana half a cake and Ben two-thirds of one, so Ana has the comparative advantage in bread. Two producers with different cost ratios each hold one comparative advantage.",
        ["Ana and Ben", trade("Cakes", "Loaves", ["Ana", 6, 12], ["Ben", 4, 6])],
        ["Cleo and Dev", trade("Cakes", "Loaves", ["Cleo", 2, 10], ["Dev", 4, 4])],
      ),
      beat(
        "Specialise, then swap",
        "Specialising, Ben bakes 4 cakes, keeps 2 and trades 2 for 2 × 1.75 = 3.5 loaves. He ends with 2 cakes and 3.5 loaves, half a loaf more than splitting his own day gave him. Ana gains too: each cake costs her 1.75 loaves instead of the 2 she would forgo baking it. Any price between 1.5 and 2 loaves per cake helps both; at 2.5 Ana would rather bake her own.",
        ["1.75 loaves per cake", trade("Cakes", "Loaves", ["Ana", 6, 12], ["Ben", 4, 6], 1.75)],
        ["2.5 loaves per cake", trade("Cakes", "Loaves", ["Ana", 6, 12], ["Ben", 4, 6], 2.5)],
      ),
      beat(
        "Equal ratios, no gain",
        "Cara and Dan both give up 2 loaves per cake. Cara is twice as productive at everything, yet no price leaves both better off: a rate below 2 loaves per cake hurts whoever sells cakes and a rate above 2 hurts whoever buys them. Gains from trade come from differences in opportunity cost. Differences in productivity alone create none.",
        ["Cara and Dan", trade("Cakes", "Loaves", ["Cara", 4, 8], ["Dan", 2, 4])],
        ["Ana and Ben", trade("Cakes", "Loaves", ["Ana", 6, 12], ["Ben", 4, 6])],
      ),
    ],
    questions: [
      numeric(
        "In a day Ana can bake 12 loaves or 6 cakes. What is her opportunity cost of one cake, in loaves?",
        2,
        "12 loaves ÷ 6 cakes = 2 loaves per cake.",
        [
          "A day of cakes and a day of bread use the same time.",
          "Ask how much bread one cake's share of the day could have made.",
          "Divide her loaves per day by her cakes per day.",
        ],
        "loaves",
      ),
      word(
        "In a day Ana can bake 12 loaves or 6 cakes; Ben can bake 6 loaves or 4 cakes. Who has the comparative advantage in cakes? Give the name.",
        "Ben",
        [],
        ["Ana"],
        "Ben. A cake costs him 1.5 loaves against Ana's 2.",
        [
          "Compare each baker's opportunity cost of a cake, in loaves.",
          "The comparative advantage belongs to whoever gives up less.",
        ],
      ),
      numeric(
        "Ben can bake 6 loaves or 4 cakes a day. Splitting his day he makes 2 cakes and 3 loaves. Instead he bakes only cakes and swaps 2 of them with Ana for 1.75 loaves each. How many more loaves does he end with than before?",
        0.5,
        "He receives 2 × 1.75 = 3.5 loaves and keeps 2 cakes, so he has 3.5 − 3 = 0.5 loaves more.",
        [
          "Find how many loaves the swap brings him.",
          "He keeps the same number of cakes as before.",
          "Subtract the loaves he used to bake from the loaves he receives.",
        ],
        "loaves",
      ),
      numeric(
        "Cara can bake 8 loaves or 4 cakes a day; Dan can bake 4 loaves or 2 cakes. By how many loaves does their opportunity cost of a cake differ?",
        0,
        "Each gives up 8 ÷ 4 = 4 ÷ 2 loaves per cake, so the costs are equal and the difference is nothing.",
        [
          "Work out each person's loaves per cake.",
          "Compare the two rates.",
          "Subtract the smaller from the larger.",
        ],
        "loaves",
      ),
      numeric(
        "In an hour Mira can code 4 web pages or write 8 reports. Tom can code 1 page or write 4 reports. What is Tom's opportunity cost of one page, in reports?",
        4,
        "Tom gives up 4 reports ÷ 1 page = 4 reports per page; Mira gives up only 2.",
        [
          "Use only Tom's two figures.",
          "Ask how many reports he forgoes to spend an hour on pages.",
          "Divide his reports per hour by his pages per hour.",
        ],
        "reports",
      ),
      choose(
        "Mira gives up 2 reports per web page; Tom gives up 4. Which division of work produces gains from trade?",
        [
          "Mira codes pages and Tom writes reports",
          "Tom codes pages and Mira writes reports",
          "Each splits the hour equally",
        ],
        0,
        "Mira has the lower opportunity cost of pages, so she codes them; Tom's lower cost of reports makes him the report writer.",
        "Give each task to the person who gives up less to do it.",
      ),
    ],
    cards: [
      card(
        "In a day a country's workers can make 50 shirts or 10 phones. What is the opportunity cost of one phone, in shirts?",
        5,
        "50 ÷ 10 = 5 shirts per phone.",
        "shirts",
      ),
      card(
        "In an hour Uma picks 30 apples or 10 pears; Raj picks 20 apples or 10 pears. What is Raj's opportunity cost of one pear, in apples?",
        2,
        "20 ÷ 10 = 2 apples per pear, below Uma's 3, so Raj has the comparative advantage in pears.",
        "apples",
      ),
    ],
  },
  {
    id: "thinking-at-the-margin",
    title: "The next unit",
    summary:
      "Choose how much of an activity to do by comparing marginal benefit with marginal cost, and ignore sunk costs.",
    moduleId: "econ-choice",
    sourceIds: ["econ-consumption", "econ-budget"],
    beats: [
      beat(
        "One more hour",
        "Marginal means one more. The café's first late hour adds £90 and costs £30; the second adds £70 for £35; the third adds £55 for £45. The fourth would add £40 but cost £50, so it would lower the café's net gain. Marginal benefit falls as late customers thin out, and marginal cost rises as staff move onto overtime. The best choice sits where the two meet.",
        ["Rising cost", margin("Late opening", "Hour", cafeBenefits, cafeCosts)],
        ["Flat £40 cost", margin("Late opening", "Hour", cafeBenefits, [40, 40, 40, 40, 40])],
      ),
      beat(
        "Add up the gains",
        "The three hours add £60, £35 and £10, a total of £105. A fourth would subtract £10 and a fifth another £30. Total net benefit peaks exactly where marginal net benefit turns negative, so comparing marginal values finds the best total without computing every total.",
        ["Rising cost", margin("Late opening", "Hour", cafeBenefits, cafeCosts)],
        ["Busier street", margin("Late opening", "Hour", [120, 95, 70, 50, 35], cafeCosts)],
      ),
      beat(
        "Costs that count",
        "With costs of £50, £55 and £65, the third hour now loses £10, so two hours is best. A one-off cost already paid behaves differently. A £200 licence bought last month is sunk: it is the same whether the café opens no extra hours or five, so it changes no marginal comparison and should change no decision.",
        ["Original costs", margin("Late opening", "Hour", cafeBenefits, cafeCosts)],
        [
          "Costs up £20",
          margin(
            "Late opening",
            "Hour",
            cafeBenefits,
            cafeCosts.map((c) => c + 20),
          ),
        ],
      ),
      beat(
        "Averages mislead",
        "Opening the fourth hour changes net benefit by £40 − £50 = −£10. The average benefit of the first four hours, (90 + 70 + 55 + 40) ÷ 4 = £63.75, sits well above £50, which tempts a wrong yes: the average includes hours that are being opened anyway. Only the extra hour's own benefit and cost decide the extra hour.",
        ["Evening", margin("Late opening", "Hour", cafeBenefits, cafeCosts)],
        ["Weekday", margin("Late opening", "Hour", [60, 45, 30, 20], [25, 30, 35, 40])],
      ),
    ],
    questions: [
      numeric(
        "A café's extra opening hours have marginal benefits of £90, £70, £55, £40 and £30, and marginal costs of £30, £35, £45, £50 and £60. How many extra hours should it open?",
        3,
        "Hours one to three each bring at least their cost (£90 > £30, £70 > £35, £55 > £45); the fourth brings £40 for £50.",
        [
          "Compare benefit and cost hour by hour.",
          "Keep adding hours while the next one brings at least as much as it costs.",
          "Stop before the first hour whose cost exceeds its benefit.",
        ],
        "hours",
      ),
      numeric(
        "With marginal benefits of £90, £70 and £55 and marginal costs of £30, £35 and £45 for the hours it opens, what total net benefit does the café gain, in pounds?",
        105,
        "(90 − 30) + (70 − 35) + (55 − 45) = 60 + 35 + 10 = £105.",
        [
          "The net benefit of an hour is its benefit minus its cost.",
          "Work out the net benefit of each of those hours.",
          "Add them.",
        ],
        "£",
      ),
      numeric(
        "The café's hours bring marginal benefits of £90, £70, £55, £40 and £30. Its marginal costs rise by £20 to £50, £55, £65, £70 and £80. How many extra hours should it now open?",
        2,
        "£90 > £50 and £70 > £55, but £55 < £65, so it opens two hours.",
        [
          "Use the new costs, hour by hour.",
          "Compare each hour's benefit with its new cost, in order.",
          "Count the hours whose benefit still covers the cost.",
        ],
        "hours",
      ),
      numeric(
        "The fourth extra hour brings £40 of benefit and costs £50. By how many pounds does opening it change the café's net benefit?",
        -10,
        "£40 − £50 = −£10: opening it makes the café worse off.",
        [
          "Subtract the hour's cost from its benefit.",
          "Keep the sign, since a loss is negative.",
          "Use that hour's figures only, not the averages.",
        ],
        "£",
      ),
      numeric(
        "A student values successive hours of revision at 50, 40, 30, 20 and 10 points, and each hour costs her 25 points of other activities. How many hours should she revise?",
        3,
        "50, 40 and 30 each exceed 25; the fourth hour's 20 does not.",
        [
          "Every hour costs the same here.",
          "Compare each hour's value with that cost in turn.",
          "Count the hours worth more than the cost.",
        ],
        "hours",
      ),
      word(
        "A cost that has already been paid and cannot be recovered, whatever you decide next, is called what kind of cost? One word.",
        "sunk",
        [],
        ["fixed"],
        "Sunk. It is the same under every option, so it should not affect the choice.",
        ["Think of money that has gone for good, like a non-refundable ticket."],
      ),
    ],
    cards: [
      card(
        "Successive adverts bring marginal benefits of £80, £60, £45 and £30. Each advert costs £40. How many adverts maximise net benefit?",
        3,
        "£80, £60 and £45 each cover £40; the fourth advert brings only £30.",
        "adverts",
      ),
      card(
        "Three units bring marginal benefits of £12, £9 and £7, with marginal costs of £4, £5 and £8. What total net benefit does the best choice give, in pounds?",
        12,
        "Take the first two units: (12 − 4) + (9 − 5) = £12. The third would lose £1.",
        "£",
      ),
    ],
  },
];
