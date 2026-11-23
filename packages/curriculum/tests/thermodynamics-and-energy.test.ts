import { readFileSync } from "node:fs";
import { assessNumericAnswer, assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Thermodynamics and Energy Systems is a course of engineering judgements, and a good share of
 * them are calculations. This file checks the shape of the questions (each lesson asked, end
 * checks of more than one type, option lengths, feedback on wrong options, hints), the quoted
 * extracts against passages copied from the source pack, and every numeric answer, which is
 * recomputed here from the figures in the question and the pack, not copied from the bundle.
 */
/** The lines and sentences the fixture copies from the pack for the numbers this test reads. */
type FigureName =
  | "waterTableHeader"
  | "waterTable40"
  | "waterTable200"
  | "doeCondenserExample"
  | "heatRateHeader"
  | "heatRate2025"
  | "btuPerKwh"
  | "fossilFactorHeader"
  | "fossilFactor2025"
  | "nonFossilFactorHeader"
  | "nonFossilFactor2025"
  | "methaneHeatingValues"
  | "brayton11to16"
  | "ge9ha";
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/thermodynamics-and-energy/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/thermodynamics-and-energy-passages.json", import.meta.url),
    "utf8",
  ),
) as { files: Record<string, string[]>; figures: { text: Record<FigureName, string> } };
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const stepQuestionIds = (lesson: CourseBundle["lessons"][number]) =>
  lesson.steps.flatMap((step) => [
    step.checkQuestionId,
    ...(step.workedSteps ?? []).flatMap((line) => [
      line.blank?.questionId ?? "",
      line.selfExplain?.questionId ?? "",
    ]),
  ]);
const choiceQuestions = bundle.questions.filter(
  (question) =>
    question.choices &&
    question.choices.length >= 3 &&
    question.answerAuthority.kind === "text" &&
    !question.order &&
    !question.sort,
);
const rightOption = (question: Question) => {
  const authority = question.answerAuthority;
  if (authority.kind !== "text") throw new Error(question.id);
  const right = (question.choices ?? []).filter(
    (choice) => assessTextAnswer(choice.label, authority).correct,
  );
  expect(right, question.id).toHaveLength(1);
  return right[0] as NonNullable<Question["choices"]>[number];
};
const squash = (text: string) =>
  text.replace(/[‘’]/gu, "'").replace(/[“”]/gu, '"').replace(/\s+/gu, " ").trim();

// Figures read from the pack's own lines, so a figure in the fixture and a figure in a question
// cannot drift apart without a test failing.
const figure = fixture.figures.text;
const cells = (line: string) => line.split("|").map((cell) => cell.trim());
const row = (header: string, values: string) => {
  const names = cells(header);
  const found = cells(values);
  return (name: string) => found[names.indexOf(name)] as string;
};
const heatRate = row(figure.heatRateHeader, figure.heatRate2025);
const fossilFactor = row(figure.fossilFactorHeader, figure.fossilFactor2025);
const nonFossilFactor = row(figure.nonFossilFactorHeader, figure.nonFossilFactor2025);
const waterTable = (line: string) => {
  const found = cells(line).map(Number);
  // Temperature, pressure, enthalpy of the liquid and of vaporisation, in kJ/kg (the table's J/g).
  return { hf: found[2] as number, hfg: found[3] as number };
};
const percent = (text: string) => Number(text.replace("%", ""));

const coalHeatRate = Number(heatRate("Coal")); // Btu/kWh, 2025
const gasHeatRate = Number(heatRate("Natural Gas"));
const btuPerKwh = Number(/\(([\d,]+) Btu\)/u.exec(figure.btuPerKwh)?.[1]?.replace(",", ""));
const ccFactor = percent(fossilFactor("Natural gas, combined cycle")) / 100;
const nuclearFactor = percent(nonFossilFactor("Nuclear")) / 100;
const windFactor = percent(nonFossilFactor("Wind")) / 100;
const hoursPerYear = 8760;
const methane = /HHV of methane is ([\d.]+) MJ\/kg .* ([\d.]+) MJ\/kg \(.*\) LHV/u.exec(
  figure.methaneHeatingValues,
) as RegExpExecArray;
const lhvOverHhv = Number(methane[2]) / Number(methane[1]);
const doeHs = [...figure.doeCondenserExample.matchAll(/h = ([\d.]+)/gu)].map((match) =>
  Number(match[1]),
);
const [steamIn, steamOut, waterIn, waterOut] = doeHs as [number, number, number, number];
const table40 = waterTable(figure.waterTable40);
const table200 = waterTable(figure.waterTable200);

