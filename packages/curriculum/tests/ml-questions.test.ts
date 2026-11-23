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
 * Machine Learning, from Models to MLOps follows the way History and Git ask questions
 * (docs/question-writing-guide.md), adapted to judgement about models and data: most questions put
 * a table of scores, a confusion matrix, a data split, a feature or a release result in front of the
 * learner and ask what it shows. Five numeric questions remain, where counting precision, a
 * threshold, a parameter total or a number of fits is the skill, and this file recomputes each of
 * them from the numbers in the prompt. The other questions ask which option is larger, which way a
 * figure moves or what drives it, since a calculator or a spreadsheet does the sum in practice, and
 * this file recomputes the figures behind each of those judgements. The definitions come from the
 * scikit-learn user guide, Google's Machine Learning Crash Course and its Rules of Machine
 * Learning, which the course lists as sources.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/machine-learning-and-mlops/bundle.json", import.meta.url),
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
  const question = questions.get(`maclm-${suffix}`);
  if (!question) throw new Error(`missing question ${suffix}`);
  return question;
};
const flat = (text: string): string => text.replace(/−/gu, "-").replace(/(\d),(\d{3})/gu, "$1$2");
const numbers = (text: string): number[] =>
  (flat(text).match(/-?\d+(?:\.\d+)?/gu) ?? []).map(Number);
const pairs = (text: string): [number, number][] =>
  [...flat(text).matchAll(/\((-?[\d.]+), (-?[\d.]+)\)/gu)].map(
    (match) => [Number(match[1]), Number(match[2])] as [number, number],
  );
const labelled = (text: string): { score: number; positive: boolean }[] =>
  [...flat(text).matchAll(/([\d.]+) \((positive|negative)\)/gu)].map((match) => ({
    score: Number(match[1]),
    positive: match[2] === "positive",
  }));
const auc = (scores: number[], labels: boolean[]): number => {
  let hit = 0;
  let total = 0;
  scores.forEach((s, i) => {
    scores.forEach((t, j) => {
      if (labels[i] && !labels[j]) {
        total += 1;
        if (s > t) hit += 1;
        else if (s === t) hit += 0.5;
      }
    });
  });
  return hit / total;
};
const gini = (a: number, b: number): number => 1 - (a / (a + b)) ** 2 - (b / (a + b)) ** 2;
const psi = (expected: number[], actual: number[]): number =>
  expected.reduce((sum, e, i) => sum + ((actual[i] ?? 0) - e) * Math.log((actual[i] ?? 1) / e), 0);

