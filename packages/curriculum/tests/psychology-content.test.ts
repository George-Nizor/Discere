import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { assessTextAnswer } from "@discere/assessment-engine";
import { PsychologyDiagramSchema, PsychologyModelSchema } from "@discere/contracts";
import { loadCourseBundle, assertEditorialApproval, validateCourseBundle } from "../src/index.js";
import { psychologyLessons } from "../../../content/psychology-how-minds-work/authoring/lessons.js";
import { psychologyChecks } from "../../../content/psychology-how-minds-work/authoring/course-checks.js";
import { historicalBundle } from "./helpers/published-history.js";
import { CourseBundleSchema } from "@discere/contracts";

/*
 * Every numeric key is recomputed here from the problem statement, without the activity engine.
 * null marks a question answered by a word or a choice.
 */
const pc = (part: number, whole: number) => (part / whole) * 100;
const recall = (t: number, s: number) => 100 / (1 + t / (9 * s));
const combine = (a: number, sa: number, b: number, sb: number) =>
  (a / sa ** 2 + b / sb ** 2) / (1 / sa ** 2 + 1 / sb ** 2);
const combinedSd = (sa: number, sb: number) => 1 / Math.sqrt(1 / sa ** 2 + 1 / sb ** 2);
const rw = (rate: number, trials: string) =>
  [...trials].reduce((v, t) => v + rate * ((t === "P" ? 1 : 0) - v), 0);
const anyone = (n: number, p: number) => (1 - (1 - p) ** n) * 100;
const ppv = (n: number, base: number, hit: number, fa: number) =>
  pc(n * base * hit, n * base * hit + n * (1 - base) * fa);
const round1 = (v: number) => Math.round(v * 10) / 10;

const expected: Record<string, Array<number | null>> = {
  "correlation-and-cause": [
    0.6 ** 2 * 100,
    null,
    null,
    pc(6, 20) - pc(30, 100),
    0.3 ** 2 * 100,
    null,
  ],
  "experiments-and-assignment": [
    (9 + 8 + 8 + 7) / 4 - (3 + 2 + 2 + 1) / 4,
    null,
    null,
    12 - 8,
    (4 + 6 + 5 + 7) / 4 - (6 + 5 + 4 + 5) / 4,
    null,
  ],
  "effect-size-and-replication": [
    (106 - 100) / 15,
    (46.5 - 40) / Math.sqrt((7 ** 2 + 17 ** 2) / 2),
    16 / 0.4 ** 2,
    (50.4 - 50) / 10,
    round1(pc(35, 97)),
    null,
  ],
  "signal-detection": [pc(40, 50), 0.84 - -0.84, 1.68 - 0, -(1.68 + 0) / 2, 0.5 - -1.48, null],
  "attention-and-multitasking": [
    round1(pc(14, 30)),
    8 * 600 + 7 * 200,
    7 * 200 - 1 * 200,
    pc(5, 200),
    8 * 500 + 3 * 150,
    null,
  ],
  "perception-as-inference": [
    combine(50, 2, 56, 4),
    combine(50, 4, 56, 2),
    combinedSd(3, 4),
    combine(0, 1, 10, 3),
    combine(10, 8, 0, 4),
    null,
  ],
  "working-memory": [9 - 4, 12 - 4, 20 / 4, null, 16 / 4, null],
  "forgetting-and-spacing": [
    recall(90, 10),
    recall(13.5, 2 * 3),
    12,
    56 - 42,
    recall(108, 4),
    null,
  ],
  conditioning: [rw(0.3, "PP"), rw(0.5, "PPA"), Math.floor(30 / 5), 5, null, null],
  "base-rates": [
    1000 * 0.99 * 0.1,
    round1(pc(9, 9 + 99)),
    ppv(1000, 0.1, 0.9, 0.1),
    round1(ppv(1000, 0.2, 0.75, 0.25)),
    2000 * 0.05 * 0.8 + 2000 * 0.95 * 0.1,
    null,
  ],
  "anchors-and-intuition": [
    45 - 25,
    (59 - 35) / (80 - 20),
    round1(pc(200, 600)),
    (110 - 100) / 2,
    (340 - 220) / (500 - 100),
    null,
  ],
  "social-influence": [
    round1(pc(72, 18 * 12)),
    pc(26, 40),
    pc(26, 40) - pc(12, 40),
    round1(anyone(5, 0.2)),
    anyone(3, 0.5),
    null,
  ],
};

