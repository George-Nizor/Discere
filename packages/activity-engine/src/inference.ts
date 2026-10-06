import type { InferenceModel } from "@discere/contracts";
import {
  binomialMass,
  countEventProbability,
  normalInterval,
  normalQuantile,
  normalSurvival,
  poissonMass,
  studentQuantile,
  studentSurvival,
} from "./inference-probability.js";

type Model<K extends InferenceModel["kind"]> = Extract<InferenceModel, { kind: K }>;
export const inferenceNumber = (x: number) => Number(x.toFixed(5)).toString();
export const inferencePercent = (x: number) => inferenceNumber(x * 100) + "%";
const average = (xs: number[]) => xs.reduce((sum, x) => sum + x, 0) / xs.length;
const median = (xs: number[]) => {
  const middle = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[middle]! : (xs[middle - 1]! + xs[middle]!) / 2;
};

/** Median of each half, excluding the overall median for odd sample sizes. */
export function inferenceSummary(values: number[]) {
  if (values.length < 3 || values.length > 16 || values.some((x) => !Number.isFinite(x)))
    throw Error("Use three to sixteen finite observations.");
  const sorted = [...values].sort((a, b) => a - b);
  const mean = average(values);
  const variance = values.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (values.length - 1);
  const q1 = median(sorted.slice(0, Math.floor(sorted.length / 2)));
  const q3 = median(sorted.slice(Math.ceil(sorted.length / 2)));
  return {
    sorted,
    mean,
    median: median(sorted),
    q1,
    q3,
    iqr: q3 - q1,
    variance,
    sd: Math.sqrt(variance),
  };
}

export function inferenceDiscrete(outcomes: Model<"discrete_distribution">["outcomes"]) {
  const mean = outcomes.reduce((sum, o) => sum + o.value * o.probability, 0);
  const variance = outcomes.reduce((sum, o) => sum + (o.value - mean) ** 2 * o.probability, 0);
  return { mean, variance, sd: Math.sqrt(variance) };
}

export function inferenceBayes(m: Model<"bayes_table">) {
  const row = m.counts[0][0] + m.counts[0][1];
  const column = m.counts[0][0] + m.counts[1][0];
  const total = m.counts.flat().reduce((sum, n) => sum + n, 0);
  return {
    total,
    prior: row / total,
    evidence: column / total,
    likelihood: m.counts[0][0] / row,
    posterior: m.counts[0][0] / column,
  };
}

/** All equally likely ordered draws, independently with replacement. */
export function inferenceSampling(m: Model<"sampling_means">) {
  const count = m.population.length ** m.sampleSize;
  if (
    !Number.isInteger(m.sampleSize) ||
    m.sampleSize < 1 ||
    m.sampleSize > 5 ||
    m.population.length < 2 ||
    m.population.length > 6 ||
    count > 4096
  )
    throw Error("Exact sampling is limited to 4,096 ordered samples.");
  const means: number[] = [];
  const enumerate = (sum: number, remaining: number) => {
    if (remaining === 0) {
      means.push(sum / m.sampleSize);
      return;
    }
    for (const value of m.population) enumerate(sum + value, remaining - 1);
  };
  enumerate(0, m.sampleSize);
  const frequencies = new Map<number, number>();
  for (const value of means) {
    const key = Number(value.toFixed(9));
    frequencies.set(key, (frequencies.get(key) ?? 0) + 1);
  }
  const mean = average(m.population);
  const populationVariance =
    m.population.reduce((sum, x) => sum + (x - mean) ** 2, 0) / m.population.length;
  return {
    means,
    mean,
    se: Math.sqrt(populationVariance / m.sampleSize),
    bins: [...frequencies]
      .sort((a, b) => a[0] - b[0])
      .map(([value, frequency]) => ({
        value,
        count: frequency,
        probability: frequency / count,
      })),
  };
}

export function inferenceMeanInterval(m: Model<"mean_interval">) {
  const se = m.sd / Math.sqrt(m.size);
  const critical = m.knownSigma
    ? normalQuantile((1 + m.confidence) / 2)
    : studentQuantile((1 + m.confidence) / 2, m.size - 1);
  const margin = se * critical;
  return { mean: m.mean, se, critical, margin, lower: m.mean - margin, upper: m.mean + margin };
}