const kelvin = (celsius: number) => celsius + 273;
/** The Carnot efficiency between two Celsius temperatures, in percent. */
const carnotPercent = (hot: number, cold: number) => (1 - kelvin(cold) / kelvin(hot)) * 100;
/** The ideal Brayton efficiency for a pressure ratio and gamma, in percent. */
const braytonPercent = (ratio: number, gamma: number) =>
  (1 - ratio ** (-(gamma - 1) / gamma)) * 100;
/** The ideal Otto efficiency for a compression ratio and gamma, in percent. */
const ottoPercent = (ratio: number, gamma: number) => (1 - ratio ** (1 - gamma)) * 100;
/** The log mean temperature difference from the two end differences. */
const logMean = (first: number, second: number) => (first - second) / Math.log(first / second);
/** The resistance of a cylindrical shell per metre, in K/W. */
const shellResistance = (inner: number, outer: number, k: number) =>
  Math.log(outer / inner) / (2 * Math.PI * k);
/** Power in the fuel, in the same unit as the power sent out, from a heat rate in Btu/kWh. */
const fuelPower = (output: number, rate: number) => (output * rate) / btuPerKwh;

/**
 * The correct answer to every numeric question, in the unit the answer box declares, worked out
 * from the figures in the question text and the pack. A key with a made-up value says so in the
 * question.
 */
