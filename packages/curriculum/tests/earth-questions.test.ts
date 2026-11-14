import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Earth and Environmental Science asks most of its questions about a record, a table or a passage:
 * seismic stations, an earthquake list, NASA's planet table, a balloon sounding, NOAA's carbon
 * dioxide readings, the Global Carbon Project's budget and the IPCC's attribution. This file checks
 * the shape of the questions, the length of the right options, the quoted extracts against passages
 * copied from the pages that were fetched, the restated tables against the values copied from them,
 * and every number a question asks for or quotes against the sum that produces it.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/earth-and-environmental-science/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
type Planet = { s: number; albedo: number; meanC: number };
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/earth-and-environmental-science-passages.json", import.meta.url),
    "utf8",
  ),
) as {
  files: Record<string, string[]>;
  data: {
    mlo: Record<string, number>;
    gcp: {
      fossil: number;
      luc: number;
      total: number;
      totalCO2: number;
      air: number;
      ocean: number;
      land: number;
    };
    planets: { venus: Planet; earth: Planet; mars: Planet };
    isotopeHalfLivesYears: { "uranium-238": number; "uranium-235": number; "potassium-40": number };
    eia2024: { nuclear: number; wind: number; solar: number };
    seaRates: { from: number; to: number; rate: number }[];
    quakes: { id: string; lat: number; lon: number; depth: number; mag: number }[];
    usgsGroundwater: { totalKm3: number; averageKm3PerYear: number; recentKm3PerYear: number };
    logistic: { r: number; K: number; n0: number; steps: number };
  };
};
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
  const question = questions.get(`eares-${suffix}`);
  if (!question) throw new Error(`missing question ${suffix}`);
  return question;
};
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
const flat = (text: string) => text.replace(/−/gu, "-").replace(/(\d),(\d{3})/gu, "$1$2");
const numbers = (text: string): number[] =>
  (flat(text).match(/(?<![\p{L}\d])-?\d+(?:\.\d+)?/gu) ?? []).map(Number);
const extractText = (question: Question) => (question.extracts ?? []).map((e) => e.text).join(" ");
const near = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);
const mlo = (key: string) => fixture.data.mlo[key] as number;

const SIGMA = 5.670374419e-8;
const D = fixture.data;
const atmosphere = (h: number) => {
  if (h <= 11000) {
    const t = 15.04 - 0.00649 * h;
    return { t, p: 101.29 * ((t + 273.1) / 288.08) ** 5.256 };
  }
  if (h <= 25000) return { t: -56.46, p: 22.65 * Math.exp(1.73 - 0.000157 * h) };
  const t = -131.21 + 0.00299 * h;
  return { t, p: 2.488 * ((t + 273.1) / 216.6) ** -11.388 };
};

