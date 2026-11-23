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
 * Modern Physics is a calculation course whose every lesson also asks for a judgement about a
 * measurement. This file checks the shape of the questions (each lesson asked, end checks of more
 * than one type, option lengths, feedback on wrong options, hints), the quoted extracts against
 * passages copied from the source pack, and every numeric answer, which is recomputed here from
 * the physical constants and the figures in the question, not copied from the bundle.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/modern-physics/bundle.json", import.meta.url), "utf8"),
) as CourseBundle;
const passages = JSON.parse(
  readFileSync(new URL("./fixtures/modern-physics-passages.json", import.meta.url), "utf8"),
) as { files: Record<string, string[]> };
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

// The physical constants, as defined in the 2019 SI and as measured (CODATA 2018).
const c = 299_792_458; // m/s
const h = 6.62607015e-34; // J s
const hbar = h / (2 * Math.PI);
const eV = 1.602176634e-19; // J
const electronMass = 9.1093837015e-31; // kg
const rydberg = 1.097373156816e7; // per metre
const hcInEvNm = (h * c) / eV / 1e-9; // 1239.84 eV nm
const bohrRadius = 52.9e-12; // m, as the lessons round it

const gamma = (beta: number) => 1 / Math.sqrt(1 - beta * beta);
/** The Lorentz factor minus one, in a form that keeps its digits when the speed is small. */
const excess = (beta: number) =>
  beta ** 2 / (1 + Math.sqrt(1 - beta ** 2)) / Math.sqrt(1 - beta ** 2);
const photonEnergyEv = (nanometres: number) => hcInEvNm / nanometres;
const photonEnergyJ = (nanometres: number) => (h * c) / (nanometres * 1e-9);
/** The wavelength in nm of the hydrogen line that drops from `upper` to `lower`. */
const hydrogenLine = (lower: number, upper: number) =>
  1e9 / (rydberg * (1 / lower ** 2 - 1 / upper ** 2));
const deBroglie = (mass: number, speed: number) => h / (mass * speed);
const minimumSpeedSpread = (mass: number, width: number) => hbar / (2 * mass * width);
const halfYear = 0.5 * 365.25 * 86_400; // s
const quadrature = (a: number, b: number) => Math.hypot(a, b);

/** The level that both of two lines end on, for a hydrogen lamp's two infrared lines. */
const sharedLowerLevel = (first: number, second: number) => {
  const reaches = (lower: number, nanometres: number) =>
    Array.from({ length: 30 }, (_, step) => lower + 1 + step).some(
      (upper) => Math.abs(hydrogenLine(lower, upper) - nanometres) < 1,
    );
  const levels = [1, 2, 3, 4, 5, 6, 7].filter(
    (lower) => reaches(lower, first) && reaches(lower, second),
  );
  // Not a number when no level, or more than one, fits, so the comparison with the bundle fails.
  return levels.length === 1 ? (levels[0] as number) : Number.NaN;
};

// Bismuth-212 decays to polonium-212 by beta emission 64.06% of the time, the figure the lesson gives.
const bismuthBetaShare = 0.6406;

/**
 * The correct answer to every numeric question, in the unit the answer box declares, worked out
 * from the figures in the question text. A key with a made-up value says so in the question.
 */
