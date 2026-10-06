import type {
  CourseBundle,
  EconomicsDiagram,
  EconomicsModel,
  Question,
} from "../../../packages/contracts/src/index.js";

export type DraftQuestion = Omit<Question, "id" | "conceptIds" | "sourceIds">;
type Card = {
  front: string;
  back: string;
  answerAuthority: NonNullable<CourseBundle["flashcards"][number]["answerAuthority"]>;
};
export interface TeachingLesson {
  id: string;
  title: string;
  summary: string;
  moduleId: string;
  sourceIds: string[];
  beats: Array<{ title: string; text: string; diagram: EconomicsDiagram }>;
  questions: DraftQuestion[];
  cards: Card[];
}

export function numeric(
  prompt: string,
  value: number,
  workedAnswer: string,
  hints: [string, string, string],
  unit: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "numeric",
    difficulty: 1,
    hints,
    answerAuthority: {
      kind: "numeric",
      value,
      unit,
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer,
    },
  };
}
export function choose(
  prompt: string,
  labels: string[],
  correct: number,
  reason: string,
  hint: string,
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: [hint],
    choices: labels.map((label, i) => ({ id: String(i + 1), label })),
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [labels[correct]!],
      rejectedIdeas: [],
      exampleAnswer: reason,
    },
  };
}
/** A one-word or short-phrase written answer, matched as a whole word. */
export function word(
  prompt: string,
  accepted: string,
  alternatives: string[],
  rejected: string[],
  exampleAnswer: string,
  hints: string[],
): DraftQuestion {
  return {
    prompt,
    responseType: "short_text",
    difficulty: 1,
    hints,
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [accepted],
      ...(alternatives.length ? { acceptedAlternatives: alternatives } : {}),
      rejectedIdeas: rejected,
      exampleAnswer,
    },
  };
}
export function card(front: string, value: number, back: string, unit: string): Card {
  return {
    front,
    back,
    answerAuthority: {
      kind: "numeric",
      value,
      unit,
      absoluteTolerance: 1e-6,
      relativeTolerance: 0,
      workedAnswer: back,
    },
  };
}
export function beat(
  title: string,
  text: string,
  ...cases: Array<[string, EconomicsModel]>
): TeachingLesson["beats"][number] {
  const ids = ["first", "second", "third"];
  return {
    title,
    text,
    diagram: {
      type: "economics_explorer",
      cases: cases.map(([label, model], i) => ({ id: ids[i]!, label, model })),
      initialCaseId: "first",
    },
  };
}

/* ---------- Model builders: givens only ---------- */

export const ppf = (
  goodX: string,
  goodY: string,
  points: Array<[number, number]>,
  marker?: [number, number],
): EconomicsModel => ({
  kind: "ppf",
  goodX,
  goodY,
  points: points.map(([x, y]) => ({ x, y })),
  ...(marker ? { marker: { x: marker[0], y: marker[1] } } : {}),
});
export const trade = (
  goodX: string,
  goodY: string,
  a: [string, number, number],
  b: [string, number, number],
  terms?: number,
): EconomicsModel => ({
  kind: "trade",
  goodX,
  goodY,
  producers: [a, b].map(([name, maxX, maxY]) => ({ name, maxX, maxY })),
  ...(terms === undefined ? {} : { terms }),
});
export const margin = (
  activity: string,
  unit: string,
  benefits: number[],
  costs: number[],
): EconomicsModel => ({ kind: "margin", activity, unit, benefits, costs });
type MarketOptions = Partial<
  Pick<
    Extract<EconomicsModel, { kind: "market" }>,
    "demandShift" | "supplyShift" | "marker" | "tax" | "control" | "quota" | "externalCost"
  >
>;
export const market = (
  good: string,
  demand: [number, number],
  supply: [number, number],
  view: Extract<EconomicsModel, { kind: "market" }>["view"] = "equilibrium",
  options: MarketOptions = {},
): EconomicsModel => ({
  kind: "market",
  good,
  demand: { intercept: demand[0], slope: demand[1] },
  supply: { intercept: supply[0], slope: supply[1] },
  view,
  ...options,
});
export const elastic = (
  good: string,
  demand: [number, number],
  prices: [number, number],
): EconomicsModel => ({
  kind: "elasticity",
  good,
  demand: { intercept: demand[0], slope: demand[1] },
  prices,
});
export const costs = (
  fixedCost: number,
  linearCost: number,
  quadraticCost: number,
  price?: number,
): EconomicsModel => ({
  kind: "costs",
  fixedCost,
  linearCost,
  quadraticCost,
  ...(price === undefined ? {} : { price }),
});
export const monopoly = (
  demandIntercept: number,
  demandSlope: number,
  marginalCost: number,
): EconomicsModel => ({ kind: "monopoly", demandIntercept, demandSlope, marginalCost });
export const game = (
  players: [string, string],
  rows: string[],
  columns: string[],
  payoffs: Array<Array<[number, number]>>,
): EconomicsModel => ({
  kind: "game",
  rowPlayer: players[0],
  columnPlayer: players[1],
  rowStrategies: rows,
  columnStrategies: columns,
  payoffs,
});
export const repeated = (
  strategies: Extract<EconomicsModel, { kind: "repeated" }>["strategies"],
  rounds: number,
  payoffs: { reward: number; temptation: number; sucker: number; punishment: number } = {
    reward: 10,
    temptation: 14,
    sucker: 2,
    punishment: 5,
  },
  moves: [string, string] = ["High price", "Low price"],
): EconomicsModel => ({
  kind: "repeated",
  cooperate: moves[0],
  defect: moves[1],
  ...payoffs,
  strategies,
  rounds,
});