const recallCards: Record<string, Array<number | null>> = {
  "correlation-and-cause": [0.7 ** 2 * 100, null],
  "experiments-and-assignment": [15 - 9, null],
  "effect-size-and-replication": [(30 - 24) / 12, 16 / 0.8 ** 2],
  "signal-detection": [1.0 - -0.5, -(1.2 + -0.4) / 2],
  "attention-and-multitasking": [4 * 700 + 2 * 250, null],
  "perception-as-inference": [combinedSd(6, 8), combine(20, 3, 30, 3)],
  "working-memory": [5 - 4, null],
  "forgetting-and-spacing": [recall(9, 3), 8 * 2.5],
  conditioning: [rw(0.4, "PP"), null],
  "base-rates": [1000 * 0.98 * 0.05, pc(12, 12 + 36)],
  "anchors-and-intuition": [12 - 1, (40 - 30) / (60 - 10)],
  "social-influence": [pc(21, 60), anyone(2, 0.4)],
};

const checkValues: Record<string, Array<number | null>> = {
  "starting-point": [
    0.5 ** 2 * 100,
    (10 + 9 + 8 + 7) / 4 - (2 + 3 + 4 + 5) / 4,
    (76 - 70) / 10,
    1.28 - -0.52,
    6 * 500 + 4 * 100,
    combine(30, 1, 40, 2),
    7 - 4,
    recall(6, 2),
    Math.floor(30 / 4),
    1000 * 0.98 * 0.05,
    (110 - 80) / (150 - 50),
    round1(anyone(4, 0.25)),
  ],
  "mixed-challenge": [
    0.8 ** 2 * 100,
    14 - 9,
    (39 - 30) / Math.sqrt((3 ** 2 + 21 ** 2) / 2),
    -(0.8 + -1.2) / 2,
    pc(12, 40),
    combinedSd(9, 12),
    null,
    recall(27, 12),
    rw(0.2, "PPP"),
    round1(ppv(500, 0.1, 0.8, 0.2)),
    10 - 1,
    pc(18, 40),
  ],
  "later-applications": [
    null,
    14 - 5,
    16 / 0.25 ** 2,
    0.25 - -1.75,
    8 * 400 + 3 * 200,
    combine(12, 6, 0, 3),
    15 / 5,
    recall(81, 3),
    null,
    ppv(1000, 0.25, 0.7, 0.3),
    (19 - 11) / (25 - 5),
    pc(36, 120),
  ],
};

const root = path.resolve(import.meta.dirname, "../../../content/psychology-how-minds-work");

