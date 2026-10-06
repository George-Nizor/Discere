import { describe, expect, it } from "vitest";
import { PsychologyModelSchema, type PsychologyModel } from "@discere/contracts";
import {
  psychAnchoringIndex,
  psychAnyoneHelps,
  psychAssignGroups,
  psychBaseRateCounts,
  psychCohensD,
  psychCombineCues,
  psychDetectionRates,
  psychDPrimeFromRates,
  psychEffectSummary,
  psychForgettingCurve,
  psychNormalCdf,
  psychNormalQuantile,
  psychPairingStrengths,
  psychPearson,
  psychRecallAt,
  psychRetrievability,
  psychScheduleEvents,
  psychSpanSummary,
  psychSwitchingSummary,
  psychologyGivens,
  psychologyMeasures,
  psychologyNumber,
} from "../src/psychology.js";

type Of<K extends PsychologyModel["kind"]> = Extract<PsychologyModel, { kind: K }>;

describe("psychology models compute from stated values only", () => {
  it("matches standard normal table values", () => {
    expect(psychNormalCdf(0)).toBeCloseTo(0.5, 7);
    expect(psychNormalCdf(1.96)).toBeCloseTo(0.975, 4);
    expect(psychNormalCdf(-0.84)).toBeCloseTo(0.2005, 3);
    expect(psychNormalQuantile(0.8)).toBeCloseTo(0.8416, 3);
    expect(psychNormalQuantile(0.5)).toBeCloseTo(0, 6);
  });

  it("computes Pearson's r symmetrically and exactly for a perfect line", () => {
    const line = [1, 2, 3, 4].map((x) => ({ x, y: 10 - 2 * x }));
    expect(psychPearson(line)).toBeCloseTo(-1, 12);
    const pts = [
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 4 },
      { x: 4, y: 3 },
    ];
    expect(psychPearson(pts)).toBeCloseTo(0.6, 12);
    expect(psychPearson(pts.map((p) => ({ x: p.y, y: p.x })))).toBeCloseTo(0.6, 12);
  });

  it("lets self-selection build a confound while random draws stay balanced on average", () => {
    const m: Of<"assignment"> = {
      kind: "assignment",
      traitLabel: "Hours",
      traits: [9, 3, 8, 2, 8, 2, 7, 1],
      method: "self_selected",
      seed: 1,
    };
    const chosen = psychAssignGroups(m);
    expect(chosen.treatmentMean).toBe(8);
    expect(chosen.controlMean).toBe(2);
    const random = { ...m, method: "random" as const };
    const gaps = Array.from({ length: 400 }, (_, i) => psychAssignGroups(random, i + 1).gap);
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    expect(Math.abs(meanGap)).toBeLessThan(0.35);
    expect(psychAssignGroups(random, 5)).toEqual(psychAssignGroups(random, 5));
    const groups = psychAssignGroups(random, 9);
    expect([...groups.treatment, ...groups.control].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("pools unequal spreads for Cohen's d and reports overlap", () => {
    const m: Of<"effect"> = {
      kind: "effect",
      labelA: "A",
      labelB: "B",
      meanA: 40,
      meanB: 46.5,
      sdA: 7,
      sdB: 17,
      unit: "",
    };
    expect(psychCohensD(m)).toBeCloseTo(0.5, 12);
    const s = psychEffectSummary(m);
    expect(s.overlap).toBeCloseTo(0.8026, 3);
    expect(s.aboveMean).toBeCloseTo(0.6915, 3);
    expect(s.perGroupFor80).toBe(63);
  });

  it("keeps d′ fixed while the criterion trades hits for false alarms", () => {
    const m: Of<"detection"> = {
      kind: "detection",
      separation: 1.68,
      criterion: 0.84,
      signalLabel: "Signal",
    };
    const mid = psychDetectionRates(m);
    expect(mid.hit).toBeCloseTo(0.7995, 3);
    expect(mid.falseAlarm).toBeCloseTo(0.2005, 3);
    expect(mid.bias).toBeCloseTo(0, 12);
    const liberal = psychDetectionRates(m, 0);
    expect(liberal.hit).toBeGreaterThan(mid.hit);
    expect(liberal.falseAlarm).toBeCloseTo(0.5, 7);
    expect(psychDPrimeFromRates(liberal.hit, liberal.falseAlarm)).toBeCloseTo(1.68, 4);
    expect(psychDPrimeFromRates(mid.hit, mid.falseAlarm)).toBeCloseTo(1.68, 4);
    expect(liberal.bias).toBeCloseTo(-0.84, 12);
  });

  it("counts switches and their cost", () => {
    const m: Of<"switching"> = {
      kind: "switching",
      sequence: "ABABABAB",
      labelA: "A",
      labelB: "B",
      baseMs: 600,
      switchCostMs: 200,
    };
    expect(psychSwitchingSummary(m)).toMatchObject({ switches: 7, totalMs: 6200, lostMs: 1400 });
    expect(psychSwitchingSummary({ ...m, sequence: "AAAABBBB" }).totalMs).toBe(5000);
  });

  it("weights cues by reliability and narrows the combined estimate", () => {
    const m: Of<"cues"> = {
      kind: "cues",
      labelA: "Vision",
      labelB: "Touch",
      meanA: 50,
      meanB: 56,
      sdA: 2,
      sdB: 4,
      unit: "mm",
    };
    const c = psychCombineCues(m);
    expect(c.weightA).toBeCloseTo(0.8, 12);
    expect(c.mean).toBeCloseTo(51.2, 12);
    expect(c.sd).toBeLessThan(2);
    expect(psychCombineCues({ ...m, sdA: 3, sdB: 4 }).sd).toBeCloseTo(2.4, 12);
  });

  it("groups items into the stated chunks", () => {
    const m: Of<"span"> = {
      kind: "span",
      items: "F B I B B C N H S U S A".split(" "),
      chunks: [3, 3, 3, 3],
      capacity: 4,
    };
    const s = psychSpanSummary(m);
    expect(s.groups.map((g) => g.join(""))).toEqual(["FBI", "BBC", "NHS", "USA"]);
    expect(s.chunksFit).toBe(true);
    expect(s.itemsFit).toBe(false);
  });

  it("anchors stability at 90% recall and resets the curve at each review", () => {
    expect(psychRetrievability(10, 10)).toBeCloseTo(0.9, 12);
    expect(psychRetrievability(90, 10)).toBeCloseTo(0.5, 12);
    const m: Of<"forgetting"> = {
      kind: "forgetting",
      stability: 2,
      reviews: [4],
      growth: 3,
      horizon: 30,
    };
    expect(psychRecallAt(m, 4)).toBe(1);
    expect(psychRecallAt(m, 17.5)).toBeCloseTo(0.8, 12);
    expect(psychRecallAt({ ...m, reviews: [] }, 17.5)).toBeCloseTo(1 / (1 + 17.5 / 18), 12);
    const curve = psychForgettingCurve(m);
    for (let i = 1; i < curve.length; i++)
      if (curve[i]!.day !== 4) expect(curve[i]!.recall).toBeLessThanOrEqual(curve[i - 1]!.recall);
  });

  it("follows the Rescorla–Wagner rule through acquisition and extinction", () => {
    const m: Of<"pairing"> = {
      kind: "pairing",
      cueLabel: "Bell",
      outcomeLabel: "Food",
      rate: 0.5,
      asymptote: 1,
      trials: ["paired", "paired", "alone"],
    };
    expect(psychPairingStrengths(m)).toEqual([0, 0.5, 0.75, 0.375]);
  });

  it("rewards ratio and interval schedules by their own rules", () => {
    const fr: Of<"schedule"> = {
      kind: "schedule",
      rule: "fixed_ratio",
      requirements: [5],
      responseEvery: 2,
      duration: 60,
    };
    expect(psychScheduleEvents(fr).reinforced).toHaveLength(6);
    const fi = { ...fr, rule: "fixed_interval" as const, requirements: [10], responseEvery: 3 };
    expect(psychScheduleEvents(fi).reinforced).toEqual([12, 24, 36, 48, 60]);
    const vr = { ...fr, rule: "variable_ratio" as const, requirements: [3, 7, 2, 8, 5] };
    expect(psychScheduleEvents(vr).reinforced).toEqual([6, 20, 24, 40, 50, 56]);
  });

  it("counts natural frequencies, anchors, tallies and bystanders", () => {
    const b: Of<"base_rate"> = {
      kind: "base_rate",
      population: 1000,
      baseRate: 0.01,
      hitRate: 0.9,
      falseAlarmRate: 0.1,
      conditionLabel: "Disease",
      testLabel: "Test",
    };
    expect(psychBaseRateCounts(b)).toMatchObject({ truePositives: 9, falsePositives: 99 });
    expect(psychBaseRateCounts(b).positivePredictiveValue).toBeCloseTo(9 / 108, 12);
    const a: Of<"anchor"> = {
      kind: "anchor",
      quantity: "Q",
      lowAnchor: 10,
      highAnchor: 65,
      lowEstimate: 25,
      highEstimate: 45,
      min: 0,
      max: 100,
    };
    expect(psychAnchoringIndex(a)).toBeCloseTo(20 / 55, 12);
    expect(
      psychAnyoneHelps({ kind: "bystander", bystanders: 5, helpProbability: 0.2 }),
    ).toBeCloseTo(0.67232, 12);
  });

  it("rejects models that smuggle in answers or break their own bounds", () => {
    expect(
      PsychologyModelSchema.safeParse({
        kind: "detection",
        separation: 1,
        criterion: 0.5,
        signalLabel: "S",
        dPrime: 1,
      }).success,
    ).toBe(false);
    expect(
      PsychologyModelSchema.safeParse({
        kind: "base_rate",
        population: 1000,
        baseRate: 0.01,
        hitRate: 0.9,
        falseAlarmRate: 0.01,
        conditionLabel: "D",
        testLabel: "T",
      }).success,
    ).toBe(false);
    expect(
      PsychologyModelSchema.safeParse({
        kind: "schedule",
        rule: "fixed_ratio",
        requirements: [3, 5],
        responseEvery: 1,
        duration: 30,
      }).success,
    ).toBe(false);
    expect(
      PsychologyModelSchema.safeParse({
        kind: "span",
        items: ["a", "b", "c"],
        chunks: [2, 2],
        capacity: 4,
      }).success,
    ).toBe(false);
  });

  it("states givens without results and formats numbers with true minus signs", () => {
    const m: Of<"detection"> = {
      kind: "detection",
      separation: 1.68,
      criterion: 0.84,
      signalLabel: "Tumour present",
    };
    expect(psychologyGivens(m)).not.toMatch(/80|20\.0|hit rate/i);
    expect(psychologyMeasures(m).map((x) => x.label)).toContain("d′");
    expect(psychologyNumber(-0.84)).toBe("−0.84");
    expect(psychologyNumber(2.5)).toBe("2.5");
    expect(psychologyNumber(-0.0001)).toBe("0");
  });
});
