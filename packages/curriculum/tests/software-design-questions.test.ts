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
 * Software Design and Architecture follows the way System Design and Backend and API Design ask questions
 * (docs/question-writing-guide.md). The skill is judgement about structure, so most questions put a short piece
 * of code, a module layout or a decision in front of the learner and ask which principle it breaks, what a
 * change forces, which pattern fits, or what a record should say. The figures that carry a decision (links
 * between modules, the cost of an inheritance tree, a chain's availability, a weighted total, the break-even of a
 * repair) are in the prompts, and the learner judges which way they move or roughly how large they come out. One
 * question still asks for a number, because the value of a line of code is the point of it.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/software-design-and-architecture/bundle.json", import.meta.url),
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
const get = (id: string): Question => {
  const question = questions.get(`sofda-${id}`);
  if (!question) throw new Error(id);
  return question;
};
const mentions = (prompt: string, value: number) => {
  const text = prompt.replace(/,/gu, "");
  return new RegExp(
    `(^|[^\\d.])${String(value).replace(".", "\\.")}([^\\d]|\\.\\D|\\.$|$)`,
    "u",
  ).test(text);
};

/** Each numeric answer is recomputed here. `uses` lists numbers that must appear in the prompt. */
const pairs = (n: number) => (n * (n - 1)) / 2;
const stretchSquare = () => {
  // Square sets both sides on each setter, so the last call decides: width 5, then height 2 gives 2 by 2.
  let side = 1;
  side = 5;
  side = 2;
  return side * side;
};
const recompute: Record<string, { value: () => number; uses?: number[]; example?: string }> = {
  "principles-as-heuristics-predict-square": { value: stretchSquare, uses: [5, 2] },
};