describe("questions in Machine Learning, from Models to MLOps", () => {
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
  });

  it("ends each lesson with three questions, of at least two types unless a sum became a choice", () => {
    // These three lessons used to end on one sum and two choices. The sum is now a choice as well,
    // so each of them ends on three choices.
    const threeChoices = new Set([
      "thresholds-and-ranking",
      "trees-and-ensembles",
      "responsible-ml",
    ]);
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      if (threeChoices.has(lesson.id))
        expect(types, lesson.id).toEqual(["choice", "choice", "choice"]);
      else expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to places where computing the metric is the skill", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(28);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("recomputes every numeric answer from the numbers in its prompt", () => {
    const checks: Record<string, (text: string) => number> = {
      "classification-and-metrics-practice-1": (t) => {
        const [tp, fp] = numbers(t) as [number, number];
        return tp / (tp + fp);
      },
      "thresholds-and-ranking-precision-at-05": (t) => {
        const flagged = labelled(t).filter((row) => row.score >= 0.5);
        return flagged.filter((row) => row.positive).length / flagged.length;
      },
      "neural-networks-params-5-2-1": (t) => {
        const sizes = numbers(t.split("layer sizes")[1] ?? "").slice(0, 3);
        return sizes.slice(1).reduce((s, n, i) => s + (sizes[i] as number) * n + n, 0);
      },
      "pipelines-and-experiments-fits-36": (t) => {
        const [a, b, c, folds] = numbers(t) as [number, number, number, number];
        return a * b * c * folds;
      },
      "pipelines-and-experiments-practice-1": (t) => {
        const [a, b, folds] = numbers(t) as [number, number, number];
        return a * b * folds;
      },
    };
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace("maclm-", "")).sort()).toEqual(
      Object.keys(checks).sort(),
    );
    for (const question of numeric) {
      const check = checks[question.id.replace("maclm-", "")];
      const authority = question.answerAuthority;
      if (!check || authority.kind !== "numeric") throw new Error(question.id);
      const computed = check(question.prompt);
      expect(Math.abs(computed - authority.value), question.id).toBeLessThan(
        Math.max(authority.absoluteTolerance, 1e-6),
      );
    }
  });

  it("asks each former sum as a choice, with the figure behind it in the prompt", () => {
    const converted = [
      "what-a-model-learns-sxy-three",
      "what-a-model-learns-practice-1",
      "loss-and-gradient-descent-w-after-one-step",
      "loss-and-gradient-descent-practice-1",
      "classification-and-metrics-f1-another",
      "classification-and-metrics-rare-baseline",
      "thresholds-and-ranking-auc-small",
      "thresholds-and-ranking-fpr-at-04",
      "thresholds-and-ranking-practice-3",
      "regularisation-and-cross-validation-pen-l2",
      "regularisation-and-cross-validation-sd-b",
      "features-and-leakage-z-of-eleven",
      "trees-and-ensembles-left-out-5",
      "trees-and-ensembles-practice-1",
      "trees-and-ensembles-gain-age-v2",
      "neural-networks-w2-new",
      "serving-and-release-replicas-16",
      "serving-and-release-practice-1",
      "monitoring-and-drift-psi-two-bins",
      "monitoring-and-drift-practice-1",
      "monitoring-and-drift-psi-169-v2",
      "responsible-ml-practice-2",
    ];
    for (const suffix of converted) {
      const question = get(suffix);
      expect(kind(question), suffix).toBe("choice");
      expect(question.answerAuthority.kind, suffix).toBe("text");
      expect(question.prompt, suffix).not.toMatch(/calculator|round|decimal place|to three/iu);
    }
  });

  it("recomputes the figures that the judgement questions quote", () => {
    // Cost of errors: a missed fraud costs £120 and a false alarm £4.
    const costs = get("classification-and-metrics-cost-of-errors");
    const [fnA, fpA, fnB, fpB, costFn, costFp] = numbers(costs.prompt.replace(/£/gu, "")).filter(
      (n) => n >= 4,
    ) as number[];
    expect([fnA, fpA, fnB, fpB, costFn, costFp]).toEqual([20, 10, 8, 150, 120, 4]);
    const a = 20 * 120 + 10 * 4;
    const b = 8 * 120 + 150 * 4;
    expect([a, b]).toEqual([2440, 1560]);
    expect(costs.choices?.some((c) => c.label.includes("£1,560 against £2,440"))).toBe(true);

    // The matrix behind the false negative question gives a recall of 0.9.
    expect(45 / (45 + 5)).toBeCloseTo(0.9, 10);
    expect(16 / (16 + 4)).toBeCloseTo(0.8, 10);

    // A high AUC with a rare positive class: 800 frauds among 9,990 false alarms.
    const honest = 1_000_000 - 1000;
    const falseAlarms = honest * 0.01;
    expect(falseAlarms).toBe(9990);
    expect(Math.round((800 / (800 + falseAlarms)) * 100)).toBe(7);

    // Eight scored examples at three thresholds.
    const rows: [number, boolean][] = [
      [0.92, true],
      [0.85, true],
      [0.75, false],
      [0.66, true],
      [0.58, false],
      [0.45, true],
      [0.3, false],
      [0.15, false],
    ];
    const at = (t: number) => {
      const flagged = rows.filter(([s]) => s >= t);
      const tp = flagged.filter(([, p]) => p).length;
      return [
        Math.round((tp / flagged.length) * 1000) / 1000,
        tp / rows.filter(([, p]) => p).length,
      ];
    };
    expect([at(0.8), at(0.6), at(0.4)]).toEqual([
      [1, 0.5],
      [0.75, 0.75],
      [0.667, 1],
    ]);
    expect(get("thresholds-and-ranking-threshold-when-misses-cost").prompt).toContain(
      "(1.0, 0.5), (0.75, 0.75) and (0.667, 1.0)",
    );
    expect(
      auc(
        rows.map(([s]) => s),
        rows.map(([, p]) => p),
      ),
    ).toBeCloseTo(0.8125, 10);

    // Cross-validation scores for three penalty strengths.
    const prompt = get("regularisation-and-cross-validation-pick-lambda").prompt;
    const groups = [...prompt.matchAll(/gives ([\d., and]+) \(mean ([\d.]+)\)/gu)];
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      const scores = numbers(group[1] ?? "");
      expect(scores).toHaveLength(5);
      const mean = scores.reduce((s, x) => s + x, 0) / 5;
      expect(Math.abs(mean - Number(group[2]))).toBeLessThan(0.0051);
    }

    // The learning-rate runs: loss after five updates on (1, 1) and (2, 3).
    const loss = (w: number) => 0.5 * ((w - 1) ** 2 + (2 * w - 3) ** 2);
    const after = (eta: number, steps: number) => {
      let w = 0;
      for (let i = 0; i < steps; i += 1) w -= eta * (w - 1 + 2 * (2 * w - 3));
      return loss(w);
    };
    expect(after(0.02, 5)).toBeCloseTo(1.8, 1);
    expect(after(0.1, 5)).toBeCloseTo(0.105, 3);
    expect(after(0.5, 5)).toBeCloseTo(282.7, 1);
    expect(
      [after(0.6, 1), after(0.6, 2), after(0.6, 3)].map((x) => Math.round(x * 10) / 10),
    ).toEqual([19.7, 78.5, 313.7]);
    expect(loss(0)).toBe(5);

    // Overshoot on (1, 1) and (3, 3): from w = 0 with eta 0.25.
    const w1 = 0 - 0.25 * (1 * (0 - 1) + 3 * (0 - 3));
    expect(w1).toBe(2.5);
    expect(0.5 * ((w1 - 1) ** 2 + (3 * w1 - 3) ** 2)).toBeCloseTo(11.25, 10);

    // Splits of a node of 6 positive and 4 negative loans.
    const weighted = (l: [number, number], r: [number, number]) =>
      ((l[0] + l[1]) / 10) * gini(...l) + ((r[0] + r[1]) / 10) * gini(...r);
    expect(gini(6, 4)).toBeCloseTo(0.48, 10);
    expect(weighted([5, 0], [1, 4])).toBeCloseTo(0.16, 10);
    expect(weighted([3, 2], [3, 2])).toBeCloseTo(0.48, 10);
    expect(weighted([4, 1], [2, 3])).toBeCloseTo(0.4, 10);
    expect(weighted([6, 3], [0, 1])).toBeCloseTo(0.4, 10);
    expect([gini(9, 1), gini(5, 5), gini(7, 3)].map((g) => Math.round(g * 100) / 100)).toEqual([
      0.18, 0.5, 0.42,
    ]);

    // Parameter counts.
    expect(784 * 128 + 128).toBe(100_480);
    expect(128 * 10 + 10).toBe(1290);
    expect(100_480 + 1290).toBe(101_770);
    expect(3 * 4 + 4 + (4 * 1 + 1)).toBe(21);
    expect(3 * 4 + 4 * 1).toBe(16);

    // Grid search time: 5 x 4 x 5 fits at 2 minutes, then a third setting of 3 values.
    expect(5 * 4 * 5 * 2).toBe(200);
    expect(5 * 4 * 5 * 3 * 2).toBe(600);

    // The 99th percentile latency path and the typical one.
    expect(30 + 45 + 95).toBe(170);
    expect(30 + 45 + 40).toBe(115);

    // The weekly PSI of four equal training bins.
    const weeks = [
      [0.26, 0.25, 0.25, 0.24],
      [0.28, 0.26, 0.24, 0.22],
      [0.31, 0.27, 0.23, 0.19],
      [0.35, 0.29, 0.21, 0.15],
      [0.4, 0.3, 0.2, 0.1],
    ];
    const weekly = weeks.map(
      (week) => Math.round(psi([0.25, 0.25, 0.25, 0.25], week) * 1000) / 1000,
    );
    expect(weekly).toEqual([0.001, 0.008, 0.033, 0.098, 0.228]);
    expect(get("monitoring-and-drift-weekly-psi").prompt).toContain(
      "0.001, 0.008, 0.033, 0.098 and 0.228",
    );

    // Group figures.
    expect((0.95 * 900 + 0.6 * 100) / 1000).toBeCloseTo(0.915, 10);
    expect([36 / 120, 14 / 70]).toEqual([0.3, 0.2]);
    expect([18 / 45, 21 / 35]).toEqual([0.4, 0.6]);

    // The label delay on day 45.
    expect(45 - 30).toBe(15);
  });

  it("recomputes the figures behind the questions that ask for a judgement and not a number", () => {
    const near = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);
    const meanOf = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

    // Sxy for (1, 3), (2, 5) and (3, 10): the outer examples add 3 and 4, the middle one adds 0.
    const sxyPoints = pairs(get("what-a-model-learns-sxy-three").prompt);
    expect(sxyPoints).toEqual([
      [1, 3],
      [2, 5],
      [3, 10],
    ]);
    const mx = meanOf(sxyPoints.map((p) => p[0]));
    const my = meanOf(sxyPoints.map((p) => p[1]));
    expect([mx, my]).toEqual([2, 6]);
    expect(sxyPoints.map(([x, y]) => Math.abs((x - mx) * (y - my)))).toEqual([3, 0, 4]);
    expect(sxyPoints.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0)).toBe(7);
    expect(sxyPoints.reduce((s, [x]) => s + (x - mx) ** 2, 0)).toBe(2);
    expect([7 / 2, 6 - (7 / 2) * 2]).toEqual([3.5, -1]);

    // The four-point fit: the labels rise by 6 over 3 hours, and least squares gives 1.9 and 0.
    const fit = pairs(get("what-a-model-learns-practice-1").prompt);
    expect(fit).toHaveLength(4);
    const fx = meanOf(fit.map((p) => p[0]));
    const fy = meanOf(fit.map((p) => p[1]));
    expect([fx, fy]).toEqual([2.5, 4.75]);
    const slope =
      fit.reduce((s, [x, y]) => s + (x - fx) * (y - fy), 0) /
      fit.reduce((s, [x]) => s + (x - fx) ** 2, 0);
    near(slope, 1.9, 10);
    near(fy - slope * fx, 0, 10);
    expect(((fit[3] as [number, number])[1] - (fit[0] as [number, number])[1]) / 3).toBe(2);

    // One update at w = 3 on (1, 1) and (2, 3): gradient 8, minimum 1.4, step 0.8, landing at 2.2.
    const gradientAt = (w: number) => 1 * (w * 1 - 1) + 2 * (w * 2 - 3);
    expect(gradientAt(3)).toBe(8);
    near((1 * 1 + 2 * 3) / (1 + 4), 1.4, 10);
    near(3 - 0.1 * 8, 2.2, 10);
    near(0.1 * 8, (3 - 1.4) / 2, 10);

    // (1, 2) and (2, 4) from w = 0: loss 10, gradient -10, one step to w = 1, loss 2.5.
    const loss2 = (w: number) => 0.5 * ((w * 1 - 2) ** 2 + (w * 2 - 4) ** 2);
    const gradient2 = (w: number) => 1 * (w * 1 - 2) + 2 * (w * 2 - 4);
    expect([loss2(0), gradient2(0)]).toEqual([10, -10]);
    near(0 - 0.1 * gradient2(0), 1, 10);
    near(loss2(1), 2.5, 10);
    near(loss2(1) / loss2(0), 0.25, 10);
    near(((1 - 2) / (0 - 2)) ** 2, 0.25, 10);

    // F1 for precision 0.75 and recall 0.90: 0.818, below their average of 0.825 and above 0.75.
    const f1 = (2 * 0.75 * 0.9) / (0.75 + 0.9);
    near(f1, 0.818, 3);
    near((0.75 + 0.9) / 2, 0.825, 10);
    expect(f1).toBeLessThan(0.825);
    expect(f1).toBeGreaterThan(0.75);
    near(0.75 * 0.9, 0.675, 10);
    near((2 * 18) / (2 * 18 + 6 + 2), 0.818, 3);

    // The baseline on 4,000 people with 20 positives, against a model at 0.99.
    near((4000 - 20) / 4000, 0.995, 10);
    near((1 - 0.99) * 4000, 40, 8);
    near(20 / 4000, 1 / 200, 10);

    // The AUC of the four and the six examples, from the scores and labels in the prompts.
    const small = get("thresholds-and-ranking-auc-small").prompt;
    near(
      auc(
        numbers(small.split("have")[0] ?? ""),
        (small.match(/positive|negative/gu) ?? []).map((w) => w === "positive"),
      ),
      0.75,
      10,
    );
    const six = get("thresholds-and-ranking-practice-3").prompt;
    const [sixScores, sixLabels] = six.split("have the labels");
    const sixValues = numbers(sixScores ?? "");
    const sixFlags = numbers((sixLabels ?? "").split("where")[0] ?? "").map((x) => x === 1);
    expect(sixValues).toHaveLength(6);
    near(auc(sixValues, sixFlags), 8 / 9, 10);
    // The precision at 0.5 on the same six examples is the 0.75 that one wrong option quotes.
    const flaggedSix = sixValues.map((v, i) => [v, sixFlags[i]] as const).filter(([v]) => v >= 0.5);
    expect(flaggedSix.filter(([, p]) => p).length / flaggedSix.length).toBe(0.75);

    // Threshold 0.2 on the eight examples: 7 flagged, 4 positives and 3 of the 4 negatives.
    const eight: [number, boolean][] = [
      [0.92, true],
      [0.85, true],
      [0.75, false],
      [0.66, true],
      [0.58, false],
      [0.45, true],
      [0.3, false],
      [0.15, false],
    ];
    const flagged = eight.filter(([s]) => s >= 0.2);
    expect(flagged).toHaveLength(7);
    expect(flagged.filter(([, p]) => p)).toHaveLength(4);
    expect(flagged.filter(([, p]) => !p)).toHaveLength(3);
    near(3 / 4, 0.75, 10);
    near(3 / 7, 0.4286, 4);

    // The penalty 0.2 w squared at w = 3, against a mean squared error of 1.5.
    near(0.2 * 3 ** 2, 1.8, 10);
    near(1.5 + 0.2 * 3 ** 2, 3.3, 10);
    near(0.2 * 3, 0.6, 10);
    near(3 ** 2, 9, 10);

    // Setting B's fold scores against setting A's.
    const sumSquares = (xs: number[]) => {
      const m = meanOf(xs);
      return xs.reduce((s, x) => s + (x - m) ** 2, 0);
    };
    const settingA = [0.78, 0.8, 0.76, 0.79, 0.77];
    const settingB = [0.84, 0.72, 0.8, 0.7, 0.84];
    near(meanOf(settingA), 0.78, 10);
    near(meanOf(settingB), 0.78, 10);
    near(sumSquares(settingA), 0.001, 10);
    near(sumSquares(settingB), 0.0176, 10);
    near(sumSquares(settingB) / sumSquares(settingA), 17.6, 8);
    const sdA = Math.sqrt(sumSquares(settingA) / 4);
    const sdB = Math.sqrt(sumSquares(settingB) / 4);
    near(sdA, 0.016, 3);
    near(sdB, 0.066, 3);
    near(sdB / sdA, 4.2, 1);
    near(17.6 / 2, 8.8, 10);

    // The scaler on 2, 4, 4, 4, 5, 5, 7 and 9: mean 5, standard deviation 2, so 11 is 3 and 9 is 2.
    const training = [2, 4, 4, 4, 5, 5, 7, 9];
    const mu = meanOf(training);
    const sigma = Math.sqrt(meanOf(training.map((x) => (x - mu) ** 2)));
    expect([mu, sigma]).toEqual([5, 2]);
    expect([(11 - mu) / sigma, (9 - mu) / sigma]).toEqual([3, 2]);
    near(6 / 4, 1.5, 10);
    near(11 / 5, 2.2, 10);

    // A bootstrap sample of 5 from 5 rows leaves a given row out with probability 0.8 to the fifth.
    near(0.8 ** 5, 0.32768, 10);
    near(1 / Math.E, 0.368, 3);
    near(1 - 0.8, 0.2, 10);

    // Gini of a 6 and 4 node, a 3 and 1 node, and the loan-term split.
    near(gini(6, 4), 0.48, 10);
    near(2 * 0.6 * 0.4, 0.48, 10);
    near(gini(3, 1), 0.375, 10);
    near(gini(7, 3), 0.42, 10);
    near(gini(6, 2), 0.375, 10);
    near(gini(1, 1), 0.5, 10);
    near(0.8 * 0.375 + 0.2 * 0.5, 0.4, 10);
    near(0.42 - 0.4, 0.02, 10);
    near((0.375 + 0.5) / 2, 0.4375, 10);
    near(0.375 + 0.5, 0.875, 10);
    near(0.42 - 0.375, 0.045, 10);

    // One update of a weight at 2 with gradient 8 and learning rate 0.05.
    near(2 - 0.05 * 8, 1.6, 10);
    near((0.05 * 8) / 2, 0.2, 10);

    // Replicas: 1,000 at 80 each and a target of 80%, and 400 at 50 each and a target of 80%.
    near(1000 / (80 * 0.8), 15.625, 10);
    near(1000 / (15 * 80), 0.8333, 4);
    near(1000 / (16 * 80), 0.78125, 10);
    near(1000 / 80, 12.5, 10);
    near(400 / (50 * 0.8), 10, 10);
    expect(8 * 50).toBe(400);
    near(400 / (10 * 50), 0.8, 10);

    // The population stability index of the two and three bins in the prompts.
    const term = (e: number, a: number) => (a - e) * Math.log(a / e);
    near(term(0.7, 0.6), 0.0154, 4);
    near(term(0.3, 0.4), 0.0288, 4);
    near(psi([0.7, 0.3], [0.6, 0.4]), 0.0442, 4);
    near(Math.log(0.6 / 0.7), -0.154, 3);
    near(Math.log(0.4 / 0.3), 0.2877, 4);
    near(term(0.5, 0.4), 0.0223, 4);
    near(term(0.2, 0.3), 0.0405, 4);
    near(psi([0.5, 0.3, 0.2], [0.4, 0.3, 0.3]), 0.0629, 4);
    near(term(0.5, 0.3), 0.1022, 4);
    near(term(0.5, 0.7), 0.0673, 4);
    near(psi([0.5, 0.5], [0.3, 0.7]), 0.169, 3);
    expect(term(0.5, 0.3)).toBeGreaterThan(term(0.5, 0.7));

    // True positive rates of the two groups, and the same number of misses in each.
    near(30 / 40, 0.75, 10);
    near(10 / 20, 0.5, 10);
    near(30 / 40 - 10 / 20, 0.25, 10);
    expect([40 - 30, 20 - 10]).toEqual([10, 10]);

    // The review cards that used to drill a sum.
    near(45 / 60, 0.75, 10);
    near(0.2 * 1.5 ** 2, 0.45, 10);
    near(0.45 / 4, 0.1125, 4);
  });

  it("puts a case in front of the learner: scores, counts, a split, a feature or a result", () => {
    const situation = /\d|`[^`]+`|\byou\b|\bteam\b|\bmodel\b|\bfilter\b|\bnetwork\b/iu;
    const withFigures = bundle.questions.filter((question) => /\d/u.test(question.prompt));
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.85);
    expect(withFigures.length).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
    const tables = bundle.questions.filter(
      (question) =>
        kind(question) === "choice" &&
        (flat(question.prompt).match(/\d+(?:\.\d+)?/gu) ?? []).length >= 6,
    );
    expect(tables.length).toBeGreaterThanOrEqual(12);
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
    const places = new Set<string>();
    let choices = 0;
    let longest = 0;
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const length = right[0]?.label.length ?? 0;
      choices += 1;
      if (length > longestOther) longest += 1;
      expect(length, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      const stops = new Set(question.choices.map((choice) => choice.label.trimEnd().endsWith(".")));
      expect(stops.size, `${question.id} mixes full stops`).toBe(1);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(`${question.choices.indexOf(right[0] as (typeof question.choices)[number])}`);
    }
    expect(longest / choices).toBeLessThanOrEqual(0.3);
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("keeps most questions multiple choice, with order and sort questions where the sequence or the kinds are the point", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(5);
    expect(counts.sort).toBeGreaterThanOrEqual(3);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
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

  it("covers the usual mistakes: accuracy on a rare class, tuning on the test set, a random split of time data, leaks, skew and drift", () => {
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
      /base rate|never flags|predicts that nobody/iu,
      /test set/iu,
      /at random|shuffle/iu,
      /leak/iu,
      /train-serve skew|different definition|two definitions/iu,
      /concept drift/iu,
      /data drift/iu,
      /model card/iu,
      /canary/iu,
      /shadow/iu,
      /out-of-bag|bootstrap/iu,
    ])
      expect(
        text.some((entry) => phrase.test(entry)),
        String(phrase),
      ).toBe(true);
  });

  it("does not make a single metric the answer for every use", () => {
    const sorted = get("classification-and-metrics-sort-which-metric");
    const bins = new Set(sorted.sort?.items.map((item) => item.bin));
    expect(bins).toEqual(new Set(["recall", "precision"]));
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
