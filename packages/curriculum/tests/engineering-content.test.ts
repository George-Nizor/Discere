import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { loadCourseBundle, assertEditorialApproval, validateCourseBundle } from "../src/index.js";
import { engineeringLessons } from "../../../content/engineering-structures-and-machines/authoring/lessons.js";
import { engineeringChecks } from "../../../content/engineering-structures-and-machines/authoring/course-checks.js";
import { EngineeringDiagramSchema } from "@discere/contracts";
import { historicalBundle } from "./helpers/published-history.js";
import { CourseBundleSchema } from "@discere/contracts";

// Every key is recomputed here from the problem statement, by hand-written formulas that do not
// call the explorer engine. Unit conversions are spelled out: kN → N (×1000), GPa → MPa (×1000),
// 10⁶ mm⁴ → m⁴ (×10⁻⁶), rpm → rad/s (×2π/60).
const rad = (deg: number) => (deg * Math.PI) / 180;
const rectI = (b: number, h: number) => (b * h ** 3) / 12;
const cantileverMm = (PkN: number, L: number, EGPa: number, I6: number) =>
  ((PkN * 1000 * L ** 3) / (3 * EGPa * 1e9 * I6 * 1e-6)) * 1000;
const omega = (rpm: number) => (rpm * 2 * Math.PI) / 60;

