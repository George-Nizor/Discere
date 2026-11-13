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
 * Small Buildings follows the way System Design and UX ask questions (docs/question-writing-guide.md).
 * The course mixes calculation and judgement, so a number stays only where it drives a design decision
 * (a shadow against a window, a stair's run against a hall, a joist's span against a room, a heat loss
 * against a wall build-up). Everything else puts a plan, a section, a wall build-up or a site in front of
 * the learner and asks what it shows or what is wrong. Regulatory figures are those of the documents the
 * prompts name: Approved Document K (2013), Approved Document M volume 1 (2015, 2016 amendments) and
 * Approved Document L volume 1 (2021, 2023 amendments), all England.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL(
      "../../../content/small-buildings-and-architectural-design/bundle.json",
      import.meta.url,
    ),
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

const rad = (degrees: number) => (degrees * Math.PI) / 180;
const deg = (radians: number) => (radians * 180) / Math.PI;
const tan = (degrees: number) => Math.tan(rad(degrees));
const section = (b: number, d: number) => (b * d * d) / 6 / 1000; // cm3

/**
 * Each numeric answer is recomputed here. `uses` lists numbers that must appear in the prompt, so the
 * calculation cannot drift from the wording. A question asked in a worked or faded example continues the
 * example's text, so its inputs (marked `example`) may come from that text.
 */
const recompute: Record<string, { value: () => number; uses?: number[]; example?: string }> = {
  "site-and-sun-neighbour-wall-40": {
    value: () => 6 - 8 * tan(90 - 40 - 23.44),
    uses: [6, 8, 26.56],
  },
  "site-and-sun-overhang-june": { value: () => 0.8 * tan(61.4), uses: [0.8, 61.4, 1.1] },
  "site-and-sun-shadow-9m-50": { value: () => 9 / tan(16.56), uses: [9, 50, 16.56] },
  "programme-and-areas-gross-34-v2": { value: () => 40 * 2200, uses: [34, 40, 2200] },
  "programme-and-areas-corridor-cost": {
    value: () => Math.round(((68 / 0.75 - 68 / 0.85) * 2200) / 100) * 100,
    uses: [68, 85, 75, 2200],
  },
  "plan-section-elevation-stud-1-20": { value: () => 120 * 20, uses: [120] },
  "circulation-and-stairs-going-175": { value: () => 630 - 2 * 175, uses: [175, 630] },
  "circulation-and-stairs-run-2600": {
    value: () => Math.round(14 * (630 - 2 * (2600 / 15)) - 3600),
    uses: [2600, 15, 14, 630],
  },
  "structure-small-buildings-line-load-06": { value: () => 2.925 * 0.6, uses: [0.6, 0.4, 2.925] },
  "structure-small-buildings-moment-3m": { value: () => (1.17 * 3 * 3) / 8, uses: [3, 1.17] },
  "structure-small-buildings-max-span": {
    value: () => Math.sqrt((8 * ((7 * section(47, 145) * 1000) / 1e6)) / 1.17),
    uses: [3.6, 47, 145, 164.7, 7, 1.17],
  },
  "daylight-df-bedroom": { value: () => (90 / 6000) * 100, uses: [90, 6000] },
  "daylight-depth-18": { value: () => 6 / 4.5 + 6 / 2.1, uses: [6, 4.5, 2.1] },
  "daylight-practice-2-v2": { value: () => 5 / 3.5 + 5 / 2.4, uses: [5, 3.5, 2.4, 4] },
  "heat-flow-and-u-values-wool-to-match-pir": {
    value: () => 0.035 * (0.1 / 0.022) * 1000,
    uses: [100, 0.022, 0.035],
  },
  "heat-flow-and-u-values-u-no-insulation": { value: () => 1 / 1.23, uses: [1.23] },
  "heat-flow-and-u-values-q-25": { value: () => 0.173 * 25 * 15, uses: [25, 0.173, 20, 5] },
  "heat-flow-and-u-values-leave-out-pir": {
    value: () => (0.81 - 0.173) * 30 * (21 - 3),
    uses: [30, 21, 3, 0.173, 0.81],
  },
  "air-moisture-and-bridges-leaky-extra": {
    value: () => 0.33 * 200 * (2.0 - 0.5) * 20,
    uses: [200, 0.5, 20],
  },
  "air-moisture-and-bridges-ts-lintel": {
    value: () => 20 - 1.2 * 0.13 * 20,
    uses: [1.2, 20, 0.13],
  },
  "comfort-and-passive-design-seminar-gain": {
    value: () => 20 * 1.2 * 58.2 * 1.8,
    uses: [20, 1.2, 58.2, 1.8],
  },
  "comfort-and-passive-design-overhang-40": {
    value: () => 0.5 * tan(73.44),
    uses: [73.44, 0.5, 0.3, 1.5],
  },
  "roofs-and-rain-ridge-7-40": { value: () => 3.5 * tan(40), uses: [7, 40] },
  "roofs-and-rain-pitch-1-5": { value: () => deg(Math.atan(1.5 / 3.0)), uses: [1.5] },
  "roofs-and-rain-rain-80": { value: () => (80 * 36) / 3600, uses: [80, 36, 0.6] },
  "roofs-and-rain-loft-pitch": { value: () => deg(Math.atan(2.4 / 4)), uses: [8, 2.4] },
  "a-small-building-end-to-end-walls-ua": { value: () => 44 * 0.173, uses: [44, 0.173] },
  "a-small-building-end-to-end-fabric-first": {
    value: () => (44 * 0.45 + 21.6) * 20,
    uses: [0.45, 44, 21.6, 20],
  },
  "a-small-building-end-to-end-double-glass-v2": {
    value: () => (8 - 4) * 1.4 * 20,
    uses: [8, 1.4, 20],
  },
  "a-small-building-end-to-end-glass-share": {
    value: () => (100 * 3 * 1.4) / (36 * 0.173 + 3 * 1.4),
    uses: [36, 0.173, 3, 1.4],
  },
};
const mentions = (prompt: string, value: number) => {
  const text = prompt.replace(/,/gu, "");
  return new RegExp(
    `(^|[^\\d.])${String(value).replace(".", "\\.")}([^\\d]|\\.\\D|\\.$|$)`,
    "u",
  ).test(text);
};

