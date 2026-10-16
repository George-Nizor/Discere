import { existsSync, readFileSync } from "node:fs";
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
// The candidate holds the lessons as last written; the published bundle is the fallback.
const candidatePath = "../../../content/economics-markets-and-strategy/.authoring/candidate.json";
const bundle = existsSync(new URL(candidatePath, import.meta.url)) ? read(candidatePath) : published;
const storyLessons = new Set([
  "opportunity-cost-and-the-frontier",
  "comparative-advantage",
  "thinking-at-the-margin",
  "demand-and-supply",
  "shifts-and-movements",
  "price-elasticity",
  "consumer-and-producer-surplus",
  "taxes-and-deadweight-loss",
  "controls-and-externalities",
  "costs-and-profit",
  "monopoly",
  "game-theory",
]);

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
      if (!storyLessons.has(lesson.id)) {
        expect(lesson.steps.length, lesson.id).toBeGreaterThanOrEqual(5);
        expect(lesson.steps.length, lesson.id).toBeLessThanOrEqual(7);
      }
      expect(lesson.steps.some((s) => s.kind === "transfer"), lesson.id).toBe(true);
    }
  });

  it("writes every lesson as a story", () => {
    const wordCount = (blocks: { kind: string; text?: string }[] | undefined) =>
      (blocks ?? []).reduce((sum, b) => sum + (b.text ? b.text.split(/\s+/u).filter(Boolean).length : 0), 0);
    for (const id of storyLessons) {
      const lesson = bundle.lessons.find((item) => item.id === id)!;
      const teaching = lesson.steps.filter((s) => s.kind === "explain" && !s.checkQuestionId);
      expect(lesson.steps.length, id).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length, id).toBeLessThanOrEqual(14);
      // The opener asks nothing and teaching screens carry 80 to 280 words of their own prose.
      expect(lesson.intro!.hook.questionId, id).toBeUndefined();
      expect(teaching.length / lesson.steps.length, id).toBeGreaterThanOrEqual(0.4);
      for (const step of teaching) {
        const n = wordCount(step.lead) + wordCount(step.afterFigure);
        expect(n, `${id}/${step.id}`).toBeGreaterThanOrEqual(80);
        expect(n, `${id}/${step.id}`).toBeLessThanOrEqual(280);
      }
      const asking = lesson.steps.filter(
        (s) => s.checkQuestionId || s.workedSteps?.some((w) => w.blank || w.selfExplain),
      );
      expect(asking.length, id).toBeGreaterThanOrEqual(3);
      expect(asking.length, id).toBeLessThanOrEqual(7);
      expect(lesson.steps.some((s) => s.diagram), id).toBe(true);
      expect(lesson.recap!.nextHook?.length ?? 0, id).toBeGreaterThan(0);
    }
  });

  it("keeps every skill-check item on a skill taught by its lesson or an earlier one", () => {
    const taught = new Set<string>();
    for (const lesson of bundle.lessons) {
      for (const skill of lesson.taughtSkills ?? []) taught.add(skill);
      if (!storyLessons.has(lesson.id)) continue;
      for (const id of lesson.questionIds) {
        const skill = byId(id).skill;
        expect(taught.has(skill!), `${lesson.id}/${id}`).toBe(true);
      }
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
    // Teaching screens: £8 book against £4 teas, Workshop B's table, the first step along the frontier.
    near(I + "hook", 10 / 5); // the practice ticket, again, so the teaching numbers sit beside it
    expect(8 / 4).toBe(2);
    expect(40 / 20).toBe(2);
    expect(20 / 40).toBe(0.5);
    expect(20 / 40 + 10 / 20).toBe(1); // 20 chairs and 10 tables fill Workshop B's week
    expect(10 / 40 + 5 / 20).toBeLessThan(1); // 10 chairs and 5 tables leave it idle
    expect((100 - 90) / (20 - 0)).toBe(0.5);
    // The four steps along the bowed frontier cost 0.5, 1, 1.5 and 2 machines a unit of food.
    const bowed = [[0, 100], [20, 90], [40, 70], [60, 40], [80, 0]] as const;
    const steps = bowed.slice(1).map(([x, y], i) => (bowed[i]![1] - y) / (x - bowed[i]![0]));
    expect(steps).toEqual([0.5, 1, 1.5, 2]);
    near(I + "unit-cost", steps[2]!);
    near(I + "4", steps[3]!);
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
    // Teaching screens: Mo makes 9 bowls or 3 vases, Jo 4 bowls or 2 vases.
    expect(9 / 3).toBe(3);
    expect(4 / 2).toBe(2);
    expect(3 / 9).toBeCloseTo(1 / 3, 12);
    expect(2 / 4).toBe(0.5);
    expect(2.5 - 2).toBe(0.5); // Jo's gain per vase at 2.5 bowls
    expect(3 - 2.5).toBe(0.5); // Mo's saving per vase at 2.5 bowls
    expect(2 < 2.5 && 2.5 < 3).toBe(true);
    // Mo has the absolute advantage in both goods, Jo the comparative advantage in vases.
    expect(9 > 4 && 3 > 2).toBe(true);
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
    // Teaching screens: the ice-cream van and the florist.
    expect(takeWhile([9, 6, 4, 2], (v) => v >= 3)).toHaveLength(3);
    const florist = { benefits: [50, 40, 25, 10], costs: [20, 22, 30, 35] };
    const nets = florist.benefits.map((b, i) => b - florist.costs[i]!);
    expect(nets).toEqual([30, 18, -5, -25]);
    expect(takeWhile(florist.benefits, (b, i) => b >= florist.costs[i]!)).toHaveLength(2);
    expect(nets[0]! + nets[1]!).toBe(48);
    expect(nets[0]! + nets[1]! + nets[2]!).toBe(43);
    expect(50 + 40 + 25).toBe(115);
    expect(115 / 3).toBeCloseTo(38.33, 2);
    expect(115 - (50 + 40)).toBe(25);
    expect(25 < 30).toBe(true);
    // The bookshop: nets of 50, 30, 10 and −10 against a £30 hour.
    expect([80, 60, 40, 20].map((b) => b - 30)).toEqual([50, 30, 10, -10]);
    // The manager's average, and the batch item rewritten as "first adds 120, each later 30 less".
    expect((90 + 70 + 55 + 40) / 4).toBe(63.75);
    expect([0, 1, 2, 3].map((i) => 120 - 30 * i)).toEqual([120, 90, 60, 30]);
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
    // Teaching screens: the lolly stall, Qd = 60 − 5P against Qs = 5P.
    expect(60 - 5 * 4).toBe(40);
    expect(60 - 5 * 8).toBe(20);
    expect(60 - 5 * 4 - 5 * 4).toBe(20); // shortage at £4
    expect(5 * 8 - (60 - 5 * 8)).toBe(20); // surplus at £8
    expect(equilibrium(60, 5, 0, 5)).toEqual({ price: 6, quantity: 30 });
    expect(5 * 4).toBe(20);
    expect(5 * 8).toBe(40);
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
    // Teaching screens: the lolly stall.
    expect(60 - 5 * 4).toBe(40);
    expect(60 - 5 * 6).toBe(30);
    expect(70 - 5 * 4).toBe(50);
    expect(70 - 5 * 6 - 5 * 6).toBe(10); // shortage at the old £6
    expect(equilibrium(70, 5, 0, 5)).toEqual({ price: 7, quantity: 35 });
    expect(equilibrium(60, 5, -10, 5)).toEqual({ price: 7, quantity: 25 }); // sugar costs more
    expect(equilibrium(70, 5, 20, 5)).toEqual({ price: 5, quantity: 45 }); // demand +10, supply +20
    expect(equilibrium(70, 5, 10, 5)).toEqual({ price: 6, quantity: 40 }); // equal shifts of 10: price holds
    near(I + "hook", 112 - 2 * 20 - 60);
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

  it("recomputes the teaching screens", () => {
    // The bakery: £3 × 85 = £255 falls to £2 × 115 = £230 when the price is cut.
    expect(3 * 85).toBe(255);
    expect(2 * 115).toBe(230);
    expect(3 * 85 - 2 * 115).toBe(25);
    // A base of the old price gives a third down and a half up; the midpoint gives 40% either way.
    expect((3 - 2) / 3).toBeCloseTo(1 / 3, 12);
    expect((3 - 2) / 2).toBe(0.5);
    expect((3 - 2) / ((3 + 2) / 2)).toBeCloseTo(0.4, 12);
    expect((115 - 85) / ((85 + 115) / 2)).toBeCloseTo(0.3, 12);
    expect(elasticity(85, 115, 3, 2)).toBeCloseTo(0.75, 12);
    expect(elasticity(85, 115, 2, 3)).toBeCloseTo(0.75, 12); // the same whichever way the price moves
    // The two stalls: snack demand Qd = 210 − 30P and painkiller demand Qd = 70 − 2P, both 60 at £5.
    expect([210 - 30 * 5, 70 - 2 * 5]).toEqual([60, 60]);
    expect(210 - 30 * 4).toBe(90);
    expect(elasticity(60, 90, 5, 4)).toBeCloseTo(1.8, 12);
    expect(elasticity(60, 62, 5, 4)).toBeCloseTo(0.15, 1);
    // The museum, Qd = 200 − 10P, at the top and the bottom of its demand line.
    const museum = (p: number) => 200 - 10 * p;
    expect(elasticity(museum(15), museum(13), 15, 13)).toBeCloseTo(7 / 3, 12);
    expect(15 * museum(15)).toBe(750);
    expect(13 * museum(13)).toBe(910);
    expect(elasticity(museum(6), museum(4), 6, 4)).toBeCloseTo(1 / 3, 12);
    expect(6 * museum(6)).toBe(840);
    expect(4 * museum(4)).toBe(640);
    // Revenue peaks where the elasticity is 1, at £10; the practice cut from £11 to £9 straddles it.
    expect(elasticity(museum(11), museum(9), 11, 9)).toBeCloseTo(1, 12);
    expect(11 * museum(11)).toBe(9 * museum(9));
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

  it("recomputes the teaching screens", () => {
    // Mia values the headphones at £50 and pays £40; the bakers' prices and costs.
    expect(50 - 40).toBe(10);
    expect(3.5 - 2).toBe(1.5);
    expect(3.5 - 1).toBe(2.5);
    // The lolly stall, Qd = 60 − 5P and Qs = 5P: £6, 30 lollies, demand reaches zero at £12.
    const lollies = equilibrium(60, 5, 0, 5);
    expect(lollies).toEqual({ price: 6, quantity: 30 });
    expect(60 / 5).toBe(12);
    expect(tri(lollies.quantity, 60 / 5 - lollies.price)).toBe(90);
    expect(tri(lollies.quantity, lollies.price - 0)).toBe(90);
    expect(tri(30, 6) + tri(30, 6)).toBe(180);
    expect(equilibrium(60, 5, -10, 5)).toEqual({ price: 7, quantity: 25 }); // dearer sugar
    // The 31st lolly is worth £5.80 to its buyer and costs £6.20 to make.
    expect(60 / 5 - 31 / 5).toBeCloseTo(5.8, 12);
    expect(31 / 5).toBeCloseTo(6.2, 12);
    expect(9 - 4).toBe(5);
    // A cap of 20 lollies: buyers would pay £8 and sellers accept £4 at the 20th, so £20 is lost.
    expect(60 / 5 - 20 / 5).toBe(8);
    expect(20 / 5).toBe(4);
    expect(tri(30 - 20, 8 - 4)).toBe(20);
    expect(((60 / 5 - 0 + (8 - 4)) / 2) * 20).toBe(160); // total surplus under the cap
    expect(180 - 160).toBe(20);
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

  it("recomputes the teaching screens", () => {
    // The ice-cream van: buyers pay £6, the van keeps £4, and the wedge is the £2 tax.
    expect(6 - 2).toBe(4);
    expect(6 - 5).toBe(5 - 4);
    // The lolly stall with a £2 tax: buyers pay £7, sellers keep £5, 25 are sold.
    const taxed = equilibrium(60, 5, 0, 5, 2);
    expect(taxed).toEqual({ price: 7, quantity: 25 });
    expect(taxed.price - 2).toBe(5);
    expect(5 * (taxed.price - 2)).toBe(taxed.quantity);
    expect(2 * taxed.quantity).toBe(50);
    expect(2 * 30).toBe(60);
    const bigger = equilibrium(60, 5, 0, 5, 4);
    expect(bigger).toEqual({ price: 8, quantity: 20 });
    expect(4 * bigger.quantity).toBe(80);
    // The 25th lolly is worth £7 to its buyer and costs £5, a gap equal to the tax.
    expect(60 / 5 - 25 / 5 - 25 / 5).toBe(2);
    expect(tri(30 - taxed.quantity, 2)).toBe(5);
    // Coffee with a £6 tax: buyers pay £24, sellers keep £18, buyers carry £4 of the £6.
    const coffee = equilibrium(100, 2, -20, 4);
    const coffeeTax = equilibrium(100, 2, -20, 4, 6);
    expect(coffeeTax.price - 6).toBe(18);
    expect(coffeeTax.price - coffee.price).toBe(4);
    expect(coffee.price - (coffeeTax.price - 6)).toBe(2);
    // When buyers react less (Qd = 80 − P, Qs = 3P − 20) they bear £4.50 of the £6.
    expect(equilibrium(80, 1, -20, 3, 6).price - equilibrium(80, 1, -20, 3).price).toBeCloseTo(4.5, 12);
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

  it("recomputes the teaching screens", () => {
    // The lolly stall, equilibrium £6 and 30. A £4 ceiling: buyers want 40, sellers offer 20.
    expect(60 - 5 * 4).toBe(40);
    expect(5 * 4).toBe(20);
    expect(60 - 5 * 4 - 5 * 4).toBe(20);
    expect(4 < 6 && 9 > 6).toBe(true); // £4 binds as a ceiling, £9 does not
    // An £8 floor: buyers take 20, sellers offer 40, so 20 go unsold. A £4 floor does not bind.
    expect(60 - 5 * 8).toBe(20);
    expect(5 * 8).toBe(40);
    expect(5 * 8 - (60 - 5 * 8)).toBe(20);
    // The fertiliser plant: £2 of damage a tonne moves the market from 30 to 25 tonnes.
    expect(equilibrium(60, 5, 0, 5)).toEqual({ price: 6, quantity: 30 });
    expect(efficient(60, 5, 0, 5, 2)).toBe(25);
    expect(equilibrium(60, 5, 0, 5, 2).price).toBe(7);
    expect(5 * (7 - 2)).toBe(25);
    expect(6 + 2).toBe(8); // social cost of the 30th tonne
    expect(tri(30 - 25, 2)).toBe(5);
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

  it("recomputes the teaching screens", () => {
    // The print shop: £50 rent and £1 a poster.
    expect(50 + 20 * 1).toBe(70);
    // The £36 workshop, TC = 36 + q².
    expect([2, 6, 12].map((q) => tc(q, 36))).toEqual([40, 72, 180]);
    expect([2, 6, 12].map((q) => tc(q, 36) / q)).toEqual([20, 12, 15]);
    expect(36 / 2).toBe(18);
    expect(36 / 6).toBe(6);
    // Unit steps cost 11 and 13; the line MC = 2q gives 12 at q = 6, between them.
    expect(tc(6, 36) - tc(5, 36)).toBe(11);
    expect(tc(7, 36) - tc(6, 36)).toBe(13);
    expect(2 * 6).toBe(12);
    expect([2, 12].map((q) => 2 * q)).toEqual([4, 24]);
    // Average cost is lowest at q = √36 = 6, where it equals MC.
    expect(Math.sqrt(36)).toBe(6);
    expect(tc(6, 36) / 6).toBe(2 * 6);
    // At £20, 2q = 20 gives 10 units and a profit of £64; the 11th unit adds about £22.
    expect(20 / 2).toBe(10);
    expect(20 * 10 - tc(10, 36)).toBe(64);
    expect(2 * 11).toBe(22);
    // At £8 the workshop makes 4, loses £20, and closing would lose the whole £36 of rent.
    expect(8 / 2).toBe(4);
    expect(8 * 4 - tc(4, 36)).toBe(-20);
    expect(8 * 4 > tc(4, 36) - 36).toBe(true); // revenue covers the variable cost
    expect(tc(4, 36) - 36).toBe(16);
    // The £100 firm's profit item restated on its own: 15 units at £30.
    near(I + "4", 30 * 15 - tc(15, 100));
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

  it("recomputes the teaching screens", () => {
    // The ferry: P = 50 − Q, MC £14. Ten passengers at £40, eleven at £39.
    expect(10 * 40).toBe(400);
    expect(11 * 39).toBe(429);
    expect(11 * 39 - 10 * 40).toBe(29);
    expect(39 - 10 * 1).toBe(29); // new fare less the cut on the ten already travelling
    // The marginal revenue line 50 − 2Q gives 30 at Q = 10 and 28 at Q = 11, around the step of 29.
    expect([10, 11].map((q) => 50 - 2 * q)).toEqual([30, 28]);
    expect(50 / 2).toBe(25);
    // Marginal revenue against the £14 cost.
    expect([10, 15, 18, 20].map((q) => 50 - 2 * q)).toEqual([30, 20, 14, 10]);
    const ferry = monopoly(50, 1, 14);
    expect(ferry).toMatchObject({ q: 18, p: 32, competitive: 36 });
    expect(18 * 32).toBe(576);
    expect(18 * 14).toBe(252);
    expect(576 - 252).toBe(324);
    expect(50 - 20).toBe(30); // price at the twentieth passenger
    expect(50 - 19).toBe(31); // the nineteenth would pay up to this
    expect(tri(ferry.competitive - ferry.q, ferry.p - 14)).toBe(162);
    // Practice item 1's price and the faded example's two outputs, as the recap states them.
    expect(100 - 30).toBe(70);
    expect(monopoly(100, 1, 20).q * 2).toBe(monopoly(100, 1, 20).competitive);
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

  it("recomputes the teaching screens", () => {
    // The cafés: Ruby picks the row, Sol the column; strategy 0 closes early, 1 opens late.
    const cafes: Cell[][] = [[[8, 8], [3, 12]], [[12, 3], [6, 6]]];
    const quiet: Cell[][] = [[[6, 6], [2, 9]], [[9, 2], [4, 4]]];
    expect(nash(cafes)).toEqual([[1, 1]]);
    expect(nash(quiet)).toEqual([[1, 1]]);
    // Staying open beats closing early against both of Sol's choices.
    expect(cafes[1]![0]![0] > cafes[0]![0]![0] && cafes[1]![1]![0] > cafes[0]![1]![0]).toBe(true);
    expect([cafes[0]![0]![0], cafes[1]![0]![0], cafes[0]![1]![0], cafes[1]![1]![0]]).toEqual([8, 12, 3, 6]);
    // A prisoner's dilemma: the equilibrium pays less to both than closing early together.
    expect(cafes[1]![1]![0] < cafes[0]![0]![0] && cafes[1]![1]![1] < cafes[0]![0]![1]).toBe(true);
    // Three rounds of tit for tat (Ruby) against a rival who always opens late.
    const rounds = (n: number) => {
      let ruby = 0;
      let last = 0;
      for (let i = 0; i < n; i++) {
        const move = i === 0 ? 0 : last;
        ruby += cafes[move]![1]![0];
        last = 1;
      }
      return ruby;
    };
    expect(rounds(3)).toBe(3 + 6 + 6);
    expect(6 * 3).toBe(18);
    expect(8 * 3).toBe(24);
    // Two drivers on a narrow road: the matching cells are the equilibria.
    const road: Cell[][] = [[[1, 1], [0, 0]], [[0, 0], [1, 1]]];
    expect(nash(road)).toEqual([[0, 0], [1, 1]]);
    // The repeated-game payoffs satisfy temptation > reward > punishment > sucker.
    expect(12 > 8 && 8 > 6 && 6 > 3).toBe(true);
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