/** Wilson score interval, including all-success and zero-success samples. */
export function inferenceProportion(m: Model<"proportion_interval">) {
  const estimate = m.successes / m.size;
  const z = normalQuantile((1 + m.confidence) / 2),
    z2 = z * z;
  const denominator = 1 + z2 / m.size;
  const center = (estimate + z2 / (2 * m.size)) / denominator;
  const margin =
    (z * Math.sqrt((estimate * (1 - estimate)) / m.size + z2 / (4 * m.size ** 2))) / denominator;
  return {
    estimate,
    center,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

/** Reproducible illustration under a normal population with known population SD. */
export function inferenceCoverage(m: Model<"interval_coverage">) {
  let state = m.seed >>> 0;
  const uniform = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  };
  const se = m.sd / Math.sqrt(m.size);
  const margin = normalQuantile((1 + m.confidence) / 2) * se;
  return Array.from({ length: m.intervals }, (_, index) => {
    const z = Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
    const mean = m.mean + se * z,
      lower = mean - margin,
      upper = mean + margin;
    return { index, mean, lower, upper, covers: lower <= m.mean && upper >= m.mean };
  });
}

export function inferenceTest(m: Model<"mean_test">) {
  const se = m.sd / Math.sqrt(m.size),
    statistic = (m.mean - m.nullMean) / se;
  const survival = (value: number) =>
    m.knownSigma ? normalSurvival(value) : studentSurvival(value, m.size - 1);
  const p =
    m.alternative === "greater"
      ? survival(statistic)
      : m.alternative === "less"
        ? survival(-statistic)
        : Math.min(1, 2 * survival(Math.abs(statistic)));
  return { effect: m.mean - m.nullMean, se, statistic, p, reject: p <= m.alpha };
}

/** Right-tailed known-sigma z test at the stated positive alternative effect. */
export function inferencePower(m: Model<"power">) {
  const se = m.sd / Math.sqrt(m.size),
    critical = normalQuantile(1 - m.alpha);
  const power = normalSurvival(critical - m.effect / se);
  return { se, critical, power, beta: 1 - power, threshold: critical * se };
}

/** Welch's independent-groups estimate, consistently second group minus first. */
export function inferenceWelch(m: Model<"two_sample">) {
  const [a, b] = m.groups,
    va = a.sd ** 2 / a.size,
    vb = b.sd ** 2 / b.size;
  const se = Math.sqrt(va + vb),
    difference = b.mean - a.mean;
  const degrees = (va + vb) ** 2 / (va ** 2 / (a.size - 1) + vb ** 2 / (b.size - 1));
  const margin = studentQuantile((1 + m.confidence) / 2, degrees) * se;
  return {
    difference,
    se,
    degrees,
    lower: difference - margin,
    upper: difference + margin,
    p: Math.min(1, 2 * studentSurvival(Math.abs(difference / se), degrees)),
  };
}

export function inferencePaired(m: Model<"paired">) {
  const differences = m.before.map((x, i) => m.after[i]! - x);
  const summary = inferenceSummary(differences);
  const interval = inferenceMeanInterval({
    kind: "mean_interval",
    mean: summary.mean,
    sd: summary.sd,
    size: differences.length,
    knownSigma: false,
    confidence: m.confidence,
  });
  return { differences, ...interval, sd: summary.sd };
}

export function inferenceAllocation(m: Model<"allocation">) {
  const a = m.units.filter((u) => u.arm === "A"),
    b = m.units.filter((u) => u.arm === "B");
  return {
    a: average(a.map((u) => u.value)),
    b: average(b.map((u) => u.value)),
    difference: average(b.map((u) => u.value)) - average(a.map((u) => u.value)),
  };
}

export function inferenceMultiplicity(m: Model<"multiple_tests">) {
  return {
    familyError: -Math.expm1(m.tests * Math.log1p(-m.alpha)),
    bonferroni: m.alpha / m.tests,
  };
}

const n = inferenceNumber,
  pct = inferencePercent;
const list = (values: number[]) => values.map(n).join(", ");
const ci = (confidence: number) => pct(confidence) + " confidence";
const spreadName = (known: boolean) => (known ? "known population SD" : "sample SD");
const eventName = { equal: "exactly", at_least: "at least", at_most: "at most" };

/** Only authored givens: safe for text alternatives before an answer. */
export function inferenceGivens(m: InferenceModel): string {
  switch (m.kind) {
    case "sample_summary":
      return (
        "Observations: " +
        list(m.values) +
        ". Quartiles use medians of halves, excluding an overall middle observation."
      );
    case "bayes_table":
      return (
        m.rowLabels
          .map(
            (row, i) =>
              row + ": " + m.columnLabels.map((col, j) => col + " " + m.counts[i]![j]).join(", "),
          )
          .join("; ") + "."
      );
    case "discrete_distribution":
      return (
        m.outcomes.map((o) => n(o.value) + " with probability " + pct(o.probability)).join("; ") +
        "."
      );
    case "binomial":
      return (
        m.trials +
        " independent trials; fixed success probability " +
        pct(m.probability) +
        ". Event: " +
        eventName[m.tail] +
        " " +
        m.target +
        " successes."
      );
    case "poisson":
      return (
        "Poisson model: " +
        n(m.rate) +
        " arrivals per unit time for " +
        n(m.duration) +
        " time units. Event: " +
        eventName[m.tail] +
        " " +
        m.target +
        " arrivals."
      );
    case "normal":
      return (
        "Normal population; mean " +
        n(m.mean) +
        ", SD " +
        n(m.sd) +
        ". Shaded interval: " +
        n(m.lower) +
        " to " +
        n(m.upper) +
        "."
      );
    case "sampling_means":
      return (
        "Population values: " +
        list(m.population) +
        ". Draw " +
        m.sampleSize +
        " times independently, with replacement. Every listed unit is equally likely on each draw."
      );
    case "standard_error":
      return (
        "Mean " +
        n(m.mean) +
        "; " +
        spreadName(m.knownSigma) +
        " " +
        n(m.sd) +
        "; n = " +
        m.size +
        ". Independent observations."
      );
    case "mean_interval":
      return (
        "Sample mean " +
        n(m.mean) +
        "; " +
        spreadName(m.knownSigma) +
        " " +
        n(m.sd) +
        "; n = " +
        m.size +
        "; " +
        ci(m.confidence) +
        ". Independent normal observations."
      );
    case "interval_coverage":
      return (
        "Normal population: mean " +
        n(m.mean) +
        ", known SD " +
        n(m.sd) +
        ". Samples of " +
        m.size +
        "; " +
        ci(m.confidence) +
        ". " +
        m.intervals +
        " fixed simulated intervals."
      );
    case "proportion_interval":
      return (
        m.successes +
        " successes in " +
        m.size +
        " independent trials with a common success probability; " +
        ci(m.confidence) +
        "."
      );
    case "mean_test":
      return (
        "Sample mean " +
        n(m.mean) +
        "; " +
        spreadName(m.knownSigma) +
        " " +
        n(m.sd) +
        "; n = " +
        m.size +
        ". Null mean " +
        n(m.nullMean) +
        "; alternative: " +
        { less: "smaller", greater: "larger", different: "different" }[m.alternative] +
        ". Alpha " +
        pct(m.alpha) +
        ". Independent normal observations."
      );
    case "power":
      return (
        "Planned right-tailed z test, independent normal observations; known SD " +
        n(m.sd) +
        ", n = " +
        m.size +
        ", alpha " +
        pct(m.alpha) +
        ", true effect " +
        n(m.effect) +
        " above the null mean."
      );
    case "two_sample":
      return (
        m.groups
          .map(
            (g) => g.label + ": mean " + n(g.mean) + ", sample SD " + n(g.sd) + ", n = " + g.size,
          )
          .join("; ") +
        ". Independent normal groups; " +
        ci(m.confidence) +
        "."
      );
    case "paired":
      return (
        "Before: " +
        list(m.before) +
        ". After, in matching unit order: " +
        list(m.after) +
        ". Independent units with normally distributed differences; " +
        ci(m.confidence) +
        "."
      );
    case "test_outcomes":
      return (
        m.nullRuns +
        " runs with a true null; " +
        m.falseRejections +
        " rejected. " +
        m.alternativeRuns +
        " runs at a stated alternative; " +
        m.missedEffects +
        " missed."
      );
    case "allocation":
      return (
        m.units
          .map((u) => u.id + " (block " + u.block + ", group " + u.arm + "): " + n(u.value))
          .join("; ") + "."
      );
    case "multiple_tests":
      return (
        m.tests +
        " independent tests, each at alpha " +
        pct(m.alpha) +
        ". All null hypotheses are true, and each test has exactly its nominal false-alarm probability."
      );
  }
}

export interface InferenceResult {
  measures: Array<{ label: string; value: string }>;
  detail: string;
}
const result = (entries: Array<[string, string]>, detail: string): InferenceResult => ({
  measures: entries.map(([label, value]) => ({ label, value })),
  detail,
});
const intervalText = (lower: number, upper: number) => "[" + n(lower) + ", " + n(upper) + "]";
export function inferenceResult(m: InferenceModel): InferenceResult {
  switch (m.kind) {
    case "sample_summary": {
      const s = inferenceSummary(m.values);
      return result(
        [
          ["Mean", n(s.mean)],
          ["Median", n(s.median)],
          ["Quartiles", intervalText(s.q1, s.q3)],
          ["IQR", n(s.iqr)],
          ["Sample variance", n(s.variance)],
          ["Sample SD", n(s.sd)],
        ],
        "Variance uses n − 1. Quartiles describe the middle half using the stated convention; other conventions can differ.",
      );
    }
    case "bayes_table": {
      const b = inferenceBayes(m);
      return result(
        [
          ["Prior: " + m.rowLabels[0], pct(b.prior)],
          ["After " + m.columnLabels[0], pct(b.posterior)],
        ],
        "Condition on the " + m.columnLabels[0] + " column: use its total as the new denominator.",
      );
    }
    case "discrete_distribution": {
      const d = inferenceDiscrete(m.outcomes);
      return result(
        [
          ["Expected value", n(d.mean)],
          ["Variance", n(d.variance)],
          ["SD", n(d.sd)],
        ],
        "Weight each outcome by its probability. An expected value need not be a possible single outcome.",
      );
    }
    case "binomial":
      return result(
        [
          [
            "Event probability",
            pct(
              countEventProbability(
                (k) => binomialMass(m.trials, m.probability, k),
                m.target,
                m.tail,
              ),
            ),
          ],
          ["Expected successes", n(m.trials * m.probability)],
        ],
        "The binomial model requires a fixed number of independent trials with the same success probability.",
      );
    case "poisson": {
      const expected = m.rate * m.duration;
      return result(
        [
          ["Expected arrivals", n(expected)],
          [
            "Event probability",
            pct(countEventProbability((k) => poissonMass(expected, k), m.target, m.tail)),
          ],
        ],
        "A constant-rate Poisson process has independent counts in disjoint intervals. Its count variance equals its expected count.",
      );
    }
    case "normal":
      return result(
        [
          ["Lower z", n((m.lower - m.mean) / m.sd)],
          ["Upper z", n((m.upper - m.mean) / m.sd)],
          [
            "Probability in interval",
            pct(normalInterval((m.lower - m.mean) / m.sd, (m.upper - m.mean) / m.sd)),
          ],
        ],
        "Standardise by subtracting the mean and dividing by the population SD.",
      );
    case "sampling_means": {
      const s = inferenceSampling(m);
      return result(
        [
          ["Ordered samples", n(s.means.length)],
          ["Mean of sample means", n(s.mean)],
          ["Standard error", n(s.se)],
        ],
        "Every ordered sample is equally likely. Group their means to obtain the exact sampling distribution; its SD is the standard error.",
      );
    }
    case "standard_error":
      return result(
        [["Standard error", n(m.sd / Math.sqrt(m.size))]],
        m.knownSigma
          ? "Population SD measures individual spread. Standard error measures how sample means vary."
          : "The estimated standard error uses the sample SD. More observations reduce random uncertainty, not selection bias.",
      );
    case "mean_interval": {
      const c = inferenceMeanInterval(m);
      return result(
        [
          [ci(m.confidence) + " interval", intervalText(c.lower, c.upper)],
          ["Standard error", n(c.se)],
          ["Critical value", n(c.critical)],
          ["Margin", n(c.margin)],
        ],
        m.knownSigma
          ? "The z interval uses a known population SD. Confidence describes repeated-sampling coverage of this method."
          : "The t interval uses n − 1 degrees of freedom because the population SD was estimated, even when n exceeds 30.",
      );
    }
    case "interval_coverage": {
      const intervals = inferenceCoverage(m),
        count = intervals.filter((i) => i.covers).length;
      return result(
        [["Intervals covering the mean", count + " / " + intervals.length]],
        "The green intervals cover the fixed population mean. A finite batch need not match the confidence level exactly. Replay shows the same samples.",
      );
    }
    case "proportion_interval": {
      const c = inferenceProportion(m);
      return result(
        [
          ["Observed proportion", pct(c.estimate)],
          ["Wilson interval", pct(c.lower) + " to " + pct(c.upper)],
        ],
        "The score interval stays within 0 to 1 and retains uncertainty even when a sample has no successes or only successes.",
      );
    }
    case "mean_test": {
      const t = inferenceTest(m);
      return result(
        [
          [m.knownSigma ? "z statistic" : "t statistic", n(t.statistic)],
          ["p-value", n(t.p)],
          ["Decision at stated alpha", t.reject ? "Reject the null" : "Do not reject the null"],
          ["Estimated effect", n(t.effect)],
        ],
        "The p-value is a tail probability under the null model, not a probability that the null is true. Assess the effect and its uncertainty as well.",
      );
    }
    case "power": {
      const p = inferencePower(m);
      return result(
        [
          ["Power at this effect", pct(p.power)],
          ["Miss probability", pct(p.beta)],
        ],
        "Power depends on the particular alternative effect, spread, sample size and decision rule. It is not a probability that an observed finding is true.",
      );
    }
    case "two_sample": {
      const w = inferenceWelch(m);
      return result(
        [
          ["Second mean − first mean", n(w.difference)],
          ["Welch interval", intervalText(w.lower, w.upper)],
          ["Standard error", n(w.se)],
          ["Degrees of freedom", n(w.degrees)],
        ],
        "Welch's method estimates each group's variance separately. Independent groups are different from repeated measurements on the same units.",
      );
    }
    case "paired": {
      const p = inferencePaired(m);
      return result(
        [
          ["After − before differences", list(p.differences)],
          ["Mean change", n(p.mean)],
          ["Paired t interval", intervalText(p.lower, p.upper)],
          ["Standard error", n(p.se)],
        ],
        "Analyse one difference per unit. The spread of those differences determines uncertainty; preserve each before/after pairing.",
      );
    }
    case "test_outcomes":
      return result(
        [
          ["Observed false-alarm rate", pct(m.falseRejections / m.nullRuns)],
          ["Observed miss rate", pct(m.missedEffects / m.alternativeRuns)],
          ["Observed power", pct(1 - m.missedEffects / m.alternativeRuns)],
        ],
        "Each rate uses the runs with the relevant truth as its denominator. Realised simulation rates fluctuate around theoretical rates.",
      );
    case "allocation": {
      const a = inferenceAllocation(m);
      return result(
        [
          ["Group A mean", n(a.a)],
          ["Group B mean", n(a.b)],
          ["B − A", n(a.difference)],
        ],
        "Compare allocation within blocks before attributing a difference to treatment. Random assignment controls confounding in expectation; a single allocation can still be imbalanced.",
      );
    }
    case "multiple_tests": {
      const t = inferenceMultiplicity(m);
      return result(
        [
          ["At least one false alarm", pct(t.familyError)],
          ["Bonferroni per-test threshold", n(t.bonferroni)],
        ],
        "The exact family probability assumes independent tests with all nulls true. The Bonferroni bound uses alpha divided by the number of tests and does not require independence.",
      );
    }
  }
}
