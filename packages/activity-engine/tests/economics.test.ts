import { type EconomicsModel, EconomicsModelSchema } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  costsAnalysis,
  costsAt,
  type EconomicsMarket,
  economicsGivens,
  economicsMeasures,
  economicsMoney,
  economicsNumber,
  elasticityAnalysis,
  gameAnalysis,
  marginAnalysis,
  marketEquilibrium,
  marketOutcome,
  marketScale,
  monopolyAnalysis,
  ppfPosition,
  ppfSegments,
  repeatedPlay,
  tradeAnalysis,
} from "../src/index.js";

const coffee: EconomicsMarket = {
  kind: "market",
  good: "Coffee",
  demand: { intercept: 100, slope: 2 },
  supply: { intercept: -20, slope: 4 },
  view: "surplus",
};
/** Numerical integration, independent of the closed forms in the engine. */
function integrate(f: (x: number) => number, a: number, b: number, n = 20000) {
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h) * h;
  return s;
}

describe("economics markets", () => {
  it("finds the crossing where both plans agree", () => {
    const eq = marketEquilibrium(coffee);
    expect(eq).toEqual({ price: 20, quantity: 60 });
    expect(100 - 2 * eq.price).toBeCloseTo(-20 + 4 * eq.price, 9);
  });
  it("matches surplus areas to numerical integrals of the curves", () => {
    const o = marketOutcome(coffee);
    expect(o.consumerSurplus).toBeCloseTo(
      integrate((p) => 100 - 2 * p, 20, 50),
      3,
    );
    expect(o.producerSurplus).toBeCloseTo(
      integrate((p) => -20 + 4 * p, 5, 20),
      3,
    );
    expect(o.totalSurplus).toBe(1350);
    // A positive supply intercept makes producer surplus a trapezium.
    const flat = marketOutcome({ ...coffee, supply: { intercept: 10, slope: 3 } });
    const p = flat.equilibrium.price;
    expect(flat.producerSurplus).toBeCloseTo(
      integrate((x) => 10 + 3 * x, 0, p),
      3,
    );
  });
  it("splits a tax by relative slopes and loses exactly the triangle", () => {
    const o = marketOutcome({ ...coffee, view: "tax", tax: 6 });
    expect(o.tax).toMatchObject({ buyerPrice: 24, sellerPrice: 18, quantity: 52 });
    expect(o.tax!.revenue).toBe(312);
    expect(o.tax!.deadweight).toBe(24);
    expect(o.tax!.buyerShare + o.tax!.sellerShare).toBeCloseTo(6, 9);
    // Buyers' price and quantity demanded agree, and sellers' price and supply agree.
    expect(100 - 2 * o.tax!.buyerPrice).toBeCloseTo(o.tax!.quantity, 9);
    expect(-20 + 4 * o.tax!.sellerPrice).toBeCloseTo(o.tax!.quantity, 9);
    // Lost surplus equals the area between the curves over the lost units.
    const gap = (q: number) => (100 - q) / 2 - (q + 20) / 4;
    expect(o.tax!.deadweight).toBeCloseTo(integrate(gap, 52, 60), 4);
  });
  it("leaves a non-binding control alone and measures binding gaps", () => {
    const loose = marketOutcome({
      ...coffee,
      view: "control",
      control: { kind: "ceiling", price: 30 },
    });
    expect(loose.control).toMatchObject({ binding: false, shortage: 0, traded: 60 });
    const tight = marketOutcome({
      ...coffee,
      view: "control",
      control: { kind: "ceiling", price: 15 },
    });
    expect(tight.control).toMatchObject({ binding: true, shortage: 30, traded: 40 });
    const floor = marketOutcome({
      ...coffee,
      view: "control",
      control: { kind: "floor", price: 30 },
    });
    expect(floor.control).toMatchObject({ binding: true, excess: 60, traded: 40 });
  });
  it("treats an external cost like a corrective tax and prices a quota's lost surplus", () => {
    const o = marketOutcome({ ...coffee, view: "externality", externalCost: 9 });
    expect(o.externality).toMatchObject({ quantity: 48, overproduction: 12, deadweight: 54 });
    const q = marketOutcome({ ...coffee, quota: 40 });
    expect(q.quota).toMatchObject({ binding: true, traded: 40, deadweight: 150 });
  });
  it("shifts curves horizontally and keeps a shared scale wide enough for every case", () => {
    expect(marketEquilibrium({ ...coffee, demandShift: 30 })).toEqual({ price: 25, quantity: 80 });
    expect(marketEquilibrium({ ...coffee, demandShift: 30 }, false)).toEqual({
      price: 20,
      quantity: 60,
    });
    const models = [coffee, { ...coffee, demandShift: 30 }];
    const s = marketScale(models);
    expect(s.maxP).toBeGreaterThan(25);
    expect(s.maxQ).toBeGreaterThan(80);
  });
  it("rejects curves that never cross at a positive price", () => {
    expect(
      EconomicsModelSchema.safeParse({ ...coffee, supply: { intercept: 150, slope: 1 } }).success,
    ).toBe(false);
  });
});