const expected: Record<string, number> = {
  // Drawing the boundary: heat leaving is negative when heat into the system is positive
  "thee-draw-the-boundary-pump-heat-term": -0.3,
  "thee-draw-the-boundary-end-heat-sign": -45,
  // Reading states
  "thee-reading-states-quality-from-h": (2400 - table200.hf) / table200.hfg,
  // A sealed tank: absolute pressure scales with kelvin, then the atmosphere comes off again
  "thee-reading-states-end-gauge": (150 + 101.3) * (kelvin(125) / kelvin(25)) - 101.3,
  // The energy balance of a device, in kJ per kilogram and then at a flow
  "thee-device-energy-balance-hook": 3100 - 2500,
  "thee-device-energy-balance-turbine-work": 3230 - 2420 - 15,
  "thee-device-energy-balance-condenser-duty": (2.0e6 / 3600) * (steamIn - steamOut),
  "thee-device-energy-balance-cooling-water-flow": 1.36e6 / (waterOut - waterIn),
  "thee-device-energy-balance-river-limit": (20000 * (waterOut - waterIn)) / (steamIn - steamOut),
  "thee-device-energy-balance-end-turbine-flow": 100_000 / (3350 - 2300),
  // The efficiency ceiling
  "thee-efficiency-ceiling-hook": carnotPercent(600, 25),
  "thee-efficiency-ceiling-carnot-450-40": carnotPercent(450, 40),
  "thee-efficiency-ceiling-steam-cycle-limit": carnotPercent(171, 16),
  "thee-efficiency-ceiling-steam-cycle-fraction": (18.0 / 34.9) * 100,
  // A 45% limit with a 300 K sink: 1 - 300/T = 0.45
  "thee-efficiency-ceiling-end-source": 300 / (1 - 0.45),
  // Entropy and losses
  "thee-entropy-and-losses-work-at-085": 0.85 * 360,
  "thee-entropy-and-losses-exit-at-085": 3100 - 0.85 * 360,
  "thee-entropy-and-losses-pump-exit": table40.hf + 8.0 / 0.8,
  "thee-entropy-and-losses-end-turbine-eta": (3350 - 2550) / (3350 - 2400),
  // The Rankine cycle: cycle B has h1 = 167.2, h2 = 182.0, h3 = 3500, h4 = 2250 (illustrative)
  "thee-rankine-cycle-cycle-b-efficiency":
    ((3500 - 2250 - (182.0 - table40.hf)) / (3500 - 182.0)) * 100,
  // Ideal: efficiency = 1 - T_cold / T_in, so T_in = T_cold / (1 - efficiency)
  "thee-rankine-cycle-average-temperature": 313 / (1 - 0.4),
  // Gas turbines
  "thee-gas-turbines-efficiency-16": braytonPercent(16, 1.4),
  "thee-gas-turbines-ratio-for-fifty": 2 ** (1.4 / 0.4),
  // Piston engines
  "thee-piston-engines-nine-to-ten": ottoPercent(10, 1.4) - ottoPercent(9, 1.4),
  "thee-piston-engines-ratio-for-sixty": (1 / (1 - 0.6)) ** (1 / 0.4),
  // Combined cycles and CHP: the HHV basis uses the pack's heating values for methane
  "thee-combined-cycles-and-chp-hhv-value": 56 * lhvOverHhv,
  "thee-combined-cycles-and-chp-steam-share": ((0.64 - 0.43) / (1 - 0.43)) * 100,
  // Refrigeration and heat pumps
  "thee-refrigeration-and-heat-pumps-condenser-heat": 2.4 + 0.8,
  "thee-refrigeration-and-heat-pumps-heating-cop": (5.0 + 2.0) / 2.0,
  "thee-refrigeration-and-heat-pumps-carnot-45": kelvin(45) / (kelvin(45) - kelvin(0)),
  "thee-refrigeration-and-heat-pumps-heat-from-outdoors": 3.2 * 2.5 - 2.5,
  // Resistance networks and insulation
  "thee-resistance-networks-and-insulation-series-flux": 20 / (0.12 + 0.45 + 0.08),
  "thee-resistance-networks-and-insulation-board-drop": 202 * 0.0386,
  "thee-resistance-networks-and-insulation-pipe-insulation-resistance": shellResistance(
    152.4,
    228.6,
    0.242,
  ),
  // The critical radius is k / h, here in millimetres
  "thee-resistance-networks-and-insulation-critical-radius-value": (0.06 / 12) * 1000,
  "thee-resistance-networks-and-insulation-check-double-insulation":
    250 / (shellResistance(152.4, 304.8, 0.242) + 0.00134),
  // Heat exchangers
  "thee-heat-exchangers-parallel-lmtd": logMean(211.1, 50.0),
  "thee-heat-exchangers-area-ratio": 128.9 / 111.9,
  // Doubling the inside film (the better choice) in series with the outside film
  "thee-heat-exchangers-double-one-film": 1 / (1 / (2 * 600) + 1 / 4000),
  "thee-heat-exchangers-check-parallel-area": 600_000 / (800 * logMean(150 - 20, 90 - 70)),
  // Where the energy goes, with the 2025 heat rates and capacity factors from the EIA pages
  "thee-where-the-energy-goes-efficiency-from-heat-rate": (btuPerKwh / coalHeatRate) * 100,
  "thee-where-the-energy-goes-gas-rest-power": fuelPower(600, gasHeatRate) - 600,
  "thee-where-the-energy-goes-check-rest-power": fuelPower(800, 6200) - 800,
  // Judging energy claims
  "thee-judging-energy-claims-wind-farm-energy": (150 * hoursPerYear * windFactor) / 1000,
  "thee-judging-energy-claims-wind-equivalent": (100 * nuclearFactor) / windFactor,
  // Fuel per kWh of heat is (heat rate / 3,412) / COP, set equal to 1 / 0.90 for the boiler
  "thee-judging-energy-claims-breakeven-coal-grid": (coalHeatRate / btuPerKwh) * 0.9,
  "thee-judging-energy-claims-check-wind-for-gas": (200 * ccFactor) / windFactor,
  "thee-judging-energy-claims-hook-fuel-behind-heat": 3 / 4,
};