describe("questions in Small Buildings and Architectural Design", () => {
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

  it("ends each lesson with three questions of at least two types and at most one sum", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
      expect(types.filter((type) => type === "numeric").length, lesson.id).toBeLessThanOrEqual(1);
    }
  });

  it("keeps numeric questions to calculations that drive a design decision", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(30);
    for (const question of numeric) {
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(3);
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(`${question.id} is not numeric`);
      const decimals = (String(authority.value).split(".")[1] ?? "").length;
      if (decimals > 0)
        expect(authority.absoluteTolerance, question.id).toBeGreaterThanOrEqual(
          0.5 * 10 ** -decimals - 1e-12,
        );
      for (const item of question.misconceptions ?? [])
        for (const wrong of item.match.numeric ?? [])
          expect(Math.abs(wrong - authority.value), question.id).toBeGreaterThan(
            authority.absoluteTolerance,
          );
    }
  });

  it("recomputes every numeric answer from its prompt", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace(/^smabad-/u, "")).sort()).toEqual(
      Object.keys(recompute).sort(),
    );
    for (const question of numeric) {
      const entry = recompute[question.id.replace(/^smabad-/u, "")];
      if (!entry || question.answerAuthority.kind !== "numeric") throw new Error(question.id);
      const { value, absoluteTolerance } = question.answerAuthority;
      expect(
        Math.abs(entry.value() - value),
        `${question.id} recomputed ${entry.value()}`,
      ).toBeLessThanOrEqual(absoluteTolerance + 1e-9);
      for (const number of entry.uses ?? [])
        expect(mentions(question.prompt, number), `${question.id} mentions ${number}`).toBe(true);
    }
  });

  it("checks the numbers that choices, sorts and feedback quote", () => {
    const near = (a: number, b: number, places = 2) => expect(a).toBeCloseTo(b, places);
    // Sun and shadow.
    near(90 - 34 - -23.44 * -1, 32.56);
    near(90 - 35 - 23.44, 31.56);
    near(90 - (35 - 23.44), 78.44);
    near(9 / tan(14.56), 34.65);
    near(9 - 12 * tan(14.56), 5.88);
    near(6 / tan(26.56), 12.0, 1);
    near(0.8 * tan(14.6), 0.21);
    near(0.5 * tan(26.56), 0.25);
    // Areas and cost.
    near(68 / 0.85, 80);
    near(68 / 0.75, 90.67);
    near(68 * 0.85, 57.8);
    near(4 * 0.85, 3.4);
    near(4 * 2200, 8800);
    near(3.4 * 2200, 7480);
    // Scale.
    expect(52 * 50).toBe(2600);
    expect(1200 / 200).toBe(6);
    expect(38000 / 200).toBe(190);
    expect(38000 / 100).toBe(380);
    expect(9000 / 50).toBe(180);
    expect(6000 / 50).toBe(120);
    expect(9000 / 20).toBe(450);
    expect(5000 + 3500).toBe(8500);
    // Stairs and ramps.
    near(2600 / 15, 173.33);
    near(14 * (630 - 2 * (2600 / 15)), 3966.67);
    expect(450 * 15).toBe(6750);
    expect(450 * 12).toBe(5400);
    for (const [rise, going, pitch] of [
      [175, 260, 33.9],
      [200, 210, 43.6],
      [160, 300, 28.1],
      [190, 250, 37.2],
    ] as const)
      near(deg(Math.atan(rise / going)), pitch, 1);
    near(2700 / 16, 168.75);
    near(15 * (630 - 2 * 168.75), 4387.5);
    // Structure.
    near(section(63, 195), 399.26);
    near(section(47, 245), 470.2);
    expect(63 * 195).toBe(12285);
    expect(47 * 245).toBe(11515);
    // Daylight.
    near(400 / 4 ** 2, 25);
    near(400 / 2 ** 2, 100);
    near(5 / 4 + 5 / 1.8, 4.03);
    near(2 / (1 - 0.3), 2.86);
    // Heat.
    const wall = 0.102 / 0.77 + 0.1 / 0.022 + 0.1 / 0.11 + 0.013 / 0.57 + 0.17;
    near(1 / wall, 0.173, 3);
    near(1 / (wall + 0.1 / 0.022), 0.097, 3);
    near((1 - 1 / (wall + 0.1 / 0.022) / (1 / wall)) * 100, 44, 0);
    near(1 / (0.44 / 0.77 + 0.17), 1.35);
    near((0.1 / 0.022) * 0.77, 3.5, 1);
    near(1 / (1.234 + 0.1 / 0.035), 0.244, 3);
    near(0.035 / 0.022, 1.59);
    expect(0.102 * 1000 + 100 + 100 + 13).toBe(315);
    near(0.33 * 2.0 * 200, 132);
    near(0.33 * 0.5 * 200, 33);
    near(1.4 / 0.173, 8.09);
    near(10.4 * (1.4 - 0.173) * 20, 255.2, 1);
    // Roofs.
    near(48 / Math.cos(rad(45)), 67.88);
    expect(60 * 48).toBe(2880);
    near(60 * (48 / Math.cos(rad(45))), 4072.9, 0);
    near(60 * 48 * Math.cos(rad(45)), 2036.5, 0);
    expect(50 * 40).toBe(2000);
    near(3 * tan(30), 1.73);
    near(3 * tan(45), 3.0);
    near(6 / Math.cos(rad(30)), 6.93);
    near(6 / Math.cos(rad(45)), 8.49);
    // The cabin.
    near(6 / 4 + 6 / 2.1, 4.36);
    near(7.6 + 3.2 + 2.9 + 3.6 + 9.5, 26.8, 1);
  });

  it("checks the dew points quoted in the course against the Magnus formula", () => {
    const dew = (t: number, rh: number) => {
      const gamma = Math.log(rh / 100) + (17.625 * t) / (243.04 + t);
      return (243.04 * gamma) / (17.625 - gamma);
    };
    expect(dew(20, 60)).toBeCloseTo(12.0, 1);
    expect(dew(20, 65)).toBeCloseTo(13.2, 1);
  });

  it("names the regulation a prompt quotes", () => {
    const quoting = (pattern: RegExp) =>
      bundle.questions.filter((question) => pattern.test(question.prompt));
    for (const question of quoting(/Approved Document K/u))
      expect(question.prompt, question.id).toMatch(/England/u);
    for (const question of quoting(/Approved Document M/u))
      expect(question.prompt, question.id).toMatch(/England.*2015/u);
    for (const question of quoting(/Approved Document L/u))
      expect(question.prompt, question.id).toMatch(/England|new dwelling/u);
    expect(quoting(/Approved Document K/u).length).toBeGreaterThanOrEqual(2);
    expect(quoting(/Approved Document M/u).length).toBeGreaterThanOrEqual(1);
    expect(quoting(/Approved Document L/u).length).toBeGreaterThanOrEqual(1);
  });

  it("puts a situation in front of the learner in most questions", () => {
    const situation =
      /\byou\b|\byour\b|\b(client|house|cabin|room|wall|roof|stair|joist|window|plan|builder|designer|architect|plot|bathroom|bedroom|floor|drawing|sheet|lamp|extension|garden|couple|seminar|person|owner|tenant|bungalow|storey|detail|cavity|sun|air|area|light|load|layer|surface|rooms|resistance|factor|daylight|pitch|lintel|studio|gross)\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.9);
  });

  it("keeps dashes and verdict words out of questions, hints and feedback", () => {
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
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job|Well done)\b/u);
    }
  });

  it("marks one option right, keeps options alike in length and form, and explains each wrong one", () => {
    const places = new Set<number>();
    let threeOrMore = 0;
    let rightLongest = 0;
    let rightShortest = 0;
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const shortestOther = Math.min(...others.map((choice) => choice.label.length));
      const rightLength = right[0]?.label.length ?? 0;
      if (question.choices.length >= 3) {
        threeOrMore += 1;
        if (rightLength > longestOther) rightLongest += 1;
        if (rightLength < shortestOther) rightShortest += 1;
        expect(rightLength, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      }
      const stops = new Set(question.choices.map((choice) => /[.!?]$/u.test(choice.label)));
      expect(stops.size, `${question.id} mixes final stops`).toBe(1);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(question.choices.indexOf(right[0] as (typeof question.choices)[number]));
    }
    expect(rightLongest / threeOrMore).toBeLessThanOrEqual(0.3);
    expect(rightShortest / threeOrMore).toBeLessThanOrEqual(0.4);
    expect([...places].sort()).toEqual([0, 1, 2, 3]);
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(4);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.5);
    expect(counts.numeric).toBeLessThanOrEqual(30);
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

  it("covers the judgements a small building gets wrong", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).flatMap((item) => [item.label, item.explanation ?? ""]),
        ...(question.order?.items ?? []),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
      ].join(" "),
    );
    for (const phrase of [
      /Southern Hemisphere|south of the equator|latitude 3[45] degrees south/iu,
      /load-bearing|carries .* from above|what the wall carries/iu,
      /thermal bridge/iu,
      /deliberate ventilation|ventilate/iu,
      /dew point/iu,
      /plan area/iu,
      /splash/iu,
      /section/iu,
      /elevation/iu,
      /circulation/iu,
      /overhang/iu,
      /gross area/iu,
      /glaz/iu,
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
    const bridge = questions.get("smabad-a-small-building-end-to-end-bridge-name");
    if (bridge?.answerAuthority.kind !== "text") throw new Error("bridge question");
    for (const right of ["thermal bridge", "A thermal bridge", "a cold bridge", "thermal bridging"])
      expect(assessTextAnswer(right, bridge.answerAuthority).correct, right).toBe(true);
    for (const wrong of ["dew point", "U-value", "lintel", "condensation", "insulation"])
      expect(assessTextAnswer(wrong, bridge.answerAuthority).correct, wrong).toBe(false);
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

  it("keeps a review card for each lesson that asks for a name, a number or a choice, or is self-rated", () => {
    for (const card of bundle.flashcards)
      expect(Boolean(card.answerAuthority) || card.recall === "self", card.id).toBe(true);
    for (const card of bundle.flashcards) {
      if (card.answerAuthority?.kind !== "text") continue;
      expect(assessTextAnswer(card.front, card.answerAuthority).correct, card.id).toBe(false);
    }
  });
});
