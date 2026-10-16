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

const rad = Math.PI / 180;
/** Altitude of a body at declination δ seen from latitude φ at hour angle H, all in degrees. */
const altitude = (latitude: number, declination: number, hourAngle: number) =>
  Math.asin(
    Math.sin(declination * rad) * Math.sin(latitude * rad) +
      Math.cos(declination * rad) * Math.cos(latitude * rad) * Math.cos(hourAngle * rad),
  ) / rad;
/** The lowest altitude of a body's daily circle, which is where it crosses below the pole. */
const lowestAltitude = (latitude: number, declination: number) =>
  altitude(latitude, declination, 180);
/** Smallest declination whose whole circle clears the horizon, found by bisection. */
const circumpolarLimit = (latitude: number) => {
  let [low, high] = [0, 90];
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (lowestAltitude(latitude, mid) > 0) high = mid;
    else low = mid;
  }
  return high;
};
/** Hours of daylight for the Sun's centre from the sunrise equation. */
const daylight = (latitude: number, declination: number) =>
  (2 * Math.acos(-Math.tan(latitude * rad) * Math.tan(declination * rad))) / rad / 15;

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
      // The story lessons (turning-sky, seasons, moon-and-eclipses) run to 11–13 steps.
      expect(lesson.steps.length).toBeLessThanOrEqual(13);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
      expect(lesson.calculator).toBe("available");
    }
  });

  it("keeps multiple choice to at most 35% of the course", () => {
    const choices = bundle.questions.filter((item) => item.choices && item.choices.length > 0);
    expect(choices.length / bundle.questions.length).toBeLessThanOrEqual(0.35);
  });

  it("writes the twelve lessons as stories", () => {
    const words = (text: string) => text.split(/\s+/u).filter(Boolean).length;
    const prose = (blocks: ReadonlyArray<{ kind: string; text?: string }> = []) =>
      blocks.map((block) => block.text ?? "").join(" ");
    const lessons = [
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
    ].map(
      (id) => bundle.lessons.find((lesson) => lesson.id === id)!,
    );
    for (const lesson of lessons) {
      const intro = lesson.intro!;
      // Opener: 120–200 words in two or three paragraphs, a promise, and no question.
      const opener = words(prose(intro.hook.blocks));
      expect(opener).toBeGreaterThanOrEqual(120);
      expect(opener).toBeLessThanOrEqual(200);
      expect(intro.hook.blocks.length).toBeGreaterThanOrEqual(2);
      expect(intro.hook.blocks.length).toBeLessThanOrEqual(3);
      expect(intro.hook.questionId).toBeUndefined();
      expect(words(intro.promise)).toBeLessThanOrEqual(25);
      expect(intro.promise).toMatch(/^By the end you(?:'|’)ll /u);
      // Steps: at least 40% teaching screens of 80–280 words, 3–6 asking, one transfer, a figure.
      const teaching = lesson.steps.filter((step) => step.kind === "explain");
      const asking = lesson.steps.filter((step) => step.kind !== "explain");
      expect(teaching.length / lesson.steps.length).toBeGreaterThanOrEqual(0.4);
      expect(asking.length).toBeGreaterThanOrEqual(3);
      expect(asking.length).toBeLessThanOrEqual(6);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
      expect(lesson.steps.some((step) => step.diagram)).toBe(true);
      for (const step of teaching) {
        expect(step.checkQuestionId).toBe("");
        const body = words(prose(step.lead) + " " + prose(step.afterFigure));
        expect(body).toBeGreaterThanOrEqual(80);
        expect(body).toBeLessThanOrEqual(280);
      }
      for (const step of asking) {
        // A worked example asks through its self-explanation line instead of a check question.
        if (step.kind === "worked_example")
          expect(step.workedSteps!.some((line) => line.selfExplain?.questionId)).toBe(true);
        else expect(step.checkQuestionId).not.toBe("");
        expect(words(prose(step.lead))).toBeLessThanOrEqual(60);
        if (step.diagram) expect(step.answerVisibility).toBe("hidden-until-response");
      }
      let run = 0;
      for (const step of lesson.steps) {
        run = step.kind === "explain" ? run + 1 : 0;
        expect(run).toBeLessThanOrEqual(3);
      }
      // Close: a key idea and a bridge that is a statement, not a question.
      expect(lesson.recap!.nextHook).toBeDefined();
      expect(lesson.recap!.nextHook).not.toContain("?");
      // Every graded question the lesson asks is cited, and every step too.
      const cited = new Set(
        bundle.authoringMetadata!.find((item) => item.lessonId === lesson.id)!.citations.map(
          (citation) => citation.targetKind + ":" + citation.targetId,
        ),
      );
      for (const step of lesson.steps) expect(cited.has("step:" + step.id)).toBe(true);
    }
    // Each lesson's bridge leads into the next lesson's opener.
    const opening = (index: number) => prose(lessons[index]!.intro!.hook.blocks);
    expect(lessons[0]!.recap!.nextHook).toMatch(/stick/u);
    expect(opening(1)).toMatch(/stick/u);
    expect(lessons[1]!.recap!.nextHook).toMatch(/Moon/u);
    expect(opening(2)).toMatch(/Moon/u);
    expect(lessons[2]!.recap!.nextHook).toMatch(/orbit/u);
    expect(opening(3)).toMatch(/circle/u);
    expect(lessons[3]!.recap!.nextHook).toMatch(/Newton/u);
    expect(opening(4)).toMatch(/Newton/u);
    expect(lessons[4]!.recap!.nextHook).toMatch(/orbit/u);
    expect(opening(5)).toMatch(/orbit/u);
    expect(lessons[5]!.recap!.nextHook).toMatch(/brightness of a star/u);
    expect(opening(6)).toMatch(/torch/u);
    expect(lessons[6]!.recap!.nextHook).toMatch(/colour/u);
    expect(opening(7)).toMatch(/poker/u);
    expect(lessons[7]!.recap!.nextHook).toMatch(/against the other/u);
    expect(opening(8)).toMatch(/two numbers/u);
    expect(lessons[8]!.recap!.nextHook).toMatch(/mass/u);
    expect(opening(9)).toMatch(/mass/u);
    expect(lessons[9]!.recap!.nextHook).toMatch(/galaxies/u);
    expect(opening(10)).toMatch(/galaxy/u);
    expect(lessons[10]!.recap!.nextHook).toMatch(/backwards/u);
    expect(opening(11)).toMatch(/backwards/u);
    expect(lessons[11]!.recap!.nextHook).toMatch(/completes the course/u);
    // Every question a story lesson asks is cited, and every question it no longer asks has no citation.
    for (const lesson of lessons.slice(3)) {
      const asked = new Set([
        ...lesson.questionIds,
        ...lesson.steps.flatMap((step) => [
          step.checkQuestionId,
          ...(step.workedSteps ?? []).map((line) => line.selfExplain?.questionId),
        ]),
      ]);
      const cited = bundle.authoringMetadata!.find((item) => item.lessonId === lesson.id)!.citations;
      for (const id of asked) if (id) expect(cited.some((c) => c.targetId === id)).toBe(true);
      for (const c of cited)
        if (c.targetKind === "question") expect(asked.has(c.targetId)).toBe(true);
    }
    // The meridian-altitude rule moved from lesson 1 to lesson 2, where it is taught for the Sun.
    expect(lessons[0]!.taughtSkills).not.toContain("meridian-altitude");
    expect(lessons[1]!.steps.some((step) => step.id === "noon-height")).toBe(true);
  });

  it("1 The turning sky: rate, pole height, circumpolar limit (story format)", () => {
    const p = "astro-turning-sky-";
    // The ported prototype: six practice items and three skill-check items.
    same(p + "7", 360 / 24);
    same(p + "1", altitude(52, 90, 0)); // a star at the pole stands as high as the latitude
    same(p + "12", altitude(41, 90, 0));
    same(p + "13", circumpolarLimit(40));
    same(p + "14", 135 / 15);
    same(p + "15", circumpolarLimit(30));
    expect(choiceMarked(p + "8")).toEqual(["a"]);
    expect(choiceMarked(p + "10")).toEqual(["a"]);
    expect(choiceMarked(p + "16")).toEqual(["c"]);
    // On the equator the limit is 90°, which no star exceeds: none is circumpolar.
    expect(circumpolarLimit(0)).toBeCloseTo(90, 6);
    expect(circumpolarLimit(60)).toBeCloseTo(30, 6); // the worked example, +30° from 60° N
    // Numbers in the prose.
    expect(24 * 60 - (23 * 60 + 56)).toBe(4); // a star rises four minutes earlier each night
    expect(Math.round((52 * 6371 * rad) / 100) * 100).toBe(5800); // equator to Amsterdam, km
    expect(Math.round(6371 * rad)).toBe(111); // one degree of latitude, km
    // Still in the question bank, no longer in the lesson.
    same(p + "2", 15 * 6);
    same(p + "3", 90 - 52);
    same(p + "4", 90 - Math.abs(52 - 20));
    same(p + "5", 90 - Math.abs(30 - -10));
    same(p + "11", 270 / 15);
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
    expect(choiceMarked(p + "10")).toEqual(["a"]);
    expect(choiceMarked(p + "6")).toEqual(["1"]);
    // The rule is the spherical altitude of the Sun on the meridian.
    for (const [latitude, declination] of [
      [51.5, tilt],
      [51.5, -tilt],
      [-33.9, tilt],
      [35, tilt],
      [-20, -tilt],
    ] as const)
      expect(altitude(latitude, declination, 0)).toBeCloseTo(noon(latitude, declination), 9);
    // Worked examples in the prose.
    expect(noon(35, tilt)).toBeCloseTo(78.4, 9);
    expect(dp(35 - tilt, 1)).toBe(11.6);
    expect(noon(40, -tilt)).toBeCloseTo(26.6, 9);
    expect(dp(40 + tilt, 1)).toBe(63.4);
    expect(noon(-20, tilt)).toBeCloseTo(46.6, 9);
    expect(dp(20 + tilt, 1)).toBe(43.4);
    expect(noon(-20, -tilt)).toBeCloseTo(86.6, 9);
    expect(dp(tilt - 20, 1)).toBe(3.4);
    expect(noon(25, 0)).toBe(65);
    expect(noon(0, 0)).toBe(90);
    expect(dp(51.5 - tilt, 1)).toBe(28.1); // reveal of the June step
    expect(dp(51.5 + tilt, 1)).toBe(74.9); // reveal of the December step
    // The opening shadow: length as a multiple of the stick's height.
    const shadow = (altitudeDegrees: number) => 1 / Math.tan(altitudeDegrees * rad);
    expect(shadow(61.9)).toBeGreaterThan(0.5); // a little over half
    expect(shadow(61.9)).toBeLessThan(0.55);
    expect(shadow(15.1)).toBeGreaterThan(3.6); // nearly four times
    expect(dp(shadow(15.1), 1)).toBe(3.7);
    expect(Math.round(shadow(15.1) / shadow(61.9))).toBe(7); // about seven times as long
    // A beam at altitude h covers 1/sin h of the overhead ground.
    const spread = (altitudeDegrees: number) => 1 / Math.sin(altitudeDegrees * rad);
    expect(dp(spread(61.9), 1)).toBe(1.1);
    expect(dp(spread(15.1), 1)).toBe(3.8);
    expect(spread(15.1) / spread(61.9)).toBeGreaterThan(3);
    expect(spread(61.9) / spread(15.1)).toBeLessThan(1 / 3);
    expect(spread(20)).toBeGreaterThan(spread(60)); // the beam-spread choice item
    // London's daylight at the solstices.
    expect(dp(daylight(51.5, tilt), 1)).toBe(16.4);
    expect(dp(daylight(51.5, -tilt), 1)).toBe(7.6);
    // Earth's distance varies by about 3% (perihelion 147.1, aphelion 152.1 million km).
    expect(dp((152.1 - 147.1) / ((152.1 + 147.1) / 2) * 100, 0)).toBe(3);
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
    expect(choiceMarked(p + "8")).toEqual(["a"]);
    expect(question(p + "3").answerAuthority.kind).toBe("text"); // one word: "full"
    // Numbers in the prose.
    expect(dp(lit(150), 1)).toBe(93.3); // the worked example
    expect(dp(1 - Math.cos(150 * rad), 3)).toBe(1.866);
    expect(dp(Math.cos(150 * rad), 3)).toBe(-0.866);
    expect(lit(0)).toBe(0);
    expect(lit(180)).toBeCloseTo(100, 9);
    expect(dp((150 / 360) * 29.53, 1)).toBe(12.3); // 150° is 12.3 days after new moon
    expect(dp(29.53 / 2 - (150 / 360) * 29.53, 1)).toBe(2.5); // a couple of days before full
    expect(dp(1 / (1 / 27.32 - 1 / 365.25), 2)).toBe(29.53); // synodic from the sidereal month
    expect(dp(27.32 * (360 / 365.25), 0)).toBe(27); // the Sun moves on about 27°
    expect(dp(29.53 - 27.32, 1)).toBe(2.2); // a little over two more days
    expect(dp(360 / 27.32 - 360 / 365.25, 1)).toBe(12.2); // Moon's and Sun's daily drift
    expect(Math.round(((360 / 29.53) / 15) * 60)).toBe(49); // minutes later each night
    expect(384400 * Math.sin(5.1 * rad)).toBeGreaterThan(30000); // lift of the tilted orbit, km
    expect(dp((1.39e6 / 1.496e8) * 57.3, 2)).toBe(0.53); // the Sun's angular diameter
    expect(Math.round(1.39e6 / 3475 / 100) * 100).toBe(400); // Sun's width over the Moon's
    expect(Math.round(1.496e8 / 384400 / 100) * 100).toBe(400); // and its distance over the Moon's
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
    expect(choiceMarked(p + "9")).toEqual(["a"]);
    expect(choiceMarked(p + "10")).toEqual(["a"]);
    // Numbers in the story prose.
    expect((3 + 9) / 2).toBe(6); // size-of-an-orbit: a comet from 3 AU to 9 AU
    expect(dp(1.52 ** 3, 2)).toBe(3.51); // Mars, P² = a³
    expect(dp(Math.sqrt(1.52 ** 3), 2)).toBe(1.87);
    expect(Math.sqrt(4 ** 3)).toBe(8); // four times as wide, eight times as long
    expect(Math.round(((1 + 0.017) / (1 - 0.017) - 1) * 100)).toBe(3); // Earth, near to far
    expect(Math.sqrt(1 ** 3 / 9)).toBeCloseTo(1 / 3, 12); // a star of nine solar masses, one AU
    expect(dp((1 / 3) * 12, 0)).toBe(4); // months
    expect(Math.sqrt(1 ** 3 / 4)).toBe(0.5); // the recap: four solar masses
    // Mars missed by the circle: 8 arcminutes against the Full Moon's 31, about a quarter.
    expect(Math.round((8 / (0.52 * 60)) * 100) / 100).toBeCloseTo(0.26, 2);
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
    expect(choiceMarked(p + "6")).toEqual(["1"]);
    expect(choiceMarked(p + "9")).toEqual(["a"]);
    // The apple and the Moon: the Moon's fall in one second against the apple's.
    const g = 3.986e14 / 6.371e6 ** 2;
    const apple = 0.5 * g * 1 ** 2; // metres fallen in the first second
    const moonSpeed = (2 * Math.PI * 3.844e8) / (27.32 * 86400); // sidereal month
    const moonFall = moonSpeed ** 2 / (2 * 3.844e8); // metres below the straight line in 1 s
    expect(dp(apple, 0)).toBe(5);
    expect(dp(moonFall * 1000, 1)).toBe(1.4);
    expect(Math.round(apple / moonFall / 100) * 100).toBe(3600);
    expect(Math.round(3.844e8 / 6.371e6)).toBe(60);
    expect(60 * 60).toBe(3600);
    // The Moon's surface gravity, worked in the prose.
    expect(dp(1.737e6 ** 2 / 1e12, 3)).toBe(3.017);
    expect(dp(4.9e12 / 1.737e6 ** 2, 2)).toBe(1.62);
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
    expect(choiceMarked(p + "6")).toEqual(["1"]);
    expect(choiceMarked(p + "9")).toEqual(["a"]);
    // The ball puzzle: the ground drops about 5 m over 8 km, and a ball falls about 5 m in a second.
    expect(dp(8000 ** 2 / (2 * 6.371e6), 0)).toBe(5);
    expect(dp(0.5 * (3.986e14 / 6.371e6 ** 2), 0)).toBe(5);
    expect(dp(Math.sqrt(GM / 6.371e6) / 1000, 0)).toBe(8);
    expect(dp(Math.sqrt(2), 2)).toBe(1.41); // escape over circular
    expect(dp(Math.sqrt(2 * GM / 6.371e6) / Math.sqrt(GM / 6.371e6), 2)).toBe(1.41);
    expect(3 ** 3).toBe(27); // a Moon three times as far gives a 27th of the stretch
    expect(2 ** 3).toBe(8); // halving the distance
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
    expect(choiceMarked(p + "9")).toEqual(["a"]);
    expect(2 ** 2).toBe(4); // a torch at 2 m lights four times the area
    expect(Math.round(1.496e11 / Math.tan(Math.PI / 180 / 3600) / 1.496e11)).toBe(206265); // 1 pc in AU
    expect(dp(1 / 0.5, 0)).toBe(2); // p = 0.5 arcseconds is 2 pc
    expect(16 / 4 ** 2).toBe(1); // 16 L at 4 times the distance matches 1 L
    expect(1 / 0.768 * 3.26).toBeCloseTo(4.25, 1); // Proxima in light-years
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
    expect(choiceMarked(p + "5")).toEqual(["1"]);
    expect(choiceMarked(p + "9")).toEqual(["a"]);
    expect(Math.round((wien / 310) * 1e9 / 10) * 10).toBe(9350); // skin, in nanometres
    expect(nearest((3e5 * 0.5) / 100, 10)).toBe(1500); // a line stretched by 0.5%
    expect(dp(0.01 * 3e5, 0)).toBe(3000); // a 1% stretch
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
    expect(3 ** 2).toBe(9); // a star three times as wide has nine times the surface
    expect(3 ** 4).toBe(81); // a surface three times hotter shines 81 times as brightly
    expect((81 / 1 ** 2) ** 0.25).toBeCloseTo(3, 9); // 81 L☉ at the Sun's radius, taught backwards
    expect(choiceMarked(p + "8")).toEqual(["a"]);
    const hrLesson = bundle.lessons.find((lesson) => lesson.id === "hr-diagram")!;
    expect(hrLesson.questionIds).toEqual([p + "5", p + "6", p + "11"]);
    expect(hrLesson.steps.filter((step) => step.diagram).length).toBeGreaterThanOrEqual(2);
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
    expect(dp(3 ** 3.5, 0)).toBe(47); // the teaching screen's 3 M☉ example
    expect(Math.round(10e9 * 10 ** -2.5 / 1e6)).toBe(32); // a 10 M☉ star lasts about 32 million years
    expect(4 ** 2.5).toBe(32); // a quarter of the Sun's mass: M⁻²·⁵ = 32, so 320 billion years
    expect(dp(100 ** 0.4, 1)).toBe(6.3); // a star that lasts a hundredth as long as the Sun
    expect(choiceMarked(p + "8")).toEqual(["a"]);
    expect(dp(2 ** 3.5, 0)).toBe(11); // the reveal for a 2 M☉ star
    expect(bundle.questions.find((item) => item.id === p + "7")!.prompt).toContain("Give a decimal");
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
    expect(dp(0.05 * 3.26 * 1000, 0)).toBe(163); // the Large Magellanic Cloud, in thousands of years
    expect([5 * 1.2 - 5, 15 * 1.2 - 15]).toEqual([1, 3]); // the 20% stretch of the sheet, 5 cm and 15 cm gaps
    expect(dp(3e5 * ((404 - 400) / 400), 0)).toBe(3000); // the worked chain: line at 404.0 nm
    expect(dp(3000 / 70, 0)).toBe(43); // and the distance it gives, in Mpc
    expect([70 * 10, 70 * 20]).toEqual([700, 1400]); // Hubble's law examples
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
    expect(60 / 40).toBe(1.5); // the car on the first screen
    expect(dp(3.086e19 / 3.156e16, 1)).toBe(977.8); // the shortcut constant
    expect(dp(977.8 / 90, 1)).toBe(10.9); // H₀ = 90 on the "rough age" screen
    expect(300 / 100).toBe(3); // a 300 K glow stretched 100 times
    expect(dp((2.898e-3 / 3000) * 1e9, 0)).toBe(966); // the glow at release peaks near 1 µm, in nm
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
