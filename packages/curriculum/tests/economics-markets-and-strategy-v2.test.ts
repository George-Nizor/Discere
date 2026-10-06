import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Economics: Markets and Strategy, v2 lessons. Every numeric key is recomputed here from the
 * arithmetic the item describes (equations solved, areas taken, rounds played), not read back from
 * the authority it is checking.
 */
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as CourseBundle;
const published = read("../../../content/economics-markets-and-strategy/bundle.json");
const bundle = published.lessons.every((lesson) => lesson.intro)
  ? published
  : read("../../../content/economics-markets-and-strategy/.authoring/candidate.json");

const byId = (id: string): Question => {
  const found = bundle.questions.find((item) => item.id === id);
  if (!found) throw new Error(`no question ${id}`);
  return found;
};
const key = (id: string): number => {
  const authority = byId(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const marked = (id: string): string[] => {
  const item = byId(id);
  if (item.answerAuthority.kind !== "text") throw new Error(`${id} is not a choice`);
  const authority = item.answerAuthority;
  return item.choices!.filter((c) => assessTextAnswer(c.label, authority).correct).map((c) => c.label);
};

/** Equilibrium of Qd = a − bP and Qs = c + d(P − tax). */
const equilibrium = (a: number, b: number, c: number, d: number, tax = 0) => {
  const price = (a - c + d * tax) / (b + d);
  return { price, quantity: a - b * price };
};
/** Midpoint elasticity, absolute value. */
const elasticity = (q1: number, q2: number, p1: number, p2: number) =>
  Math.abs((q2 - q1) / ((q1 + q2) / 2) / ((p2 - p1) / ((p1 + p2) / 2)));
const takeWhile = (xs: number[], keep: (x: number, i: number) => boolean) => {
  const out: number[] = [];
  for (let i = 0; i < xs.length && keep(xs[i]!, i); i++) out.push(xs[i]!);
  return out;
};
const tri = (base: number, height: number) => (base * height) / 2;
const near = (id: string, expected: number) => expect(key(id)).toBeCloseTo(expected, 9);

describe("Economics v2: the course is converted", () => {
  it("has twelve v2 lessons, each with three skill-check items", () => {
    expect(bundle.lessons).toHaveLength(12);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro, lesson.id).toBeDefined();
      expect(lesson.recap, lesson.id).toBeDefined();
      expect(lesson.questionIds, lesson.id).toHaveLength(3);
      expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length, lesson.id).toBeLessThanOrEqual(7);
      expect(lesson.steps.some((s) => s.kind === "transfer"), lesson.id).toBe(true);
    }
  });
});

describe("Lesson 1: opportunity cost and the frontier", () => {
  const I = "econ-opportunity-cost-and-the-frontier-";
  it("recomputes the keys", () => {
    near(I + "hook", 10 / 5);
    near(I + "1", 60 / 20);
    near(I + "3", 70 - 40);
    near(I + "unit-cost", (70 - 40) / (60 - 40));
    near(I + "4", (40 - 0) / (80 - 60));
    near(I + "5", 3 / 1.5);
    near(I + "check-1", 100 / 25);
    near(I + "check-2", (90 - 45) / (25 - 10));
    near(I + "check-3", 25 / 20 / (10 / 20));
    // 30 chairs use half of a 60-chair week, leaving time for 10 of 20 tables; 5 is inside.
    expect(5 < 20 * (1 - 30 / 60)).toBe(true);
    expect(marked(I + "2")).toEqual(["Inside the frontier"]);
  });
});

describe("Lesson 2: comparative advantage", () => {
  const I = "econ-comparative-advantage-";
  it("recomputes the keys", () => {
    near(I + "1", 12 / 6);
    expect(6 / 4 < 12 / 6).toBe(true); // Ben's cake is cheaper than Ana's
    near(I + "received", 2 * 1.75);
    near(I + "3", 2 * 1.75 - 3);
    near(I + "5", 4 / 1);
    near(I + "4", Math.abs(8 / 4 - 4 / 2));
    near(I + "check-2", 24 / 6 - 6 / 6);
    near(I + "check-3", 8 * 2 - 8 * 1.75);
    // Dev's cake costs 4/4 loaves against Cleo's 10/2.
    expect(4 / 4 < 10 / 2).toBe(true);
    expect(marked(I + "dev-check")).toEqual(["Dev"]);
    expect(1.5 < 1.8 && 1.8 < 2).toBe(true);
    expect(marked(I + "price-check")).toEqual(["1.8"]);
    // Mira's page costs 8/4 reports and Tom's 4/1: Mira codes.
    expect(8 / 4 < 4 / 1).toBe(true);
    expect(marked(I + "6")).toEqual(["Mira codes pages and Tom writes reports"]);
    expect(0.5 < 2 / 3).toBe(true); // Ana's loaf costs fewer cakes than Ben's
  });
});