const expected: Record<string, number> = {
  // Moving clocks
  "modp-moving-clocks-gamma-08": gamma(0.8),
  "modp-moving-clocks-iss-excess": excess(7700 / c),
  "modp-moving-clocks-iss-lag": excess(7700 / c) * halfYear * 1000,
  "modp-moving-clocks-accelerator-muon": gamma(0.995) * 2.197,
  "modp-moving-clocks-half-percent": Math.sqrt(1 - 1 / 1.005 ** 2),
  // Simultaneity: the gap is gamma v dx / c^2, here in nanoseconds
  "modp-simultaneity-gap-200": ((gamma(0.5) * 0.5 * c * 200) / c ** 2) * 1e9,
  "modp-simultaneity-gap-90": ((gamma(0.8) * 0.8 * c * 90) / c ** 2) * 1e9,
  // Moving rods
  "modp-moving-rods-hook": 0.98 * c * 2.197e-6,
  "modp-moving-rods-muon-099": (4000 / gamma(0.99) / (0.99 * c)) * 1e6,
  "modp-moving-rods-rocket": 80 / gamma(0.9),
  // Mass and energy
  "modp-mass-and-energy-three-grams": 0.003 * c ** 2,
  // The photoelectric effect
  "modp-photoelectric-effect-photon-500": photonEnergyEv(500),
  "modp-photoelectric-effect-kmax-500": photonEnergyEv(500) - 2.0,
  "modp-photoelectric-effect-kmax-450": photonEnergyEv(450) - 1.9,
  // Photon energy, in eV, in units of 10^15 photons per second, and in nm
  "modp-photon-energy-orange-photon": photonEnergyEv(620),
  "modp-photon-energy-photons-at-1000": 1.0e-3 / photonEnergyJ(1000) / 1e15,
  "modp-photon-energy-photons-from-620": 2.0e-3 / photonEnergyJ(620) / 1e15,
  "modp-photon-energy-wavelength-from-count": (h * c) / (0.5e-3 / 2.5e15) / 1e-9,
  "modp-photon-energy-longest-wavelength": hcInEvNm / 1.5,
  // The hydrogen spectrum
  "modp-hydrogen-spectrum-seven-to-two": hydrogenLine(2, 7),
  // The line at 1281.8 nm ends on n = 3: 1/n_i^2 = 1/9 - (1/lambda)/R, then n_i = 1/sqrt of that
  "modp-hydrogen-spectrum-inverse-ni-squared": 1 / 9 - 1 / (rydberg * 1281.8e-9),
  "modp-hydrogen-spectrum-upper-level": 1 / Math.sqrt(1 / 9 - 1 / (rydberg * 1281.8e-9)),
  "modp-hydrogen-spectrum-two-infrared-lines": sharedLowerLevel(1093.8, 1005.0),
  "modp-hydrogen-spectrum-straight-down": hydrogenLine(1, 3),
  "modp-hydrogen-spectrum-four-to-one": hydrogenLine(1, 4),
  // Where Bohr's model stops working
  "modp-bohr-model-limits-ground-speed": (hbar / (electronMass * bohrRadius) / c) * 100,
  // The n = 1 orbit has the speed that mvr = hbar gives, and the circumference over the wavelength
  "modp-bohr-model-limits-wavelengths-in-ground-orbit":
    (2 * Math.PI * bohrRadius) / deBroglie(electronMass, hbar / (electronMass * bohrRadius)),
  "modp-bohr-model-limits-made-up-orbit": (2 * Math.PI * 0.2e-9) / deBroglie(electronMass, 1.1e6),
  // Waves and particles
  "modp-waves-and-particles-electron-3e6": deBroglie(electronMass, 3.0e6) / 1e-9,
  "modp-waves-and-particles-ball-wavelength": deBroglie(0.145, 40) / 1e-34,
  "modp-waves-and-particles-speed-for-atomic-wavelength": h / (electronMass * 0.1e-9) / 1e6,
  "modp-waves-and-particles-slow-electron": deBroglie(electronMass, 5.0e5) / 1e-9,
  // The uncertainty principle
  "modp-uncertainty-principle-electron-030nm": minimumSpeedSpread(electronMass, 0.3e-9) / 1e5,
  "modp-uncertainty-principle-electron-hydrogen":
    minimumSpeedSpread(electronMass, bohrRadius) / 1e6,
  "modp-uncertainty-principle-region-from-speed": hbar / (2 * electronMass * 1.0e4) / 1e-9,
  // Half-life
  "modp-half-life-seven-and-a-half-hours": 800 * 2 ** -(7.5 / 3.0),
  "modp-half-life-two-routes": bismuthBetaShare * 2000,
  "modp-half-life-half-life-in-minutes": (2.0 * 60) / Math.log2(640 / 40),
  "modp-half-life-date-the-bone": 5700 * Math.log2(14 / 5),
  // Fission and fusion
  "modp-fission-and-fusion-kilogram-of-uranium": (0.001 * 1.0 * c ** 2) / 1e13,
  "modp-fission-and-fusion-tritium-and-hydrogen": 8.482e6 / 13.6 / 1e5,
  "modp-fission-and-fusion-hydrogen-for-uranium": 9.0e13 / (0.008 * c ** 2),
  "modp-fission-and-fusion-kilograms-of-hydrogen": 1.0e15 / (0.008 * c ** 2),
  // Which physics applies
  "modp-which-physics-applies-combined-uncertainty": quadrature(21, 7),
  "modp-which-physics-applies-gap-in-uncertainties": (140 - 120) / quadrature(15, 20),
};

describe("questions in Modern Physics", () => {
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
        question.id.startsWith(`modp-${lesson.id}-`),
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
    expect(ordered).toBeGreaterThanOrEqual(3);
    expect(sorted).toBeGreaterThanOrEqual(8);
  });

  it("finds every quoted extract word for word in a passage copied from the source pack", () => {
    const pool = Object.values(passages.files).flat().map(squash);
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
    expect(checked).toBe(6);
  });

  it("describes the Station's clock offset the same way in the first and last lessons", () => {
    // Both give the effect of speed alone, about 5 ms in six months, and say that gravity takes a
    // little off it. The first lesson says so in its text and the last in the question it asks.
    const first = JSON.stringify(bundle.lessons.find((lesson) => lesson.id === "moving-clocks"));
    expect(first).toMatch(/speed alone/u);
    expect(first).toMatch(/5 milliseconds/u);
    expect(first).toMatch(/somewhat less than 5 ms/u);
    const station = questions.get("modp-which-physics-applies-space-station-clock") as Question;
    expect(station.prompt).toMatch(/speed alone/u);
    expect(station.prompt).toMatch(/5 ms/u);
    expect(JSON.stringify(station.choices)).toMatch(/somewhat less than 5 ms/u);
    // The effect of speed alone over six months is the 5 ms that both quote.
    expect(excess(7700 / c) * halfYear * 1000).toBeCloseTo(5.2, 1);
  });
});

describe("numeric answers in Modern Physics", () => {
  const numeric = bundle.questions.filter((question) => kind(question) === "numeric");

  it("has a recomputed answer for every numeric question and no others", () => {
    expect(numeric).toHaveLength(45);
    expect(Object.keys(expected).sort()).toEqual(numeric.map((question) => question.id).sort());
  });

  it("recomputes each answer from the constants and accepts it in the answer box", () => {
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
      // The band is tight enough that a wrong method does not pass.
      expect(band / Math.abs(authority.value), question.id).toBeLessThanOrEqual(0.08);
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
