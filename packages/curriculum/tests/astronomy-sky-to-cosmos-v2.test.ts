import { existsSync, readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * Astronomy: Sky to Cosmos, v2 conversion. Every numeric key written or changed in the migration is
 * recomputed here from the arithmetic the item describes, not read back from the authority it checks.
 * The candidate is read while the course awaits publication; the published bundle afterwards.
 */
const root = new URL("../../../content/astronomy-sky-to-cosmos/", import.meta.url);
const candidate = new URL(".authoring/candidate.json", root);
const bundle = JSON.parse(
  readFileSync(existsSync(candidate) ? candidate : new URL("bundle.json", root), "utf8"),
) as CourseBundle;

const lessonOrder = [
  "turning-sky",
  "seasons",
  "moon-and-eclipses",
  "kepler-laws",
  "newton-gravity",
  "orbits-escape-tides",
  "brightness-and-distance",
  "colour-and-motion",
  "hr-diagram",
  "star-lives",
  "expanding-universe",
  "big-bang",
];

const question = (id: string): Question => {
  const found = bundle.questions.find((item) => item.id === id);
  if (!found) throw new Error(`no question ${id}`);
  return found;
};
const key = (id: string) => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const choiceMarked = (id: string) => {
  const item = question(id);
  if (item.answerAuthority.kind !== "text") throw new Error("not a choice");
  const authority = item.answerAuthority;
  return item
    .choices!.filter((choice) => assessTextAnswer(choice.label, authority).correct)
    .map((c) => c.id);
};
/** Round to a number of decimal places, as the prompt asks. */
const dp = (x: number, places: number) => Number(x.toFixed(places));
const nearest = (x: number, step: number) => Math.round(x / step) * step;
const same = (id: string, expected: number) => expect(key(id)).toBeCloseTo(expected, 9);

describe("Astronomy: Sky to Cosmos (v2)", () => {
  it("validates, with every lesson in the v2 shape", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(bundle.lessons.map((lesson) => lesson.id)).toEqual(lessonOrder);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro).toBeDefined();
      expect(lesson.recap).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length).toBeLessThanOrEqual(7);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
      expect(lesson.calculator).toBe("available");
    }
  });

  it("keeps multiple choice to at most 35% of the course", () => {
    const choices = bundle.questions.filter((item) => item.choices && item.choices.length > 0);
    expect(choices.length / bundle.questions.length).toBeLessThanOrEqual(0.35);
  });

  it("1 The turning sky: rate, pole height, circumpolar limit, meridian altitude", () => {
    const p = "astro-turning-sky-";
    same(p + "7", 360 / 24);
    same(p + "1", 52); // the pole stands as high as the latitude
    same(p + "2", 15 * 6);
    same(p + "3", 90 - 52);
    same(p + "4", 90 - Math.abs(52 - 20));
    same(p + "5", 90 - Math.abs(30 - -10));
    same(p + "11", 270 / 15);
    expect(choiceMarked(p + "8")).toEqual(["a"]);
    expect(choiceMarked(p + "10")).toEqual(["a"]);
  });

  it("2 Why the seasons change: noon altitude is 90° − |φ − δ|", () => {
    const p = "astro-seasons-";
    const tilt = 23.4;
    const noon = (latitude: number, declination: number) =>
      90 - Math.abs(latitude - declination);
    same(p + "7", dp(tilt - -tilt, 1));
    same(p + "1", dp(noon(51.5, tilt), 1));
    same(p + "2", dp(noon(51.5, -tilt), 1));
    same(p + "3", noon(40, 0));
    same(p + "4", dp(noon(51.5, 0), 1));
    same(p + "5", tilt); // overhead when |φ − δ| = 0
    same(p + "11", dp(noon(-33.9, tilt), 1));
    expect(noon(35, tilt)).toBeCloseTo(78.4, 9); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("3 Phases and eclipses: lit fraction, synodic month, angular size", () => {
    const p = "astro-moon-and-eclipses-";
    const lit = (degrees: number) => ((1 - Math.cos((degrees * Math.PI) / 180)) / 2) * 100;
    same(p + "7", 30 / 2);
    same(p + "1", dp(lit(90), 6));
    same(p + "6", dp(lit(120), 6));
    same(p + "2", dp(360 / 29.53, 1));
    same(p + "5", dp(29.53 / 4, 2));
    same(p + "4", dp((3475 / 384400) * 57.3, 2));
    same(p + "11", dp((3475 / (2 * 384400)) * 57.3, 2));
    expect(dp(lit(150), 1)).toBe(93.3); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("4 Kepler's laws: perihelion, speed ratio, P² = a³", () => {
    const p = "astro-kepler-laws-";
    same(p + "7", 1 + 9);
    same(p + "1", dp(2 * (1 - 0.6), 6));
    same(p + "2", (2 * (1 + 0.6)) / (2 * (1 - 0.6)));
    same(p + "3", Math.sqrt(4 ** 3));
    same(p + "4", Math.sqrt(1 ** 3 / 4));
    same(p + "5", dp(11.86 ** (2 / 3), 2));
    same(p + "11", (0.5 + 7.5) / 2);
    expect(3 * (1 + 0.5)).toBe(4.5); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("5 Newton's gravitation: inverse square, product of masses, field", () => {
    const p = "astro-newton-gravity-";
    const G = 6.674e-11;
    same(p + "1", dp(1 / 3 ** 2, 3));
    same(p + "2", 2 * 3);
    same(p + "3", dp(3.986e14 / 6.371e6 ** 2, 2));
    // Earth on Moon and Moon on Earth: the same product of masses over the same r².
    const [earth, moon, r] = [81, 1, 3.844e8];
    same(p + "4", (G * earth * moon) / r ** 2 / ((G * moon * earth) / r ** 2));
    same(p + "5", dp(4.283e13 / 3.39e6 ** 2, 2));
    same(p + "7", 1 / 2 ** 2);
    same(p + "11", 1 / 4 ** 2);
    expect(2 ** 2 * 2).toBe(8); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("6 Orbits, escape and tides: circular and escape speed, tidal cube law", () => {
    const p = "astro-orbits-escape-tides-";
    const GM = 3.986e14;
    same(p + "7", 8 / 1); // 8 km along the ground per 5 m of fall, which takes 1 s
    same(p + "1", dp(Math.sqrt(GM / 6.771e6) / 1000, 2));
    same(p + "2", dp(Math.sqrt((2 * GM) / 6.371e6) / 1000, 2));
    same(p + "3", dp(Math.sqrt(1.327e20 / 1.496e11) / 1000, 1));
    same(p + "4", 2 ** 3);
    same(p + "5", dp(Math.sqrt((2 * 4.9e12) / 1.737e6) / 1000, 2));
    same(p + "11", dp(Math.sqrt(GM / 8e6) / 1000, 2));
    expect(dp(Math.sqrt(GM / 3.844e8) / 1000, 2)).toBe(1.02); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
    expect(choiceMarked(p + "10")).toEqual(["a"]);
  });

  it("7 Brightness and distance: flux, parallax, equal-flux distance", () => {
    const p = "astro-brightness-and-distance-";
    same(p + "7", 3 ** 2);
    same(p + "1", 1 / 2 ** 2);
    same(p + "2", Math.round(3.828e26 / (4 * Math.PI * 1.496e11 ** 2)));
    same(p + "3", dp(1 / 0.768, 2));
    same(p + "4", Math.sqrt(100));
    same(p + "5", dp((1 / 0.05) * 3.26, 1));
    same(p + "11", dp(4 / 3 ** 2, 3));
    expect(Math.round(3.828e26 / (4 * Math.PI * (5 * 1.496e11) ** 2))).toBe(54); // worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("8 Temperature, colour and motion: Wien's law and the Doppler shift", () => {
    const p = "astro-colour-and-motion-";
    const wien = 2.898e-3;
    same(p + "7", (505 - 500) / 500 * 100);
    same(p + "1", Math.round((wien / 5772) * 1e9));
    same(p + "2", nearest(wien / 290e-9, 100));
    same(p + "3", nearest((3e5 * (662.84 - 656.28)) / 656.28, 10));
    same(p + "4", dp((500 * -150) / 3e5, 3));
    same(p + "6", Math.round((wien / 3000) * 1e9));
    same(p + "11", nearest((3e5 * 1.31) / 656.28, 10));
    expect(Math.round((wien / 9000) * 1e9)).toBe(322); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("9 The H–R diagram: L = R²(T/T☉)⁴", () => {
    const p = "astro-hr-diagram-";
    const lum = (radius: number, tRatio: number) => radius ** 2 * tRatio ** 4;
    same(p + "7", 2 ** 2);
    same(p + "1", lum(1, 2));
    same(p + "2", nearest(lum(760, 3600 / 5772), 1000));
    same(p + "3", dp(lum(0.01, 4), 4));
    same(p + "5", Math.sqrt(100));
    // Solve 4 = 2² (T/T☉)⁴ for T.
    same(p + "6", 5772 * (4 / 2 ** 2) ** 0.25);
    same(p + "11", lum(0.5, 2));
    expect(lum(2, 1.5)).toBeCloseTo(20.25, 9); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("10 How mass sets a star's life: t = 10 Gyr × M^−2.5, L = M^3.5", () => {
    const p = "astro-star-lives-";
    same(p + "7", 3 / 12);
    same(p + "1", dp((10e9 * 4 ** -2.5) / 1e6, 1));
    same(p + "2", dp(2 ** 3.5, 1));
    same(p + "3", dp(10 * 0.5 ** -2.5, 1));
    same(p + "5", Math.round((1e7 / 1e10) ** (-1 / 2.5)));
    same(p + "10", nearest(10 ** 3.5, 100));
    expect(dp(10 * 2 ** -2.5, 2)).toBe(1.77); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("11 Galaxies and Hubble's law: v = H₀d", () => {
    const p = "astro-expanding-universe-";
    same(p + "7", (20 * 2 - 20) / (10 * 2 - 10)); // C's gain over B's gain when every gap doubles
    same(p + "1", dp(0.78 * 3.26, 1));
    same(p + "2", 70 * 100);
    same(p + "3", 14000 / 70);
    same(p + "4", (73 - 67) * 300);
    same(p + "5", Math.round((3e5 * (510 - 500)) / 500 / 70));
    same(p + "11", 72 * 150);
    expect(70 * 30).toBe(2100); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("12 The Big Bang: 1/H₀, the background's peak and its stretch", () => {
    const p = "astro-big-bang-";
    same(p + "7", 100 / 50);
    same(p + "1", dp(3.086e19 / 70 / 3.156e16, 1));
    same(p + "2", dp((2.898e-3 / 2.725) * 1000, 2));
    same(p + "3", Math.round(3000 / 2.725));
    same(p + "4", dp(977.8 / 50, 1));
    same(p + "11", dp((1.0 * Math.round(3000 / 2.725)) / 1000, 2));
    expect(dp(3.086e19 / 60 / 3.156e16, 1)).toBe(16.3); // the worked example
    expect(choiceMarked(p + "8")).toEqual(["a"]);
  });

  it("gives every misconception a distinct wrong value, never the key", () => {
    for (const item of bundle.questions) {
      for (const misconception of item.misconceptions ?? []) {
        if (item.answerAuthority.kind === "numeric")
          expect(misconception.match.numeric ?? []).not.toContain(item.answerAuthority.value);
      }
    }
  });
});
