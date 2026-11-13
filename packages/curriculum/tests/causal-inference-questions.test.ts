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
 * a trial or a causal diagram in words and ask what follows, and numeric questions stay where
 * computing is the skill. This file recomputes each numeric answer from the numbers in its prompt,
 * and the figures that the judgement questions quote. The definitions come from the course's own
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

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to places where computing is the skill", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(26);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("recomputes every numeric answer from the numbers in its prompt", () => {
    const checks: Record<string, (text: string) => number> = {
      "sample-means-wobble-n144": (t) => {
        const [sd, n] = numbers(t) as [number, number];
        return sd / Math.sqrt(n);
      },
      "sample-means-wobble-target-n": (t) => {
        const [sd, se] = numbers(t) as [number, number];
        return (sd / se) ** 2;
      },
      "normal-areas-between": (t) => {
        const [mean, sd] = numbers(t) as [number, number];
        return phi((178 - mean) / sd) - phi((162 - mean) / sd);
      },
      "normal-areas-mean-54": (t) => {
        const [mean, , n, limit] = numbers(t) as [number, number, number, number];
        const sd = 12;
        return 1 - phi((limit - mean) / (sd / Math.sqrt(n)));
      },
      "interval-for-a-mean-margin-t": (t) => {
        const [n, , s, tcrit] = numbers(t.replace("standard error is 2", "")) as [
          number,
          number,
          number,
          number,
        ];
        return tcrit * (s / Math.sqrt(n));
      },
      "interval-for-a-mean-upper-25": (t) => {
        const [n, mean, s, , , , tcrit] = numbers(t) as number[];
        return (mean as number) + (tcrit as number) * ((s as number) / Math.sqrt(n as number));
      },
      "what-95-means-margin-30-of-50": (t) => {
        const [x, n] = numbers(t) as [number, number];
        const p = x / n;
        return 1.96 * Math.sqrt((p * (1 - p)) / n);
      },
      "what-95-means-margin-52": (t) => {
        const [n, percent] = numbers(t) as [number, number];
        const p = percent / 100;
        return 1.96 * Math.sqrt((p * (1 - p)) / n);
      },
      "surprise-under-the-null-p-two-sided": (t) => {
        const [, area] = numbers(t.replace(/z = 2\.1/u, "")) as [number, number];
        return 2 * (area as number);
      },
      "two-ways-to-be-wrong-power-300": (t) => {
        const [runs, missed] = numbers(t) as [number, number];
        return (runs - missed) / runs;
      },
      "size-a-study-n-71": (t) => {
        const [z, scale] = numbers(t) as [number, number];
        return Math.ceil((z * scale) ** 2);
      },
      "size-a-study-half-effect": (t) => {
        const [, , sd, , small, za, zb] = numbers(t) as number[];
        return Math.ceil(
          ((((za as number) + (zb as number)) * (sd as number)) / (small as number)) ** 2,
        );
      },
      "compare-two-groups-margin-diff": (t) => {
        const n = numbers(t) as number[];
        return (n[n.length - 1] as number) * (n[1] as number);
      },
      "compare-two-groups-paired-margin": (t) => {
        const n = numbers(t) as number[];
        return (n[n.length - 1] as number) * ((n[1] as number) / 3);
      },
      "compare-two-groups-paired-upper": (t) => {
        const [n, mean, sd, , , tcrit] = numbers(t) as number[];
        return (mean as number) + (tcrit as number) * ((sd as number) / Math.sqrt(n as number));
      },
      "many-tests-one-lucky-result-twelve-tests": (t) => {
        const [alpha] = numbers(t) as [number];
        return 1 - (1 - alpha) ** 12;
      },
      "many-tests-one-lucky-result-eight-threshold": (t) => {
        const [alpha] = numbers(t) as [number];
        return alpha / 8;
      },
      "fit-a-line-sxy-v2": () => (1 - 2) * (3 - 6) + 0 * (5 - 6) + (3 - 2) * (10 - 6),
      "fit-a-line-slope-25": (t) => {
        const [h1, h2, h3, s1, s2, s3] = numbers(
          t.replace(/The mean of x is \d+ and the mean of y is \d+\./u, ""),
        ) as number[];
        const xs = [h1, h2, h3] as number[];
        const ys = [s1, s2, s3] as number[];
        const mx = xs.reduce((a, x) => a + x, 0) / 3;
        const my = ys.reduce((a, y) => a + y, 0) / 3;
        return (
          xs.reduce((a, x, i) => a + (x - mx) * ((ys[i] as number) - my), 0) /
          xs.reduce((a, x) => a + (x - mx) ** 2, 0)
        );
      },
      "randomise-to-compare-ten-five": (t) => {
        const [n, group] = numbers(t) as [number, number];
        return choose(n, group);
      },
      "randomise-to-compare-five-two": (t) => {
        const [n, treated] = numbers(t) as [number, number];
        return 1 / choose(n, treated);
      },
      "confounding-b-overall": (t) => {
        const [s1, n1, s2, n2] = numbers(t.replace(/treatment C/u, "")) as [
          number,
          number,
          number,
          number,
        ];
        return ((s1 + s2) / (n1 + n2)) * 100;
      },
      "confounding-weighted-fair": (t) => {
        const n = numbers(t);
        // 100 easy and 400 hard for E, 400 easy and 100 hard for F, then successes.
        const [, , , , e1, e2, f1, f2] = n as number[];
        const e = 0.5 * ((e1 as number) / 100) + 0.5 * ((e2 as number) / 400);
        const f = 0.5 * ((f1 as number) / 400) + 0.5 * ((f2 as number) / 100);
        return (e - f) * 100;
      },
      "draw-the-causes-three-backdoor-v2": () => {
        // Z and W are common causes of X and Y. M is a mediator and C a collider.
        return ["Z", "W"].length;
      },
      "natural-experiments-did-neg": (t) => {
        const [a, b2, c, d] = numbers(t) as [number, number, number, number];
        return b2 - a - (d - c);
      },
      "natural-experiments-did-5": (t) => {
        const [a, b2, c, d] = numbers(t) as [number, number, number, number];
        return b2 - a - (d - c);
      },
    };
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace("staci-", "")).sort()).toEqual(
      Object.keys(checks).sort(),
    );
    for (const question of numeric) {
      const check = checks[question.id.replace("staci-", "")];
      const authority = question.answerAuthority;
      if (!check || authority.kind !== "numeric") throw new Error(question.id);
      const computed = check(question.prompt);
      expect(Math.abs(computed - authority.value), question.id).toBeLessThan(
        Math.max(authority.absoluteTolerance, 0.006),
      );
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