describe("economics choice, elasticity and firms", () => {
  it("reads opportunity cost from frontier segments", () => {
    const m = {
      kind: "ppf" as const,
      goodX: "Food",
      goodY: "Machines",
      points: [
        { x: 0, y: 100 },
        { x: 20, y: 90 },
        { x: 40, y: 70 },
        { x: 60, y: 40 },
        { x: 80, y: 0 },
      ],
    };
    expect(ppfSegments(m).map((s) => s.costPerX)).toEqual([0.5, 1, 1.5, 2]);
    expect(ppfPosition(m, { x: 40, y: 70 })).toBe("on");
    expect(ppfPosition(m, { x: 40, y: 50 })).toBe("inside");
    expect(ppfPosition(m, { x: 50, y: 60 })).toBe("beyond");
  });
  it("assigns comparative advantage by lower opportunity cost, not by absolute output", () => {
    const t = tradeAnalysis({
      kind: "trade",
      goodX: "Cakes",
      goodY: "Loaves",
      producers: [
        { name: "Ana", maxX: 6, maxY: 12 },
        { name: "Ben", maxX: 4, maxY: 6 },
      ],
      terms: 1.75,
    });
    expect(t.producers.map((p) => p.costOfX)).toEqual([2, 1.5]);
    expect(t.xSpecialist).toBe("Ben");
    expect(t.ySpecialist).toBe("Ana");
    expect(t.termsGainful).toBe(true);
  });
  it("stops at the last unit whose benefit covers its cost", () => {
    const a = marginAnalysis({
      kind: "margin",
      activity: "Opening",
      unit: "Hour",
      benefits: [90, 70, 55, 40, 30],
      costs: [30, 35, 45, 50, 60],
    });
    expect(a).toMatchObject({ best: 3, bestTotal: 105 });
  });
  it("computes midpoint elasticity and revenue in both directions", () => {
    const e = elasticityAnalysis({
      kind: "elasticity",
      good: "Tickets",
      demand: { intercept: 200, slope: 15 },
      prices: [11, 9],
    });
    expect(e).toMatchObject({ q1: 35, q2: 65, elasticity: 3, kind: "elastic", revenueChange: 200 });
    const reverse = elasticityAnalysis({
      kind: "elasticity",
      good: "Tickets",
      demand: { intercept: 200, slope: 15 },
      prices: [9, 11],
    });
    expect(reverse.elasticity).toBe(3);
  });
  it("has marginal cost cross average total cost at its minimum", () => {
    const m = {
      kind: "costs" as const,
      fixedCost: 100,
      linearCost: 0,
      quadraticCost: 1,
      price: 30,
    };
    const a = costsAnalysis(m);
    expect(a.efficientScale).toBe(10);
    expect(costsAt(m, 10).marginal).toBe(costsAt(m, 10).averageTotal);
    for (const q of [9, 9.9, 10.1, 11]) expect(costsAt(m, q).averageTotal).toBeGreaterThan(20);
    expect(a.decision).toMatchObject({ quantity: 15, profit: 125 });
  });
  it("sets monopoly output where marginal revenue meets marginal cost", () => {
    const a = monopolyAnalysis({
      kind: "monopoly",
      demandIntercept: 100,
      demandSlope: 1,
      marginalCost: 20,
    });
    expect(a).toMatchObject({
      quantity: 40,
      price: 60,
      competitiveQuantity: 80,
      deadweight: 800,
      profit: 1600,
    });
    expect(a.marginalRevenue(40)).toBe(20);
  });
});

describe("economics strategy", () => {
  const dilemma = {
    kind: "game" as const,
    rowPlayer: "Alpha",
    columnPlayer: "Beta",
    rowStrategies: ["High", "Low"],
    columnStrategies: ["High", "Low"],
    payoffs: [
      [
        [10, 10],
        [2, 14],
      ],
      [
        [14, 2],
        [5, 5],
      ],
    ] as Array<Array<[number, number]>>,
  };
  it("finds the dominant strategies and the single Nash cell of a prisoner's dilemma", () => {
    const a = gameAnalysis(dilemma);
    expect(a.nash).toEqual([[1, 1]]);
    expect(a.rowDominant).toBe(1);
    expect(a.columnDominant).toBe(1);
  });
  it("finds two equilibria in a coordination game", () => {
    const a = gameAnalysis({
      ...dilemma,
      payoffs: [
        [
          [6, 6],
          [0, 0],
        ],
        [
          [0, 0],
          [4, 4],
        ],
      ],
    });
    expect(a.nash).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(a.rowDominant).toBeUndefined();
  });
  it("plays repeated strategies round by round", () => {
    const base = {
      kind: "repeated" as const,
      cooperate: "High",
      defect: "Low",
      reward: 10,
      temptation: 14,
      sucker: 2,
      punishment: 5,
      rounds: 5,
    };
    expect(repeatedPlay({ ...base, strategies: ["tit_for_tat", "always_defect"] }).totals).toEqual([
      22, 34,
    ]);
    expect(repeatedPlay({ ...base, strategies: ["tit_for_tat", "tit_for_tat"] }).totals).toEqual([
      50, 50,
    ]);
    expect(
      repeatedPlay({ ...base, strategies: ["grim_trigger", "always_cooperate"] }).totals,
    ).toEqual([50, 50]);
  });
});

describe("economics words", () => {
  it("formats money and numbers with true minus signs", () => {
    expect(economicsMoney(-36)).toBe("−£36");
    expect(economicsNumber(1350)).toBe("1,350");
    expect(economicsNumber(0.25)).toBe("0.25");
  });
  it("states givens without derived results", () => {
    const text = economicsGivens({ ...coffee, tax: 6 });
    expect(text).toContain("Qd = 100 − 2P");
    expect(text).toContain("£6 per unit");
    expect(text).not.toContain("24");
    const models: EconomicsModel[] = [coffee];
    for (const m of models) expect(economicsMeasures(m).length).toBeGreaterThan(0);
  });
});
