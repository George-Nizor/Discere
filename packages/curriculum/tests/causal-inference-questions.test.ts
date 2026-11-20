import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Statistical and Causal Inference follows the way History and Machine Learning ask questions
 * (docs/question-writing-guide.md), adapted to statistics: most questions describe a study, a poll,
 * a trial or a causal diagram in words and ask what follows. The questions about a figure (a standard
 * error, a margin, a p-value, a power, a sample size, a count of assignments) are multiple choice and
 * ask for the size or direction of the figure, never for an exact value. This file recomputes the
 * fact behind each right option and the slip behind each wrong one, and the figures that the other
 * judgement questions quote. The definitions come from the course's own
 * sources: OpenStax Introductory Statistics, the NIST e-Handbook, the ASA statement on p-values,
 * Ioannidis (2005), Hernan and Robins, Pearl, and Charig et al. (1986) for the kidney stone data.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/statistical-and-causal-inference/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const get = (suffix: string): Question => {
  const question = questions.get(`staci-${suffix}`);
  if (!question) throw new Error(`missing question ${suffix}`);
  return question;
};
const flat = (text: string): string => text.replace(/−/gu, "-").replace(/(\d),(\d{3})/gu, "$1$2");
const numbers = (text: string): number[] =>
  (flat(text).match(/-?\d+(?:\.\d+)?/gu) ?? []).map(Number);

// The standard normal distribution function (Abramowitz and Stegun 7.1.26, error below 1.5e-7).
const erf = (x: number): number => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const value = 1 - poly * Math.exp(-x * x);
  return x >= 0 ? value : -value;
};
const phi = (z: number): number => 0.5 * (1 + erf(z / Math.SQRT2));
const choose = (n: number, k: number): number => {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return Math.round(result);
};

const words = (text: string) => text.split(/\s+/u).filter(Boolean).length;
const near = (value: number, target: number, tolerance: number): boolean =>
  Math.abs(value - target) <= tolerance;
const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/**
 * No question asks the learner to compute an exact figure, because a calculator or an assistant does
 * that in practice. Each converted question is multiple choice: the learner judges which option the
 * figures support, and each wrong option is a slip people make with them. `right` is the label of the
 * right option, `holds` recomputes the fact that option states, `mistakes` recomputes the figures that
 * the wrong options come from, and `uses` lists numbers that must appear in the prompt so the question
 * cannot drift from the figures it is checked against.
 */
