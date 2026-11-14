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
 * Biology: Cells to Ecosystems had its questions rewritten on 14 November 2026. Arithmetic dressed
 * in the subject's words became judgement about a case: what a control rules out, which variable to
 * hold fixed, what a table of counts supports, which cause a change in frequency points to. A number
 * stays where calculating it is the biology (a Punnett percentage, a dilution, an energy transfer).
 * Facts come from the course's OpenStax sections, and every figure in a prompt is recomputed here.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/biology-cells-to-ecosystems/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const byId = (id: string): Question => {
  const question = questions.get(`bio-${id}`);
  if (!question) throw new Error(`no question ${id}`);
  return question;
};
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
const rightLabel = (id: string) => rightOption(byId(id)).label;
const numeric = (id: string) => {
  const authority = byId(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority;
};
const percent = (part: number, whole: number) => (part / whole) * 100;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe("questions in Biology: Cells to Ecosystems", () => {
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

  it("cites a source for every question and card a lesson asks", () => {
    for (const lesson of bundle.lessons) {
      const metadata = bundle.authoringMetadata?.find((item) => item.lessonId === lesson.id);
      const cited = new Set(
        (metadata?.citations ?? []).map((item) => `${item.targetKind}:${item.targetId}`),
      );
      for (const id of [...lesson.questionIds, ...stepQuestionIds(lesson)].filter(Boolean))
        expect(cited.has(`question:${id}`), `${lesson.id} ${id}`).toBe(true);
      for (const id of lesson.flashcardIds)
        expect(cited.has(`flashcard:${id}`), `${lesson.id} ${id}`).toBe(true);
    }
  });

  it("does not repeat a flashcard front, and marks a typed card by an answer the learner can give", () => {
    const fronts = bundle.flashcards.map((card) => card.front.toLowerCase());
    expect(new Set(fronts).size).toBe(fronts.length);
    for (const card of bundle.flashcards) {
      if (card.recall === "self") expect(card.answerAuthority, card.id).toBeUndefined();
      else if (card.answerAuthority?.kind === "text")
        expect(assessTextAnswer(card.front, card.answerAuthority).correct, card.id).toBe(false);
    }
    expect(
      bundle.flashcards.filter((card) => card.recall === "self").length,
    ).toBeGreaterThanOrEqual(12);
    expect(
      bundle.flashcards.filter((card) => card.answerAuthority?.kind === "numeric").length,
    ).toBeLessThanOrEqual(4);
  });

  it("ends each lesson with three checks of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to places where the calculation is the biology", () => {
    const numericQuestions = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numericQuestions.length).toBeLessThanOrEqual(20);
    for (const question of numericQuestions) {
      expect(question.hints.length, question.id).toBe(3);
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(question.id);
      if (!Number.isInteger(authority.value))
        expect(authority.absoluteTolerance, question.id).toBeGreaterThanOrEqual(0.05);
    }
  });

  it("keeps the right option the longest in at most 30 percent of choice questions, and never far longer", () => {
    let longest = 0;
    let shortest = 0;
    for (const question of choiceQuestions) {
      const right = rightOption(question);
      const others = (question.choices ?? [])
        .filter((choice) => choice.id !== right.id)
        .map((choice) => choice.label.length);
      if (right.label.length > Math.max(...others)) longest += 1;
      if (right.label.length < Math.min(...others)) shortest += 1;
      expect(right.label.length, question.id).toBeLessThanOrEqual(Math.max(...others) * 1.15);
      const stops = new Set(
        (question.choices ?? []).map((choice) => choice.label.trimEnd().endsWith(".")),
      );
      expect(stops.size, question.id).toBe(1);
    }
    expect(longest / choiceQuestions.length).toBeLessThanOrEqual(0.3);
    expect(longest).toBeGreaterThan(0);
    expect(shortest / choiceQuestions.length).toBeLessThanOrEqual(0.4);
  });

  it("explains every wrong option and gives hints that guide", () => {
    const places = new Set<string>();
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
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
      places.add(`${question.choices.indexOf(right)}`);
    }
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("keeps dashes and verdict words out of the course text", () => {
    const whole = JSON.stringify({
      course: bundle.course,
      lessons: bundle.lessons,
      flashcards: bundle.flashcards,
    });
    expect(whole).not.toMatch(/[—–]/u);
    for (const question of bundle.questions) {
      const text = JSON.stringify(question);
      expect(text, question.id).not.toMatch(/[—–]/u);
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
    }
    for (const check of bundle.courseChecks ?? [])
      expect(JSON.stringify(check)).not.toMatch(/[—–]/u);
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(6);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(14);
    expect(counts.typed).toBeGreaterThanOrEqual(6);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
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

  it("puts a study, a set of counts or a design in front of the learner in at least twenty questions", () => {
    const study =
      /\b(experiment|test|tests|tested|study|counts?|measures?|measured|readings?|jar|pots|strips|culture|cultures|sample|survivors|compares?|plots)\b/iu;
    expect(
      bundle.questions.filter((question) => study.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(20);
  });

  it("marks the short-text answers a learner would give, and not the prompt or a wrong idea", () => {
    const cases: Record<string, { right: string[]; wrong: string[] }> = {
      "inside-a-cell-3": {
        right: ["mitochondria", "the mitochondrion", "Mitochondria"],
        wrong: ["chloroplast", "the ribosomes", "light"],
      },
      "light-to-sugar-energy-store": {
        right: ["chemical energy", "It is stored as chemical energy", "chemical"],
        wrong: ["light", "heat", "oxygen", "energy"],
      },
      "fuel-to-cell-work-breath-carbon": {
        right: ["glucose", "the glucose", "sugar", "From the glucose in the cell"],
        wrong: ["oxygen", "water", "the air", "carbon dioxide"],
      },
      "fuel-to-cell-work-7": {
        right: ["heat", "thermal energy", "as heat"],
        wrong: ["light", "ATP", "sound"],
      },
      "meiosis-and-gametes-which-division": {
        right: ["meiosis I", "Meiosis 1", "the first division", "in the first division"],
        wrong: ["meiosis II", "the second division", "meiosis 2", "fertilisation"],
      },
      "predicting-inheritance-8": {
        right: ["heterozygous", "carriers", "a heterozygote"],
        wrong: ["homozygous", "recessive", "aa"],
      },
      "ecological-evidence-window-pots": {
        right: ["random assignment", "a random draw", "randomisation", "by chance"],
        wrong: ["a control group", "more pots", "the same light", "replication"],
      },
    };
    const typedIds = bundle.questions.filter((q) => kind(q) === "typed").map((q) => q.id);
    expect(typedIds.sort()).toEqual(
      Object.keys(cases)
        .map((id) => `bio-${id}`)
        .sort(),
    );
    for (const [id, { right, wrong }] of Object.entries(cases)) {
      const question = byId(id);
      const authority = question.answerAuthority;
      if (authority.kind !== "text") throw new Error(id);
      for (const answer of right)
        expect(assessTextAnswer(answer, authority).correct, `${id}: ${answer}`).toBe(true);
      for (const answer of wrong)
        expect(assessTextAnswer(answer, authority).correct, `${id}: ${answer}`).toBe(false);
      expect(assessTextAnswer(question.prompt, authority).correct, `${id} prompt`).toBe(false);
      expect(assessTextAnswer(authority.exampleAnswer, authority).correct, `${id} example`).toBe(
        true,
      );
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, id).toBeGreaterThan(20);
    }
  });

  it("recomputes every numeric answer", () => {
    const expected: Record<string, number> = {
      "diffusion-and-membranes-2": (10 + 6) / 2,
      "water-across-a-membrane-3": 12 / 2,
      "water-across-a-membrane-hook": 6 / 4,
      "water-across-a-membrane-8": 20 / 2,
      "light-to-sugar-2": 5 * 6,
      "fuel-to-cell-work-2": 2 * 6,
      // A is 30%, so T is 30%, and the remaining 40% is shared equally by C and G.
      "copying-dna-chargaff": (100 - 2 * 30) / 2,
      "mitosis-and-growth-8": 2 ** 4,
      "meiosis-and-gametes-6-v2": 2 ** 4,
      "predicting-inheritance-2": percent(1, 4),
      "predicting-inheritance-7": percent(3, 4),
      "natural-selection-1": percent(10, 40),
      "natural-selection-3": percent(30, 50) - percent(15, 50),
      "energy-between-levels-2": 2000 * 0.1 * 0.1,
      "energy-between-levels-4": 300 / 0.1,
      "energy-between-levels-5-v2": percent(1200, 8000),
      "population-limits-hook": [0, 1, 2, 3, 4, 5, 6].find((day) => 2 ** day > 20) as number,
      "population-limits-5": 70 + 16 - 9,
    };
    const numericQuestions = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numericQuestions.map((question) => question.id.replace(/^bio-/u, "")).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const [id, value] of Object.entries(expected))
      expect(numeric(id).value, id).toBeCloseTo(value, 6);
  });

  it("recomputes the figures in the questions that read a study or a table", () => {
    // Counts across a membrane the solute crosses: the total stays 24, the sides meet at 12, and each
    // minute's loss on the left shrinks as the gap closes.
    const left = [20, 16, 13, 12, 12];
    const right = [4, 8, 11, 12, 12];
    for (const [i, value] of left.entries()) expect(value + (right[i] as number)).toBe(24);
    expect(left.slice(1).map((value, i) => (left[i] as number) - value)).toEqual([4, 3, 1, 0]);
    expect(byId("diffusion-and-membranes-counts").prompt).toContain("20, 16, 13, 12 and 12");
    expect(byId("diffusion-and-membranes-counts").prompt).toContain("4, 8, 11, 12 and 12");
    expect(byId("diffusion-and-membranes-counts").onCorrect).toContain("4, 3, 1 and then 0");

    // Potato strips: mass rises while the solution is weaker than the cells and falls once it is
    // stronger, so the cells match a solution between B and C.
    const change = { A: 6, B: 2, C: -3, D: -9 };
    expect(Math.sign(change.B)).toBe(1);
    expect(Math.sign(change.C)).toBe(-1);
    expect(rightLabel("water-across-a-membrane-potato")).toContain("between B and C");

    // Cultures: every count is twice the one before, which a fixed addition would not give.
    const culture = [100, 200, 400, 800];
    for (const [i, value] of culture.slice(1).entries())
      expect(value / (culture[i] as number)).toBe(2);
    expect(byId("mitosis-and-growth-culture-counts").prompt).toContain("100, 200, 400 and 800");

    // A human cell has 46 chromosomes; copied, each holds two DNA molecules, shared out again at mitosis.
    expect(46 * 2).toBe(92);
    expect(rightLabel("mitosis-and-growth-daughter-dna")).toMatch(/^46,/u);
    // Cell Q holds twice the DNA molecules of cell P in the same 8 chromosomes.
    expect(16 / 8).toBe(2);

    // Meselson and Stahl: simulate semiconservative copying of a molecule with two heavy strands.
    type Molecule = ["H" | "L", "H" | "L"];
    const copy = (molecules: Molecule[]): Molecule[] =>
      molecules.flatMap((molecule) => [
        [molecule[0], "L"] as Molecule,
        [molecule[1], "L"] as Molecule,
      ]);
    const once = copy([["H", "H"]]);
    expect(once.every((molecule) => molecule.join("") === "HL" || molecule.join("") === "LH")).toBe(
      true,
    );
    const twice = copy(once);
    expect(twice).toHaveLength(4);
    expect(twice.filter((molecule) => molecule.includes("H"))).toHaveLength(2);
    expect(twice.filter((molecule) => !molecule.includes("H"))).toHaveLength(2);
    expect(rightLabel("copying-dna-two-rounds")).toBe(
      "Two hold one heavy and one light strand, and two hold only light strands",
    );

    // Parents and child differ at position 4 only.
    const trio = { mother: "ACGTAC", father: "ACGTAC", child: "ACGAAC" };
    expect(trio.mother).toBe(trio.father);
    const differing = [...trio.child].flatMap((base, i) =>
      base !== trio.mother[i] ? [i + 1] : [],
    );
    expect(differing).toEqual([4]);
    expect(byId("mutation-and-variation-trio").onCorrect).toContain(
      "Position 4 reads T in both parents and A",
    );

    // Survivors across ten cultures: wildly uneven, which fits mutations at random times.
    const survivors = [0, 0, 3, 0, 212, 0, 1, 0, 0, 45];
    expect(survivors).toHaveLength(10);
    expect(Math.max(...survivors) / mean(survivors)).toBeGreaterThan(3);
    expect(byId("mutation-and-variation-cultures").prompt).toContain(
      "0, 0, 3, 0, 212, 0, 1, 0, 0 and 45",
    );

    // The test cross: 11 dominant and 9 recessive among 20 is close to the 1:1 of an Aa parent and
    // far from the 20:0 that an AA parent would give.
    expect(11 + 9).toBe(20);
    expect(Math.abs(11 - 9)).toBeLessThan(20 * 0.25);
    expect(9).toBeGreaterThan(0);
    expect(rightLabel("predicting-inheritance-test-cross-result")).toMatch(/^Aa,/u);

    // Energy: 10% of each level, 15% from the lake measurements, and eight times at level 4 for 20% against 10%.
    expect(
      [5000, 5000 * 0.1, 5000 * 0.1 ** 2, 5000 * 0.1 ** 3].map((value) => Math.round(value)),
    ).toEqual([5000, 500, 50, 5]);
    expect(rightLabel("energy-between-levels-pattern")).toBe("5000, 500, 50 and 5 kJ");
    expect(1800 / 12000).toBeCloseTo(0.15, 9);
    expect(270 / 1800).toBeCloseTo(0.15, 9);
    expect((9000 * 0.2 ** 3) / (9000 * 0.1 ** 3)).toBeCloseTo(8, 9);
    expect(rightLabel("energy-between-levels-doubling")).toContain("eight times");

    // Yeast counts level off near 120 thousand, and the biggest one-day rise (30 to 75) ends well below it.
    const yeast = [2, 8, 30, 75, 110, 120, 121];
    const rises = yeast.slice(1).map((value, i) => value - (yeast[i] as number));
    const biggest = Math.max(...rises);
    expect(biggest).toBe(45);
    expect(yeast[rises.indexOf(biggest) + 1]).toBe(75);
    expect(rises.slice(-2).every((rise) => rise <= 10)).toBe(true);
    expect(rightLabel("population-limits-yeast")).toContain("120 thousand");

    // Pots: no treated pot grew less than any control pot, and the group means differ by 5.5 cm.
    const treated = [12, 13, 11, 14];
    const control = [7, 8, 6, 7];
    expect(Math.min(...treated)).toBeGreaterThan(Math.max(...control));
    expect(mean(treated) - mean(control)).toBeCloseTo(5.5, 9);
    // Two sets share a mean of 9 cm and differ in spread.
    expect(mean([8, 9, 10])).toBe(9);
    expect(mean([2, 9, 16])).toBe(9);
    // Growth is the change from the starting height.
    expect(19 - 4).toBe(15);
    expect(22 - 12).toBe(10);
    expect(rightLabel("ecological-evidence-baseline")).toContain("A grew 15 cm to B's 10 cm");

    // Respiration readings: the blank is taken off each jar.
    expect(9 - 8).toBe(1);
    expect([4 - 1, 10 - 1, (10 - 1) / (4 - 1)]).toEqual([3, 9, 3]);
    expect(byId("fuel-to-cell-work-temperature").onCorrect).toContain(
      "about 3 units at 10°C and 9 at 25°C",
    );

    // Chromosome counts around meiosis.
    expect(5 + 5).toBe(10);
    expect(12 / 2).toBe(6);
    expect(8 / 2).toBe(4);
    expect(rightLabel("meiosis-and-gametes-fertilisation-count")).toContain("6");
    expect(rightLabel("meiosis-and-gametes-body-cell")).toMatch(/^Ten/u);
  });

  it("sets each course check apart from the lessons: one question per lesson, no hints, no filler sums", () => {
    const lessonIds = bundle.lessons.map((lesson) => lesson.id);
    let numericItems = 0;
    for (const check of bundle.courseChecks ?? []) {
      expect(
        check.items.map((item) => item.lessonId),
        check.id,
      ).toEqual(lessonIds);
      for (const item of check.items) {
        const question = item.question;
        expect(question.hints, question.id).toEqual([]);
        if (question.responseType === "numeric") numericItems += 1;
        else {
          const authority = question.answerAuthority;
          if (authority.kind !== "text") throw new Error(question.id);
          const right = (question.choices ?? []).filter(
            (choice) => assessTextAnswer(choice.label, authority).correct,
          );
          expect(right, question.id).toHaveLength(1);
          expect(question.choices, question.id).toHaveLength(3);
          const stops = new Set(
            (question.choices ?? []).map((choice) => choice.label.trimEnd().endsWith(".")),
          );
          expect(stops.size, question.id).toBe(1);
        }
      }
    }
    // Water concentration, the two Punnett percentages, the doubling and the energy step back.
    expect(numericItems).toBeLessThanOrEqual(8);
    const values = new Map<string, number>();
    for (const check of bundle.courseChecks ?? [])
      for (const item of check.items) {
        const authority = item.question.answerAuthority;
        if (authority.kind === "numeric") values.set(item.question.id, authority.value);
      }
    expect(Object.fromEntries(values)).toEqual({
      "bio-check-starting-point-predicting-inheritance": percent(0, 4),
      "bio-check-mixed-challenge-water-across-a-membrane": 18 / 3,
      "bio-check-mixed-challenge-predicting-inheritance": percent(3, 4),
      "bio-check-mixed-challenge-energy-between-levels": 180 / 0.2,
      "bio-check-later-applications-mitosis-and-growth": 2 * 2 ** 4,
      "bio-check-later-applications-predicting-inheritance": percent(2, 4),
    });
  });
});