describe("Lesson 3: thinking at the margin", () => {
  const I = "econ-thinking-at-the-margin-";
  const benefits = [90, 70, 55, 40, 30];
  const costs = [30, 35, 45, 50, 60];
  it("recomputes the keys", () => {
    expect(takeWhile([12, 9, 6, 5, 3], (v) => v >= 4)).toHaveLength(key(I + "hook"));
    expect(takeWhile(benefits, (b, i) => b >= costs[i]!)).toHaveLength(key(I + "1"));
    near(I + "hour-2-net", 70 - 35);
    near(I + "2", 90 - 30 + (70 - 35) + (55 - 45));
    const dearer = costs.map((c) => c + 20);
    expect(takeWhile(benefits, (b, i) => b >= dearer[i]!)).toHaveLength(key(I + "3"));
    near(I + "4", 40 - 50);
    expect(takeWhile([50, 40, 30, 20, 10], (v) => v > 25)).toHaveLength(key(I + "5"));
    const batches = [120, 90, 60, 30].filter((b) => b >= 50);
    near(I + "check-3", batches.reduce((sum, b) => sum + b - 50, 0));
    expect(215 - 160).toBe(55);
    expect(marked(I + "marginal-check")).toEqual(["£55"]);
  });
});

describe("Lesson 4: demand and supply", () => {
  const I = "econ-demand-and-supply-";
  it("recomputes the keys", () => {
    near(I + "hook", 80 - 2 * (13 - 10));
    near(I + "1", 100 - 2 * 15);
    near(I + "2", equilibrium(100, 2, -20, 4).price);
    near(I + "3", equilibrium(100, 2, -20, 4).quantity);
    near(I + "4", -20 + 4 * 25 - (100 - 2 * 25));
    near(I + "5", equilibrium(80, 4, 8, 2).price);
    near(I + "6", equilibrium(150, 5, 30, 10).quantity);
    near(I + "check-2", equilibrium(120, 4, 12, 2).price);
    near(I + "check-3", 80 - 4 * 8 - (8 + 2 * 8));
  });
});

describe("Lesson 5: shifts and movements", () => {
  const I = "econ-shifts-and-movements-";
  it("recomputes the keys", () => {
    near(I + "hook", 112 - 2 * 20 - (-20 + 4 * 20));
    near(I + "2", equilibrium(130, 2, -20, 4).price);
    near(I + "new-quantity", equilibrium(130, 2, -20, 4).quantity);
    near(I + "3", equilibrium(100, 2, -44, 4).quantity);
    near(I + "4", equilibrium(130, 2, 10, 4).price - equilibrium(100, 2, -20, 4).price);
    near(I + "6", equilibrium(120, 3, 20, 2).price);
    near(I + "check-2", equilibrium(118, 2, -20, 4).price);
    expect(equilibrium(70, 2, -20, 4)).toEqual({ price: 15, quantity: 40 });
  });
});

describe("Lesson 6: price elasticity", () => {
  const I = "econ-price-elasticity-";
  it("recomputes the keys", () => {
    near(I + "hook", 4 * 90 - 5 * 60);
    near(I + "quantity-percent", (10 / 100) * 100);
    near(I + "3", elasticity(95, 105, 6, 4));
    near(I + "1", elasticity(35, 65, 11, 9));
    near(I + "2", 9 * 65 - 11 * 35);
    near(I + "4", 9 * (200 - 10 * 9) - 11 * (200 - 10 * 11));
    near(I + "6", elasticity(110, 90, 8, 12));
    near(I + "check-3", 12 * 95 - 10 * 100);
    expect(elasticity(130, 70, 4, 6)).toBeCloseTo(1.5, 9);
    // 30% on 10% is 3, above 1: elastic. At 0.4 a price cut lowers revenue.
    expect(30 / 10 > 1).toBe(true);
    expect(marked(I + "elastic-check")[0]).toMatch(/^Elastic/);
    expect(marked(I + "check-2")).toEqual(["It falls."]);
    expect(marked(I + "5")).toEqual(["It rises"]);
  });
});