describe("questions in Earth and Environmental Science", () => {
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

  it("ends each lesson with three checks of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses order and sort where the sequence or the sorting is the point, and keeps numbers to computing", () => {
    const structured = bundle.questions.filter((q) => kind(q) === "order" || kind(q) === "sort");
    expect(structured.length).toBeGreaterThanOrEqual(8);
    expect(structured.length).toBeLessThanOrEqual(12);
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    // twenty-seven of them are the blanks of worked and faded examples
    expect(numeric.length).toBeLessThanOrEqual(40);
    for (const question of numeric)
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(3);
    const withData = bundle.questions.filter((question) => (question.extracts ?? []).length > 0);
    expect(withData.length).toBeGreaterThanOrEqual(20);
  });

  it("keeps the right option the longest in at most 30 percent of choice questions, and never far longer", () => {
    let longest = 0;
    let shortest = 0;
    for (const question of choiceQuestions) {
      const right = rightOption(question).label.length;
      const rightId = rightOption(question).id;
      const others = (question.choices ?? [])
        .filter((choice) => choice.id !== rightId)
        .map((choice) => choice.label.length);
      if (right > Math.max(...others)) longest += 1;
      if (right < Math.min(...others)) shortest += 1;
      expect(right, question.id).toBeLessThanOrEqual(Math.max(...others) * 1.15);
    }
    expect(longest / choiceQuestions.length).toBeLessThanOrEqual(0.3);
    expect(shortest / choiceQuestions.length).toBeLessThanOrEqual(0.4);
  });

  it("spreads the right answer over the positions", () => {
    const counts = [0, 0, 0, 0];
    for (const question of choiceQuestions) {
      const position = (question.choices ?? []).findIndex((c) => c.id === rightOption(question).id);
      counts[position] = (counts[position] ?? 0) + 1;
    }
    for (const count of counts) expect(count / choiceQuestions.length).toBeLessThan(0.4);
  });

  it("explains every wrong option and gives enough hints", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
      }
      if (kind(question) !== "numeric")
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

  it("gives every option of a question the same form", () => {
    for (const question of choiceQuestions) {
      const stops = new Set(
        (question.choices ?? []).map((choice) => choice.label.trimEnd().endsWith(".")),
      );
      expect(stops.size, question.id).toBe(1);
    }
  });

  it("ends no numeric question on a hint that is only a sum", () => {
    for (const question of bundle.questions.filter((q) => kind(q) === "numeric")) {
      const last = (question.hints.at(-1) ?? "").trim();
      expect(last, question.id).not.toMatch(/^[\d\s.,+\-−×÷*/^()=²³√%]+[.?]?$/u);
    }
  });

  it("keeps dashes and verdict words out of the questions and cards, apart from quoted extracts", () => {
    for (const question of bundle.questions) {
      const { extracts: _extracts, ...rest } = question;
      const text = JSON.stringify(rest);
      expect(text, question.id).not.toMatch(/[—–]/u);
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
    }
    expect(JSON.stringify(bundle.flashcards)).not.toMatch(/[—–]/u);
  });

  it("finds every quoted extract word for word in a passage copied from the page it came from", () => {
    const verbatim = [
      "moving-plates-san-andreas",
      "moving-plates-hotspot-direction",
      "the-ocean-system-check-attribution",
      "what-has-changed-gap-observed",
      "what-has-changed-check-offset",
      "the-ocean-system-ice-to-mm",
      "carbon-moves-check-rates",
      "living-systems-keystone-case",
      "living-systems-check-overshoot",
      "limits-and-choices-rivers",
    ];
    const pool = Object.values(fixture.files).flat().map(squash);
    for (const suffix of verbatim) {
      const question = get(suffix);
      expect(question.extracts?.length, suffix).toBeGreaterThan(0);
      for (const extract of question.extracts ?? [])
        expect(
          pool.some((passage) => passage.includes(squash(extract.text))),
          suffix,
        ).toBe(true);
    }
    // each source the extracts name is one the bundle lists
    const sourceIds = new Set(bundle.sources.map((source) => source.id));
    for (const id of Object.keys(fixture.files)) expect(sourceIds.has(id), id).toBe(true);
  });

  it("restates each table from the values copied from its source", () => {
    // NOAA monthly means
    const shown = numbers(extractText(get("carbon-moves-seasonal-record")));
    for (const value of Object.values(D.mlo)) expect(shown).toContain(value);
    // Global Carbon Project budget, 2023
    const g = D.gcp;
    expect(numbers(extractText(get("carbon-moves-airborne-share")))).toEqual([
      g.fossil,
      g.luc,
      g.air,
      g.ocean,
      g.land,
    ]);
    expect(numbers(extractText(get("carbon-moves-units-mixup")))).toContain(g.totalCO2);
    near(g.fossil + g.luc, g.total, 9);
    near(g.air + g.ocean + g.land, g.total, 9);
    // NASA planet table
    const planets = numbers(extractText(get("energy-balance-planets")));
    for (const p of [D.planets.venus, D.planets.earth, D.planets.mars]) {
      expect(planets).toContain(p.s);
      expect(planets).toContain(p.albedo);
      expect(planets).toContain(p.meanC);
    }
    // USGS earthquake list
    const quakes = numbers(extractText(get("moving-plates-chile-depths")));
    for (const q of D.quakes) {
      expect(quakes).toContain(Math.round(Math.abs(q.lon) * 10) / 10);
      expect(quakes).toContain(Math.round(q.depth));
      expect(q.lat).toBeLessThanOrEqual(-20);
      expect(q.lat).toBeGreaterThanOrEqual(-22);
      expect(q.mag).toBeGreaterThanOrEqual(5.2);
    }
    const depths = D.quakes.map((q) => q.depth);
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    // IPCC sea level rates
    expect(numbers(extractText(get("the-ocean-system-three-rates")))).toEqual(
      D.seaRates.flatMap((r) => [r.from, r.to, r.rate]),
    );
    // USGS isotope table, EIA capacity factors, USGS groundwater
    const iso = D.isotopeHalfLivesYears;
    expect(numbers(extractText(get("reading-deep-time-isotope-table")))).toEqual([
      238, 206, 4.5, 235, 207, 704, 40, 40, 1.25,
    ]);
    expect(iso["uranium-238"]).toBe(4.5e9);
    expect(iso["uranium-235"]).toBe(704e6);
    expect(iso["potassium-40"]).toBe(1.25e9);
    expect(numbers(extractText(get("limits-and-choices-capacity-needed")))).toEqual([
      2024,
      D.eia2024.nuclear,
      D.eia2024.wind,
      D.eia2024.solar,
    ]);
    const gw = D.usgsGroundwater;
    const depleted = numbers(extractText(get("limits-and-choices-deplete-record")));
    expect(depleted).toContain(gw.totalKm3);
    expect(depleted).toContain(gw.averageKm3PerYear);
    expect(depleted).toContain(gw.recentKm3PerYear);
  });

  it("recomputes the figures that the judgement questions rely on", () => {
    // the plate that is faster, and the volcano that does not fit
    expect(7 * 10).toBeGreaterThan(600 / 10);
    const chain = [
      [100, 2],
      [250, 5],
      [400, 11],
      [600, 12],
    ] as const;
    const speeds = chain.map(([km, myr]) => km / myr);
    expect(speeds.map((s) => Math.round(s))).toEqual([50, 50, 36, 50]);
    expect(numbers(get("moving-plates-chain-check").prompt)).toEqual(chain.flat());
    // the three samples of the isotope table
    const age = (fraction: number, halfLife: number) => -Math.log2(fraction) * halfLife;
    near(age(1 / 4, D.isotopeHalfLivesYears["potassium-40"]), 2.5e9, 0);
    near(age(1 / 8, D.isotopeHalfLivesYears["uranium-238"]), 13.5e9, 0);
    near(age(1 / 2, D.isotopeHalfLivesYears["uranium-235"]), 704e6, 0);
    expect(13.5).toBeGreaterThan(4.54);
    // the clock of Earth's history
    const clock = (ma: number) => (1 - ma / 4540) * 24;
    near(clock(3500), 5.5, 1);
    near(clock(539), 21 + 9 / 60, 1);
    near(4540 / 24, 189.2, 1);
    // the standard atmosphere against the halving rule
    const modelP = numbers(extractText(get("layers-of-air-rule-trust")));
    [5.5, 11, 16.5, 22].forEach((km, i) => {
      near(modelP[2 * i] as number, km, 6);
      near(modelP[2 * i + 1] as number, Math.round(atmosphere(km * 1000).p * 10) / 10, 6);
    });
    const rule = (km: number) => 101.3 / 2 ** (km / 5.5);
    expect(rule(11) / atmosphere(11000).p - 1).toBeLessThan(0.13);
    expect(rule(11) / atmosphere(11000).p - 1).toBeGreaterThan(0.09);
    expect(rule(22) / atmosphere(22000).p - 1).toBeGreaterThan(0.5);
    const balloon = numbers(extractText(get("layers-of-air-balloon-record")));
    [0, 10, 15, 20, 30, 40].forEach((km, i) => {
      near(balloon[2 * i] as number, km, 6);
      near(balloon[2 * i + 1] as number, Math.round(atmosphere(km * 1000).t * 10) / 10, 6);
    });
    near(0.25 * 101.3, 25.3, 0);
    // Venus, Earth and Mars
    const absorbed = (p: { s: number; albedo: number }) => (p.s * (1 - p.albedo)) / 4;
    const { venus, earth, mars } = D.planets;
    near(absorbed(venus), 150, -1);
    near(absorbed(earth), 240, -1);
    expect(absorbed(venus)).toBeLessThan(absorbed(earth));
    near((absorbed(venus) / SIGMA) ** 0.25, 227, -1);
    expect(Math.abs((absorbed(mars) / SIGMA) ** 0.25 - (mars.meanC + 273.15))).toBeLessThan(2);
    near(venus.meanC + 273.15, 737, 0);
    // a tenth more temperature, and a log of the ratio
    near(1.1 ** 4 - 1, 0.4641, 4);
    near(1.1 ** 2 - 1, 0.21, 2);
    // the evening log and the two forecasts
    expect([21 - 11, 16 - 11, 11 - 11].map((gap) => gap * 125)).toEqual([1250, 625, 0]);
    expect([27 - 6, 14 - 11].map((gap) => gap * 125)).toEqual([2625, 375]);
    // the three periods of sea level rise
    const rises = D.seaRates.map((r) => r.rate * (r.to - r.from));
    near(rises[0] as number, 91, 6);
    near(rises[1] as number, 66.5, 6);
    near(rises[2] as number, 44.4, 6);
    const total = rises.reduce((a, b) => a + b, 0);
    near(total, 200, -1);
    expect(((rises[1] as number) + (rises[2] as number)) / total).toBeGreaterThan(0.5);
    expect((2018 - 1971) / (2018 - 1901)).toBeLessThan(0.5);
    near((0.2 / (2018 - 1901)) * 1000, 1.7, 1);
    near(
      D.seaRates.reduce((a, r) => a + r.rate, 0),
      6.9,
      6,
    );
    // the student who mixes GtC with GtCO2
    near((100 * D.gcp.air) / D.gcp.totalCO2, 14.5, 1);
    near((D.gcp.totalCO2 * 12) / 44, 11.1, 1);
    near((100 * (D.gcp.ocean + D.gcp.land)) / D.gcp.total, 47, 0);
    // the Mauna Loa record, month against month
    near(mlo("2022-5") - mlo("2022-9"), 5.06, 6);
    near(mlo("2024-5") - mlo("2023-5"), 2.9, 6);
    near(mlo("2023-9") - mlo("2022-9"), 2.59, 6);
    near(mlo("2024-9") - mlo("2023-9"), 3.53, 6);
    // 280 to 560 and 560 to 1,120 are both doublings
    expect(560 / 280).toBe(1120 / 560);
    near(5.35 * Math.log(2), 3.7, 1);
    near(5.35 * Math.log(1.5), 2.2, 1);
    near(3 * Math.log2(1.5), 1.755, 3);
    // the logistic record, step by step
    const { r, K, n0, steps } = D.logistic;
    let n = n0;
    const seq: number[] = [];
    for (let t = 0; t < steps; t += 1) {
      seq.push(Math.round(n));
      n += r * n * (1 - n / K);
    }
    expect(numbers(get("living-systems-logistic-record").prompt).slice(-steps)).toEqual(seq);
    const gains = seq.slice(1).map((v, i) => v - (seq[i] as number));
    expect(gains[0]).toBe(12);
    expect(Math.max(...gains)).toBe(149);
    expect(gains[gains.length - 2]).toBe(24);
    expect(gains.at(-1)).toBe(11);
    expect(seq[gains.indexOf(149)]).toBeGreaterThan(500);
    expect(seq[gains.indexOf(149)]).toBeLessThan(700);
    expect(1 - 1200 / 1000).toBeCloseTo(-0.2, 9);
    // the groundwater estimate
    near(1000 / D.usgsGroundwater.averageKm3PerYear, 108.7, 1);
    near(1000 / D.usgsGroundwater.recentKm3PerYear, 40, 0);
    near(D.usgsGroundwater.recentKm3PerYear / D.usgsGroundwater.averageKm3PerYear, 2.7, 1);
    // one extra step of a food chain is a factor of ten
    expect(0.1 * 10).toBeCloseTo(1, 9);
    // the shares in the IPCC statement on sea level
    expect(22 + 20).toBe(42);
  });

  it("recomputes every numeric answer", () => {
    const expected: Record<string, number> = {
      "inside-the-earth-core-radius": 6371 - 2891,
      "inside-the-earth-inner-radius": 6371 - 5150,
      "moving-plates-worked-1800": 60 * 30,
      "moving-plates-hotspot-speed-v2": 480 / 6 / 10,
      "moving-plates-san-andreas": 5 * 10 * 10,
      "rock-cycle-shale-200k": 10000 / 0.05,
      "rock-cycle-shale-500k": 50000 / 0.1,
      "reading-deep-time-bone-age": 3 * 5730,
      "reading-deep-time-rock-age": (2 * 700) / 1000,
      "reading-deep-time-dinosaur-minutes": Math.round((230 / 4540) * 1440),
      "reading-deep-time-check-seven": Math.round(((3 * 704) / 1000) * 10) / 10,
      "layers-of-air-p11": 104 / 4,
      "layers-of-air-p165": Math.round((99.2 / 8) * 10) / 10,
      "energy-balance-absorbed-238": Math.round((1361 * 0.7) / 4),
      "energy-balance-absorbed-170": Math.round((1361 * 0.5) / 4),
      "energy-balance-balance-255": Math.round((300 / SIGMA) ** 0.25),
      "energy-balance-check-albedo": Math.round(((1361 * 0.01) / 4) * 10) / 10,
      "why-the-weather-moves-cb-1500": 12 * 125,
      "why-the-weather-moves-cb-28-16": 14 * 125,
      "the-ocean-system-rise-10": 0.00001 * 1_000_000,
      "the-ocean-system-rise-20": 7220 / 361,
      "the-ocean-system-ice-to-mm": Math.round(((135 + 264) / 361) * 10) / 10,
      "carbon-moves-to-co2": Math.round(((10 * 44) / 12) * 10) / 10,
      "carbon-moves-to-carbon": Math.round(((37.4 * 12) / 44) * 10) / 10,
      "carbon-moves-budget-ppm": Math.round(((10 * 0.45) / 2.13) * 10) / 10,
      "carbon-moves-airborne-share": Math.round((100 * 5.9) / (10.1 + 1.0)),
      "what-has-changed-forcing-doubling": Math.round(5.35 * Math.log(2) * 10) / 10,
      "what-has-changed-forcing-420": Math.round(5.35 * Math.log(1.5) * 10) / 10,
      "what-has-changed-warming-420": 3 * Math.log2(1.5),
      "living-systems-carnivore-kj": 1000 * 0.1,
      "living-systems-third-level": 50000 * 0.1 ** 3,
      "living-systems-next-145": 100 + 0.5 * 100 * (1 - 100 / 1000),
      "living-systems-next-1080": 1200 + 0.5 * 1200 * (1 - 1200 / 1000),
      "limits-and-choices-aquifer-years": 300 / (10 - 4),
      "limits-and-choices-growth-years": Math.round(Math.log(1 + (0.05 * 300) / 10) / 0.05),
      "limits-and-choices-years-1000": Math.round(Math.log(1 + (0.03 * 1000) / 20) / 0.03),
      "limits-and-choices-wind-mwh": 3 * 8760 * 0.35,
      "limits-and-choices-capacity-needed": Math.round((1000 * 0.908) / 0.232 / 10) * 10,
    };
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace(/^eares-/u, "")).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const question of numeric) {
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(question.id);
      const key = question.id.replace(/^eares-/u, "");
      expect(
        Math.abs(authority.value - (expected[key] as number)),
        question.id,
      ).toBeLessThanOrEqual(Math.max(authority.absoluteTolerance, 1e-9) + 1e-9);
    }
  });
});
