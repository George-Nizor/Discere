import {
  beat,
  card,
  choose,
  costs,
  game,
  monopoly,
  numeric,
  repeated,
  type TeachingLesson,
  word,
} from "./definition.js";

const dilemma = game(
  ["Alpha", "Beta"],
  ["High price", "Low price"],
  ["High price", "Low price"],
  [
    [
      [10, 10],
      [2, 14],
    ],
    [
      [14, 2],
      [5, 5],
    ],
  ],
);
const standards = game(
  ["Maker A", "Maker B"],
  ["Plug A", "Plug B"],
  ["Plug A", "Plug B"],
  [
    [
      [6, 6],
      [0, 0],
    ],
    [
      [0, 0],
      [4, 4],
    ],
  ],
);

export const strategyLessons: TeachingLesson[] = [
  {
    id: "costs-and-profit",
    title: "Costs and the best output",
    summary:
      "Separate fixed, variable, average and marginal cost, and choose output where marginal revenue equals marginal cost.",
    moduleId: "econ-strategy",
    sourceIds: ["econ-costs", "econ-competition"],
    beats: [
      beat(
        "Fixed and variable",
        "Fixed cost, here £100 of rent, is paid whatever the output. Variable cost, q², grows with output and grows faster as the workshop gets crowded. At 5 units total cost is 100 + 25 = £125, so average total cost is £25. Spreading the fixed cost over more units pulls the average down at first; rising variable cost pushes it back up later.",
        ["Rent £100", costs(100, 0, 1)],
        ["Rent £400", costs(400, 0, 1)],
      ),
      beat(
        "Marginal meets average",
        "Marginal cost is the cost of one more unit. While it is below the average, each new unit pulls the average down, as a low mark lowers a class average; once it is above, it pulls the average up. So MC crosses ATC at ATC's lowest point. Setting 2q = 100/q + q gives q² = 100 and q = 10, where both equal £20.",
        ["Rent £100", costs(100, 0, 1)],
        ["Rent £400", costs(400, 0, 1)],
      ),
      beat(
        "Produce to MR = MC",
        "A firm maximises profit by producing up to the point where marginal revenue equals marginal cost. A competitive firm is a price-taker, so every unit adds the price, £30, to revenue. Below 15 units the next unit adds more revenue than cost; beyond 15 it adds less. This is the marginal rule from the start of the course, applied to output.",
        ["Price £30", costs(100, 0, 1, 30)],
        ["Price £16", costs(100, 0, 1, 16)],
      ),
      beat(
        "Profit as an area",
        "Revenue is 30 × 15 = £450 and cost is 100 + 225 = £325, so profit is £125: the rectangle between the price and ATC (about £21.67) across 15 units. At £16 the best output is 8, with revenue £128 and cost £164, a loss of £36. The firm still produces in the short run, since shutting down would lose the whole £100 of rent.",
        ["Price £30", costs(100, 0, 1, 30)],
        ["Price £16", costs(100, 0, 1, 16)],
      ),
    ],
    questions: [
      numeric(
        "A firm's total cost is TC = 100 + q², where £100 is fixed. What is average total cost at q = 5, in pounds?",
        25,
        "TC = 100 + 25 = £125, and ATC = 125 ÷ 5 = £25.",
        [
          "Average total cost is total cost divided by output.",
          "Find total cost at that output first.",
          "Divide by the number of units.",
        ],
        "£",
      ),
      numeric(
        "With TC = 100 + q², marginal cost is MC = 2q and average total cost is 100/q + q. At what output is average total cost lowest?",
        10,
        "ATC is lowest where MC = ATC: 2q = 100/q + q gives q² = 100, so q = 10.",
        [
          "Average cost falls while the next unit costs less than the average.",
          "The lowest point is where marginal cost equals average total cost.",
          "Set the two expressions equal and solve for q.",
        ],
        "units",
      ),
      numeric(
        "A competitive firm with MC = 2q sells at a market price of £30. What output maximises its profit?",
        15,
        "Marginal revenue is the £30 price; 30 = 2q gives q = 15.",
        [
          "A price-taker's marginal revenue equals the price.",
          "Produce while the next unit's revenue covers its marginal cost.",
          "Solve price = 2q.",
        ],
        "units",
      ),
      numeric(
        "That firm has TC = 100 + q² and sells 15 units at £30 each. What is its profit, in pounds?",
        125,
        "Revenue 30 × 15 = £450; cost 100 + 225 = £325; profit £125.",
        [
          "Profit is total revenue minus total cost.",
          "Revenue is price times quantity.",
          "Total cost includes the fixed £100.",
        ],
        "£",
      ),
      numeric(
        "Total cost is £50 at 0 units, £70 at 1, £85 at 2, £105 at 3 and £135 at 4. What is the marginal cost of the third unit, in pounds?",
        20,
        "£105 − £85 = £20.",
        [
          "Marginal cost is the change in total cost from one more unit.",
          "Compare total cost at 2 units and at 3 units.",
          "Subtract the smaller total from the larger.",
        ],
        "£",
      ),
      numeric(
        "A competitive firm sells at £50 and its marginal cost is MC = 10 + 2q. What output maximises profit?",
        20,
        "50 = 10 + 2q gives q = 20.",
        [
          "Set price equal to marginal cost.",
          "Move the constant to one side.",
          "Divide by the slope of the marginal cost line.",
        ],
        "units",
      ),
    ],
    cards: [
      card(
        "A firm has fixed cost £60 and variable cost £8 for every unit. What is average total cost at 20 units, in pounds?",
        11,
        "(60 + 8 × 20) ÷ 20 = 220 ÷ 20 = £11.",
        "£",
      ),
      card(
        "Making one more unit adds £25 to a firm's revenue and £31 to its cost. By how many pounds does profit change?",
        -6,
        "£25 − £31 = −£6, so that unit should not be made.",
        "£",
      ),
    ],
  },
  {
    id: "monopoly",
    title: "One seller",
    summary:
      "Derive a single seller's marginal revenue and use it to find its price and output. Then measure the deadweight loss of monopoly.",
    moduleId: "econ-strategy",
    sourceIds: ["econ-monopoly"],
    beats: [
      beat(
        "Revenue from one more sale",
        "A monopolist is the only seller, so to sell one more unit it must cut the price on every unit. At Q = 30 the price is £70, but the 31st unit adds only £39 to revenue: £69 for itself minus £1 lost on each of the other 30. For straight-line demand, the marginal revenue line starts at the same intercept and falls twice as fast.",
        ["P = 100 − Q, MC £20", monopoly(100, 1, 20)],
        ["P = 120 − 2Q, MC £40", monopoly(120, 2, 40)],
      ),
      beat(
        "Choose output, then price",
        "MR = MC gives 100 − 2Q = 20 and Q = 40. Buyers will pay £60 for 40 units. The monopolist picks output where the MR line meets marginal cost, then charges the highest price the demand curve allows. Profit is (60 − 20) × 40 = £1,600, with no fixed cost.",
        ["P = 100 − Q, MC £20", monopoly(100, 1, 20)],
        ["P = 120 − 2Q, MC £40", monopoly(120, 2, 40)],
      ),
      beat(
        "Against competition",
        "Competition drives price down to marginal cost: 100 − Q = 20 gives 80 units at £20. The monopoly sells half as much at three times the price. Buyers lose twice: they pay £40 more on the 40 units they still buy, and the other 40 units are never sold.",
        ["P = 100 − Q, MC £20", monopoly(100, 1, 20)],
        ["P = 100 − Q, MC £40", monopoly(100, 1, 40)],
      ),
      beat(
        "The monopoly triangle",
        "Units 41 to 80 are each worth more to some buyer than the £20 they cost, yet none is produced. The lost value is a triangle with base 40 and height £40: ½ × 40 × 40 = £800. The £1,600 of profit is a transfer from buyers to the firm; the £800 is lost to everyone. Barriers to entry, such as patents and large economies of scale, let it persist.",
        ["P = 100 − Q, MC £20", monopoly(100, 1, 20)],
        ["P = 120 − 2Q, MC £40", monopoly(120, 2, 40)],
      ),
    ],
    questions: [
      numeric(
        "A monopolist faces demand P = 100 − Q, so marginal revenue is MR = 100 − 2Q. What is marginal revenue at Q = 30, in pounds?",
        40,
        "MR = 100 − 2 × 30 = £40, well below the £70 price.",
        [
          "Substitute the quantity into the MR equation.",
          "Double the quantity first.",
          "Subtract that from the intercept.",
        ],
        "£",
      ),
      numeric(
        "With demand P = 100 − Q and a constant marginal cost of £20, what price maximises the monopolist's profit, in pounds?",
        60,
        "100 − 2Q = 20 gives Q = 40, and the demand curve gives P = 100 − 40 = £60.",
        [
          "Find the output where MR equals MC first.",
          "Solve 100 − 2Q = MC.",
          "Read the price from the demand curve at that output.",
        ],
        "£",
      ),
      numeric(
        "If the market with demand P = 100 − Q and marginal cost £20 were competitive, price would equal marginal cost. What quantity would be sold?",
        80,
        "100 − Q = 20 gives Q = 80.",
        [
          "Set the demand price equal to marginal cost.",
          "Solve 100 − Q = MC.",
          "Compare the result with the monopoly output.",
        ],
        "units",
      ),
      numeric(
        "In that market a monopoly sells 40 units at £60, while competition would sell 80 units at £20. What is the monopoly's deadweight loss, in pounds?",
        800,
        "½ × (80 − 40) × (60 − 20) = £800.",
        [
          "The lost units lie between the two quantities.",
          "On them, the gap between buyers' value and marginal cost shrinks from the markup to zero.",
          "Take one half × base × height.",
        ],
        "£",
      ),
      numeric(
        "A monopolist faces P = 60 − 2Q and has a constant marginal cost of £12. What is its profit-maximising quantity?",
        12,
        "MR = 60 − 4Q. Setting 60 − 4Q = 12 gives Q = 12, sold at P = 60 − 24 = £36.",
        [
          "With P = a − bQ, marginal revenue is a − 2bQ.",
          "Write the MR equation for this demand curve.",
          "Set MR equal to marginal cost and solve.",
        ],
        "units",
      ),
      choose(
        "Compared with a competitive market with the same costs, a profit-maximising monopoly…",
        [
          "sells less at a higher price",
          "sells more at a lower price",
          "sells the same quantity at a higher price",
        ],
        0,
        "It stops where MR = MC, short of where price meets marginal cost, and charges what demand allows for that smaller output.",
        "Marginal revenue lies below the demand curve.",
      ),
    ],
    cards: [
      card(
        "A monopolist faces P = 80 − Q and a constant marginal cost of £20. What price does it charge, in pounds?",
        50,
        "MR = 80 − 2Q = 20 gives Q = 30, so P = 80 − 30 = £50.",
        "£",
      ),
      card(
        "Demand is P = 50 − Q and marginal cost is a constant £10. What is the deadweight loss of monopoly, in pounds?",
        200,
        "Monopoly: 50 − 2Q = 10 gives Q = 20 at £30. Competition: Q = 40. DWL = ½ × 20 × 20 = £200.",
        "£",
      ),
    ],
  },
  {
    id: "game-theory",
    title: "Strategic choices",
    summary:
      "Find best responses, dominant strategies and Nash equilibria in payoff matrices, and see how repetition supports cooperation.",
    moduleId: "econ-strategy",
    sourceIds: ["econ-oligopoly"],
    beats: [
      beat(
        "Fix the rival, compare",
        "A payoff matrix lists every combination of choices and what each player earns. To find a best response, fix the rival's choice and compare your own payoffs. Against High, Low earns Alpha £14m instead of £10m by undercutting and taking customers. Against Low, Low earns £5m instead of £2m. Either way, Low pays Alpha more.",
        ["Price war", dilemma],
        ["Plug standards", standards],
      ),
      beat(
        "Dominant strategies",
        "A dominant strategy is best whatever the other player does. Low beats High for Alpha against both of Beta's choices, and the payoffs are symmetric, so Low is dominant for Beta too. A player with a dominant strategy needs no forecast of the rival at all. The plug game has none: the best plug depends on the other maker's choice.",
        ["Price war", dilemma],
        ["Plug standards", standards],
      ),
      beat(
        "Nash equilibrium",
        "Both firms choose Low and earn £5m each, £10m together, though both choosing High would earn £20m. Low/Low is a Nash equilibrium: neither firm gains by changing its own choice alone. This is a prisoner's dilemma, in which individually rational choices give an outcome both players rank below cooperation. It explains why cartels are fragile: each member gains by quietly undercutting.",
        ["Price war", dilemma],
        ["Plug standards", standards],
      ),
      beat(
        "Play it again",
        "Alpha is undercut once, earning £2m, then matches Low for £5m in each of the next four rounds: £22m, while Beta earns £34m. Against another tit-for-tat player Alpha earns £10m every round, £50m in all. When a game repeats, the threat of retaliation can sustain cooperation that a one-off dilemma cannot, provided the future matters enough and the last round is not known in advance.",
        ["Tit for tat v always Low", repeated(["tit_for_tat", "always_defect"], 5)],
        ["Tit for tat v tit for tat", repeated(["tit_for_tat", "tit_for_tat"], 5)],
        ["Grim trigger v always Low", repeated(["grim_trigger", "always_defect"], 5)],
      ),
    ],
    questions: [
      numeric(
        "Alpha and Beta each set a High or Low price. If Beta sets High, Alpha earns £10m by also setting High and £14m by setting Low. If Beta sets Low, Alpha earns £2m with High and £5m with Low. When Beta sets High, how many £m more does Alpha earn by choosing Low?",
        4,
        "£14m − £10m = £4m.",
        [
          "Fix Beta's choice and look only at that column.",
          "Compare Alpha's two payoffs in it.",
          "Subtract the smaller from the larger.",
        ],
        "£m",
      ),
      word(
        "In that game Alpha earns £10m or £14m against High (setting High or Low) and £2m or £5m against Low. Which price is a dominant strategy for Alpha? Answer High or Low.",
        "low",
        [],
        ["high"],
        "Low: it pays Alpha more whatever Beta does.",
        [
          "Find Alpha's best response to each of Beta's choices.",
          "A dominant strategy is the best response to every choice the rival makes.",
        ],
      ),
      numeric(
        "In that game both firms play their dominant strategy (Low) and each earns £5m; both choosing High would give them £20m together. What combined profit, in £m, do the firms earn at the Nash equilibrium?",
        10,
        "Low/Low gives £5m + £5m = £10m, half the £20m of High/High.",
        [
          "Find the cell where both play their dominant strategy.",
          "Read both payoffs in that cell.",
          "Add them.",
        ],
        "£m",
      ),
      numeric(
        "The firms play that game for five rounds. Alpha plays tit for tat (High in round one, then copies Beta's last move); Beta always sets Low. With payoffs of £2m for a lone High, £14m for a lone Low and £5m each for Low/Low, what is Alpha's total profit, in £m?",
        22,
        "Round one: Alpha High, Beta Low, so Alpha earns £2m. Rounds two to five: Low/Low, £5m each. Total 2 + 4 × 5 = £22m.",
        [
          "Write down both moves for each round.",
          "In round one only Alpha sets High.",
          "Add Alpha's payoff across all five rounds.",
        ],
        "£m",
      ),
      numeric(
        "Two phone makers choose a charging standard, A or B. If both pick A each earns 6; if both pick B each earns 4; if they pick differently each earns nothing. How many pure-strategy Nash equilibria does the game have?",
        2,
        "A/A and B/B are both equilibria: in each, switching alone drops a maker to nothing. The mismatched cells are not.",
        [
          "Check each of the four cells in turn.",
          "In each cell, ask whether either maker gains by switching alone.",
          "Count the cells where neither does.",
        ],
        "equilibria",
      ),
      word(
        "A game in which each player's dominant strategy leaves both worse off than cooperation is called the prisoner's what? One word.",
        "dilemma",
        [],
        [],
        "Dilemma: the prisoner's dilemma.",
        ["Picture two suspects questioned separately, each tempted to confess."],
      ),
    ],
    cards: [
      card(
        "Payoffs (row, column) are Up/Left (3, 3), Up/Right (0, 5), Down/Left (5, 0) and Down/Right (1, 1). What does the row player earn in the Nash equilibrium?",
        1,
        "Down and Right are dominant, so the equilibrium is Down/Right and the row player earns 1.",
        "",
      ),
      card(
        "Mutual cooperation pays 8 a round. A player who defects in round one against a grim-trigger rival earns 12 that round and 3 in every later round. What is the defector's total over 4 rounds?",
        21,
        "12 + 3 × 3 = 21, against 4 × 8 = 32 from cooperating throughout.",
        "",
      ),
    ],
  },
];