const expected: Record<string, Array<number | null>> = {
  "forces-as-vectors": [
    10 * Math.cos(rad(30)),
    (5 * 3) / 5,
    Math.hypot(3, 4),
    Math.hypot(6, 8),
    Math.hypot(12, 5),
    null,
  ],
  moments: [150 * 0.3, 150 * 0.3 * Math.sin(rad(30)), 0, (300 * 2) / 400, 40 * 0.8, null],
  "supported-beam": [
    (12 * 2) / 6,
    (12 * 4) / 6,
    (4 * 3 * 1.5) / 6,
    10 - (10 * 6) / 4,
    (20 * 7 + 10 * 2) / 10,
    null,
  ],
  "trusses-by-joints": [
    12 / (2 * (1.5 / 2.5)),
    null,
    (12 / (2 * 0.6)) * (2 / 2.5),
    0,
    (16 / (2 * (2 / 2.5))) * (1.5 / 2.5),
    null,
  ],
  "stress-and-strain": [
    20_000 / 400,
    (50 / 200_000) * 2000,
    (50 / 70_000) * 1400,
    null,
    15_000 / (10 * 10),
    (100 / 200_000) * 5000,
  ],
  "factor-of-safety": [
    250 / (40_000 / 400),
    60_000 / (250 / 2),
    [20, 25, 30].find((s) => s * s >= 480)!,
    (60_000 / 625 / 200_000) * 3000,
    355 / 2.5,
    (300 * (250 / 1.5)) / 1000,
  ],
  "shear-and-moment": [
    (12 * 4) / 6 - 12,
    ((12 * 4) / 6) * 2,
    (3 * 8 ** 2) / 8,
    null,
    5 * 3,
    (20 * 10) / 4,
  ],
  "bending-stress": [
    (20e6 * 100) / rectI(100, 200),
    (20e6 * 50) / rectI(200, 100),
    rectI(60, 100) / 1e6,
    // I-section by the parallel-axis theorem (flanges about their own centroids plus Ad²) and web.
    (2 * (rectI(100, 10) + 100 * 10 * 95 ** 2) + rectI(6, 180)) / 1e6,
    (5e6 * 50) / rectI(100, 100),
    null,
  ],
  "deflection-and-stiffness": [
    cantileverMm(3, 2, 200, 2),
    cantileverMm(3, 4, 200, 2) / cantileverMm(3, 2, 200, 2),
    cantileverMm(2.1, 1, 70, 1),
    (3 * 200e9 * 2e-6) / 2 ** 3 / 1000,
    ((3000 * 2 ** 3) / (3 * 200e9 * 0.008)) * 1e6,
    null,
  ],
  "levers-and-pulleys": [1.2 / 0.2, (900 * 0.2) / 1.2, 800 / 4, 4 * 0.5, (50 * 0.32) / 0.04, null],
  "gear-trains": [
    (1200 * 20) / 60,
    10 * (60 / 20),
    (1200 * 20) / 30,
    1800 / ((45 / 15) * (60 / 20)),
    (60 * 48) / 16,
    null,
  ],
  "efficiency-and-power": [
    20 * omega(1500),
    0.95 * 0.95 * 100,
    20 * 4 * 0.9,
    (2000 * 0.5) / 0.8,
    1600 / (4 * 0.8),
    null,
  ],
};
const recall: Record<string, number[]> = {
  "forces-as-vectors": [(13 * 12) / 13, Math.hypot(9, 12)],
  moments: [50 * 0.6, 80 * 0.5 * Math.sin(rad(30))],
  "supported-beam": [(15 * 1) / 5, (3 * 4) / 2],
  "trusses-by-joints": [30 / (2 * (3 / 5)), (30 / (2 * (3 / 5))) * (4 / 5)],
  "stress-and-strain": [25_000 / 500, 70_000 * 0.001],
  "factor-of-safety": [240 / 80, 30_000 / 150],
  "shear-and-moment": [(10 * 4) / 4, (2 * 6 ** 2) / 8],
  "bending-stress": [rectI(50, 120) / 1e6, (8e6 * 50) / 4e6],
  "deflection-and-stiffness": [cantileverMm(1, 3, 200, 4.5), (1 / 2) ** 3],
  "levers-and-pulleys": [(1000 * 0.3) / 1.5, 1500 / 6],
  "gear-trains": [(900 * 25) / 75, 12 * 4],
  "efficiency-and-power": [25 * 100, 4 * 0.85],
};
const checkValues: Record<string, number[]> = {
  "starting-point": [
    (26 * 5) / 13,
    60 * 0.45,
    (16 * 2) / 8,
    24 / (2 * (3 / 5)),
    30_000 / 600,
    300 / (30_000 / 400),
    (18 / 2) * 3,
    (2e6 * 50) / rectI(50, 100),
    cantileverMm(6, 1, 200, 1),
    (600 * 0.15) / 0.9,
    (960 * 24) / 72,
    (1500 * 0.4) / 0.75,
  ],
  "mixed-challenge": [
    Math.hypot(6, 3 - 11),
    200 * 1.5 - 150 * 1,
    (12 * 5) / 4,
    9,
    (20_000 / 250 / 200_000) * 1500,
    45_000 / (300 / 2),
    2 * 4 * (4 / 2),
    (9e6 * 75) / rectI(80, 150),
    ((6000 * 2 ** 3) / (3 * 200e9 * 0.01)) * 1e6,
    1350 / (3 * 0.9),
    1500 / ((48 / 16) * (72 / 18)),
    12 * (60 / 12) * 0.96,
  ],
  "later-applications": [
    (15 * 9) / Math.hypot(9, 12),
    90 * 0.4 * Math.sin(rad(30)),
    (5 * 12 * 6 + 30 * 8) / 12,
    // Warren truss: reactions P/2; joint A gives AC; joint C gives CE = −2 × AC × cos θ.
    2 * (16 / 2 / (2 / 2.5)) * (1.5 / 2.5),
    (35 / 70_000) * 2100,
    275 / (55_000 / 500),
    ((12 * 6) / 9) * 3,
    (75 * 200 ** 2) / (150 * 100 ** 2),
    (1.5 / 3) ** 3,
    (40 * 0.3) / 0.05,
    (2100 * 14) / 42,
    0.9 * 20 * omega(1000),
  ],
};