type Judged = { right: string; holds: () => boolean; mistakes?: () => boolean; uses: number[] };
const judged: Record<string, Judged> = {
  "sample-means-wobble-n144": {
    right: "It halves to about 1, as n is four times larger",
    holds: () => 12 / Math.sqrt(36) === 2 && 12 / Math.sqrt(144) === 1 && 144 / 36 === 4,
    mistakes: () => 12 / 144 < 0.1 && 2 / 4 === 0.5,
    uses: [36, 12, 2, 144],
  },
  "sample-means-wobble-target-n": {
    right: "About 100 readings, four times as many",
    holds: () => 20 / Math.sqrt(25) === 4 && (20 / 2) ** 2 === 100 && 100 / 25 === 4,
    mistakes: () => 20 / 2 === 10 && 25 * 2 === 50,
    uses: [20, 25, 4, 2],
  },
  "normal-areas-between": {
    right: "About 68 percent",
    holds: () =>
      (162 - 170) / 8 === -1 &&
      (178 - 170) / 8 === 1 &&
      Math.round((phi(1) - phi(-1)) * 100) === 68,
    mistakes: () =>
      Math.round(phi(1) * 100) === 84 &&
      Math.round((1 - (phi(1) - phi(-1))) * 100) === 32 &&
      Math.round((phi(2) - phi(-2)) * 100) === 95,
    uses: [170, 8, 162, 178],
  },
  "normal-areas-mean-54": {
    right: "About 2 percent",
    holds: () => 12 / Math.sqrt(36) === 2 && Math.round((1 - phi((54 - 50) / 2)) * 100) === 2,
    mistakes: () =>
      Math.round(2 * (1 - phi(2)) * 100) === 5 &&
      Math.round((1 - phi(4 / 12)) * 100) === 37 &&
      Math.round((1 - phi(1)) * 100) === 16,
    uses: [50, 12, 36, 54, 2],
  },
  "interval-for-a-mean-margin-t": {
    right: "About 5, just over twice the standard error",
    holds: () => 6 / Math.sqrt(9) === 2 && near(2.306 * 2, 4.6, 0.02) && 2.306 > 2,
    mistakes: () => Math.round(2.306 * 6) === 14,
    uses: [9, 40, 6, 2, 8, 2.306],
  },
  "interval-for-a-mean-upper-25": {
    right: "About 6 points, so it clears 105 by a little",
    holds: () => {
      const se = 15 / Math.sqrt(25);
      const margin = 2.064 * se;
      return se === 3 && Math.round(margin) === 6 && 100 + margin > 105 && 100 + margin < 107;
    },
    mistakes: () => 2.064 * (15 / 25) < 5 && 2.064 * 3 > 5 && 100 + 3 < 105 && 100 + 15 > 105,
    uses: [25, 100, 15, 105, 24, 2.064],
  },
  "what-95-means-margin-30-of-50": {
    right: "About 14 points, twice the standard error",
    holds: () => {
      const se = Math.sqrt((0.6 * 0.4) / 50);
      return Math.round(se * 100) === 7 && Math.round(1.96 * se * 100) === 14;
    },
    mistakes: () => Math.round(2 * 1.96 * Math.sqrt((0.6 * 0.4) / 50) * 100) === 27,
    uses: [30, 50, 0.6, 0.07],
  },
  "what-95-means-margin-52": {
    right: "About 3 points, as in most national polls",
    holds: () => {
      const se = Math.sqrt((0.52 * 0.48) / 1000);
      return (
        near(se * 100, 1.6, 0.05) &&
        Math.round(1.96 * se * 100) === 3 &&
        0.52 - 1.96 * se < 0.5 &&
        0.52 + 1.96 * se > 0.5
      );
    },
    mistakes: () => Math.round(2 * 1.96 * Math.sqrt((0.52 * 0.48) / 1000) * 100) === 6,
    uses: [1000, 52],
  },
  "surprise-under-the-null-p-two-sided": {
    right: "About 0.036, both tails together",
    holds: () => near(1 - phi(2.1), 0.018, 0.0005) && near(2 * (1 - phi(2.1)), 0.036, 0.001),
    mistakes: () => near(0.018 / 2, 0.009, 1e-12) && near(1 - 0.018, 0.98, 0.003),
    uses: [2.1, 0.018],
  },
  "two-ways-to-be-wrong-power-300": {
    right: "About 78 percent, the share caught",
    holds: () => (300 - 66) / 300 === 0.78,
    mistakes: () => Math.round((66 / 300) * 100) === 22 && Math.round((66 / 300) * 5) === 1,
    uses: [300, 66],
  },
  "size-a-study-n-71": {
    right: "About 70 people, a bit over twice as many",
    holds: () =>
      near(((1.96 + 0.8416) * 3) ** 2, 70.6, 0.05) &&
      Math.ceil(((1.96 + 0.8416) * 3) ** 2) === 71 &&
      Math.ceil(((1.96 + 0.8416) * 2) ** 2) === 32 &&
      1.5 ** 2 === 2.25,
    mistakes: () => 32 * 1.5 === 48 && 32 * 9 === 288,
    uses: [10, 32, 5, 15],
  },
  "size-a-study-half-effect": {
    right: "About 130 people, four times as many",
    holds: () => Math.ceil((((1.96 + 0.8416) * 10) / 2.5) ** 2) === 126 && 4 * 32 === 128,
    mistakes: () => Math.round(32 * Math.SQRT2) === 45 && 32 * 2 === 64,
    uses: [32, 5, 10, 2.5],
  },
  "compare-two-groups-margin-diff": {
    right: "About 4, about twice the standard error",
    holds: () => near(1.96 * 2, 3.92, 1e-9) && Math.round(1.96 * 2) === 4,
    mistakes: () => Math.round(1.96 * 5) === 10 && Math.round(2 * 1.96 * 2) === 8,
    uses: [5, 2, 95],
  },
  "compare-two-groups-paired-margin": {
    right: "About 1.4, so the interval stops short of zero",
    holds: () => near(1.8 / 3, 0.6, 1e-9) && near(2.306 * 0.6, 1.38, 0.005) && -2.4 + 1.4 < 0,
    mistakes: () =>
      -2.4 + 0.6 < 0 && -2.4 + 2.306 * 1.8 > 0 && Math.round(2.306 * 1.8) === 4,
    uses: [2.4, 1.8, 0.6, 8, 2.306],
  },
  "compare-two-groups-paired-upper": {
    right: "About −2, just below zero, so scores fell",
    holds: () => Math.round(-6 + 2.064 * 2) === -2 && -6 + 2.064 * 2 < 0,
    mistakes: () =>
      Math.round(-6 - 2.064 * 2) === -10 && -6 + 2 === -4 && Math.round(2.064 * 2) === 4,
    uses: [25, 6, 10, 2, 24, 2.064],
  },
  "many-tests-one-lucky-result-twelve-tests": {
    right: "About 45 percent, a little under even",
    holds: () => near((1 - 0.95 ** 12) * 100, 45, 1.5) && 1 - 0.95 ** 12 < 0.5,
    mistakes: () => 12 * 5 === 60 && 1 - 0.95 ** 50 > 0.9,
    uses: [0.05],
  },
  "many-tests-one-lucky-result-eight-threshold": {
    right: "About 0.006, one eighth of 0.05",
    holds: () => near(0.05 / 8, 0.00625, 1e-12) && 0.009 > 0.05 / 8,
    mistakes: () => near(0.05 * 8, 0.4, 1e-12),
    uses: [0.05, 0.009],
  },
  "fit-a-line-sxy-v2": {
    right: "About three or four times Sxx, since y rises faster",
    holds: () => {
      const dx = [1 - 2, 2 - 2, 3 - 2];
      const dy = [3 - 6, 5 - 6, 10 - 6];
      const sxy = dx.reduce((total, d, i) => total + d * (dy[i] as number), 0);
      const sxx = dx.reduce((total, d) => total + d * d, 0);
      return sxy === 7 && sxx === 2 && sxy / sxx === 3.5;
    },
    mistakes: () => {
      const dx = [-1, 0, 1];
      const dy = [-3, -1, 4];
      const products = dx.map((d, i) => d * (dy[i] as number));
      return (
        dx.reduce((a, d) => a + d, 0) === 0 &&
        dy.reduce((a, d) => a + d, 0) === 0 &&
        products.every((product) => product >= 0)
      );
    },
    uses: [3, 5, 10, 2, 6],
  },
  "fit-a-line-slope-25": {
    right: "About 2.5 points per hour",
    holds: () => {
      const xs = [1, 2, 3];
      const ys = [2, 3, 7];
      const mx = 2;
      const my = 4;
      const slope =
        xs.reduce((a, x, i) => a + (x - mx) * ((ys[i] as number) - my), 0) /
        xs.reduce((a, x) => a + (x - mx) ** 2, 0);
      return slope === 2.5 && (7 - 2) / 2 === 2.5 && (3 - 2 + (7 - 3)) / 2 === 2.5;
    },
    mistakes: () => 3 - 2 === 1 && 7 - 3 === 4 && 7 - 2 === 5,
    uses: [1, 2, 3, 7],
  },
  "randomise-to-compare-ten-five": {
    right: "About 250",
    holds: () => choose(10, 5) === 252,
    mistakes: () => 10 * 9 * 8 * 7 * 6 === 30_240 && factorial(10) === 3_628_800,
    uses: [10, 5],
  },
  "randomise-to-compare-five-two": {
    right: "About 0.10, 1 in 10",
    holds: () => choose(5, 2) === 10 && 1 / choose(5, 2) === 0.1,
    mistakes: () => 1 / 20 === 0.05 && 2 / 5 === 0.4 && 2 / 10 === 0.2,
    uses: [5, 2],
  },
  "confounding-b-overall": {
    right: "About 60 percent, nearer the large-stone rate",
    holds: () =>
      (54 + 70) / (60 + 140) === 0.62 && 54 / 60 === 0.9 && 70 / 140 === 0.5 && 62 - 50 < 90 - 62,
    mistakes: () => (90 + 50) / 2 === 70 && 140 / 200 === 0.7,
    uses: [54, 60, 90, 70, 140, 50, 200],
  },
  "confounding-weighted-fair": {
    right: "E does better, by about 10 points",
    holds: () => {
      const easy = [(90 / 100) * 100, (340 / 400) * 100];
      const hard = [(160 / 400) * 100, (25 / 100) * 100];
      const e = 0.5 * (easy[0] as number) + 0.5 * (hard[0] as number);
      const f = 0.5 * (easy[1] as number) + 0.5 * (hard[1] as number);
      return e === 65 && f === 55 && e - f === 10;
    },
    mistakes: () => 90 - 85 === 5 && 40 - 25 === 15 && 73 - 50 === 23,
    uses: [100, 400, 90, 85, 40, 25, 50, 73],
  },
  "natural-experiments-did-neg": {
    right: "Lowered it by about 5, as the control gained more",
    holds: () => 83 - 80 - (78 - 70) === -5,
    mistakes: () => 83 - 80 === 3 && 83 - 80 + (78 - 70) === 11,
    uses: [80, 83, 70, 78],
  },
  "natural-experiments-did-5": {
    right: "Left hours about 4 above State C's trend",
    holds: () => 41 - 45 - (42 - 50) === 4 && 41 - (45 + (42 - 50)) === 4,
    mistakes: () => 41 - 45 === -4 && 41 - 45 + (42 - 50) === -12,
    uses: [45, 41, 50, 42],
  },
};