describe("Lesson 7: consumer and producer surplus", () => {
  const I = "econ-consumer-and-producer-surplus-";
  it("recomputes the keys", () => {
    near(I + "hook", [30, 25, 20].filter((v) => v >= 22).reduce((s, v) => s + v - 22, 0));
    near(I + "1", 35 - 20);
    const coffee = equilibrium(100, 2, -20, 4);
    near(I + "2", tri(coffee.quantity, 100 / 2 - coffee.price));
    near(I + "3", tri(coffee.quantity, coffee.price - 20 / 4));
    near(I + "4", tri(60 - 40, (100 - 40) / 2 - (40 + 20) / 4));
    const m5 = equilibrium(80, 2, 0, 2);
    near(I + "5", tri(m5.quantity, 80 / 2 - m5.price));
    const c1 = equilibrium(100, 5, 0, 5);
    near(I + "check-1", tri(c1.quantity, 100 / 5 - c1.price));
    const c2 = equilibrium(80, 4, -16, 4);
    near(I + "check-2", tri(c2.quantity, c2.price - 16 / 4));
    near(I + "check-3", tri(c1.quantity - 40, (100 - 40) / 5 - 40 / 5));
    const bagels = equilibrium(90, 3, -10, 2);
    expect(tri(bagels.quantity, 90 / 3 - bagels.price)).toBe(150);
    expect(18 < 22).toBe(true);
    expect(marked(I + "total-check")[0]).toMatch(/^No/);
  });
});

describe("Lesson 8: taxes and deadweight loss", () => {
  const I = "econ-taxes-and-deadweight-loss-";
  it("recomputes the keys", () => {
    near(I + "hook", 10 - (14 - 6));
    near(I + "1", equilibrium(100, 2, -20, 4, 6).price);
    near(I + "2", 6 * equilibrium(100, 2, -20, 4, 6).quantity);
    near(I + "3", tri(equilibrium(100, 2, -20, 4).quantity - equilibrium(100, 2, -20, 4, 6).quantity, 6));
    near(I + "4", equilibrium(120, 4, -30, 2, 6).price - equilibrium(120, 4, -30, 2).price);
    near(I + "5", equilibrium(90, 3, -30, 3, 4).quantity);
    near(I + "6", tri(30 - 24, 4));
    const c2 = equilibrium(100, 4, -20, 4, 4);
    near(I + "check-2", 4 * c2.quantity);
    near(I + "check-3", equilibrium(70, 2, -30, 3, 5).price - equilibrium(70, 2, -30, 3).price);
    expect(equilibrium(60, 2, -20, 2, 4)).toEqual({ price: 22, quantity: 16 });
    expect(marked(I + "wedge-check")).toEqual(["£14"]);
    expect(20 - 6).toBe(14);
  });
});

describe("Lesson 9: controls and externalities", () => {
  const I = "econ-controls-and-externalities-";
  /** Efficient quantity when each unit also costs `damage` to others. */
  const efficient = (a: number, b: number, c: number, d: number, damage: number) =>
    equilibrium(a, b, c, d, damage).quantity;
  it("recomputes the keys", () => {
    near(I + "hook", Math.min(500, 300));
    near(I + "1", 100 - 2 * 12 - (-20 + 4 * 12));
    near(I + "offered-at-floor", -20 + 4 * 30);
    near(I + "2", -20 + 4 * 30 - (100 - 2 * 30));
    near(I + "3", efficient(100, 2, -20, 4, 9));
    near(I + "4", tri(equilibrium(100, 2, -20, 4).quantity - efficient(100, 2, -20, 4, 9), 9));
    near(I + "check-2", 90 - 3 * 10 - 2 * 10);
    near(I + "check-3", efficient(90, 3, -10, 2, 5));
    expect(-20 + 4 * 26 - (100 - 2 * 26)).toBe(36);
    // A ceiling of £30 sits above the £20 equilibrium, so it does not bind.
    expect(30 > equilibrium(100, 2, -20, 4).price).toBe(true);
    expect(marked(I + "5")[0]).toMatch(/does not bind/);
    expect(marked(I + "external-check")).toEqual(["Too much paint."]);
  });
});

