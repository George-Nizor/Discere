import { beat, card, choose, market, numeric, type TeachingLesson, word } from "./definition.js";

const D: [number, number] = [100, 2];
const S: [number, number] = [-20, 4];

export const welfareLessons: TeachingLesson[] = [
  {
    id: "consumer-and-producer-surplus",
    title: "Who gains from a sale",
    summary:
      "Measure consumer and producer surplus as areas on the diagram and see why equilibrium makes their total largest.",
    moduleId: "econ-welfare",
    sourceIds: ["econ-efficiency"],
    beats: [
      beat(
        "Value above the price",
        "Each point on the demand curve is the most some buyer would pay for that cup. A buyer who values a cup at £35 and pays £20 keeps £15 of value she did not hand over: her consumer surplus. Producer surplus is the seller's version, the price received minus the lowest price the seller would have accepted.",
        ["Coffee", market("Coffee", D, S, "surplus")],
        ["Bagels", market("Bagels", [90, 3], [-10, 2], "surplus")],
      ),
      beat(
        "The buyers' triangle",
        "Add up every buyer's surplus and you get the triangle between the demand curve and the price line. Its base is the 60 cups sold; its height runs from the £20 price up to the £50 at which demand vanishes. Area = ½ × 60 × 30 = £900. A lower price would widen the base and raise the height at once.",
        ["Coffee", market("Coffee", D, S, "surplus")],
        ["Bagels", market("Bagels", [90, 3], [-10, 2], "surplus")],
      ),
      beat(
        "The sellers' triangle",
        "The supply curve shows the lowest price at which each cup would be offered, which is its marginal cost. The triangle between the price line and the supply curve has base 60 and height £20 − £5 = £15, so producer surplus is ½ × 60 × 15 = £450. Total surplus, £1,350, is the whole gain from trade in this market.",
        ["Coffee", market("Coffee", D, S, "surplus")],
        ["Bagels", market("Bagels", [90, 3], [-10, 2], "surplus")],
      ),
      beat(
        "Lost trades",
        "Each cup from the 40th to the 60th was worth more to a buyer than it cost a seller, and none of them is traded under the cap. The lost value is the triangle with base 20 and height £15: £150 of deadweight loss. Free exchange at equilibrium makes total surplus as large as possible, because every cup worth more than its cost changes hands and no cup worth less does.",
        ["Cap of 40 cups", market("Coffee", D, S, "surplus", { quota: 40 })],
        ["No cap", market("Coffee", D, S, "surplus")],
      ),
    ],
    questions: [
      numeric(
        "A buyer would pay up to £35 for a cup of coffee and buys it at the market price of £20. How much consumer surplus does she gain, in pounds?",
        15,
        "£35 − £20 = £15.",
        [
          "Consumer surplus is the gap between willingness to pay and the price paid.",
          "Start from her maximum, not from the price.",
          "Subtract the price from her maximum.",
        ],
        "£",
      ),
      numeric(
        "Demand is Qd = 100 − 2P and supply is Qs = 4P − 20, so 60 cups sell at £20. Nobody buys at £50 or more. What is total consumer surplus, in pounds?",
        900,
        "½ × 60 × (50 − 20) = £900.",
        [
          "Consumer surplus is a triangle above the price and below the demand curve.",
          "Its height runs from the price up to the price at which demand reaches zero.",
          "Take one half × base × height, with the quantity sold as the base.",
        ],
        "£",
      ),
      numeric(
        "Supply is Qs = 4P − 20, so sellers offer nothing below £5. At the equilibrium price of £20 they sell 60 cups. What is total producer surplus, in pounds?",
        450,
        "½ × 60 × (20 − 5) = £450.",
        [
          "Producer surplus is a triangle below the price and above the supply curve.",
          "Its height runs from the lowest supply price up to the market price.",
          "Take one half × quantity × that height.",
        ],
        "£",
      ),
      numeric(
        "A rule caps coffee sales at 40 cups, below the free-market 60. For the 40th cup, buyers would pay £30 and sellers would accept £15. By how many pounds does total surplus fall?",
        150,
        "The lost cups form a triangle with base 60 − 40 = 20 and height 30 − 15 = 15: ½ × 20 × 15 = £150.",
        [
          "The lost units run from the 40th up to the 60th.",
          "On each lost unit the loss is the gap between what buyers would pay and what sellers would accept.",
          "Those gaps form a triangle, so take one half × base × height.",
        ],
        "£",
      ),
      numeric(
        "Demand is Qd = 80 − 2P and supply is Qs = 2P. What is consumer surplus at equilibrium, in pounds?",
        400,
        "80 − 2P = 2P gives P = £20 and Q = 40. Demand reaches zero at £40, so CS = ½ × 40 × (40 − 20) = £400.",
        [
          "Find the equilibrium price and quantity first.",
          "Find the price at which quantity demanded falls to zero.",
          "Take one half × quantity × (that price minus the equilibrium price).",
        ],
        "£",
      ),
      choose(
        "Which area on a supply and demand diagram is consumer surplus?",
        [
          "Below the demand curve and above the price, up to the quantity sold",
          "Above the supply curve and below the price, up to the quantity sold",
          "Below the supply curve, up to the quantity sold",
        ],
        0,
        "Buyers gain the gap between what they would pay and the price they do pay. The demand curve records what they would pay.",
        "Consumer surplus belongs to buyers, so look for the curve that records buyers' values.",
      ),
    ],
    cards: [
      card(
        "A seller would accept no less than £12 for a chair and sells it for £20. What producer surplus does that sale create, in pounds?",
        8,
        "£20 − £12 = £8.",
        "£",
      ),
      card(
        "Demand is Qd = 50 − P and supply is Qs = P − 10. What is producer surplus at equilibrium, in pounds?",
        200,
        "50 − P = P − 10 gives P = £30 and Q = 20. Sellers offer nothing below £10, so PS = ½ × 20 × (30 − 10) = £200.",
        "£",
      ),
    ],
  },
  {
    id: "taxes-and-deadweight-loss",
    title: "What a tax takes",
    summary:
      "Work out what a per-unit tax does to prices and revenue. Then measure the surplus it destroys and find who bears it.",
    moduleId: "econ-welfare",
    sourceIds: ["econ-efficiency", "econ-pricing"],
    beats: [
      beat(
        "The wedge",
        "A tax drives a wedge between the price buyers pay and the price sellers keep. Sellers supply according to what they keep, P − 6, so supply becomes 4(P − 6) − 20. Setting that equal to 100 − 2P gives 6P = 144: buyers pay £24 and sellers keep £18. The price rises by £4, not the full £6. Who bears a tax depends on the curves, whoever hands the money over.",
        ["£6 tax", market("Coffee", D, S, "tax", { tax: 6 })],
        ["£12 tax", market("Coffee", D, S, "tax", { tax: 12 })],
      ),
      beat(
        "Revenue",
        "Revenue is £6 × 52 = £312, the rectangle between the two prices across the cups still sold. It comes out of both surpluses: buyers pay £4 more on each of those 52 cups and sellers keep £2 less. The government's gain on those cups exactly matches what buyers and sellers lose on them.",
        ["£6 tax", market("Coffee", D, S, "tax", { tax: 6 })],
        ["£12 tax", market("Coffee", D, S, "tax", { tax: 12 })],
      ),
      beat(
        "The loss nobody collects",
        "The 8 cups no longer sold were each worth more to a buyer than they cost to make; the tax stopped those trades. The lost surplus is a triangle with height £6 and base 8: ½ × 6 × 8 = £24. With straight-line curves, doubling a tax doubles both the height and the base, so the deadweight loss quadruples. Compare the £12 case.",
        ["£6 tax", market("Coffee", D, S, "tax", { tax: 6 })],
        ["£12 tax", market("Coffee", D, S, "tax", { tax: 12 })],
      ),
      beat(
        "Who really pays",
        "Without the tax P = £25; with it buyers pay £27 and sellers keep £21. Here buyers bear £2 of the £6, against £4 in the coffee market. Demand is now more price-sensitive than supply, and the side that can more easily walk away bears less. Buyers' share is the supply slope over the sum of the slopes: 2 ÷ (4 + 2) of the tax.",
        ["Sensitive buyers", market("Gym passes", [120, 4], [-30, 2], "tax", { tax: 6 })],
        ["Coffee", market("Coffee", D, S, "tax", { tax: 6 })],
      ),
    ],
    questions: [
      numeric(
        "A £6 tax per cup is collected from coffee sellers. Demand is Qd = 100 − 2P, and supply in terms of the price sellers keep is Qs = 4P − 20. What price do buyers now pay, in pounds?",
        24,
        "Sellers keep P − 6, so 100 − 2P = 4(P − 6) − 20 gives 144 = 6P and P = £24.",
        [
          "Sellers keep the buyers' price minus the tax.",
          "Replace P in the supply equation by (P − 6) and set it equal to demand.",
          "Solve for the buyers' price.",
        ],
        "£",
      ),
      numeric(
        "A £6 per-cup tax leaves 52 cups sold each day. How much tax revenue does it raise per day, in pounds?",
        312,
        "£6 × 52 = £312.",
        [
          "Revenue is the tax per unit times the units taxed.",
          "Use the quantity after the tax, not before.",
          "Multiply the two.",
        ],
        "£",
      ),
      numeric(
        "A £6 per-cup tax cuts coffee sales from 60 to 52 cups a day. What is the deadweight loss, in pounds per day?",
        24,
        "½ × 6 × (60 − 52) = £24.",
        [
          "The loss is a triangle between the curves over the units no longer sold.",
          "Its height is the tax wedge and its base is the fall in quantity.",
          "Take one half × base × height.",
        ],
        "£",
      ),
      numeric(
        "Demand is Qd = 120 − 4P and supply is Qs = 2P − 30. A £6 tax is collected from sellers. By how many pounds does the price buyers pay rise?",
        2,
        "Without the tax 150 = 6P gives £25. With it, 120 − 4P = 2(P − 6) − 30 gives 162 = 6P, so £27: a rise of £2.",
        [
          "Find the equilibrium price without the tax.",
          "Find the buyers' price with the tax by replacing P with (P − 6) in supply.",
          "Subtract the first price from the second.",
        ],
        "£",
      ),
      numeric(
        "Demand is Qd = 90 − 3P and supply is Qs = 3P − 30. A £4 tax is collected from sellers. How many units are traded after the tax?",
        24,
        "90 − 3P = 3(P − 4) − 30 gives 132 = 6P, so buyers pay £22 and Q = 90 − 66 = 24.",
        [
          "Replace P in the supply equation by the price sellers keep.",
          "Solve for the buyers' price.",
          "Substitute that price into demand.",
        ],
        "units",
      ),
      numeric(
        "Without a tax 30 units are traded; a £4 per-unit tax cuts trade to 24 units. Both curves are straight lines. What is the deadweight loss, in pounds?",
        12,
        "½ × 4 × (30 − 24) = £12.",
        [
          "Identify the units that are no longer traded.",
          "The triangle's height is the tax per unit.",
          "Take one half × base × height.",
        ],
        "£",
      ),
    ],
    cards: [
      card(
        "A £2 per-unit tax cuts the quantity traded from 50 to 44, with straight-line curves. What is the deadweight loss, in pounds?",
        6,
        "½ × 2 × 6 = £6.",
        "£",
      ),
      card(
        "Demand for a medicine is perfectly inelastic. What percentage of a per-unit tax on it do buyers bear?",
        100,
        "Buyers take the same quantity at any price, so the whole tax passes to them: 100%.",
        "%",
      ),
    ],
  },
  {
    id: "controls-and-externalities",
    title: "Controls and spillovers",
    summary:
      "Predict shortages and surpluses from price controls, and correct an external cost with a Pigouvian tax.",
    moduleId: "econ-welfare",
    sourceIds: ["econ-controls", "econ-pollution", "econ-environment-tools"],
    beats: [
      beat(
        "A ceiling that binds",
        "A ceiling is a legal maximum price. Set at £12, below the £20 equilibrium, it binds: buyers want 76 cups and sellers offer 28, so 48 cups' worth of demand goes unmet. Only 28 cups change hands, fewer than the 60 at equilibrium, so the ceiling also destroys surplus. The shortage is rationed by queues, waiting lists or connections instead of price.",
        [
          "Ceiling £12",
          market("Coffee", D, S, "control", { control: { kind: "ceiling", price: 12 } }),
        ],
        [
          "Ceiling £30",
          market("Coffee", D, S, "control", { control: { kind: "ceiling", price: 30 } }),
        ],
      ),
      beat(
        "A floor that binds",
        "At a £30 floor sellers offer 100 cups and buyers take 40, leaving 60 unsold. Minimum prices for farm goods have produced exactly this, with governments buying and storing the excess. A floor below the equilibrium price, or a ceiling above it, changes nothing at all.",
        ["Floor £30", market("Coffee", D, S, "control", { control: { kind: "floor", price: 30 } })],
        ["Floor £15", market("Coffee", D, S, "control", { control: { kind: "floor", price: 15 } })],
      ),
      beat(
        "Costs borne by others",
        "Firms supply where the price covers their own marginal cost and ignore the £9 of damage each tonne does to people nearby. The market produces 60 tonnes. Counting the damage lifts the cost curve by £9: social supply 4(P − 9) − 20 meets demand at £26 and 48 tonnes. Each of the 12 extra tonnes costs society more than buyers value it.",
        ["£9 damage", market("Paint", D, S, "externality", { externalCost: 9 })],
        ["£3 damage", market("Paint", D, S, "externality", { externalCost: 3 })],
      ),
      beat(
        "A corrective tax",
        "On the 12 overproduced tonnes, the gap between social cost and buyers' value grows from nothing at 48 tonnes to £9 at 60: a triangle of ½ × 12 × 9 = £54. A tax of £9 a tonne, equal to the marginal external cost, makes firms face the full cost and removes the loss. Arthur Pigou argued for such taxes in The Economics of Welfare (1920), and they carry his name.",
        ["£9 damage", market("Paint", D, S, "externality", { externalCost: 9 })],
        ["£3 damage", market("Paint", D, S, "externality", { externalCost: 3 })],
      ),
    ],
    questions: [
      numeric(
        "Demand is Qd = 100 − 2P and supply is Qs = 4P − 20. A price ceiling of £12 is imposed. How large is the shortage, in cups?",
        48,
        "At £12, Qd = 100 − 24 = 76 and Qs = 48 − 20 = 28, so the shortage is 76 − 28 = 48 cups.",
        [
          "A ceiling below equilibrium is the price that actually applies.",
          "Find quantity demanded and quantity supplied at the ceiling.",
          "Subtract supply from demand.",
        ],
        "cups",
      ),
      numeric(
        "In the same market, Qd = 100 − 2P and Qs = 4P − 20, a price floor of £30 is set instead. How many cups are offered but not bought?",
        60,
        "At £30, Qs = 120 − 20 = 100 and Qd = 100 − 60 = 40: 60 cups go unsold.",
        [
          "A floor above equilibrium holds the price at the floor.",
          "Find both quantities at the floor.",
          "Subtract demand from supply.",
        ],
        "cups",
      ),
      numeric(
        "A paint market has demand Qd = 100 − 2P and supply Qs = 4P − 20, where supply reflects firms' own costs. Each tonne also causes £9 of pollution damage to people nearby. What quantity, in tonnes, maximises total surplus once that damage is counted?",
        48,
        "Social supply is 4(P − 9) − 20. Setting it equal to 100 − 2P gives 156 = 6P, so P = £26 and Q = 100 − 52 = 48 tonnes.",
        [
          "Add the external cost to the firms' own cost of each tonne.",
          "In the supply equation, that means replacing P by (P − 9).",
          "Set that social supply equal to demand and solve for quantity.",
        ],
        "tonnes",
      ),
      numeric(
        "In that paint market 60 tonnes are produced instead of the efficient 48, and each tonne does £9 of damage. What is the deadweight loss of the unregulated market, in pounds?",
        54,
        "½ × (60 − 48) × 9 = £54.",
        [
          "The loss comes only from the overproduced tonnes.",
          "On those tonnes the gap between social cost and value grows from zero to the external cost.",
          "Take one half × base × height.",
        ],
        "£",
      ),
      choose(
        "A price ceiling of £30 is set in a market whose equilibrium price is £20. What happens?",
        [
          "The ceiling does not bind, and nothing changes",
          "A shortage appears",
          "A surplus appears",
        ],
        0,
        "The market price of £20 is already below the £30 maximum, so the ceiling has no effect.",
        "Ask whether the legal maximum stops the market price being reached.",
      ),
      word(
        "A per-unit tax set equal to the marginal external cost of an activity is named after which economist? Surname only.",
        "Pigou",
        ["Pigouvian"],
        ["Coase", "Keynes"],
        "Pigou: Arthur Cecil Pigou, in The Economics of Welfare (1920).",
        ["He succeeded Alfred Marshall as professor of political economy at Cambridge."],
      ),
    ],
    cards: [
      card(
        "Demand is Qd = 50 − P and supply is Qs = P − 10. A rent ceiling of £25 applies. How large is the shortage, in units?",
        10,
        "At £25, 25 units are demanded and 15 supplied: a shortage of 10.",
        "units",
      ),
      card(
        "Each tonne of output causes £5 of damage borne by people outside the market. What per-tonne tax makes producers face the full cost, in pounds?",
        5,
        "A Pigouvian tax equal to the marginal external cost: £5 a tonne.",
        "£",
      ),
    ],
  },
];
