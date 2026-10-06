import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadCourseBundle, assertEditorialApproval, validateCourseBundle } from "../src/index.js";
import { astronomyLessons } from "../../../content/astronomy-sky-to-cosmos/authoring/lessons.js";
import { astronomyChecks } from "../../../content/astronomy-sky-to-cosmos/authoring/course-checks.js";
import { AstronomyDiagramSchema } from "@discere/contracts";

/*
 * Every key below is recomputed from the problem statement with plain arithmetic, independent of
 * the explorer engine. `null` marks a choice or a word answer.
 */
const deg = Math.PI / 180;
const noon = (lat: number, dec: number) => 90 - Math.abs(lat - dec);
const lit = (angle: number) => (100 * (1 - Math.cos(angle * deg))) / 2;
const vCirc = (gm: number, rKm: number) => Math.sqrt(gm / (rKm * 1000)) / 1000;
const wienNm = (t: number) => 2.898e-3 / t / 1e-9;
const lum = (r: number, t: number) => r ** 2 * (t / 5772) ** 4;
const lifeGyr = (m: number) => 10 * m ** -2.5;
const GM_EARTH = 3.986e14;

const expected: Record<string, Array<number | null>> = {
  "turning-sky": [52, 15 * 6, 90 - 52, noon(52, 20), noon(30, -10), null],
  seasons: [noon(51.5, 23.4), noon(51.5, -23.4), noon(40, 0), noon(51.5, 0), 23.4, null],
  "moon-and-eclipses": [lit(90), 360 / 29.53, null, (3475 / 384400) * 57.3, 29.53 / 4, lit(120)],
  "kepler-laws": [
    2 * (1 - 0.6),
    (2 * 1.6) / (2 * 0.4),
    Math.sqrt(4 ** 3),
    Math.sqrt(1 / 4),
    11.86 ** (2 / 3),
    null,
  ],
  "newton-gravity": [1 / 9, 2 * 3, GM_EARTH / 6.371e6 ** 2, 1, 4.283e13 / 3.39e6 ** 2, null],
  "orbits-escape-tides": [
    vCirc(GM_EARTH, 6771),
    Math.sqrt((2 * GM_EARTH) / 6.371e6) / 1000,
    Math.sqrt(1.327e20 / 1.496e11) / 1000,
    2 ** 3,
    Math.sqrt((2 * 4.9e12) / 1.737e6) / 1000,
    null,
  ],
  "brightness-and-distance": [
    1 / 2 ** 2,
    3.828e26 / (4 * Math.PI * 1.496e11 ** 2),
    1 / 0.768,
    Math.sqrt(100),
    (1 / 0.05) * 3.26,
    null,
  ],
  "colour-and-motion": [
    wienNm(5772),
    2.898e-3 / 290e-9,
    (3.0e5 * (662.84 - 656.28)) / 656.28,
    (500 * -150) / 3.0e5,
    null,
    wienNm(3000),
  ],
  "hr-diagram": [
    lum(1, 2 * 5772),
    lum(760, 3600),
    lum(0.01, 4 * 5772),
    null,
    Math.sqrt(100),
    5772 * (4 / 2 ** 2) ** 0.25,
  ],
  "star-lives": [lifeGyr(4) * 1000, 2 ** 3.5, lifeGyr(0.5), null, (1e10 / 1e7) ** (1 / 2.5), null],
  "expanding-universe": [
    0.78 * 3.26,
    70 * 100,
    14000 / 70,
    (73 - 67) * 300,
    (3.0e5 * 10) / 500 / 70,
    null,
  ],
  "big-bang": [
    3.086e19 / 70 / 3.156e16,
    (2.898e-3 / 2.725) * 1000,
    3000 / 2.725,
    977.8 / 50,
    null,
    null,
  ],
};
const recall: Record<string, number[]> = {
  "turning-sky": [41, 135 / 15],
  seasons: [noon(35, -23.4), noon(60, 0)],
  "moon-and-eclipses": [lit(60), (1.39 / 149.6) * 57.3],
  "kepler-laws": [Math.cbrt(27 ** 2), 5 * 1.2],
  "newton-gravity": [2 ** 2, 9.82 / 2 ** 2],
  "orbits-escape-tides": [Math.SQRT2, vCirc(GM_EARTH, 42164)],
  "brightness-and-distance": [1 / 0.25, 1 / 1.52 ** 2],
  "colour-and-motion": [wienNm(14000), (3.0e5 * 3) / 500],
  "hr-diagram": [lum(3, 5772), Math.sqrt(1 / 0.5 ** 4)],
  "star-lives": [lifeGyr(9) * 1000, 4 ** 3.5],
  "expanding-universe": [70 * 40, 3600 / 72],
  "big-bang": [977.8 / 65, 2.898e-3 / 1.0e-3],
};
const checkValues: Record<string, number[]> = {
  "starting-point": [
    noon(40, 30),
    noon(30, 23.4),
    lit(45),
    Math.sqrt(16 ** 3),
    4 ** 2,
    vCirc(GM_EARTH, 7371),
    1 / 0.2,
    wienNm(7245),
    lum(5, 5772),
    lifeGyr(2),
    70 * 50,
    977.8 / 75,
  ],
  "mixed-challenge": [
    lifeGyr(10) * 1000,
    Math.sqrt((2 * 4.283e13) / 3.39e6) / 1000,
    90 - 60,
    400 * (1 + 1500 / 3.0e5),
    noon(-45, -23.4),
    70 * 150,
    (360 * 22.15) / 29.53,
    1.267e17 / 6.9911e7 ** 2,
    Math.sqrt(((1 + 5) / 2) ** 3),
    25 / 10 ** 2 / (1 / 1 ** 2),
    lum(0.5, 2 * 5772),
    (2.898e-3 / 5.45) * 1000,
  ],
  "later-applications": [
    noon(-20, -50),
    noon(51.5, 40),
    lit(150),
    1.524 ** 1.5,
    2 / 2 ** 2,
    vCirc(GM_EARTH, 384400),
    (1 / 0.065) * 3.26,
    (2.898e-3 / 288) * 1e6,
    lum(25, 2 * 5772),
    3 ** 2.5,
    70 * (300 - 100),
    2.725 / 2,
  ],
};

