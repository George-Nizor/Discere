import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { EconomicsDiagramSchema } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { economicsChecks } from "../../../content/economics-markets-and-strategy/authoring/course-checks.js";
import { economicsLessons } from "../../../content/economics-markets-and-strategy/authoring/lessons.js";
import { assertEditorialApproval, loadCourseBundle, validateCourseBundle } from "../src/index.js";

/*
 * Every key below is derived again from the problem statement, without the activity engine.
 * Linear markets: Qd = a − bP and Qs = c + dP meet at P = (a − c)/(b + d).
 */
const price = (a: number, b: number, c: number, d: number) => (a - c) / (b + d);
const midpoint = (p1: number, q1: number, p2: number, q2: number) =>
  Math.abs((q2 - q1) / ((q1 + q2) / 2) / ((p2 - p1) / ((p1 + p2) / 2)));
const triangle = (base: number, height: number) => 0.5 * base * height;
/** Units chosen when each unit is taken while its benefit covers its cost. */
const chosen = (mb: number[], mc: number[]) => {
  let k = 0;
  while (k < mb.length && mb[k]! >= mc[k]!) k++;
  return k;
};
const net = (mb: number[], mc: number[]) =>
  mb.slice(0, chosen(mb, mc)).reduce((s, b, i) => s + b - mc[i]!, 0);