/* ---------- Sources ---------- */

const sections: Array<[string, string, string, string]> = [
  [
    "econ-what-is",
    "1.1",
    "What is economics, and why is it important?",
    "1-1-what-is-economics-and-why-is-it-important",
  ],
  [
    "econ-budget",
    "2.1",
    "How individuals make choices based on their budget constraint",
    "2-1-how-individuals-make-choices-based-on-their-budget-constraint",
  ],
  [
    "econ-ppf",
    "2.2",
    "The production possibilities frontier and social choices",
    "2-2-the-production-possibilities-frontier-and-social-choices",
  ],
  [
    "econ-markets",
    "3.1",
    "Demand, supply, and equilibrium in markets for goods and services",
    "3-1-demand-supply-and-equilibrium-in-markets-for-goods-and-services",
  ],
  [
    "econ-shifts",
    "3.2",
    "Shifts in demand and supply for goods and services",
    "3-2-shifts-in-demand-and-supply-for-goods-and-services",
  ],
  [
    "econ-four-step",
    "3.3",
    "Changes in equilibrium price and quantity: the four-step process",
    "3-3-changes-in-equilibrium-price-and-quantity-the-four-step-process",
  ],
  [
    "econ-controls",
    "3.4",
    "Price ceilings and price floors",
    "3-4-price-ceilings-and-price-floors",
  ],
  ["econ-efficiency", "3.5", "Demand, supply, and efficiency", "3-5-demand-supply-and-efficiency"],
  [
    "econ-elasticity",
    "5.1",
    "Price elasticity of demand and price elasticity of supply",
    "5-1-price-elasticity-of-demand-and-price-elasticity-of-supply",
  ],
  [
    "econ-polar",
    "5.2",
    "Polar cases of elasticity and constant elasticity",
    "5-2-polar-cases-of-elasticity-and-constant-elasticity",
  ],
  ["econ-pricing", "5.3", "Elasticity and pricing", "5-3-elasticity-and-pricing"],
  ["econ-consumption", "6.1", "Consumption choices", "6-1-consumption-choices"],
  ["econ-costs", "7.3", "Costs in the short run", "7-3-costs-in-the-short-run"],
  [
    "econ-competition",
    "8.2",
    "How perfectly competitive firms make output decisions",
    "8-2-how-perfectly-competitive-firms-make-output-decisions",
  ],
  [
    "econ-monopoly",
    "9.2",
    "How a profit-maximizing monopoly chooses output and price",
    "9-2-how-a-profit-maximizing-monopoly-chooses-output-and-price",
  ],
  ["econ-oligopoly", "10.2", "Oligopoly", "10-2-oligopoly"],
  ["econ-pollution", "12.1", "The economics of pollution", "12-1-the-economics-of-pollution"],
  [
    "econ-environment-tools",
    "12.3",
    "Market-oriented environmental tools",
    "12-3-market-oriented-environmental-tools",
  ],
  [
    "econ-trade",
    "19.1",
    "Absolute and comparative advantage",
    "19-1-absolute-and-comparative-advantage",
  ],
];
export const sources: CourseBundle["sources"] = sections.map(([id, section, title, slug]) => ({
  id,
  title,
  publisher: "OpenStax, Rice University",
  url: "https://openstax.org/books/principles-microeconomics-3e/pages/" + slug,
  section: section + ", " + title,
  edition: "Principles of Microeconomics, third edition (2022)",
  accessedAt: "2026-10-06",
  reuse: "reference_only",
  licence: "CC BY-NC-SA 4.0 (current web edition); reference only",
  licenceUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  attribution:
    "Steven A. Greenlaw, David Shapiro and Daniel MacDonald, OpenStax, Principles of Microeconomics 3e, " +
    section +
    ".",
  notes:
    "Standard definitions and relationships checked against this section. The web edition is CC BY-NC-SA 4.0 and its footer asks that the book not be ingested into large language models, so it is a fact-checking reference only. Discere prose, numbers, problems and drawings are original; no publisher text, exercises or figures are redistributed.",
}));
