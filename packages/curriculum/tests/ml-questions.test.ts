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
 * learner and ask what it shows. Numeric questions stay where computing the metric is the skill, and
 * this file recomputes each of them, and the figures the other questions rely on, from the numbers
 * in the prompt. The definitions come from the scikit-learn user guide, Google's Machine Learning
 * Crash Course and its Rules of Machine Learning, which the course lists as sources.
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

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to places where computing the metric is the skill", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(28);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("recomputes every numeric answer from the numbers in its prompt", () => {
    const sxy = (points: [number, number][]) => {
      const mx = points.reduce((s, p) => s + p[0], 0) / points.length;
      const my = points.reduce((s, p) => s + p[1], 0) / points.length;
      return {
        sxy: points.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0),
        sxx: points.reduce((s, p) => s + (p[0] - mx) ** 2, 0),
      };
    };
    const checks: Record<string, (text: string) => number> = {
      "what-a-model-learns-sxy-three": (t) => sxy(pairs(t)).sxy,
      "what-a-model-learns-practice-1": (t) => {
        const { sxy: a, sxx: b } = sxy(pairs(t));
        return a / b;
      },
      "loss-and-gradient-descent-w-after-one-step": (t) => {
        const [w, gradient, eta] = numbers(t) as [number, number, number];
        return w - eta * gradient;
      },
      "loss-and-gradient-descent-practice-1": (t) => {
        const points = pairs(t);
        const w0 = Number(/At w = (-?[\d.]+)/u.exec(flat(t))?.[1]);
        const eta = Number(/learning rate ([\d.]+)/u.exec(flat(t))?.[1]);
        const gradient = points.reduce((s, [x, y]) => s + x * (w0 * x - y), 0);
        expect(gradient).toBe(Number(/gradient is (-?\d+)/u.exec(flat(t))?.[1]));
        return w0 - eta * gradient;
      },
      "classification-and-metrics-f1-another": (t) => {
        const [p, r] = numbers(t) as [number, number];
        return (2 * p * r) / (p + r);
      },
      "classification-and-metrics-rare-baseline": (t) => {
        const [n, positives] = numbers(t) as [number, number];
        return (n - positives) / n;
      },
      "classification-and-metrics-practice-1": (t) => {
        const [tp, fp] = numbers(t) as [number, number];
        return tp / (tp + fp);
      },
      "thresholds-and-ranking-precision-at-05": (t) => {
        const flagged = labelled(t).filter((row) => row.score >= 0.5);
        return flagged.filter((row) => row.positive).length / flagged.length;
      },
      "thresholds-and-ranking-auc-small": (t) => {
        const scores = numbers(t.split("labels")[0] ?? "");
        const labels = (t.match(/positive|negative/gu) ?? []).map((w) => w === "positive");
        return auc(scores, labels);
      },
      "thresholds-and-ranking-fpr-at-04": (t) => {
        const [, fp, negatives] = numbers(t) as [number, number, number];
        return fp / negatives;
      },
      "thresholds-and-ranking-practice-3": (t) => {
        const [head, tail] = t.split("labels");
        const scores = numbers(head ?? "");
        const labels = numbers((tail ?? "").split("What")[0] ?? "").map((x) => x === 1);
        return auc(scores, labels);
      },
      "regularisation-and-cross-validation-pen-l2": (t) => {
        const [mse, w, lambda] = numbers(t) as [number, number, number];
        return mse + lambda * w * w;
      },
      "regularisation-and-cross-validation-sd-b": (t) => {
        const [ss, folds] = numbers(t) as [number, number];
        return Math.sqrt(ss / (folds - 1));
      },
      "features-and-leakage-z-of-eleven": (t) => {
        const [mean, sd, x] = numbers(t) as [number, number, number];
        return (x - mean) / sd;
      },
      "trees-and-ensembles-left-out-5": (t) => {
        const [draws] = numbers(t) as [number];
        return (1 - 1 / draws) ** draws;
      },
      "trees-and-ensembles-practice-1": (t) => {
        const [a, b] = numbers(t) as [number, number];
        return gini(a, b);
      },
      "trees-and-ensembles-gain-age-v2": (t) => {
        const [left, , gl, right, gr] = numbers(t) as [number, number, number, number, number];
        return (left / 10) * gl + (right / 10) * gr;
      },
      "neural-networks-params-5-2-1": (t) => {
        const sizes = numbers(t.split("layer sizes")[1] ?? "").slice(0, 3);
        return sizes.slice(1).reduce((s, n, i) => s + (sizes[i] as number) * n + n, 0);
      },
      "neural-networks-w2-new": (t) => {
        const [w, gradient, eta] = numbers(t.replace("w₂", "w")) as [number, number, number];
        return w - eta * gradient;
      },
      "pipelines-and-experiments-fits-36": (t) => {
        const [a, b, c, folds] = numbers(t) as [number, number, number, number];
        return a * b * c * folds;
      },
      "pipelines-and-experiments-practice-1": (t) => {
        const [a, b, folds] = numbers(t) as [number, number, number];
        return a * b * folds;
      },
      "serving-and-release-replicas-16": (t) => {
        const [peak, each, utilisation] = numbers(t) as [number, number, number];
        return Math.ceil(peak / (each * (utilisation / 100)));
      },
      "serving-and-release-practice-1": (t) => {
        const [peak, each, utilisation] = numbers(t) as [number, number, number];
        return Math.ceil(peak / (each * (utilisation / 100)));
      },
      "monitoring-and-drift-psi-two-bins": (t) => {
        const [e1, e2, a1, a2] = numbers(t) as [number, number, number, number];
        return psi([e1, e2], [a1, a2]);
      },
      "monitoring-and-drift-practice-1": (t) => {
        const n = numbers(t.replace(/\.$/u, ""));
        return psi(n.slice(0, 3), n.slice(3, 6));
      },
      "monitoring-and-drift-psi-169-v2": (t) => {
        const [e1, e2, a1, a2] = numbers(t) as [number, number, number, number];
        return psi([e1, e2], [a1, a2]) - (a1 - e1) * Math.log(a1 / e1);
      },
      "responsible-ml-practice-2": (t) => {
        const [found1, n1, found2, n2] = numbers(t.replace(/In group [AB],/gu, "")) as number[];
        return (found1 as number) / (n1 as number) - (found2 as number) / (n2 as number);
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
