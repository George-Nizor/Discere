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
 * Materials and Manufacturing keeps its calculations where calculating is the skill (Faraday's
 * law, the lever rule, Cpk, the rule of mixtures, the bend allowance) and asks the rest as
 * material to read and decisions to make: which material or process for a stated part, what a
 * fracture surface or a micrograph shows, why a moulded part sticks, which coating protects a
 * scratch. Every figure used in a prompt, an option or a feedback line is recomputed below.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/materials-and-manufacturing/bundle.json", import.meta.url),
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
const rightOption = (question: Question) => {
  const authority = question.answerAuthority;
  if (authority.kind !== "text") return undefined;
  return (question.choices ?? []).filter((choice) =>
    authority.acceptedIdeas.includes(choice.label),
  );
};
const numericValue = (id: string): number => {
  const authority = (questions.get(id) as Question).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const textOf = (id: string): string => {
  const question = questions.get(id) as Question;
  return [
    question.prompt,
    question.onCorrect ?? "",
    ...question.hints,
    ...(question.misconceptions ?? []).map((item) => item.feedback),
    ...(question.choices ?? []).map((choice) => choice.label),
    ...(question.sort?.items ?? []).map((item) => item.explanation ?? ""),
  ].join(" ");
};
const rightLabel = (id: string): string => {
  const question = questions.get(id) as Question;
  const authority = question.answerAuthority;
  if (authority.kind !== "text") throw new Error(`${id} is not a text question`);
  return authority.acceptedIdeas[0] as string;
};
const sortBinOf = (id: string, label: string): string | undefined =>
  (questions.get(id) as Question).sort?.items.find((item) => item.label === label)?.bin;
const P = "matm-";
const G = 96485;
const pi = Math.PI;
const tan = (degrees: number) => Math.tan((degrees * pi) / 180);
const ln = Math.log;
const index = (e: number, rho: number) => Math.sqrt(e) / rho;
const bend = (deg: number, r: number, k: number, t: number) => ((deg * pi) / 180) * (r + k * t);

describe("questions in Materials and Manufacturing", () => {
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

  it("keeps numeric questions to calculations that are the skill or carry a decision", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(42);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
    for (const question of numeric) {
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(question.id);
      // a learner who rounds as the prompt asks must not be marked wrong
      const text = String(authority.value);
      const decimals = text.includes(".") ? (text.split(".")[1] as string).length : 0;
      const half = 0.5 * 10 ** -decimals;
      const slack = Math.max(
        authority.absoluteTolerance,
        authority.relativeTolerance * authority.value,
      );
      if (decimals > 0 && authority.relativeTolerance === 0)
        expect(slack, question.id).toBeGreaterThanOrEqual(half - 1e-12);
    }
  });

  it("asks no fill-in-the-blank question for a term", () => {
    for (const question of bundle.questions)
      expect(question.prompt, question.id).not.toContain("___");
  });

  it("recomputes every numeric answer", () => {
    // lesson 1
    expect(numericValue(`${P}properties-from-the-tensile-test-strain-at-105`)).toBeCloseTo(
      (105 / 210000) * 100,
      6,
    );
    expect(numericValue(`${P}properties-from-the-tensile-test-true-stress-neck`)).toBeCloseTo(
      28000 / 60,
      0,
    );
    const a0 = (pi * 10 ** 2) / 4;
    const af = (pi * 8 ** 2) / 4;
    expect(a0).toBeCloseTo(78.54, 2);
    expect(af).toBeCloseTo(50.27, 2);
    expect(numericValue(`${P}properties-from-the-tensile-test-area-blank`)).toBeCloseTo(
      ((a0 - af) / a0) * 100,
      6,
    );
    // lesson 2
    expect(numericValue(`${P}bonds-and-material-families-ti-blank`)).toBeCloseTo(116 / 4.5, 1);
    // lesson 3: s0 = 50 MPa, k = 20 MPa mm^0.5
    const hp = (d: number) => 50 + 20 / Math.sqrt(d);
    expect(numericValue(`${P}grains-dislocations-strengthening-hp-try`)).toBeCloseTo(hp(0.04), 6);
    expect(numericValue(`${P}grains-dislocations-strengthening-hp-blank`)).toBeCloseTo(
      hp(0.0025),
      6,
    );
    expect(numericValue(`${P}grains-dislocations-strengthening-hp-inverse`)).toBeCloseTo(
      (20 / (350 - 50)) ** 2,
      4,
    );
    // lesson 4
    const pearlite = (c: number) => (c - 0.022) / (0.76 - 0.022);
    expect(numericValue(`${P}steel-and-heat-treatment-lever-blank`)).toBeCloseTo(pearlite(0.6), 3);
    expect(numericValue(`${P}steel-and-heat-treatment-final-lever`)).toBeCloseTo(pearlite(0.3), 3);
    expect(numericValue(`${P}steel-and-heat-treatment-carbon-for-half`)).toBeCloseTo(
      0.022 + 0.5 * (0.76 - 0.022),
      2,
    );
    // lesson 5
    const along = (vf: number, ef: number, em: number) => vf * ef + (1 - vf) * em;
    const across = (vf: number, ef: number, em: number) => 1 / (vf / ef + (1 - vf) / em);
    expect(numericValue(`${P}polymers-ceramics-composites-along-try`)).toBeCloseTo(
      along(0.5, 70, 3),
      6,
    );
    expect(numericValue(`${P}polymers-ceramics-composites-across-transfer`)).toBeCloseTo(
      across(0.5, 70, 3),
      2,
    );
    expect(numericValue(`${P}polymers-ceramics-composites-across-blank`)).toBeCloseTo(
      across(0.6, 230, 3),
      2,
    );
    // lesson 6
    const kk = (stress: number, a: number) => stress * Math.sqrt(pi * a);
    const crit = (kic: number, stress: number) => (kic / stress) ** 2 / pi;
    expect(numericValue(`${P}fracture-and-toughness-k-try`)).toBeCloseTo(kk(100, 0.001), 1);
    expect(numericValue(`${P}fracture-and-toughness-crit-crack-blank`)).toBeCloseTo(
      crit(50, 200) * 1000,
      1,
    );
    expect(numericValue(`${P}fracture-and-toughness-hs-transfer`)).toBeCloseTo(
      crit(30, 600) * 1000,
      1,
    );
    expect(numericValue(`${P}fracture-and-toughness-final-stress`)).toBeCloseTo(
      60 / Math.sqrt(pi * 0.001),
      -1,
    );
    // lesson 7
    const grams = (current: number, seconds: number, molar: number, n: number) =>
      (current * seconds * molar) / (n * G);
    const year = 3.156e7;
    expect(numericValue(`${P}corrosion-and-protection-zinc-blank`)).toBeCloseTo(
      grams(0.02, year, 65.38, 2),
      0,
    );
    expect(numericValue(`${P}corrosion-and-protection-time-transfer`)).toBeCloseTo(
      (10 * 2 * G) / (0.01 * 55.85) / 86400,
      0,
    );
    expect(numericValue(`${P}corrosion-and-protection-anode-life`)).toBeCloseTo(
      (2000 * 2 * G) / (65.38 * 0.05) / year,
      1,
    );
    // lesson 8
    const freeze = (side: number) => 2 * (side / 6) ** 2;
    expect(numericValue(`${P}casting-and-solidification-cast-blank`)).toBeCloseTo(freeze(5), 2);
    expect(numericValue(`${P}casting-and-solidification-pattern-try`)).toBeCloseTo(490 / 0.98, 6);
    // lesson 9
    expect(numericValue(`${P}forming-and-deformation-volume-try`)).toBeCloseTo((50 * 2000) / 20, 6);
    expect(numericValue(`${P}forming-and-deformation-strain-blank`)).toBeCloseTo(ln(25 / 18), 3);
    expect(numericValue(`${P}forming-and-deformation-bend-try`)).toBeCloseTo(
      bend(90, 2, 0.4, 1.5),
      2,
    );
    expect(numericValue(`${P}forming-and-deformation-bend-transfer`)).toBeCloseTo(
      bend(60, 5, 0.33, 3),
      2,
    );
    expect(numericValue(`${P}forming-and-deformation-schedule`)).toBeCloseTo(ln(20 / 12.8), 3);
    expect(ln(20 / 16) + ln(16 / 12.8)).toBeCloseTo(ln(20 / 12.8), 12);
    // lesson 10
    const speed = (d: number, n: number) => (pi * d * n) / 1000;
    expect(numericValue(`${P}machining-speed-try`)).toBeCloseTo(speed(30, 1200), 1);
    expect(numericValue(`${P}machining-power-blank`)).toBeCloseTo(
      (2.5 * (60000 * 0.1 * 1)) / 60,
      6,
    );
    expect(numericValue(`${P}machining-taylor-try`)).toBeCloseTo(60 * 1.1 ** -4, 0);
    expect(numericValue(`${P}machining-parts-per-tool`)).toBeCloseTo(0.8 ** -4 / (1 / 0.8), 2);
    expect(numericValue(`${P}machining-ra-try`)).toBeCloseTo(((0.2 * 0.2) / (32 * 0.8)) * 1000, 2);
    expect(numericValue(`${P}machining-spindle-speed`)).toBeCloseTo((1000 * 120) / (pi * 80), 0);
    // lesson 11
    expect(numericValue(`${P}moulding-additive-and-cost-breakeven-blank`)).toBeCloseTo(
      45000 / (5.8 - 0.8),
      6,
    );
    expect(numericValue(`${P}moulding-additive-and-cost-tooling-transfer`)).toBeCloseTo(
      40000 / (12 - 1.5),
      -1,
    );
    expect(numericValue(`${P}moulding-additive-and-cost-quote`)).toBe(
      Math.round(24000 / (8 - 1.2)),
    );
    // lesson 12
    expect(numericValue(`${P}process-capability-cp-try`)).toBeCloseTo(0.06 / (6 * 0.01), 6);
    expect(numericValue(`${P}process-capability-cpk-blank`)).toBeCloseTo(0.035 / 0.03, 2);
    expect(numericValue(`${P}process-capability-final-cpk`)).toBeCloseTo(0.02 / 0.03, 2);
    // lesson 13
    const index = (e: number, rho: number) => Math.sqrt(e) / rho;
    expect(numericValue(`${P}selecting-material-and-process-cfrp-blank`)).toBeCloseTo(
      index(45, 1.74),
      2,
    );
    expect(numericValue(`${P}selecting-material-and-process-titanium-saving`)).toBe(
      Math.round((1 - index(210, 7.85) / index(116, 4.5)) * 100),
    );
  });

  it("recomputes the figures that prompts, options and feedback quote", () => {
    // lesson 1: the offset method on the aluminium alloy table
    const rows: Array<[number, number]> = [
      [100, 0.143],
      [140, 0.2],
      [200, 0.286],
      [250, 0.362],
      [280, 0.52],
      [300, 0.63],
      [320, 0.9],
    ];
    const plastic = (stress: number, strain: number) => strain - (stress / 70000) * 100;
    const crossing = rows.find(([stress, strain]) => plastic(stress, strain) >= 0.2 - 0.002);
    expect(crossing?.[0]).toBe(300);
    expect(plastic(280, 0.52)).toBeLessThan(0.2);
    expect(plastic(250, 0.362)).toBeCloseTo(0.005, 2);
    expect((140 / 70000) * 100).toBeCloseTo(0.2, 6);
    expect(rightLabel(`${P}properties-from-the-tensile-test-offset-table`)).toBe("300 MPa");
    expect((300 / 70000) * 100 + 0.2).toBeCloseTo(0.629, 3);
    expect((320 / 70000) * 100 + 0.2).toBeCloseTo(0.657, 3);
    // the crash bracket
    const toughA = ((1100 + 1200) / 2) * 0.03;
    const toughB = ((250 + 400) / 2) * 0.28;
    expect(toughA).toBeCloseTo(34.5, 6);
    expect(toughB).toBeCloseTo(91, 6);
    expect(toughB / toughA).toBeGreaterThan(2.6);
    // the three bolt-steel bars
    const bars = [
      { lf: 61, d: 7.5 },
      { lf: 62, d: 8.0 },
      { lf: 58, d: 7.0 },
    ].map((bar) => ({
      elongation: ((bar.lf - 50) / 50) * 100,
      reduction: (1 - (bar.d / 10) ** 2) * 100,
    }));
    expect(bars.map((bar) => bar.elongation >= 20 && bar.reduction >= 40)).toEqual([
      true,
      false,
      false,
    ]);
    expect(bars[0]?.reduction).toBeCloseTo(43.75, 2);
    expect(bars[1]?.reduction).toBeCloseTo(36, 6);
    expect(bars[2]?.reduction).toBeCloseTo(51, 6);
    expect(bars[2]?.elongation).toBe(16);
    // equal stress, different E
    expect((100 / 210000) * 100).toBeCloseTo(0.048, 3);
    expect((100 / 70000) * 100).toBeCloseTo(0.143, 3);
    // the curve order lists five stages
    expect(
      (questions.get(`${P}properties-from-the-tensile-test-curve-order`) as Question).order?.items,
    ).toHaveLength(5);

    // lesson 2: specific stiffness table
    const spec = (e: number, rho: number) => e / rho;
    expect(spec(3, 1.14)).toBeCloseTo(2.63, 2);
    expect(spec(40, 1.9)).toBeCloseTo(21.05, 2);
    expect(spec(70, 2.7)).toBeCloseTo(25.93, 2);
    expect(spec(210, 7.85)).toBeCloseTo(26.75, 2);
    expect(spec(40, 1.9) / spec(210, 7.85)).toBeCloseTo(0.787, 3);
    const nylonRod = (70 / 3) * (1.14 / 2.7);
    expect(70 / 3).toBeCloseTo(23.3, 1);
    expect(1.14 / 2.7).toBeCloseTo(0.42, 2);
    expect(nylonRod).toBeCloseTo(9.85, 2);
    expect(textOf(`${P}bonds-and-material-families-nylon-rod`)).toContain("9.9");
    expect(116 / 70).toBeCloseTo(1.66, 2);
    expect(4.5 / 2.7).toBeCloseTo(1.67, 2);
    expect(4.5 / 116 / (2.7 / 70)).toBeCloseTo(1.006, 3);
    expect(70 / 116).toBeCloseTo(0.6, 1);

    // lesson 3: halving the grain term when d is four times larger
    const hp = (d: number) => 50 + 20 / Math.sqrt(d);
    expect(hp(0.01)).toBe(250);
    expect(hp(0.04)).toBe(150);
    expect(50 + 200 / 4).toBe(100);
    expect(hp(0.01) / 4).toBe(62.5);
    expect(rightLabel(`${P}grains-dislocations-strengthening-coarsen`)).toBe("150 MPa");
    expect(20 / Math.sqrt(0.01)).toBe(200);
    expect(0.04 / 0.01).toBe(4);

    // lesson 4: pearlite fractions
    const pearlite = (c: number) => (c - 0.022) / (0.76 - 0.022);
    expect(pearlite(0.2)).toBeCloseTo(0.241, 3);
    expect(pearlite(0.4)).toBeCloseTo(0.512, 3);
    expect(textOf(`${P}steel-and-heat-treatment-micrograph-layers`)).toContain("24 percent");
    expect(textOf(`${P}steel-and-heat-treatment-micrograph-layers`)).toContain("51 percent");

    // lesson 5
    expect(0.6 * 230 + 0.4 * 3).toBeCloseTo(139.2, 6);
    expect(1 / (0.6 / 230 + 0.4 / 3)).toBeCloseTo(7.36, 2);
    expect(139.2 / 7.36).toBeGreaterThan(18.9);
    expect(0.5 * 139.2 + 0.5 * 7.36).toBeCloseTo(73.3, 1);
    expect(-40 > -70 && -40 < -20).toBe(true);

    // lesson 6: critical lengths of the four materials at 200 MPa
    const critMm = (kic: number) => ((kic / 200) ** 2 / pi) * 1000;
    expect(critMm(0.7)).toBeCloseTo(0.0039, 4);
    expect(critMm(4)).toBeCloseTo(0.127, 3);
    expect(critMm(30)).toBeCloseTo(7.16, 2);
    expect(critMm(50)).toBeCloseTo(19.9, 1);
    expect([0.7, 4, 30, 50].filter((k) => critMm(k) > 5)).toEqual([30, 50]);
    expect(rightLabel(`${P}fracture-and-toughness-inspection-table`)).toBe(
      "The aluminium alloy and the steel",
    );
    expect(Math.sqrt(1000)).toBeCloseTo(31.6, 1);
    expect(50 / Math.sqrt(pi * 2)).toBeCloseTo(19.95, 2);
    expect(50 / Math.sqrt(pi * 0.002)).toBeCloseTo(631, 0);

    // lesson 7: standard electrode potentials in the couple sort
    const potential = {
      Mg: -2.37,
      Al: -1.66,
      Zn: -0.76,
      Fe: -0.44,
      Cu: 0.34,
    };
    const couple = `${P}corrosion-and-protection-couple-sort`;
    expect(sortBinOf(couple, "Zinc, bolted to a steel hull")).toBe(
      potential.Zn < potential.Fe ? "loses" : "protected",
    );
    expect(sortBinOf(couple, "Aluminium rivets in a steel plate")).toBe(
      potential.Al < potential.Fe ? "loses" : "protected",
    );
    expect(sortBinOf(couple, "Iron nails holding copper sheeting")).toBe(
      potential.Fe < potential.Cu ? "loses" : "protected",
    );
    const mol = 315600 / G;
    expect(mol).toBeCloseTo(3.27, 2);
    expect(mol / 2).toBeCloseTo(1.64, 2);
    expect((2000 / 65.38) * 2 * G).toBeCloseTo(5.9e6, -5);
    expect(((2000 / 65.38) * 2 * G) / 0.05).toBeCloseTo(1.18e8, -6);

    // lesson 8: V / A of the four test pieces, in mm
    const boxVA = (a: number, b: number, c: number) => (a * b * c) / (2 * (a * b + a * c + b * c));
    const plateVA = boxVA(400, 300, 20);
    const blockVA = boxVA(100, 100, 50);
    const cubeVA = 60 / 6;
    const rodVA = (((pi * 20 ** 2) / 4) * 200) / (pi * 20 * 200 + 2 * ((pi * 20 ** 2) / 4));
    expect(plateVA).toBeCloseTo(8.96, 2);
    expect(blockVA).toBe(12.5);
    expect(cubeVA).toBe(10);
    expect(rodVA).toBeCloseTo(4.76, 2);
    expect(Math.max(plateVA, blockVA, cubeVA, rodVA)).toBe(blockVA);
    expect(400 * 300 * 20).toBeGreaterThan(100 * 100 * 50);
    expect((blockVA / cubeVA) ** 2).toBeCloseTo(1.5625, 4);
    expect((1.0 / 1.2) ** 2).toBeCloseTo(0.69, 2);
    expect((20 / 5) ** 2).toBe(16);

    // lesson 9: the press, the bracket blank and the hot and cold jobs
    expect((250 * 2000) / 1000).toBe(500);
    expect((250 * ((50 * 2000) / 25)) / 1000).toBe(1000);
    const allowance = bend(90, 2, 0.4, 1.5);
    expect(allowance).toBeCloseTo(4.08, 2);
    expect(30 + 40 + allowance).toBeCloseTo(74.08, 2);
    expect(30 + 40 + (pi / 2) * 2).toBeCloseTo(73.14, 2);
    expect(30 + 40 + (pi / 2) * (2 + 1.5)).toBeCloseTo(75.5, 2);
    expect(rightLabel(`${P}forming-and-deformation-blank-length`)).toBe("74.08 mm");
    expect((250 / 210000) * 100).toBeCloseTo(0.12, 2);
    expect((900 / 210000) * 100).toBeCloseTo(0.43, 2);
    const kelvin = (c: number) => c + 273.15;
    const hotCold = [
      ["Iron rolled at 1,100 C", 1538, 1100, "hot"],
      ["Aluminium rolled at 450 C", 660.32, 450, "hot"],
      ["Copper forged at 800 C", 1084.62, 800, "hot"],
      ["Copper wire drawn at 20 C", 1084.62, 20, "cold"],
      ["An iron bar bent at 400 C", 1538, 400, "cold"],
      ["Tungsten worked at 1,000 C", 3422, 1000, "cold"],
    ] as const;
    for (const [label, melting, working, bin] of hotCold) {
      const ratio = kelvin(working) / kelvin(melting);
      // far from the line, whether it is drawn at a half or at 0.6 of the melting point
      expect(ratio > 0.7 || ratio < 0.4, label).toBe(true);
      expect(sortBinOf(`${P}forming-and-deformation-hot-cold-sort`, label), label).toBe(bin);
      expect(ratio > 0.5 ? "hot" : "cold", label).toBe(bin);
    }

    // lesson 10: removal rates and powers of the four setups
    const removal = (v: number, f: number, d: number) => (v * 1000 * f * d) / 60;
    expect(removal(200, 0.1, 1)).toBeCloseTo(333.3, 1);
    expect(removal(100, 0.4, 1.5)).toBe(1000);
    expect(removal(60, 0.25, 3)).toBe(750);
    expect(removal(120, 0.3, 2)).toBe(1200);
    expect((3 * removal(120, 0.3, 2)) / 1000).toBeCloseTo(3.6, 6);
    const ra = (f: number, r: number) => ((f * f) / (32 * r)) * 1000;
    expect(ra(0.05, 0.8)).toBeCloseTo(0.098, 3);
    expect(ra(0.1, 0.8)).toBeCloseTo(0.39, 2);
    expect(ra(0.15, 0.8)).toBeCloseTo(0.88, 2);
    expect(ra(0.2, 0.8)).toBeCloseTo(1.56, 2);
    expect([0.05, 0.1, 0.15, 0.2].filter((f) => ra(f, 0.8) <= 0.4)).toEqual([0.05, 0.1]);
    expect(ra(0.3, 0.8)).toBeCloseTo(3.52, 2);
    expect(ra(0.15, 0.8)).toBeCloseTo(0.88, 2);
    expect(ra(0.3, 0.4)).toBeCloseTo(7.03, 2);
    expect(0.8 ** -4).toBeCloseTo(2.44, 2);
    expect(0.8 ** -4 * 1.25).toBeCloseTo(3.05, 2);
    expect(1.1 ** 4 * 60).toBeCloseTo(87.8, 1);
    expect(60 / 1.1).toBeCloseTo(54.5, 1);
    expect(112500 / 60).toBe(1875);
    expect(3 * 1875).toBe(5625);

    // lesson 11: the lid, the pocket and the quote
    expect(200 * 100).toBe(20000);
    expect((40 * 20000) / 1000).toBe(800);
    expect(200 * 100 + 2 * (200 + 100) * 30).toBe(38000);
    expect((40 * 38000) / 1000).toBe(1520);
    expect(100 - 2 * 40 * tan(1)).toBeCloseTo(98.6, 1);
    expect(100 - 40 * tan(1)).toBeCloseTo(99.3, 1);
    expect(40 * tan(1)).toBeCloseTo(0.7, 1);
    expect(15000 / 9.9).toBeCloseTo(1515.2, 1);
    expect(Math.floor(15000 / 9.9) * 7.5).toBeCloseTo(11362.5, 1);
    expect(15000 / 7.5).toBe(2000);
    expect(24000 / 8).toBe(3000);
    expect(24000 / 1.2).toBe(20000);

    // lesson 12: Cp and Cpk
    const cp = (sigma: number) => 0.1 / (6 * sigma);
    const cpk = (mean: number, sigma: number) => Math.min(25.05 - mean, mean - 24.95) / (3 * sigma);
    expect(0.06 / 0.015).toBeCloseTo(4, 6);
    const fixes: Array<[string, number, number, string]> = [
      ["Mean 25.030 mm, sigma 0.008 mm", 25.03, 0.008, "recentre"],
      ["Mean 25.040 mm, sigma 0.005 mm", 25.04, 0.005, "recentre"],
      ["Mean 25.000 mm, sigma 0.025 mm", 25.0, 0.025, "narrow"],
      ["Mean 25.010 mm, sigma 0.030 mm", 25.01, 0.03, "narrow"],
      ["Mean 24.995 mm, sigma 0.010 mm", 24.995, 0.01, "leave"],
      ["Mean 25.000 mm, sigma 0.012 mm", 25.0, 0.012, "leave"],
    ];
    for (const [label, mean, sigma, bin] of fixes) {
      const action = cpk(mean, sigma) >= 1.33 ? "leave" : cp(sigma) >= 1.33 ? "recentre" : "narrow";
      expect(action, label).toBe(bin);
      expect(sortBinOf(`${P}process-capability-fix-sort`, label), label).toBe(bin);
    }
    expect(cpk(25.03, 0.008)).toBeCloseTo(0.83, 2);
    expect(cp(0.008)).toBeCloseTo(2.08, 2);
    expect(cpk(25.03, 0.004)).toBeCloseTo(1.67, 2);
    expect(cp(0.004)).toBeCloseTo(4.17, 2);
    expect(cpk(25.0, 0.008)).toBeGreaterThan(cpk(25.03, 0.004));
    expect(cp(0.01)).toBeCloseTo(1.67, 2);
    expect(cpk(25.012, 0.01)).toBeCloseTo(1.27, 2);
    expect(cp(0.014)).toBeCloseTo(1.19, 2);
    expect(cpk(24.999, 0.014)).toBeCloseTo(1.17, 2);
    expect(cpk(25.012, 0.01)).toBeGreaterThan(cpk(24.999, 0.014));
    expect(6 * 0.03).toBeCloseTo(0.18, 6);

    // lesson 13: performance indices
    expect(index(210, 7.85)).toBeCloseTo(1.85, 2);
    expect(index(116, 4.5)).toBeCloseTo(2.39, 2);
    expect(index(70, 2.7)).toBeCloseTo(3.1, 2);
    expect(index(40, 1.9)).toBeCloseTo(3.33, 2);
    expect(index(3, 1.14)).toBeCloseTo(1.52, 2);
    expect(spec(210, 7.85)).toBeCloseTo(26.75, 2);
    const lightest = [
      ["steel", 210, 7.85],
      ["titanium", 116, 4.5],
      ["aluminium", 70, 2.7],
      ["composite", 40, 1.9],
      ["nylon", 3, 1.14],
    ] as const;
    const best = [...lightest].sort((x, y) => index(y[1], y[2]) - index(x[1], x[2]))[0];
    expect(best?.[0]).toBe("composite");
    expect(index(210, 7.85) / index(70, 2.7)).toBeCloseTo(0.6, 1);
    expect(2.7 / 70 / (7.85 / 210)).toBeCloseTo(1.03, 2);
    expect(1 - 4.5 / 7.85).toBeCloseTo(0.43, 2);
    expect(index(210, 7.85) / index(116, 4.5)).toBeCloseTo(0.77, 2);
  });

  it("keeps dashes and verdict words out of questions, hints, feedback and options", () => {
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
        question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "",
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
      const feedback = [
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" ");
      expect(feedback, question.id).not.toMatch(/\b(Correct|Not quite|Well done|Great)\b/u);
    }
  });

  it("marks one option right and explains each wrong one", () => {
    const places = new Set<string>();
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(`${question.choices.indexOf(right[0] as (typeof question.choices)[number])}`);
    }
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("keeps the right option from giving itself away by length", () => {
    const rows = bundle.questions
      .filter((question) => (question.choices?.length ?? 0) >= 3)
      .map((question) => {
        const right = rightOption(question) ?? [];
        const others = (question.choices ?? []).filter((choice) => !right.includes(choice));
        const longestOther = Math.max(...others.map((choice) => choice.label.length));
        const shortestOther = Math.min(...others.map((choice) => choice.label.length));
        return {
          question,
          rightLength: right[0]?.label.length ?? 0,
          longestOther,
          shortestOther,
        };
      });
    const longest = rows.filter((row) => row.rightLength > row.longestOther);
    expect(longest.length).toBeLessThanOrEqual(Math.floor(rows.length * 0.3));
    expect(longest.length).toBeGreaterThanOrEqual(Math.floor(rows.length * 0.1));
    const shortest = rows.filter((row) => row.rightLength < row.shortestOther);
    expect(shortest.length).toBeLessThanOrEqual(Math.floor(rows.length * 0.4));
    expect(
      rows.filter((row) => row.rightLength > row.longestOther * 1.15).map((row) => row.question.id),
    ).toEqual([]);
    const mixed = rows.filter((row) => {
      const ends = new Set(
        (row.question.choices ?? []).map((choice) => choice.label.trimEnd().endsWith(".")),
      );
      return ends.size > 1;
    });
    expect(mixed.map((row) => row.question.id)).toEqual([]);
  });

  it("keeps most questions multiple choice, and uses order and sort where they are better", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(6);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice).toBeGreaterThanOrEqual(bundle.questions.length * 0.55);
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    for (const question of bundle.questions) {
      if (question.answerAuthority.kind !== "text") continue;
      const { order, sort } = question;
      if (order) {
        expect(new Set(order.items).size, question.id).toBe(order.items.length);
        expect(order.items.length, question.id).toBeGreaterThanOrEqual(4);
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
        for (const bin of sort.bins)
          expect(
            sort.items.filter((item) => item.bin === bin.id).length,
            `${question.id} ${bin.id}`,
          ).toBeGreaterThanOrEqual(2);
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      if (order || sort) {
        expect(question.answerAuthority.exampleAnswer.length, question.id).toBeGreaterThan(40);
        expect(question.onCorrect, question.id).toBeTruthy();
      }
    }
  });

  it("describes a part, a material or a process in most prompts", () => {
    const case_ =
      /\b(bar|rod|beam|plate|sheet|wire|bolt|casting|billet|shaft|lathe|mould|moulded|press|bracket|lid|pipe|hull|cable|handle|seal|steel|tool|part|alloy|copper|aluminium|plastic|ceramic|polymer|composite|process|lamp|roof|dock|boss|crankshaft|pocket|insert)s?\b/iu;
    expect(
      bundle.questions.filter((question) => case_.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(100);
  });

  it("asks for a choice or a diagnosis in the places that used to name a term", () => {
    const replaced = [
      "grains-dislocations-strengthening-what-moves",
      "steel-and-heat-treatment-pearlite-name",
      "steel-and-heat-treatment-martensite-name",
      "polymers-ceramics-composites-thermoset-name",
      "corrosion-and-protection-anode-name",
      "corrosion-and-protection-final-galv",
      "forming-and-deformation-springback-name",
      "moulding-additive-and-cost-draft-term",
      "process-capability-cpk-name",
    ];
    for (const id of replaced) expect(questions.has(`${P}${id}`), id).toBe(false);
    for (const id of [
      "fracture-and-toughness-fracture-surface",
      "corrosion-and-protection-roof-sheet",
      "moulding-additive-and-cost-sticking-part",
      "steel-and-heat-treatment-micrograph-layers",
      "selecting-material-and-process-lightest-beam",
    ])
      expect(kind(questions.get(`${P}${id}`) as Question), id).toBe("choice");
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

  it("marks the likely right and wrong typed answers fairly", () => {
    const check = (id: string, right: string[], wrong: string[]) => {
      const authority = (questions.get(id) as Question).answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      for (const answer of right)
        expect(assessTextAnswer(answer, authority).correct, `${id}: ${answer}`).toBe(true);
      for (const answer of wrong)
        expect(assessTextAnswer(answer, authority).correct, `${id}: ${answer}`).toBe(false);
    };
    check(
      `${P}grains-dislocations-strengthening-anneal-case`,
      ["annealing", "anneal it", "an anneal", "recrystallisation anneal", "Annealing the wire"],
      ["quenching", "tempering", "work hardening", "drawing it more", "cold working"],
    );
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("replaces the review cards that drilled arithmetic or a bare term", () => {
    const ids = new Set(bundle.flashcards.map((card) => card.id));
    for (const gone of [
      "properties-from-the-tensile-test-card-2",
      "bonds-and-material-families-card-2",
      "grains-dislocations-strengthening-card-2",
      "polymers-ceramics-composites-card-1",
      "fracture-and-toughness-card-2",
      "corrosion-and-protection-card-1",
      "casting-and-solidification-card-2",
      "forming-and-deformation-card-2",
      "moulding-additive-and-cost-card-1",
      "process-capability-card-1",
      "selecting-material-and-process-card-1",
    ])
      expect(ids.has(`${P}${gone}`), gone).toBe(false);
  });
});