describe("Lesson 10: costs and profit", () => {
  const I = "econ-costs-and-profit-";
  const tc = (q: number, fixed: number) => fixed + q * q;
  it("recomputes the keys", () => {
    near(I + "hook", (60 + 30 * 2) / 30);
    near(I + "5", 105 - 85);
    near(I + "1", tc(5, 100) / 5);
    // ATC = f/q + q is lowest where 2q = f/q + q, so q = sqrt(f).
    near(I + "2", Math.sqrt(100));
    near(I + "atc-low", tc(10, 100) / 10);
    expect(Math.sqrt(400)).toBe(20);
    near(I + "3", 30 / 2);
    const q16 = 16 / 2;
    near(I + "loss-at-16", 16 * q16 - tc(q16, 100));
    near(I + "4", 30 * 15 - tc(15, 100));
    near(I + "6", (50 - 10) / 2);
    near(I + "check-3", tc(8, 80) / 8);
    expect(30 < 34).toBe(true);
    expect(marked(I + "profit-check")[0]).toMatch(/^No/);
  });
});

describe("Lesson 11: monopoly", () => {
  const I = "econ-monopoly-";
  /** Demand P = a − bQ with constant marginal cost: MR = a − 2bQ. */
  const monopoly = (a: number, b: number, mc: number) => {
    const q = (a - mc) / (2 * b);
    return { q, p: a - b * q, competitive: (a - mc) / b };
  };
  it("recomputes the keys", () => {
    near(I + "hook", 31 * 69 - 30 * 70);
    near(I + "1", 100 - 2 * 30);
    near(I + "output-mr-mc", monopoly(100, 1, 20).q);
    near(I + "2", monopoly(100, 1, 20).p);
    near(I + "3", monopoly(100, 1, 20).competitive);
    near(I + "4", tri(80 - 40, 60 - 20));
    near(I + "5", monopoly(60, 2, 12).q);
    const s2 = monopoly(90, 1, 30);
    near(I + "check-2", (s2.p - 30) * s2.q);
    const s3 = monopoly(100, 2, 20);
    near(I + "check-3", tri(s3.competitive - s3.q, s3.p - 20));
    expect(monopoly(120, 2, 40)).toMatchObject({ q: 20, p: 80 });
    expect(marked(I + "mr-check")).toEqual(["MR = 60 − 2Q"]);
    expect(marked(I + "6")).toEqual(["sells less at a higher price"]);
  });
});

describe("Lesson 12: game theory", () => {
  const I = "econ-game-theory-";
  type Cell = [number, number];
  /** Pure-strategy Nash equilibria of a payoff matrix [row][column] = [row payoff, column payoff]. */
  const nash = (m: Cell[][]) => {
    const cells: [number, number][] = [];
    m.forEach((row, r) =>
      row.forEach((cell, c) => {
        const rowStays = m.every((other) => other[c]![0] <= cell[0]);
        const colStays = row.every((other) => other[1] <= cell[1]);
        if (rowStays && colStays) cells.push([r, c]);
      }),
    );
    return cells;
  };
  const war: Cell[][] = [[[10, 10], [2, 14]], [[14, 2], [5, 5]]];
  const plugs: Cell[][] = [[[6, 6], [0, 0]], [[0, 0], [4, 4]]];
  /** Alpha's profit when it plays tit for tat (High first) against a rival that always sets Low. */
  const titForTat = (rounds: number) => {
    let alpha = 0;
    let last = 0; // 0 = High, 1 = Low
    for (let i = 0; i < rounds; i++) {
      const move = i === 0 ? 0 : last;
      alpha += war[move]![1]![0];
      last = 1;
    }
    return alpha;
  };
  it("recomputes the keys", () => {
    near(I + "1", war[1]![0]![0] - war[0]![0]![0]);
    near(I + "switch-payoff", plugs[1]![0]![0]);
    expect(nash(plugs)).toHaveLength(key(I + "5"));
    expect(nash(war)).toEqual([[1, 1]]);
    near(I + "3", war[1]![1]![0] + war[1]![1]![1]);
    near(I + "4", titForTat(5));
    const rita: Cell[][] = [[[5, 5], [1, 7]], [[7, 1], [3, 3]]];
    const [[r, c]] = nash(rita) as [[number, number]];
    near(I + "check-2", rita[r]![c]![0] + rita[r]![c]![1]);
    near(I + "check-3", titForTat(4));
    // Low pays Alpha more against both of Beta's choices.
    expect(war[1]![0]![0] > war[0]![0]![0] && war[1]![1]![0] > war[0]![1]![0]).toBe(true);
  });
});

describe("Misconceptions never match the key", () => {
  it("holds for every numeric item", () => {
    for (const item of bundle.questions) {
      if (item.answerAuthority.kind !== "numeric") continue;
      for (const m of item.misconceptions ?? [])
        expect(m.match.numeric ?? [], item.id).not.toContain(item.answerAuthority.value);
    }
  });
});
