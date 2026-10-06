import type { PsychologyModel } from "@discere/contracts";

/**
 * Deterministic computation for the psychology explorer. Models hold only stated values; every
 * result below is derived here so the drawing, the tests and the tutor agree on one answer.
 */
type Model<K extends PsychologyModel["kind"]> = Extract<PsychologyModel, { kind: K }>;

/** Formats a number with at most `places` decimals and no trailing zeros. */
export function psychologyNumber(value: number, places = 2): string {
  if (!Number.isFinite(value)) return "—";
  const fixed = value.toFixed(places);
  const trimmed = fixed.includes(".") ? fixed.replace(/\.?0+$/u, "") : fixed;
  return (trimmed === "-0" ? "0" : trimmed).replace("-", "−");
}

/** Standard normal density. */
export function psychNormalPdf(x: number): number {
  return Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);
}

/** Standard normal cumulative probability, accurate to about 1e-7 (Abramowitz and Stegun 7.1.26 via erf). */
export function psychNormalCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-z * z);
  return x >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** The z-score below which a proportion p of a standard normal distribution lies. */
export function psychNormalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  // Bisection is slow but exact enough and needs no table of coefficients.
  let lo = -9,
    hi = 9;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (psychNormalCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Pearson correlation of the stated points. */
export function psychPearson(points: ReadonlyArray<{ x: number; y: number }>): number {
  const n = points.length;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let sxy = 0,
    sxx = 0,
    syy = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

/** Least-squares line through the points, for drawing. */
export function psychRegressionLine(points: ReadonlyArray<{ x: number; y: number }>) {
  const n = points.length;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let sxy = 0,
    sxx = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
  }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

/** A small seeded generator so a shuffle is the same on every machine. */
export function psychSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Splits participants into two equal groups. Random assignment shuffles with the seed; self
 * selection lets the half with the highest trait values choose the treatment.
 */
export function psychAssignGroups(m: Model<"assignment">, seed = m.seed) {
  const order = m.traits.map((_, i) => i);
  if (m.method === "random") {
    const random = psychSeededRandom(seed);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
  } else order.sort((a, b) => m.traits[b]! - m.traits[a]! || a - b);
  const half = order.length / 2;
  const treatment = order.slice(0, half).sort((a, b) => a - b);
  const control = order.slice(half).sort((a, b) => a - b);
  const mean = (ids: number[]) => ids.reduce((a, i) => a + m.traits[i]!, 0) / ids.length;
  return {
    treatment,
    control,
    treatmentMean: mean(treatment),
    controlMean: mean(control),
    gap: mean(treatment) - mean(control),
  };
}

/** Pooled standard deviation for two equal-sized groups. */
export function psychPooledSd(sdA: number, sdB: number): number {
  return Math.sqrt((sdA ** 2 + sdB ** 2) / 2);
}

/** Cohen's d, positive when group B scores higher than group A. */
export function psychCohensD(m: Model<"effect">): number {
  return (m.meanB - m.meanA) / psychPooledSd(m.sdA, m.sdB);
}

export function psychEffectSummary(m: Model<"effect">) {
  const d = psychCohensD(m);
  return {
    d,
    /** Share of group B above the mean of group A (Cohen's U3). */
    aboveMean: psychNormalCdf(d),
    /** Overlapping coefficient of two equal-variance normal curves. */
    overlap: 2 * psychNormalCdf(-Math.abs(d) / 2),
    /** Chance that a random member of B outscores a random member of A. */
    superiority: psychNormalCdf(d / Math.SQRT2),
    /** Participants per group for 80% power at two-sided α = .05, by the normal approximation. */
    perGroupFor80: d === 0 ? Infinity : Math.ceil((2 * (1.959964 + 0.841621) ** 2) / d ** 2),
  };
}

/** Lehr's rule of thumb: about 16/d² participants per group give 80% power at α = .05. */
export function psychLehrSampleSize(d: number): number {
  return 16 / d ** 2;
}

/** Hit and false-alarm rates for an equal-variance signal detection model. */
export function psychDetectionRates(m: Model<"detection">, criterion = m.criterion) {
  const hit = 1 - psychNormalCdf(criterion - m.separation);
  const falseAlarm = 1 - psychNormalCdf(criterion);
  return {
    hit,
    falseAlarm,
    miss: 1 - hit,
    correctRejection: 1 - falseAlarm,
    dPrime: m.separation,
    /** Bias c, zero when the criterion sits halfway between the two means. */
    bias: criterion - m.separation / 2,
  };
}

/** d′ = z(H) − z(FA), from stated rates. */
export function psychDPrimeFromRates(hit: number, falseAlarm: number): number {
  return psychNormalQuantile(hit) - psychNormalQuantile(falseAlarm);
}

export function psychSwitchingTrials(m: Model<"switching">) {
  let clock = 0;
  return [...m.sequence].map((task, i) => {
    const switched = i > 0 && task !== m.sequence[i - 1];
    const ms = m.baseMs + (switched ? m.switchCostMs : 0);
    const start = clock;
    clock += ms;
    return { task: task as "A" | "B", switched, ms, start };
  });
}

export function psychSwitchingSummary(m: Model<"switching">) {
  const trials = psychSwitchingTrials(m);
  const switches = trials.filter((t) => t.switched).length;
  return {
    trials: trials.length,
    switches,
    totalMs: trials.reduce((a, t) => a + t.ms, 0),
    lostMs: switches * m.switchCostMs,
  };
}

/** Reliability-weighted combination of two independent Gaussian cues. */
export function psychCombineCues(m: Model<"cues">) {
  const pa = 1 / m.sdA ** 2,
    pb = 1 / m.sdB ** 2;
  const weightA = pa / (pa + pb);
  return {
    weightA,
    weightB: 1 - weightA,
    mean: weightA * m.meanA + (1 - weightA) * m.meanB,
    sd: Math.sqrt(1 / (pa + pb)),
  };
}

export function psychSpanSummary(m: Model<"span">) {
  let at = 0;
  const groups = m.chunks.map((size) => {
    const group = m.items.slice(at, at + size);
    at += size;
    return group;
  });
  return {
    items: m.items.length,
    chunks: m.chunks.length,
    groups,
    itemsFit: m.items.length <= m.capacity,
    chunksFit: m.chunks.length <= m.capacity,
  };
}

/**
 * The FSRS-4 form of the forgetting curve: R(t, S) = (1 + t / 9S)^−1. Stability S is the number
 * of days after which predicted recall has fallen to 90 per cent.
 */
export function psychRetrievability(days: number, stability: number): number {
  return 1 / (1 + days / (9 * stability));
}

/** Stability in force at a given day, after the reviews that have already happened. */
export function psychStabilityAt(m: Model<"forgetting">, day: number): number {
  const done = m.reviews.filter((r) => r <= day).length;
  return m.stability * m.growth ** done;
}

/** Predicted recall on a given day of a forgetting model with reviews. */
export function psychRecallAt(m: Model<"forgetting">, day: number): number {
  const last = [0, ...m.reviews].filter((r) => r <= day).at(-1)!;
  return psychRetrievability(day - last, psychStabilityAt(m, day));
}

/** Sampled curve for drawing, including the jump back to full recall at each review. */
export function psychForgettingCurve(m: Model<"forgetting">, samples = 160) {
  const days = new Set<number>();
  for (let i = 0; i <= samples; i++) days.add((m.horizon * i) / samples);
  for (const r of m.reviews) {
    days.add(r - 1e-9);
    days.add(r);
  }
  return [...days].sort((a, b) => a - b).map((day) => ({ day, recall: psychRecallAt(m, day) }));
}

/** Rescorla–Wagner: ΔV = αβ(λ − V), with λ = 0 when the outcome does not follow. */
export function psychPairingStrengths(m: Model<"pairing">): number[] {
  const values = [0];
  for (const trial of m.trials) {
    const v = values.at(-1)!;
    const target = trial === "paired" ? m.asymptote : 0;
    values.push(v + m.rate * (target - v));
  }
  return values;
}

export function psychScheduleEvents(m: Model<"schedule">) {
  const responses: number[] = [];
  for (let t = m.responseEvery; t <= m.duration + 1e-9; t += m.responseEvery) responses.push(t);
  const reinforced: number[] = [];
  const ratio = m.rule.endsWith("ratio");
  let since = 0,
    lastTime = 0;
  for (const t of responses) {
    const need = m.requirements[reinforced.length % m.requirements.length]!;
    since += 1;
    if (ratio ? since >= need : t - lastTime >= need) {
      reinforced.push(t);
      since = 0;
      lastTime = t;
    }
  }
  return { responses, reinforced };
}

export const psychScheduleNames: Record<Model<"schedule">["rule"], string> = {
  fixed_ratio: "fixed ratio",
  variable_ratio: "variable ratio",
  fixed_interval: "fixed interval",
  variable_interval: "variable interval",
};

export function psychBaseRateCounts(m: Model<"base_rate">) {
  const withCondition = Math.round(m.population * m.baseRate);
  const truePositives = Math.round(withCondition * m.hitRate);
  const without = m.population - withCondition;
  const falsePositives = Math.round(without * m.falseAlarmRate);
  return {
    withCondition,
    without,
    truePositives,
    falsePositives,
    positives: truePositives + falsePositives,
    positivePredictiveValue: truePositives / (truePositives + falsePositives),
  };
}

/** Jacowitz and Kahneman's anchoring index: the shift in estimates per unit shift in anchor. */
export function psychAnchoringIndex(m: Model<"anchor">): number {
  return (m.highEstimate - m.lowEstimate) / (m.highAnchor - m.lowAnchor);
}

export function psychTallyPercent(m: Model<"tally">): number {
  return (m.count / m.total) * 100;
}

/** Probability that at least one of n independent bystanders acts. */
export function psychAnyoneHelps(m: Model<"bystander">): number {
  return 1 - (1 - m.helpProbability) ** m.bystanders;
}

const pct = (v: number, places = 1) => psychologyNumber(v * 100, places) + "%";

/** Plain-language statement of a model's given values, for tutors and screen readers. */
export function psychologyGivens(m: PsychologyModel): string {
  switch (m.kind) {
    case "scatter":
      return `${m.points.length} people, each plotted by ${m.xLabel.toLowerCase()} and ${m.yLabel.toLowerCase()}${m.zLabel ? `, with ${m.zLabel.toLowerCase()} recorded for each` : ""}.`;
    case "assignment":
      return `${m.traits.length} volunteers with ${m.traitLabel.toLowerCase()} of ${m.traits.join(", ")}, split into two groups by ${m.method === "random" ? "random assignment" : "their own choice"}.`;
    case "effect":
      return `${m.labelA}: mean ${psychologyNumber(m.meanA)}${m.unit ? " " + m.unit : ""}, standard deviation ${psychologyNumber(m.sdA)}. ${m.labelB}: mean ${psychologyNumber(m.meanB)}${m.unit ? " " + m.unit : ""}, standard deviation ${psychologyNumber(m.sdB)}.`;
    case "detection":
      return `Noise and ${m.signalLabel.toLowerCase()} distributions ${psychologyNumber(m.separation)} standard deviations apart; the criterion sits ${psychologyNumber(m.criterion)} standard deviations above the noise mean.`;
    case "switching":
      return `${m.sequence.length} trials in the order ${[...m.sequence].join(" ")} (A = ${m.labelA.toLowerCase()}, B = ${m.labelB.toLowerCase()}). Each trial takes ${m.baseMs} ms, plus ${m.switchCostMs} ms when the task changes.`;
    case "cues":
      return `${m.labelA}: ${psychologyNumber(m.meanA)}${m.unit ? " " + m.unit : ""} with standard deviation ${psychologyNumber(m.sdA)}. ${m.labelB}: ${psychologyNumber(m.meanB)}${m.unit ? " " + m.unit : ""} with standard deviation ${psychologyNumber(m.sdB)}.`;
    case "span":
      return `The list ${m.items.join(" ")}, grouped as ${m.chunks.join(" + ")}, against a capacity of about ${m.capacity} chunks.`;
    case "forgetting":
      return `Starting stability ${psychologyNumber(m.stability)} days; ${m.reviews.length ? `successful reviews on days ${m.reviews.map((r) => psychologyNumber(r)).join(", ")}, each multiplying stability by ${psychologyNumber(m.growth)}` : "no reviews"}; shown over ${psychologyNumber(m.horizon)} days.`;
    case "pairing":
      return `${m.trials.length} trials of ${m.cueLabel.toLowerCase()} (${m.trials.map((t) => (t === "paired" ? `with ${m.outcomeLabel.toLowerCase()}` : "alone")).join(", ")}). Learning rate ${psychologyNumber(m.rate)}, maximum strength ${psychologyNumber(m.asymptote)}.`;
    case "schedule":
      return `A response every ${m.responseEvery} s for ${m.duration} s. Requirements for successive rewards: ${m.requirements.join(", ")} ${m.rule.endsWith("ratio") ? "responses" : "seconds"}.`;
    case "base_rate":
      return `${m.population} people; ${pct(m.baseRate, 2)} have ${m.conditionLabel.toLowerCase()}. The ${m.testLabel.toLowerCase()} flags ${pct(m.hitRate, 2)} of those who have it and ${pct(m.falseAlarmRate, 2)} of those who do not.`;
    case "anchor":
      return `${m.quantity}. Low anchor ${psychologyNumber(m.lowAnchor)} with median estimate ${psychologyNumber(m.lowEstimate)}; high anchor ${psychologyNumber(m.highAnchor)} with median estimate ${psychologyNumber(m.highEstimate)}.`;
    case "tally":
      return `${m.setting}: ${m.count} of ${m.total} ${m.countLabel.toLowerCase()}.`;
    case "bystander":
      return `${m.bystanders} ${m.bystanders === 1 ? "witness" : "witnesses"}, each acting independently with probability ${psychologyNumber(m.helpProbability, 3)}.`;
  }
}

/** Worked results for a model, shown only after the learner has answered. */
export function psychologyMeasures(m: PsychologyModel): Array<{ label: string; value: string }> {
  switch (m.kind) {
    case "scatter": {
      const r = psychPearson(m.points);
      return [
        { label: "Correlation r", value: psychologyNumber(r) },
        { label: "Shared variance r²", value: pct(r * r, 0) },
      ];
    }
    case "assignment": {
      const g = psychAssignGroups(m);
      return [
        { label: "Treatment mean", value: psychologyNumber(g.treatmentMean) },
        { label: "Control mean", value: psychologyNumber(g.controlMean) },
        { label: "Gap before treatment", value: psychologyNumber(g.gap) },
      ];
    }
    case "effect": {
      const e = psychEffectSummary(m);
      return [
        { label: "Cohen's d", value: psychologyNumber(e.d) },
        { label: "Overlap", value: pct(e.overlap, 0) },
        { label: "B above A's mean", value: pct(e.aboveMean, 0) },
      ];
    }
    case "detection": {
      const r = psychDetectionRates(m);
      return [
        { label: "Hit rate", value: pct(r.hit) },
        { label: "False-alarm rate", value: pct(r.falseAlarm) },
        { label: "d′", value: psychologyNumber(r.dPrime) },
      ];
    }
    case "switching": {
      const s = psychSwitchingSummary(m);
      return [
        { label: "Switches", value: String(s.switches) },
        { label: "Total time", value: psychologyNumber(s.totalMs / 1000, 2) + " s" },
        { label: "Lost to switching", value: s.lostMs + " ms" },
      ];
    }
    case "cues": {
      const c = psychCombineCues(m);
      return [
        { label: `Weight on ${m.labelA.toLowerCase()}`, value: psychologyNumber(c.weightA) },
        {
          label: "Combined estimate",
          value: psychologyNumber(c.mean) + (m.unit ? " " + m.unit : ""),
        },
        { label: "Combined SD", value: psychologyNumber(c.sd) },
      ];
    }
    case "span": {
      const s = psychSpanSummary(m);
      return [
        { label: "Items", value: String(s.items) },
        { label: "Chunks", value: String(s.chunks) },
        { label: "Within capacity", value: s.chunksFit ? "Yes" : "No" },
      ];
    }
    case "forgetting":
      return [
        {
          label: `Recall on day ${psychologyNumber(m.horizon)}`,
          value: pct(psychRecallAt(m, m.horizon)),
        },
        {
          label: "Final stability",
          value: psychologyNumber(psychStabilityAt(m, m.horizon)) + " days",
        },
      ];
    case "pairing": {
      const v = psychPairingStrengths(m);
      return [{ label: "Final strength V", value: psychologyNumber(v.at(-1)!, 3) }];
    }
    case "schedule": {
      const e = psychScheduleEvents(m);
      return [
        { label: "Responses", value: String(e.responses.length) },
        { label: "Rewards", value: String(e.reinforced.length) },
      ];
    }
    case "base_rate": {
      const c = psychBaseRateCounts(m);
      return [
        { label: "True positives", value: String(c.truePositives) },
        { label: "False positives", value: String(c.falsePositives) },
        { label: "P(condition | positive)", value: pct(c.positivePredictiveValue) },
      ];
    }
    case "anchor":
      return [{ label: "Anchoring index", value: psychologyNumber(psychAnchoringIndex(m)) }];
    case "tally":
      return [{ label: "Share", value: pct(m.count / m.total) }];
    case "bystander":
      return [{ label: "At least one acts", value: pct(psychAnyoneHelps(m)) }];
  }
}