const expected: Record<string, Array<number | null>> = {
  "opportunity-cost-and-the-frontier": [
    60 / 20,
    null,
    70 - 40,
    (40 - 0) / (80 - 60),
    3 / 1.5,
    null,
  ],
  "comparative-advantage": [12 / 6, null, 2 * 1.75 - 3, 8 / 4 - 4 / 2, 4 / 1, null],
  "thinking-at-the-margin": [
    chosen([90, 70, 55, 40, 30], [30, 35, 45, 50, 60]),
    net([90, 70, 55], [30, 35, 45]),
    chosen([90, 70, 55, 40, 30], [50, 55, 65, 70, 80]),
    40 - 50,
    chosen([50, 40, 30, 20, 10], [25, 25, 25, 25, 25]),
    null,
  ],
  "demand-and-supply": [
    100 - 2 * 15,
    price(100, 2, -20, 4),
    100 - 2 * price(100, 2, -20, 4),
    -20 + 4 * 25 - (100 - 2 * 25),
    price(80, 4, 8, 2),
    150 - 5 * price(150, 5, 30, 10),
  ],
  "shifts-and-movements": [
    null,
    price(130, 2, -20, 4),
    100 - 2 * price(100, 2, -44, 4),
    price(130, 2, 10, 4) - price(100, 2, -20, 4),
    null,
    price(120, 3, 20, 2),
  ],
  "price-elasticity": [
    midpoint(11, 35, 9, 65),
    9 * 65 - 11 * 35,
    midpoint(6, 95, 4, 105),
    9 * (200 - 10 * 9) - 11 * (200 - 10 * 11),
    null,
    midpoint(8, 110, 12, 90),
  ],
  "consumer-and-producer-surplus": [
    35 - 20,
    triangle(60, 100 / 2 - 20),
    triangle(60, 20 - 20 / 4),
    // Demand price (100 − Q)/2 and supply price (Q + 20)/4 at the 40th cup.
    triangle(60 - 40, (100 - 40) / 2 - (40 + 20) / 4),
    triangle(price(80, 2, 0, 2) * 2, 80 / 2 - price(80, 2, 0, 2)),
    null,
  ],
  "taxes-and-deadweight-loss": [
    // Buyers' price with sellers keeping P − t: a − bP = c + d(P − t).
    (100 + 20 + 4 * 6) / (2 + 4),
    6 * (100 - 2 * ((100 + 20 + 4 * 6) / 6)),
    triangle(60 - 52, 6),
    (120 + 30 + 2 * 6) / (4 + 2) - price(120, 4, -30, 2),
    90 - 3 * ((90 + 30 + 3 * 4) / (3 + 3)),
    triangle(30 - 24, 4),
  ],
  "controls-and-externalities": [
    100 - 2 * 12 - (-20 + 4 * 12),
    -20 + 4 * 30 - (100 - 2 * 30),
    100 - 2 * ((100 + 20 + 4 * 9) / 6),
    triangle(60 - 48, 9),
    null,
    null,
  ],
  "costs-and-profit": [
    (100 + 5 ** 2) / 5,
    Math.sqrt(100),
    30 / 2,
    30 * 15 - (100 + 15 ** 2),
    105 - 85,
    (50 - 10) / 2,
  ],
  monopoly: [
    100 - 2 * 30,
    100 - (100 - 20) / 2,
    100 - 20,
    triangle(80 - 40, 60 - 20),
    (60 - 12) / (2 * 2),
    null,
  ],
  "game-theory": [14 - 10, null, 5 + 5, 2 + 4 * 5, 2, null],
};
const recall: Record<string, number[]> = {
  "opportunity-cost-and-the-frontier": [900 / 300, (20 - 0) / (40 - 30)],
  "comparative-advantage": [50 / 10, 20 / 10],
  "thinking-at-the-margin": [
    chosen([80, 60, 45, 30], [40, 40, 40, 40]),
    net([12, 9, 7], [4, 5, 8]),
  ],
  "demand-and-supply": [price(60, 3, -10, 2), 90 - 25 - 2 * 25],
  "shifts-and-movements": [50 - price(50, 1, 0, 1), price(200, 4, -30, 6)],
  "price-elasticity": [midpoint(5, 20, 3, 60), 2 * 5],
  "consumer-and-producer-surplus": [20 - 12, triangle(20, price(50, 1, -10, 1) - 10)],
  "taxes-and-deadweight-loss": [triangle(50 - 44, 2), 100],
  "controls-and-externalities": [50 - 25 - (25 - 10), 5],
  "costs-and-profit": [(60 + 8 * 20) / 20, 25 - 31],
  monopoly: [80 - (80 - 20) / 2, triangle(50 - 10 - (50 - 10) / 2, 50 - (50 - 10) / 2 - 10)],
  "game-theory": [1, 12 + 3 * 3],
};
const checkValues: Record<string, number[]> = {
  "starting-point": [
    80 / 20,
    6 / 3,
    chosen([500, 400, 300, 200], [350, 350, 350, 350]),
    price(120, 4, 0, 2),
    2 * price(150, 4, 0, 2),
    midpoint(9, 55, 11, 45),
    triangle(price(60, 2, -20, 2) * 2 - 20, 60 / 2 - price(60, 2, -20, 2)),
    triangle(40 - 34, 3),
    80 - 2 * 15 - 2 * 15,
    Math.sqrt(400),
    90 - (90 - 30) / 2,
    2,
  ],
  "mixed-challenge": [
    (45 - 30) / (30 - 20),
    30 / 10,
    net([60, 45, 35, 20], [15, 25, 30, 40]),
    200 - 5 * price(200, 5, -40, 3),
    price(200, 5, -56, 3),
    10 * (100 - 4 * 10) - 5 * (100 - 4 * 5),
    triangle(100 - 2 * price(100, 2, -20, 2), price(100, 2, -20, 2) - 10),
    (100 + 20 + 2 * 4) / (2 + 2),
    90 - 3 * ((90 + 30 + 3 * 6) / 6),
    24 * 10 - (50 + 4 * 10 + 10 ** 2),
    triangle(40 - 20, 150 - 3 * 20 - 30),
    0 + 2 * 3,
  ],
  "later-applications": [
    12 / 4,
    20 / 10,
    chosen([80, 70, 50, 30], [40, 40, 40, 40]),
    price(70, 1, -30, 4),
    price(95, 1, -30, 4),
    midpoint(9, 1050, 11, 950),
    triangle(60, 120 - 60) + triangle(60, 60 - 30),
    (60 + 30 + 2 * 6) / 3 - price(60, 1, -30, 2),
    -30 + 2 * 35 - (60 - 35),
    20 * 8 - (64 + 4 * 8 + 8 ** 2),
    (25 - 10) * 15,
    2,
  ],
};