function within(key: number, tolerance: number, truth: number) {
  // The authored key must sit within the stated rounding of the true value, and the tolerance
  // must stay within whole-number rounding or 2%, whichever is wider.
  expect(Math.abs(key - truth)).toBeLessThanOrEqual(tolerance + 1e-9);
  expect(tolerance).toBeLessThanOrEqual(Math.max(0.5, Math.abs(truth) * 0.02));
}

describe("independent Astronomy content review", () => {
  it("ships the reviewed candidate, exact cover and independently checked authoring", async () => {
    const root = path.resolve(import.meta.dirname, "../../../content/astronomy-sky-to-cosmos");
    const bundle = await loadCourseBundle(path.join(root, "bundle.json"));
    const review = JSON.parse(await readFile(path.join(root, "review/publication.json"), "utf8"));
    expect(() =>
      assertEditorialApproval(bundle, review, validateCourseBundle(bundle)),
    ).not.toThrow();
    for (const lesson of astronomyLessons) {
      lesson.questions.forEach((q, i) =>
        expect(
          bundle.questions.find((item) => item.id === "astro-" + lesson.id + "-" + (i + 1)),
        ).toMatchObject(q),
      );
      lesson.cards.forEach((c, i) =>
        expect(
          bundle.flashcards.find((item) => item.id === "astro-" + lesson.id + "-card-" + (i + 1)),
        ).toMatchObject(c),
      );
      const shipped = bundle.lessons.find((item) => item.id === lesson.id)!;
      expect(shipped.steps.map((s) => s.diagram)).toEqual(lesson.beats.map((b) => b.diagram));
    }
    expect(bundle.courseChecks).toEqual(astronomyChecks);
    const choices = bundle.questions.filter((q) => q.choices?.length).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.35);
  });
  it.each(astronomyLessons)("recomputes all numerical questions in $id", (lesson) => {
    expect(lesson.questions).toHaveLength(6);
    const values = expected[lesson.id]!;
    expect(values).toHaveLength(6);
    lesson.questions.forEach((q, i) => {
      const a = q.answerAuthority;
      if (a.kind === "numeric") {
        expect(values[i]).not.toBeNull();
        within(a.value, a.absoluteTolerance, values[i]!);
        expect(q.hints).toHaveLength(3);
      } else expect(values[i]).toBeNull();
    });
  });
  it.each(astronomyLessons)("checks both fresh recall keys and all diagrams in $id", (lesson) => {
    expect(lesson.cards).toHaveLength(2);
    expect(lesson.beats).toHaveLength(4);
    lesson.cards.forEach((card, i) => {
      const a = card.answerAuthority;
      expect(a.kind).toBe("numeric");
      if (a.kind === "numeric") within(a.value, a.absoluteTolerance, recall[lesson.id]![i]!);
      expect(lesson.questions.some((q) => q.prompt === card.front)).toBe(false);
    });
    for (const beat of lesson.beats)
      expect(AstronomyDiagramSchema.safeParse(beat.diagram).success).toBe(true);
  });
  it.each(astronomyChecks)("recomputes every fresh problem in $id", (check) => {
    expect(check.items).toHaveLength(12);
    expect(new Set(check.items.map((i) => i.lessonId)).size).toBe(12);
    check.items.forEach((item, i) => {
      const a = item.question.answerAuthority;
      expect(a.kind).toBe("numeric");
      if (a.kind === "numeric") within(a.value, a.absoluteTolerance, checkValues[check.id]![i]!);
    });
  });
  it("keeps independent checks distinct from teaching and requires a delayed final application", () => {
    const prompts = [
      ...astronomyLessons.flatMap((l) => l.questions.map((q) => q.prompt)),
      ...astronomyLessons.flatMap((l) => l.cards.map((c) => c.front)),
      ...astronomyChecks.flatMap((c) => c.items.map((i) => i.question.prompt)),
    ];
    expect(new Set(prompts).size).toBe(prompts.length);
    expect(astronomyChecks[0]!.requiredLessonIds).toEqual([]);
    for (const c of astronomyChecks.slice(1)) expect(c.requiredLessonIds).toHaveLength(12);
    expect(astronomyChecks[2]).toMatchObject({ afterCheckId: "mixed-challenge", delayDays: 7 });
  });
});