describe("questions in Thermodynamics and Energy Systems", () => {
  it("asks every question and every card from a lesson, and every id exists", () => {
    const asked = new Set(
      bundle.lessons.flatMap((lesson) => [
        lesson.intro?.hook.questionId ?? "",
        ...lesson.questionIds,
        ...stepQuestionIds(lesson),
      ]),
    );
    asked.delete("");
    expect([...asked].filter((id) => !questions.has(id))).toEqual([]);
    expect(bundle.questions.filter((question) => !asked.has(question.id)).map((q) => q.id)).toEqual(
      [],
    );
    const cards = bundle.lessons.flatMap((lesson) => lesson.flashcardIds);
    expect(new Set(cards).size).toBe(cards.length);
    expect(
      bundle.flashcards.filter((card) => !cards.includes(card.id)).map((card) => card.id),
    ).toEqual([]);
    const ids = [...bundle.questions.map((q) => q.id), ...bundle.flashcards.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers all 14 lessons, each with its own questions", () => {
    expect(bundle.lessons).toHaveLength(14);
    for (const lesson of bundle.lessons) {
      const own = bundle.questions.filter((question) =>
        question.id.startsWith(`thee-${lesson.id}-`),
      );
      expect(own.length, lesson.id).toBeGreaterThanOrEqual(8);
    }
  });

  it("ends each lesson with three checks of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps the right option the longest in at most a quarter of choice questions, and never far longer", () => {
    let longest = 0;
    let shortest = 0;
    for (const question of choiceQuestions) {
      const right = rightOption(question);
      const others = (question.choices ?? [])
        .filter((choice) => choice.id !== right.id)
        .map((choice) => choice.label.length);
      if (right.label.length > Math.max(...others)) longest += 1;
      if (right.label.length < Math.min(...others)) shortest += 1;
      expect(right.label.length, question.id).toBeLessThanOrEqual(Math.max(...others) * 1.25);
    }
    expect(choiceQuestions.length).toBeGreaterThan(60);
    expect(longest / choiceQuestions.length).toBeLessThanOrEqual(0.25);
    expect(shortest / choiceQuestions.length).toBeLessThanOrEqual(0.34);
  });

  it("explains every wrong option, and gives every question at least two hints", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
      }
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const right = rightOption(question);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of question.choices.filter((item) => item.id !== right.id))
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
    }
  });

  it("keeps dashes and verdict words out of the course text, apart from quoted extracts", () => {
    const withoutExtracts = JSON.stringify({
      course: bundle.course,
      lessons: bundle.lessons,
      flashcards: bundle.flashcards,
    });
    expect(withoutExtracts).not.toMatch(/[—–]/u);
    for (const question of bundle.questions) {
      const { extracts: _extracts, ...rest } = question;
      const text = JSON.stringify(rest);
      expect(text, question.id).not.toMatch(/[—–]/u);
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
    }
  });

  it("writes an order question as distinct items and a sort question with every bin used", () => {
    let ordered = 0;
    let sorted = 0;
    for (const question of bundle.questions) {
      const { order, sort } = question;
      if (question.answerAuthority.kind !== "text" || !(order || sort)) continue;
      if (order) {
        ordered += 1;
        expect(new Set(order.items).size, question.id).toBe(order.items.length);
        expect(order.items.length, question.id).toBeGreaterThanOrEqual(4);
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([ORDER_ANSWER_IDEA]);
      }
      if (sort) {
        sorted += 1;
        expect(new Set(sort.items.map((item) => item.label)).size, question.id).toBe(
          sort.items.length,
        );
        for (const bin of sort.bins)
          expect(
            sort.items.some((item) => item.bin === bin.id),
            `${question.id} ${bin.id}`,
          ).toBe(true);
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      expect(question.onCorrect, question.id).toBeTruthy();
    }
    expect(ordered).toBeGreaterThanOrEqual(2);
    expect(sorted).toBeGreaterThanOrEqual(9);
  });

  it("finds every quoted extract word for word in a passage copied from the source pack", () => {
    const pool = Object.values(fixture.files).flat().map(squash);
    let checked = 0;
    for (const question of bundle.questions) {
      for (const extract of question.extracts ?? []) {
        checked += 1;
        expect(
          pool.some((passage) => passage.includes(squash(extract.text))),
          question.id,
        ).toBe(true);
      }
    }
    expect(checked).toBe(7);
  });

  it("gives the 9HA's higher pressure ratio beside the common range in the gas-turbine lesson", () => {
    // The Brayton article gives 11 to 16 for most common designs; the combined-cycle article gives
    // the 9HA an overall pressure ratio of 21.8 to 1. The lesson says both, and cites the second.
    expect(figure.brayton11to16).toMatch(/about 11 to 16/u);
    expect(figure.ge9ha).toMatch(/overall pressure ratio is 21\.8 to 1/u);
    const lesson = JSON.stringify(bundle.lessons.find((item) => item.id === "gas-turbines"));
    expect(lesson).toMatch(/11 to 16/u);
    expect(lesson).toMatch(/largest modern machines run higher ratios/u);
    expect(lesson).toMatch(/Wikipedia's article on combined cycles/u);
    expect(lesson).toMatch(/9HA/u);
    expect(lesson).toMatch(/21\.8 to 1/u);
  });

  it("reads the 2025 EIA figures the questions use from the pack's own rows", () => {
    expect(coalHeatRate).toBe(10647);
    expect(gasHeatRate).toBe(7781);
    expect(btuPerKwh).toBe(3412);
    expect(ccFactor).toBeCloseTo(0.587, 6);
    expect(nuclearFactor).toBeCloseTo(0.911, 6);
    expect(windFactor).toBeCloseTo(0.338, 6);
    expect(lhvOverHhv).toBeCloseTo(0.901, 3);
    expect([steamIn, steamOut, waterIn, waterOut]).toEqual([2574, 125.8, 75.6, 104.9]);
    expect(table200).toEqual({ hf: 851.9, hfg: 1937.3 });
    expect(table40.hf).toBe(167.2);
  });
});