describe("independent Economics content review", () => {
  it("ships the reviewed candidate, exact cover and independently checked authoring", async () => {
    const root = path.resolve(
      import.meta.dirname,
      "../../../content/economics-markets-and-strategy",
    );
    const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    expect(() =>
      assertEditorialApproval(bundle, review, validateCourseBundle(bundle)),
    ).not.toThrow();
    const provenance = JSON.parse(
      await readFile(path.join(root, "assets/provenance.json"), "utf8"),
    );
    const cover = await readFile(path.join(root, "assets/cover.svg"));
    expect(createHash("sha256").update(cover).digest("hex")).toBe(provenance.sha256);
    for (const lesson of economicsLessons) {
      lesson.questions.forEach((q, i) =>
        expect(
          bundle.questions.find((item) => item.id === "econ-" + lesson.id + "-" + (i + 1)),
        ).toMatchObject(q),
      );
      lesson.cards.forEach((c, i) =>
        expect(
          bundle.flashcards.find((item) => item.id === "econ-" + lesson.id + "-card-" + (i + 1)),
        ).toMatchObject(c),
      );
      const shipped = bundle.lessons.find((item) => item.id === lesson.id)!;
      expect(shipped.steps.map((s) => s.diagram)).toEqual(lesson.beats.map((b) => b.diagram));
    }
    expect(bundle.courseChecks).toEqual(economicsChecks);
    const choice = bundle.questions.filter((q) => (q.choices?.length ?? 0) > 0).length;
    expect(choice / bundle.questions.length).toBeLessThanOrEqual(0.35);
  });
  it.each(economicsLessons)("recomputes all numerical questions in $id", (lesson) => {
    expect(lesson.questions).toHaveLength(6);
    const values = expected[lesson.id]!;
    expect(values).toHaveLength(6);
    lesson.questions.forEach((q, i) => {
      if (q.answerAuthority.kind === "numeric") {
        expect(values[i]).not.toBeNull();
        expect(q.answerAuthority.value).toBeCloseTo(values[i]!, 9);
        expect(q.hints).toHaveLength(3);
      } else expect(values[i]).toBeNull();
    });
  });
  it.each(economicsLessons)("checks both fresh recall keys and all diagrams in $id", (lesson) => {
    expect(lesson.cards).toHaveLength(2);
    expect(lesson.beats).toHaveLength(4);
    lesson.cards.forEach((card, i) => {
      expect(card.answerAuthority.kind).toBe("numeric");
      if (card.answerAuthority.kind === "numeric")
        expect(card.answerAuthority.value).toBeCloseTo(recall[lesson.id]![i]!, 9);
      expect(lesson.questions.some((q) => q.prompt === card.front)).toBe(false);
    });
    for (const beat of lesson.beats)
      expect(EconomicsDiagramSchema.safeParse(beat.diagram).success).toBe(true);
  });
  it.each(economicsChecks)("recomputes every fresh problem in $id", (check) => {
    expect(check.items).toHaveLength(12);
    expect(new Set(check.items.map((i) => i.lessonId)).size).toBe(12);
    check.items.forEach((item, i) => {
      const a = item.question.answerAuthority;
      expect(a.kind).toBe("numeric");
      if (a.kind === "numeric") expect(a.value).toBeCloseTo(checkValues[check.id]![i]!, 9);
    });
  });
  it("keeps independent checks distinct from teaching and requires a delayed final application", () => {
    const prompts = [
      ...economicsLessons.flatMap((l) => l.questions.map((q) => q.prompt)),
      ...economicsChecks.flatMap((c) => c.items.map((i) => i.question.prompt)),
    ];
    expect(new Set(prompts).size).toBe(prompts.length);
    expect(economicsChecks[0]!.requiredLessonIds).toEqual([]);
    for (const c of economicsChecks.slice(1)) expect(c.requiredLessonIds).toHaveLength(12);
    expect(economicsChecks[2]).toMatchObject({ afterCheckId: "mixed-challenge", delayDays: 7 });
  });
});