describe("questions in Software Design and Architecture", () => {
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

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
      expect(types.filter((type) => type === "numeric").length, lesson.id).toBeLessThanOrEqual(1);
    }
  });

  it("keeps numeric questions to counts and calculations that carry a decision", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(15);
    for (const question of numeric) {
      expect(question.hints.length, question.id).toBe(3);
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
    expect(numeric.map((question) => question.id.replace(/^sofda-/u, "")).sort()).toEqual(
      Object.keys(recompute).sort(),
    );
    for (const question of numeric) {
      const entry = recompute[question.id.replace(/^sofda-/u, "")];
      if (!entry || question.answerAuthority.kind !== "numeric") throw new Error(question.id);
      const { value, absoluteTolerance } = question.answerAuthority;
      expect(
        Math.abs(entry.value() - value),
        `${question.id} recomputed ${entry.value()}`,
      ).toBeLessThanOrEqual(absoluteTolerance + 1e-9);
      for (const number of entry.uses ?? [])
        expect(mentions(question.prompt, number), `${question.id} mentions ${number}`).toBe(true);
      if (!entry.uses) expect(entry.example, question.id).toBeTruthy();
    }
  });

  it("checks the numbers and the code results that choices and feedback quote", () => {
    // Links between modules.
    expect(pairs(8)).toBe(28);
    expect(pairs(10)).toBe(45);
    expect(pairs(20)).toBe(190);
    expect(pairs(20) / pairs(10)).toBeCloseTo(4.22, 2);
    // Inheritance against composition for three choices of four options.
    expect(4 ** 3).toBe(64);
    expect(4 * 3).toBe(12);
    // Availability of a chain of five services of 99.95%.
    expect(0.9995 ** 5).toBeCloseTo(0.9975, 4);
    expect(100 - 99.95).toBeCloseTo(0.05, 9);
    // Weighted matrix: the ranking flips when performance goes from 0.5 to 0.7.
    const total = (weights: number[], scores: number[]) =>
      weights.reduce((sum, weight, index) => sum + weight * (scores[index] ?? 0), 0);
    expect(total([0.5, 0.3, 0.2], [8, 5, 6])).toBeCloseTo(6.7, 9);
    expect(total([0.5, 0.3, 0.2], [6, 9, 9])).toBeCloseTo(7.5, 9);
    expect(total([0.7, 0.2, 0.1], [8, 5, 6])).toBeCloseTo(7.2, 9);
    expect(total([0.7, 0.2, 0.1], [6, 9, 9])).toBeCloseTo(6.9, 9);
    expect(total([0.6, 0.2, 0.2], [8, 5, 6])).toBeCloseTo(7.0, 9);
    expect(total([0.6, 0.2, 0.2], [6, 9, 9])).toBeCloseTo(7.2, 9);
    // Instability, I = Ce / (Ca + Ce).
    expect(1 / (3 + 1)).toBe(0.25);
    expect(4 / (0 + 4)).toBe(1);
    // Event correction: 100 - 30 - 45 is 25, the right figure is 100 - 30 - 40, and a deposit of 5 closes the gap.
    expect(100 - 30 - 45).toBe(25);
    expect(100 - 30 - 40).toBe(30);
    expect(100 - 30 - 45 + 5).toBe(30);
    // Break-even of a shortcut: 4 changes at 1 hour each is less than a 10-hour repair.
    expect(4 * 1).toBeLessThan(10);
  });

  it("holds the figures that the judgement questions rest on", () => {
    // A 99% measure is an allowance that scales with the load: 10 slow orders in 1,000 is 50 in 5,000.
    expect(1000 * (1 - 0.99)).toBeCloseTo(10, 9);
    expect(5000 * (1 - 0.99)).toBeCloseTo(50, 9);
    expect(5000 * 0.1).toBe(500);
    // Five modules in all pairs: 10 links, two for each module.
    expect(pairs(5)).toBe(10);
    expect(pairs(5) / 5).toBe(2);
    // Three transports and three formats: 9 subclasses against 6 parts.
    expect(3 * 3).toBe(9);
    expect(3 + 3).toBe(6);
    // Test suite layers: 2, 10 and 100 seconds, so the five slow tests are about nine tenths of 112.
    expect(200 * 0.01 + 20 * 0.5 + 5 * 20).toBeCloseTo(112, 9);
    expect(100 / 112).toBeCloseTo(0.89, 2);
    // A chain of ten services at 99.9% is about 99.0%, about 1% of downtime and 7 hours in 720.
    expect(0.999 ** 10 * 100).toBeCloseTo(99.0, 1);
    expect(100 - 0.999 ** 10 * 100).toBeCloseTo(1, 1);
    expect(0.01 * 720).toBeCloseTo(7.2, 9);
    // A chain at 99.5% is down 0.5% of 720 hours, which is 3.6 hours.
    expect(0.005 * 720).toBeCloseTo(3.6, 9);
    expect(0.05 * 720).toBeCloseTo(36, 9);
    // A duplicated deposit of 5 turns the balance of 35 into 40.
    expect(50 - 20 + 5).toBe(35);
    expect(50 - 20 + 5 + 5).toBe(40);
    // A weighted total of 6.7 sits above the plain average of 6.3 and below the best score.
    expect((8 + 5 + 6) / 3).toBeCloseTo(6.33, 2);
    expect(0.5 * 8 + 0.3 * 5 + 0.2 * 6).toBeCloseTo(6.7, 9);
    // Instability of one incoming and four outgoing links.
    expect(4 / (1 + 4)).toBeCloseTo(0.8, 9);
    expect(1 / (1 + 4)).toBeCloseTo(0.2, 9);
    // The repair of 10 hours is paid back in 2.5 months at 4 hours a month.
    expect(10 / (1 * 4)).toBe(2.5);
    expect(10 / 1).toBe(10);
    // A fourth format with 4 transports adds 4 subclasses, from 12 to 16, and one class with composition.
    expect(4 * 3).toBe(12);
    expect(4 * 4 - 4 * 3).toBe(4);
    expect(4 + 4).toBe(8);
    // Each prompt carries the figures that its question needs.
    for (const [id, numbers] of [
      ["what-architecture-decides-faded-allowance", [99, 1000, 5000]],
      ["designing-for-testability-try-total", [200, 0.01, 20, 0.5, 5]],
      ["monolith-modules-and-microservices-try-ten", [99.9]],
      ["monolith-modules-and-microservices-faded-downtime", [99.5, 720]],
      ["events-and-messages-transfer-duplicate", [50, 20, 5, 35]],
      ["trade-offs-and-decision-records-predict-total", [8, 5, 6]],
      ["evolving-a-system-try-i", [1, 4]],
      ["evolving-a-system-faded-months", [10, 1, 4]],
      ["composition-over-inheritance-faded-fourth-v2", [4, 3]],
    ] as const)
      for (const number of numbers)
        expect(mentions(get(id).prompt, number), `${id} mentions ${number}`).toBe(true);
    for (const card of ["coupling-and-cohesion-card-1", "composition-over-inheritance-card-2"])
      expect(bundle.flashcards.find((entry) => entry.id === `sofda-${card}`)?.recall, card).toBe(
        "self",
      );
    // Observer: attached in order, notify(5) appends 10 and then 6.
    const log: number[] = [];
    for (const handler of [(x: number) => log.push(x * 2), (x: number) => log.push(x + 1)])
      handler(5);
    expect(log).toEqual([10, 6]);
    // A stack that inherits from list, reversed in place, gives back 1.
    const items = [1, 2, 3].reverse();
    expect(items.pop()).toBe(1);
    // A stack used only through push and pop: three pushes and three pops leave 1 on the last pop.
    const stack = [1, 2, 3];
    stack.pop();
    stack.pop();
    expect(stack.pop()).toBe(1);
  });

  it("quotes the real output of the code it shows", () => {
    expect(get("hiding-decisions-peek-error").prompt).toContain(
      "AttributeError: 'Stack' object has no attribute '_items'",
    );
    expect(
      get("composition-over-inheritance-try-duck")
        .choices?.map((c) => c.label)
        .join(" "),
    ).toContain("AttributeError: 'Circle' object has no attribute 'area'");
    expect(get("domain-modelling-aggregate-bypass").prompt).toContain("It prints `1300 1350`");
    expect(get("layers-and-ports-port-test").prompt).toContain("gives `120.0`");
    expect(get("hiding-decisions-empty-pop").onCorrect).toContain("`None`");
  });

  it("puts a situation in front of the learner in most questions", () => {
    const situation =
      /\b(you|your|team|teams|module|modules|class|classes|function|functions|service|services|client|clients|caller|callers|code|diagram|record|records|developer|engineer|review|pull request|system|provider|consumer|order|account|shop|screen|layer|layers|library|script|company|plan|stack|queue)\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.75);
    expect(
      bundle.questions
        .filter((question) => question.prompt.length < 60)
        .map((question) => question.id),
    ).toEqual([]);
    const withCode = bundle.questions.filter(
      (question) =>
        question.prompt.split("\n").filter((line) => /^\s*`[^`]+`$/u.test(line)).length >= 2,
    );
    expect(withCode.length).toBeGreaterThanOrEqual(10);
    for (const question of withCode)
      expect(question.prompt, question.id).toMatch(/\?\s*$|\?\s*\n/u);
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
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
    expect(counts.numeric).toBeLessThanOrEqual(15);
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

  it("covers the judgements a design gets wrong", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).map((item) => item.label),
        ...(question.order?.items ?? []),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "",
      ].join(" "),
    );
    for (const phrase of [
      /single responsibility/iu,
      /leaky|reaches? past|reach through|_items/iu,
      /dependency rule|dependency inversion/iu,
      /Liskov/u,
      /DRY/u,
      /YAGNI|no problem to solve|nobody has asked/iu,
      /observer/iu,
      /strategy/iu,
      /adapter/iu,
      /seam/iu,
      /bounded context/iu,
      /microservices?/iu,
      /Conway/u,
      /god class/iu,
      /tolerant/iu,
      /expand and contract/iu,
      /system context/iu,
      /container/iu,
      /supersede/iu,
      /fitness function/iu,
      /strangler|router/iu,
      /characteris/iu,
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
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
      expect(new Set(question.hints).size, question.id).toBe(question.hints.length);
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