describe("independent Psychology content review", () => {
  it("ships the reviewed candidate, exact cover and the authoring it was built from", async () => {
    // The authoring source describes the lessons as first published. A course rewritten to v2
    // keeps that bundle in review/history (helpers/published-history.ts); approval is on the current one.
    const current = await loadCourseBundle(path.join(root, "bundle.json"));
    const bundle = CourseBundleSchema.parse(historicalBundle("psychology-how-minds-work"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    expect(() =>
      assertEditorialApproval(current, review, validateCourseBundle(current)),
    ).not.toThrow();
    for (const lesson of psychologyLessons) {
      lesson.questions.forEach((q, i) =>
        expect(
          bundle.questions.find((item) => item.id === `psych-${lesson.id}-${i + 1}`),
        ).toMatchObject(q),
      );
      lesson.cards.forEach((c, i) =>
        expect(
          bundle.flashcards.find((item) => item.id === `psych-${lesson.id}-card-${i + 1}`),
        ).toMatchObject(c),
      );
      const shipped = bundle.lessons.find((item) => item.id === lesson.id)!;
      expect(shipped.steps.map((s) => s.diagram)).toEqual(lesson.beats.map((b) => b.diagram));
    }
    expect(bundle.courseChecks).toEqual(psychologyChecks);
    const provenance = JSON.parse(
      await readFile(path.join(root, "assets/provenance.json"), "utf8"),
    );
    const cover = await readFile(path.join(root, "assets/cover.svg"));
    expect(createHash("sha256").update(cover).digest("hex")).toBe(provenance.sha256);
  });

  it("keeps multiple choice well under the cap", () => {
    const all = psychologyLessons.flatMap((l) => l.questions);
    expect(all).toHaveLength(72);
    const mcq = all.filter((q) => q.choices?.length).length;
    expect(mcq / all.length).toBeLessThanOrEqual(0.35);
  });

  it.each(psychologyLessons)(
    "recomputes every numeric key and marks every word answer in $id",
    (lesson) => {
      expect(lesson.questions).toHaveLength(6);
      expect(lesson.beats).toHaveLength(4);
      const values = expected[lesson.id]!;
      expect(values).toHaveLength(6);
      lesson.questions.forEach((q, i) => {
        const a = q.answerAuthority;
        if (a.kind === "numeric") {
          expect(values[i], `${lesson.id} question ${i + 1}`).not.toBeNull();
          expect(Math.abs(a.value - values[i]!)).toBeLessThanOrEqual(
            Math.max(a.absoluteTolerance, 1e-9),
          );
          expect(q.hints).toHaveLength(3);
        } else {
          expect(values[i]).toBeNull();
          if (q.choices)
            expect(q.choices.filter((c) => assessTextAnswer(c.label, a).correct)).toHaveLength(1);
          else expect(assessTextAnswer(a.exampleAnswer, a).correct).toBe(true);
        }
      });
      for (const beat of lesson.beats)
        expect(PsychologyDiagramSchema.safeParse(beat.diagram).success).toBe(true);
    },
  );

  it.each(psychologyLessons)("checks both fresh recall cards in $id", (lesson) => {
    expect(lesson.cards).toHaveLength(2);
    lesson.cards.forEach((card, i) => {
      const a = card.answerAuthority;
      const value = recallCards[lesson.id]![i];
      if (a.kind === "numeric") {
        expect(value).not.toBeNull();
        expect(a.value).toBeCloseTo(value!, 9);
      } else {
        expect(value).toBeNull();
        expect(assessTextAnswer(a.acceptedIdeas[0]!, a).correct).toBe(true);
        expect(assessTextAnswer(card.back, a).correct).toBe(true);
      }
      expect(lesson.questions.some((q) => q.prompt === card.front)).toBe(false);
    });
  });

  it("draws correlations at the strengths the prose states", () => {
    const r = (points: Array<{ x: number; y: number }>) => {
      const n = points.length;
      const mx = points.reduce((s, p) => s + p.x, 0) / n,
        my = points.reduce((s, p) => s + p.y, 0) / n;
      const sxy = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
      const sxx = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
      const syy = points.reduce((s, p) => s + (p.y - my) ** 2, 0);
      return sxy / Math.sqrt(sxx * syy);
    };
    const first = psychologyLessons[0]!.beats;
    const get = (b: number, c: number) => {
      const m = first[b]!.diagram.cases[c]!.model;
      if (m.kind !== "scatter") throw Error("Expected a scatter plot");
      return m.points;
    };
    expect(r(get(0, 0))).toBeCloseTo(-0.6, 2);
    expect(r(get(0, 1))).toBeCloseTo(0.4, 2);
    expect(r(get(1, 0))).toBeCloseTo(0.75, 2);
    expect(Math.abs(r(get(1, 1)))).toBeLessThan(0.01);
    expect(r(get(2, 0))).toBeCloseTo(r(get(2, 1)), 9);
  });

  it.each(psychologyChecks)("recomputes every fresh problem in $id", (check) => {
    expect(check.items).toHaveLength(12);
    expect(new Set(check.items.map((i) => i.lessonId)).size).toBe(12);
    check.items.forEach((item, i) => {
      const a = item.question.answerAuthority;
      const value = checkValues[check.id]![i];
      if (a.kind === "numeric") {
        expect(value, `${check.id} item ${i + 1}`).not.toBeNull();
        expect(Math.abs(a.value - value!)).toBeLessThanOrEqual(Math.max(a.absoluteTolerance, 1e-9));
      } else {
        expect(value).toBeNull();
        expect(
          item.question.choices!.filter((c) => assessTextAnswer(c.label, a).correct),
        ).toHaveLength(1);
      }
      if (item.visual.type === "psychology")
        expect(PsychologyModelSchema.safeParse(item.visual.model).success).toBe(true);
    });
  });

  it("keeps independent checks distinct from teaching and requires a delayed final application", () => {
    const prompts = [
      ...psychologyLessons.flatMap((l) => l.questions.map((q) => q.prompt)),
      ...psychologyLessons.flatMap((l) => l.cards.map((c) => c.front)),
      ...psychologyChecks.flatMap((c) => c.items.map((i) => i.question.prompt)),
    ];
    expect(new Set(prompts).size).toBe(prompts.length);
    expect(psychologyChecks[0]!.requiredLessonIds).toEqual([]);
    for (const c of psychologyChecks.slice(1)) expect(c.requiredLessonIds).toHaveLength(12);
    expect(psychologyChecks[2]).toMatchObject({ afterCheckId: "mixed-challenge", delayDays: 7 });
  });
});
