import {
  beat,
  card,
  choose,
  elastic,
  market,
  numeric,
  type TeachingLesson,
  word,
} from "./definition.js";

const D: [number, number] = [100, 2];
const S: [number, number] = [-20, 4];

export const marketLessons: TeachingLesson[] = [
  {
    id: "demand-and-supply",
    title: "Demand meets supply",
    summary:
      "Read linear demand and supply equations and solve them for the equilibrium price and quantity.",
    moduleId: "econ-markets",
    sourceIds: ["econ-markets"],
    beats: [
      beat(
        "Read the demand curve",
        "A demand curve records how much buyers plan to buy at each price, other things held constant. With Qd = 100 − 2P, a price of £15 gives 100 − 30 = 70 cups. Each £1 rise cuts planned purchases by 2 cups: price and quantity demanded move in opposite directions, which is the law of demand. At £50 nobody buys.",
        ["Price £15", market("Coffee", D, S, "equilibrium", { marker: 15 })],
        ["Price £30", market("Coffee", D, S, "equilibrium", { marker: 30 })],
      ),
      beat(
        "Where plans agree",
        "Equilibrium is the price at which quantity demanded equals quantity supplied: 100 − 2P = 4P − 20, so 120 = 6P and P = £20. Supply slopes upward because a higher price covers the higher cost of extra output; here nothing is offered below £5. At £20 every cup offered finds a buyer, and nobody willing to pay £20 goes without.",
        ["Coffee", market("Coffee", D, S)],
        ["Bagels", market("Bagels", [90, 3], [-10, 2])],
      ),
      beat(
        "The quantity traded",
        "Substituting £20 gives 100 − 40 = 60 cups demanded and 80 − 20 = 60 supplied; checking both equations catches slips. The quantities are flows, cups per day, so the equilibrium is a rate of trade that lasts as long as the conditions behind both curves stay put.",
        ["Coffee", market("Coffee", D, S)],
        ["Bagels", market("Bagels", [90, 3], [-10, 2])],
      ),
      beat(
        "Away from equilibrium",
        "At £25 sellers offer 80 cups but buyers want only 50, a surplus of 30. Unsold stock pushes sellers to cut prices towards £20. At £15 the reverse happens: 70 cups wanted, 40 offered, a shortage of 30 that lets sellers raise prices. Excess supply and excess demand are the forces that pull a market back to equilibrium.",
        ["Price £25", market("Coffee", D, S, "equilibrium", { marker: 25 })],
        ["Price £15", market("Coffee", D, S, "equilibrium", { marker: 15 })],
      ),
    ],
    questions: [
      numeric(
        "Demand for coffee is Qd = 100 − 2P, with P in pounds and Q in cups per day. How many cups are demanded at a price of £15?",
        70,
        "Qd = 100 − 2 × 15 = 70 cups.",
        [
          "Substitute the price for P.",
          "Multiply the price by the slope first.",
          "Subtract that product from the intercept.",
        ],
        "cups",
      ),
      numeric(
        "Coffee demand is Qd = 100 − 2P and supply is Qs = 4P − 20. At what price, in pounds, do buyers' and sellers' plans agree?",
        20,
        "100 − 2P = 4P − 20 gives 120 = 6P, so P = £20.",
        [
          "Set quantity demanded equal to quantity supplied.",
          "Collect the P terms on one side and the numbers on the other.",
          "Divide the gap between the intercepts by the sum of the slopes.",
        ],
        "£",
      ),
      numeric(
        "With Qd = 100 − 2P and Qs = 4P − 20, the equilibrium price is £20. How many cups are traded per day?",
        60,
        "Qd = 100 − 2 × 20 = 60 and Qs = 4 × 20 − 20 = 60 cups.",
        [
          "Substitute the price into either equation.",
          "Try the demand equation first.",
          "Check that the supply equation gives the same number.",
        ],
        "cups",
      ),
      numeric(
        "With Qd = 100 − 2P and Qs = 4P − 20, the price is stuck at £25. How many cups are offered but not bought each day?",
        30,
        "Qs = 100 − 20 = 80 and Qd = 100 − 50 = 50, so 80 − 50 = 30 cups go unsold.",
        [
          "Find quantity demanded at that price.",
          "Find quantity supplied at that price.",
          "Subtract demand from supply.",
        ],
        "cups",
      ),
      numeric(
        "Demand is Qd = 80 − 4P and supply is Qs = 8 + 2P. Find the equilibrium price in pounds.",
        12,
        "80 − 4P = 8 + 2P gives 72 = 6P, so P = £12 and Q = 32.",
        [
          "Set the two quantities equal.",
          "Move the P terms together and the constants together.",
          "Divide the constant difference by the combined slope.",
        ],
        "£",
      ),
      numeric(
        "Demand is Qd = 150 − 5P and supply is Qs = 30 + 10P. Find the equilibrium quantity.",
        110,
        "150 − 5P = 30 + 10P gives P = £8, so Q = 150 − 40 = 110.",
        [
          "Find the equilibrium price first.",
          "Set the equations equal and solve for P.",
          "Substitute that price back into either equation.",
        ],
        "units",
      ),
    ],
    cards: [
      card(
        "Demand is Qd = 60 − 3P and supply is Qs = 2P − 10. What is the equilibrium price in pounds?",
        14,
        "60 − 3P = 2P − 10 gives 70 = 5P, so P = £14.",
        "£",
      ),
      card(
        "Demand is Qd = 90 − P and supply is Qs = 2P. At a price of £25, how large is the shortage?",
        15,
        "65 units are demanded and 50 supplied: a shortage of 15.",
        "units",
      ),
    ],
  },
  {
    id: "shifts-and-movements",
    title: "When the curves move",
    summary:
      "Separate movements along a curve from shifts of it, and solve for the new equilibrium after a shift.",
    moduleId: "econ-markets",
    sourceIds: ["econ-shifts", "econ-four-step"],
    beats: [
      beat(
        "Along or across",
        "A demand curve already answers 'how much at each price?', so a change in the good's own price is a movement along it: quantity demanded falls. The curve itself shifts only when something else changes, such as income, tastes, expectations, the number of buyers or the price of a related good. 'Demand' names the whole curve; 'quantity demanded' is one point on it.",
        ["Price rises to £25", market("Coffee", D, S, "equilibrium", { marker: 25 })],
        ["Buyers leave", market("Coffee", D, S, "equilibrium", { demandShift: -30 })],
      ),
      beat(
        "Incomes rise",
        "With demand shifted right, 130 − 2P = 4P − 20 gives P = £25 and Q = 80: price and quantity both rise. Coffee is behaving as a normal good, one whose demand rises with income. For an inferior good, such as the cheapest own-brand instant coffee, a rise in income shifts demand left instead.",
        ["Incomes rise", market("Coffee", D, S, "equilibrium", { demandShift: 30 })],
        ["Incomes fall", market("Coffee", D, S, "equilibrium", { demandShift: -30 })],
      ),
      beat(
        "A frost hits supply",
        "100 − 2P = 4P − 44 gives P = £24, and Q = 100 − 48 = 52 cups. A fall in supply raises the price and lowers the quantity. Dearer inputs and bad harvests shift supply left; better technology and cheaper inputs shift it right, lowering the price and raising the quantity.",
        ["Frost", market("Coffee", D, S, "equilibrium", { supplyShift: -24 })],
        ["Bumper harvest", market("Coffee", D, S, "equilibrium", { supplyShift: 24 })],
      ),
      beat(
        "Two shifts at once",
        "130 − 2P = 4P + 10 gives P = £20 again, while quantity rises from 60 to 90. When both curves shift right, quantity must rise but the price can go either way, depending on which shift is larger: with supply up by 60 instead, the price falls to £15. Work through each shift separately, then combine them.",
        ["Both up 30", market("Coffee", D, S, "equilibrium", { demandShift: 30, supplyShift: 30 })],
        [
          "Supply up 60",
          market("Coffee", D, S, "equilibrium", { demandShift: 30, supplyShift: 60 }),
        ],
      ),
    ],
    questions: [
      choose(
        "The price of coffee rises while nothing else changes. What happens on the demand diagram for coffee?",
        [
          "A movement along the demand curve",
          "A leftward shift of the demand curve",
          "A rightward shift of the demand curve",
        ],
        0,
        "The good's own price is on the axis, so a change in it moves buyers along the curve; quantity demanded falls.",
        "Ask which variable is measured on the axis of the curve itself.",
      ),
      numeric(
        "Incomes rise and coffee buyers want 30 more cups at every price, so demand becomes Qd = 130 − 2P. Supply stays Qs = 4P − 20. What is the new equilibrium price, in pounds?",
        25,
        "130 − 2P = 4P − 20 gives 150 = 6P, so P = £25, up from £20.",
        [
          "Set the new demand equal to the unchanged supply.",
          "Collect the P terms on one side.",
          "Divide the constant gap by the sum of the slopes.",
        ],
        "£",
      ),
      numeric(
        "A frost destroys coffee crops and sellers offer 24 fewer cups at every price: Qs = 4P − 44. Demand stays Qd = 100 − 2P. What is the new equilibrium quantity, in cups?",
        52,
        "100 − 2P = 4P − 44 gives P = £24, so Q = 100 − 48 = 52 cups.",
        [
          "Set the original demand equal to the new supply.",
          "Solve for the price first.",
          "Substitute that price into the demand equation.",
        ],
        "cups",
      ),
      numeric(
        "Demand and supply each rise by 30 cups at every price: Qd = 130 − 2P and Qs = 4P + 10. By how many pounds does the equilibrium price change from its original £20?",
        0,
        "130 − 2P = 4P + 10 gives P = £20, so the price is unchanged while quantity rises to 90.",
        [
          "Find the new equilibrium price.",
          "Set 130 − 2P equal to 4P + 10 and solve.",
          "Subtract the old price from the new one.",
        ],
        "£",
      ),
      word(
        "Tea and coffee are substitutes. If the price of tea rises, which way does the demand curve for coffee shift? One word.",
        "right",
        ["rightward", "rightwards", "outward"],
        ["left", "leftward"],
        "Right: some tea drinkers switch to coffee, so more coffee is wanted at every coffee price.",
        [
          "Some tea drinkers switch drinks.",
          "Ask whether more or less coffee is wanted at each coffee price.",
        ],
      ),
      numeric(
        "Demand is Qd = 120 − 3P and supply is Qs = 2P. A new factory adds 20 units of supply at every price. What is the new equilibrium price, in pounds?",
        20,
        "Supply becomes Qs = 20 + 2P; 120 − 3P = 20 + 2P gives 100 = 5P, so P = £20, down from £24.",
        ["Write the new supply equation.", "Set it equal to demand.", "Solve for P."],
        "£",
      ),
    ],
    cards: [
      card(
        "Demand is Qd = 40 − P and supply is Qs = P. If demand rises by 10 units at every price, what is the new equilibrium quantity?",
        25,
        "50 − P = P gives P = £25 and Q = 25.",
        "units",
      ),
      card(
        "Demand is Qd = 200 − 4P and supply is Qs = 6P. Supply falls by 30 units at every price. What is the new equilibrium price, in pounds?",
        23,
        "200 − 4P = 6P − 30 gives 230 = 10P, so P = £23.",
        "£",
      ),
    ],
  },
  {
    id: "price-elasticity",
    title: "How strongly buyers respond",
    summary:
      "Measure price elasticity of demand with the midpoint method and predict what a price change does to revenue.",
    moduleId: "econ-markets",
    sourceIds: ["econ-elasticity", "econ-polar", "econ-pricing"],
    beats: [
      beat(
        "Measure the response",
        "Elasticity is the percentage change in quantity demanded divided by the percentage change in price. The midpoint method uses averages as the base, so the answer is the same whichever way the price moves. Quantity changes by 30 on an average of 50, or 60%; price changes by £2 on an average of £10, or 20%. Elasticity is 60% ÷ 20% = 3: demand is elastic, responding more than in proportion.",
        ["Concert tickets", elastic("Tickets", [200, 15], [11, 9])],
        ["Bus passes", elastic("Bus passes", [125, 5], [6, 4])],
      ),
      beat(
        "Revenue follows elasticity",
        "Revenue rises from 11 × 35 = £385 to 9 × 65 = £585, a gain of £200. With elastic demand the percentage gain in tickets outweighs the percentage cut in price, so a price cut raises revenue. The rectangles show it: the new one loses a thin strip £2 high and gains a wide strip of 30 extra tickets.",
        ["Concert tickets", elastic("Tickets", [200, 15], [11, 9])],
        ["Bus passes", elastic("Bus passes", [125, 5], [6, 4])],
      ),
      beat(
        "Inelastic demand",
        "Quantity changes by 10 on an average of 100, or 10%; price changes by £2 on an average of £5, or 40%. Elasticity is 10% ÷ 40% = 0.25, well below 1, so demand is inelastic: commuters with no alternative keep buying. Revenue falls from £570 to £420, because the price cut is proportionally far larger than the extra sales.",
        ["Bus passes", elastic("Bus passes", [125, 5], [6, 4])],
        ["Concert tickets", elastic("Tickets", [200, 15], [11, 9])],
      ),
      beat(
        "Unit elastic",
        "Visits rise from 90 to 110 and revenue is £990 at both prices. Quantity changes by 20% on its average and price by 20% on its average, so elasticity is exactly 1. Along a straight demand line, elasticity changes: demand is elastic at high prices and inelastic at low ones, and revenue is largest at the unit-elastic midpoint.",
        ["Near the middle", elastic("Museum entry", [200, 10], [11, 9])],
        ["Higher prices", elastic("Museum entry", [200, 10], [16, 14])],
      ),
    ],
    questions: [
      numeric(
        "When the price of a concert ticket falls from £11 to £9, the number sold rises from 35 to 65. Using the midpoint method, what is the absolute value of the price elasticity of demand?",
        3,
        "%ΔQ = 30 ÷ 50 = 60%; %ΔP = 2 ÷ 10 = 20%; elasticity = 60 ÷ 20 = 3.",
        [
          "Divide the change in quantity by the average of the two quantities.",
          "Divide the change in price by the average of the two prices.",
          "Divide the first percentage by the second and drop the sign.",
        ],
        "",
      ),
      numeric(
        "Ticket sales rise from 35 at £11 to 65 at £9. By how many pounds does total revenue change?",
        200,
        "Revenue goes from 11 × 35 = £385 to 9 × 65 = £585, a rise of £200.",
        [
          "Revenue is price times quantity.",
          "Compute revenue at each price.",
          "Subtract the old revenue from the new.",
        ],
        "£",
      ),
      numeric(
        "The price of a bus pass falls from £6 to £4 and passes sold rise from 95 to 105. What is the absolute midpoint elasticity of demand?",
        0.25,
        "%ΔQ = 10 ÷ 100 = 10%; %ΔP = 2 ÷ 5 = 40%; elasticity = 10 ÷ 40 = 0.25.",
        [
          "Use the average quantity as the base for the quantity change.",
          "Use the average price as the base for the price change.",
          "Divide the quantity percentage by the price percentage.",
        ],
        "",
      ),
      numeric(
        "Museum demand is Qd = 200 − 10P. The entry price falls from £11 to £9. By how many pounds does total revenue change?",
        0,
        "Visits rise from 90 to 110; revenue is 11 × 90 = £990 before and 9 × 110 = £990 after, so it does not change.",
        [
          "Find the quantity at each price.",
          "Multiply each price by its quantity.",
          "Subtract the old revenue from the new.",
        ],
        "£",
      ),
      choose(
        "Demand for a firm's product is inelastic. The firm raises its price. What happens to its total revenue?",
        ["It rises", "It falls", "It stays the same"],
        0,
        "With inelastic demand, quantity falls by a smaller percentage than price rises, so price times quantity goes up.",
        "Compare the percentage change in price with the percentage change in quantity.",
      ),
      numeric(
        "The price of a phone case rises from £8 to £12 and quantity demanded falls from 110 to 90. Find the absolute midpoint elasticity of demand.",
        0.5,
        "%ΔQ = 20 ÷ 100 = 20%; %ΔP = 4 ÷ 10 = 40%; elasticity = 20 ÷ 40 = 0.5.",
        [
          "Average the two quantities and the two prices.",
          "Express each change as a share of its average.",
          "Divide the quantity share by the price share.",
        ],
        "",
      ),
    ],
    cards: [
      card(
        "The price of a snack falls from £5 to £3 and quantity demanded rises from 20 to 60. What is the absolute midpoint elasticity of demand?",
        2,
        "Quantity: 40 ÷ 40 = 100%. Price: 2 ÷ 4 = 50%. Elasticity = 100% ÷ 50% = 2.",
        "",
      ),
      card(
        "Demand has an absolute price elasticity of 2. The price rises by 5%. By roughly what percentage does quantity demanded fall?",
        10,
        "%ΔQ ≈ elasticity × %ΔP = 2 × 5% = 10%.",
        "%",
      ),
    ],
  },
];