describe("questions in Statistical and Causal Inference", () => {
  it("asks every question from a lesson, and every lesson question exists", () => {
    const asked = new Set(
      bundle.lessons.flatMap((lesson) => [
        lesson.intro?.hook.questionId ?? "",
        ...lesson.questionIds,
        ...lesson.steps.flatMap((step) => [
          step.checkQuestionId,
          ...(step.workedSteps ?? []).flatMap((line) => [
            line.blank?.questionId ?? "",
            line.selfExplain?.questionId ?? "",
          ]),
        ]),
      ]),
    );
    asked.delete("");
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(bundle.questions.filter((question) => !asked.has(question.id)).map((q) => q.id)).toEqual(
      [],
    );
    const cards = new Set(bundle.lessons.flatMap((lesson) => lesson.flashcardIds));
    expect(bundle.flashcards.filter((card) => !cards.has(card.id)).map((card) => card.id)).toEqual(
      [],
    );
    expect([...cards].filter((id) => !bundle.flashcards.some((card) => card.id === id))).toEqual(
      [],
    );
  });

  it("ends each lesson with three questions, of at least two types unless one was a judged figure", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      if (!lesson.questionIds.some((id) => id.replace("staci-", "") in judged))
        expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("asks for a computed number only where the number is a count of roles, not a sum", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace("staci-", ""))).toEqual([
      "draw-the-causes-three-backdoor-v2",
    ]);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("recomputes the remaining numeric answer from the diagram in its prompt", () => {
    const question = get("draw-the-causes-three-backdoor-v2");
    const authority = question.answerAuthority;
    if (authority.kind !== "numeric") throw new Error(question.id);
    // Z and W are common causes of X and Y. M is a mediator and C a collider.
    expect(["Z", "W"].length).toBe(authority.value);
  });

  it("keeps each converted judgement true to its figures", () => {
    expect(Object.keys(judged)).toHaveLength(25);
    for (const [id, entry] of Object.entries(judged)) {
      const question = get(id);
      expect(kind(question), id).toBe("choice");
      expect(question.responseType, id).toBe("short_text");
      expect(question.answerAuthority.kind, id).toBe("text");
      if (question.answerAuthority.kind !== "text") continue;
      expect(question.answerAuthority.exampleAnswer, id).toBe(entry.right);
      expect(question.answerAuthority.acceptedIdeas, id).toEqual([entry.right]);
      expect(
        (question.choices ?? []).map((choice) => choice.label),
        id,
      ).toContain(entry.right);
      expect(entry.holds(), `${id} holds`).toBe(true);
      if (entry.mistakes) expect(entry.mistakes(), `${id} mistakes`).toBe(true);
      const quoted = numbers(question.prompt).map(Math.abs);
      for (const number of entry.uses)
        expect(quoted, `${id} mentions ${number}`).toContain(number);
    }
  });

  it("keeps feedback from repeating the right option, and keeps the explanation short", () => {
    for (const id of Object.keys(judged)) {
      const question = get(id);
      expect(words(question.onCorrect ?? ""), id).toBeLessThanOrEqual(45);
      const right = (question.choices ?? []).find((choice) =>
        question.answerAuthority.kind === "text"
          ? choice.label === question.answerAuthority.acceptedIdeas[0]
          : false,
      );
      expect(right, id).toBeTruthy();
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.toLowerCase(), id).not.toContain(right?.label.toLowerCase());
    }
  });

  it("recomputes the figures that the judgement questions quote", () => {
    // Two tests on different scales: Maya 82 (mean 70, sd 6), Noor 640 (mean 600, sd 25).
    expect((82 - 70) / 6).toBe(2);
    expect((640 - 600) / 25).toBeCloseTo(1.6, 10);
    // The scholarship line: 640 against mean 500 and sd 100.
    expect((640 - 500) / 100).toBeCloseTo(1.4, 10);
    // A two-sided flag at 2 sd holds about 5 percent of a normal distribution.
    expect(2 * (1 - phi(2))).toBeCloseTo(0.0455, 3);
    // Skewed stays: 2 sd above a mean of 5 days with sd 4 is 13 days.
    expect(5 + 2 * 4).toBe(13);
    expect(1 - phi(2)).toBeCloseTo(0.023, 3);
    // The loaf sd of 15 g and a sample of 25 give a standard error of 3 g.
    expect(15 / Math.sqrt(25)).toBe(3);
    expect((14 / 2) ** 2).toBe(49);
    // The interval 52 plus and minus 1.96 standard errors of 1.5.
    expect([52 - 1.96 * 1.5, 52 + 1.96 * 1.5].map((x) => Math.round(x * 100) / 100)).toEqual([
      49.06, 54.94,
    ]);
    // The confidence interval for a change of 1.5 with the stated ends is centred on 1.5.
    expect((-0.4 + 3.4) / 2).toBeCloseTo(1.5, 10);
    // The 99 percent interval for the mean 5 with a 95 percent margin of 1.9.
    const margin99 = 1.9 * (2.576 / 1.96);
    expect([5 - margin99, 5 + margin99].map((x) => Math.round(x * 2) / 2)).toEqual([2.5, 7.5]);
    // The poll: 52 percent of 1000 gives an interval from 49 to 55 percent.
    const pollMargin = 1.96 * Math.sqrt((0.52 * 0.48) / 1000);
    expect([0.52 - pollMargin, 0.52 + pollMargin].map((x) => Math.round(x * 100))).toEqual([
      49, 55,
    ]);
    // Doubling a poll multiplies the margin by 1 / sqrt(2).
    expect(Math.sqrt(500 / 1000)).toBeCloseTo(Math.SQRT1_2, 4);
    // The courier firm: sigma 10 and 25 deliveries give a standard error of 2 and z = 1.5.
    expect((23 - 20) / (10 / Math.sqrt(25))).toBe(1.5);
    expect(3 / 10).toBe(0.3);
    // A website test: a rise of 0.9 minutes with sd 15 and n 2500 gives z = 3 and p about 0.003.
    const siteZ = 0.9 / (15 / Math.sqrt(2500));
    expect(siteZ).toBeCloseTo(3, 10);
    expect(2 * (1 - phi(siteZ))).toBeCloseTo(0.0027, 4);
    expect(0.9 / 15).toBeCloseTo(0.06, 10);
    // A one-sided area of 0.036 above z = 1.8 doubles to 0.072.
    expect(1 - phi(1.8)).toBeCloseTo(0.036, 3);
    expect(2 * (1 - phi(1.8))).toBeCloseTo(0.072, 3);
    // Power: 200 caught out of 250 gives 0.8, and 50 missed gives 0.2.
    expect([200 / 250, 50 / 250]).toEqual([0.8, 0.2]);
    // A real effect of 6 with sd 20 and n 100 sits 3 standard errors from zero.
    expect(6 / (20 / Math.sqrt(100))).toBe(3);
    // Cutting n from 100 to 25 for an effect of 3 with sd 10: shift 3 gives 0.85, shift 1.5 gives 0.32.
    const power = (shift: number) => phi(shift - 1.96) + phi(-shift - 1.96);
    expect(power(3)).toBeCloseTo(0.85, 2);
    expect(3 / (10 / Math.sqrt(25))).toBe(1.5);
    expect(power(1.5)).toBeCloseTo(0.32, 2);
    expect(0.85 / 4).toBeCloseTo(0.21, 2);
    // Sample size for effect 3, sd 10, power 0.8: 87.2 rounds up to 88.
    expect((((1.96 + 0.8416) * 10) / 3) ** 2).toBeCloseTo(87.2, 1);
    expect(Math.ceil(((1.96 + 0.8416) * 10) / 3) ** 2 >= 87.2).toBe(true);
    expect(Math.ceil((((1.96 + 0.8416) * 10) / 3) ** 2)).toBe(88);
    // Two classes of 25 with sd 10 differ by 5: standard error 2.83 and an interval of about -0.5 to 10.5.
    const se = Math.sqrt(100 / 25 + 100 / 25);
    expect(se).toBeCloseTo(2.83, 2);
    expect([5 - 1.96 * se, 5 + 1.96 * se].map((x) => Math.round(x * 2) / 2)).toEqual([-0.5, 10.5]);
    // Standard errors 3 and 4 combine to 5.
    expect(Math.sqrt(3 ** 2 + 4 ** 2)).toBe(5);
    // Changes -2, -1, 0 and -3 have a mean of -1.5.
    expect([8 - 10, 11 - 12, 9 - 9, 11 - 14]).toEqual([-2, -1, 0, -3]);
    expect((-2 - 1 + 0 - 3) / 4).toBe(-1.5);
    // Six tests give 0.26, twelve give 0.46, thirty give 0.79.
    expect(1 - 0.95 ** 6).toBeCloseTo(0.265, 3);
    expect(1 - 0.95 ** 12).toBeCloseTo(0.46, 2);
    expect(1 - 0.95 ** 30).toBeCloseTo(0.785, 2);
    expect(6 * 0.05).toBeCloseTo(0.3, 10);
    // The Bonferroni threshold for nine outcomes.
    expect(0.05 / 9).toBeCloseTo(0.00556, 5);
    // The line through (4, 9) with slope 1.5 has intercept 3, and the delivery residual is -0.8.
    expect(9 - 1.5 * 4).toBe(3);
    expect(6.2 - 7).toBeCloseTo(-0.8, 10);
    expect(1 + 2 * 3).toBe(7);
    // Kidney stones: rates in each group and the share of large stones.
    const pct = (a: number, b2: number) => Math.round((a / b2) * 100);
    expect([pct(81, 87), pct(234, 270), pct(192, 263), pct(55, 80)]).toEqual([93, 87, 73, 69]);
    expect([pct(263, 350), pct(80, 350)]).toEqual([75, 23]);
    expect([pct(273, 350), pct(289, 350)]).toEqual([78, 83]);
    // The hospital with easy and hard cases: pooled 50 and 73, weighted 65 and 55.
    expect([pct(90 + 160, 500), pct(340 + 25, 500)]).toEqual([50, 73]);
    expect([0.5 * 90 + 0.5 * 40, 0.5 * 85 + 0.5 * 25]).toEqual([65, 55]);
    // Difference in differences: employment and commute examples.
    expect(9 - 10 - (8 - 10)).toBe(1);
    expect(46 - 40 - (41 - 38)).toBe(3);
    expect(41 - 45 - (42 - 50)).toBe(4);
    // Commute times: 4 minutes a year already, so about 4 of the 6 is the old trend.
    expect(6 - 0 - 4).toBe(2);
    // The prompts quote the figures that were recomputed above.
    expect(get("confounding-case-mix").prompt).toContain("263 of them large stones");
    expect(get("what-95-means-columnist-majority").choices?.[0]?.label).toContain("49 to 55");
    expect(get("interval-for-a-mean-se-is-not-margin").choices?.[2]?.label).toContain("49.06");
    expect(get("natural-experiments-trend-check").prompt).toContain("4 minutes a year");
  });

  it("puts a case in front of the learner: a study, a poll, a trial, a table or a diagram", () => {
    const situation =
      /\d|\bstudy\b|\btrial\b|\bpoll\b|\bteam\b|\bgraph\b|\banalyst\b|\bresearcher/iu;
    const withFigures = bundle.questions.filter((question) => /\d/u.test(question.prompt));
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.85);
    expect(withFigures.length).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
  });

  it("keeps dashes out of questions, hints and feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.prompt,
        ...question.hints,
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.order?.items ?? []),
        ...(question.sort?.bins ?? []).map((bin) => bin.label),
        ...(question.sort?.items ?? []).flatMap((item) => [item.label, item.explanation ?? ""]),
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
    }
  });

  it("marks one option right, keeps the right one from standing out, and explains each wrong one", () => {
    const places = new Set<number>();
    let choices = 0;
    let longest = 0;
    let shortest = 0;
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      if (question.choices.length >= 3) {
        const longestOther = Math.max(...others.map((choice) => choice.label.length));
        const shortestOther = Math.min(...others.map((choice) => choice.label.length));
        const length = right[0]?.label.length ?? 0;
        choices += 1;
        if (length > longestOther) longest += 1;
        if (length < shortestOther) shortest += 1;
        expect(length, question.id).toBeLessThanOrEqual(longestOther * 1.15);
        places.add(question.choices.indexOf(right[0] as (typeof question.choices)[number]));
      }
      const stops = new Set(question.choices.map((choice) => choice.label.trimEnd().endsWith(".")));
      expect(stops.size, `${question.id} mixes full stops`).toBe(1);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
    }
    expect(longest / choices).toBeLessThanOrEqual(0.3);
    expect(shortest / choices).toBeLessThanOrEqual(0.4);
    expect([0, 1, 2].filter((place) => !places.has(place))).toEqual([]);
  });

  it("keeps most questions multiple choice, with order and sort questions where the sequence or the kinds are the point", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(3);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    for (const question of bundle.questions) {
      if (question.answerAuthority.kind !== "text") continue;
      const { order, sort } = question;
      if (order) {
        expect(new Set(order.items).size, question.id).toBe(order.items.length);
        expect(order.items.length, question.id).toBeGreaterThanOrEqual(4);
        expect(order.items.length, question.id).toBeLessThanOrEqual(6);
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([ORDER_ANSWER_IDEA]);
        expect(
          order.items.filter((item) => /^\d/u.test(item)),
          question.id,
        ).toEqual([]);
      }
      if (sort) {
        expect(new Set(sort.items.map((item) => item.label)).size, question.id).toBe(
          sort.items.length,
        );
        expect(sort.items.length, question.id).toBeGreaterThanOrEqual(5);
        for (const bin of sort.bins)
          expect(
            sort.items.some((item) => item.bin === bin.id),
            `${question.id} ${bin.id}`,
          ).toBe(true);
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      if (order || sort) {
        expect(question.answerAuthority.exampleAnswer.length, question.id).toBeGreaterThan(40);
        expect(question.onCorrect, question.id).toBeTruthy();
      }
    }
  });

  it("covers the usual mistakes: p as the chance the null is true, no significance as no effect, a collider, correlation as cause, a large sample against bias", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).map((item) => item.label),
        ...(question.order?.items ?? []),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" "),
    );
    for (const phrase of [
      /chance that the (null|layout|true)|chance that the layout does nothing|probability that the null/iu,
      /95 percent chance/iu,
      /does not show that|no significant difference|no difference/iu,
      /collider/iu,
      /parallel/iu,
      /backdoor/iu,
      /mediator/iu,
      /confounder/iu,
      /Bonferroni/iu,
      /larger sample|bigger sample|more patients|large cohort/iu,
      /either causes the other|causes? the other|cause/iu,
      /adjust(ing)? for (every|more)/iu,
      /replicat/iu,
    ])
      expect(
        text.some((entry) => phrase.test(entry)),
        String(phrase),
      ).toBe(true);
  });

  it("does not mark a typed answer right when it only repeats the prompt", () => {
    for (const question of bundle.questions) {
      if (question.choices || question.answerAuthority.kind !== "text") continue;
      if (question.order || question.sort) continue;
      expect(assessTextAnswer(question.prompt, question.answerAuthority).correct, question.id).toBe(
        false,
      );
      expect(
        assessTextAnswer(question.answerAuthority.exampleAnswer, question.answerAuthority).correct,
        question.id,
      ).toBe(true);
    }
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(
        kind(question) === "numeric" ? 3 : 2,
      );
    }
  });

  it("keeps verdict words out of feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((m) => m.feedback),
      ];
      for (const entry of text)
        expect(entry, question.id).not.toMatch(
          /^(correct|not quite|great|well done|exactly right)\b/iu,
        );
    }
  });
});