describe("independent Engineering content review", () => {
  it("ships the reviewed candidate, exact cover and independently checked authoring", async () => {
    const root = path.resolve(
      import.meta.dirname,
      "../../../content/engineering-structures-and-machines",
    );
    // The authoring source describes the lessons as first published. A course rewritten to v2
    // keeps that bundle in review/history (helpers/published-history.ts); approval is on the current one.
    const current = await loadCourseBundle(path.join(root, "bundle.json"));
    const bundle = CourseBundleSchema.parse(historicalBundle("engineering-structures-and-machines"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    expect(() =>
      assertEditorialApproval(current, review, validateCourseBundle(current)),
    ).not.toThrow();
    for (const lesson of engineeringLessons) {
      lesson.questions.forEach((q, i) =>
        expect(
          bundle.questions.find((item) => item.id === "engr-" + lesson.id + "-" + (i + 1)),
        ).toMatchObject(q),
      );
      lesson.cards.forEach((c, i) =>
        expect(
          bundle.flashcards.find((item) => item.id === "engr-" + lesson.id + "-card-" + (i + 1)),
        ).toMatchObject(c),
      );
      const shipped = bundle.lessons.find((item) => item.id === lesson.id)!;
      expect(shipped.steps.map((s) => s.diagram)).toEqual(lesson.beats.map((b) => b.diagram));
    }
    expect(bundle.courseChecks).toEqual(engineeringChecks);
    const provenance = JSON.parse(
      await readFile(path.join(root, "assets/provenance.json"), "utf8"),
    );
    const cover = await readFile(path.join(root, "assets/cover.svg"));
    expect(createHash("sha256").update(cover).digest("hex")).toBe(provenance.sha256);
  });
  it.each(engineeringLessons)("recomputes all numerical questions in $id", (lesson) => {
    expect(lesson.questions).toHaveLength(6);
    const values = expected[lesson.id]!;
    expect(values).toHaveLength(6);
    lesson.questions.forEach((q, i) => {
      if (q.answerAuthority.kind === "numeric") {
        expect(values[i]).not.toBeNull();
        const a = q.answerAuthority;
        // A rounded key must sit within its stated tolerance of the exact value.
        expect(Math.abs(a.value - values[i]!)).toBeLessThanOrEqual(
          Math.max(a.absoluteTolerance, 1e-9),
        );
        expect(a.absoluteTolerance).toBeLessThan(1);
        expect(q.hints).toHaveLength(3);
      } else expect(values[i]).toBeNull();
    });
  });
  it.each(engineeringLessons)("checks both fresh recall keys and all diagrams in $id", (lesson) => {
    expect(lesson.cards).toHaveLength(2);
    expect(lesson.beats).toHaveLength(4);
    lesson.cards.forEach((card, i) => {
      expect(card.answerAuthority.kind).toBe("numeric");
      if (card.answerAuthority.kind === "numeric")
        expect(card.answerAuthority.value).toBeCloseTo(recall[lesson.id]![i]!, 9);
      expect(lesson.questions.some((q) => q.prompt === card.front)).toBe(false);
    });
    for (const beat of lesson.beats)
      expect(EngineeringDiagramSchema.safeParse(beat.diagram).success).toBe(true);
  });
  it.each(engineeringChecks)("recomputes every fresh problem in $id", (check) => {
    expect(check.items).toHaveLength(12);
    expect(new Set(check.items.map((i) => i.lessonId)).size).toBe(12);
    check.items.forEach((item, i) => {
      const a = item.question.answerAuthority;
      expect(a.kind).toBe("numeric");
      if (a.kind === "numeric")
        expect(Math.abs(a.value - checkValues[check.id]![i]!)).toBeLessThanOrEqual(
          Math.max(a.absoluteTolerance, 1e-9),
        );
    });
  });
  it("keeps multiple choice rare, checks distinct from teaching and the transfer delayed", () => {
    const questions = engineeringLessons.flatMap((l) => l.questions);
    expect(
      questions.filter((q) => q.choices?.length).length / questions.length,
    ).toBeLessThanOrEqual(0.35);
    const prompts = [
      ...questions.map((q) => q.prompt),
      ...engineeringChecks.flatMap((c) => c.items.map((i) => i.question.prompt)),
    ];
    expect(new Set(prompts).size).toBe(prompts.length);
    expect(engineeringChecks[0]!.requiredLessonIds).toEqual([]);
    for (const c of engineeringChecks.slice(1)) expect(c.requiredLessonIds).toHaveLength(12);
    expect(engineeringChecks[2]).toMatchObject({ afterCheckId: "mixed-challenge", delayDays: 7 });
  });
});