describe("numeric answers in Thermodynamics and Energy Systems", () => {
  const numeric = bundle.questions.filter((question) => kind(question) === "numeric");

  it("has a recomputed answer for every numeric question and no others", () => {
    expect(numeric).toHaveLength(48);
    expect(Object.keys(expected).sort()).toEqual(numeric.map((question) => question.id).sort());
  });

  it("recomputes each answer from the figures and accepts it in the answer box", () => {
    for (const question of numeric) {
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(question.id);
      const exact = expected[question.id] as number;
      const band = Math.max(
        authority.absoluteTolerance ?? 1e-9,
        Math.abs(authority.value) * (authority.relativeTolerance ?? 0.01),
      );
      // The stored value is the exact answer, rounded the way the question asks for it.
      expect(Math.abs(authority.value - exact) / Math.abs(exact), question.id).toBeLessThan(0.01);
      expect(Math.abs(exact - authority.value), question.id).toBeLessThanOrEqual(band);
      expect(assessNumericAnswer(String(exact), authority).correct, question.id).toBe(true);
      expect(assessNumericAnswer(String(authority.value), authority).correct, question.id).toBe(
        true,
      );
      // The band is tight enough that a wrong method does not pass: at most 8% of the answer, or
      // half a unit of its last printed digit where rounding needs more than that.
      const decimals = String(authority.value).split(".")[1]?.length ?? 0;
      expect(band, question.id).toBeLessThanOrEqual(
        Math.max(0.08 * Math.abs(authority.value), 0.5 * 10 ** -decimals) * (1 + 1e-9),
      );
    }
  });

  it("does not accept the wrong answers the questions name as misconceptions", () => {
    for (const question of numeric) {
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(question.id);
      for (const item of question.misconceptions ?? [])
        for (const wrong of item.match.numeric ?? [])
          expect(assessNumericAnswer(String(wrong), authority).correct, question.id).toBe(false);
    }
  });

  it("gives every numeric question a worked answer and at least two hints", () => {
    for (const question of numeric) {
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(question.id);
      expect(authority.workedAnswer?.length ?? 0, question.id).toBeGreaterThan(20);
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
    }
  });
});
