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
 * Data Engineering follows the way System Design and DevOps ask questions (docs/question-writing-guide.md).
 * Questions put a pipeline, a log, a table or a schedule in front of the learner and ask what a rerun, a late
 * record, a layout or a schema change does. A learner judges which design costs more, roughly how much, and
 * what drives a figure, and does not compute it, so two numeric questions remain: replaying a commit log to
 * count live files, and adding up the latest amount for each key. Both are worked-example steps.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/data-engineering/bundle.json", import.meta.url), "utf8"),
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

const minutes = (time: string) => {
  const [hours, mins] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (mins ?? 0);
};

/**
 * Each numeric answer is recomputed here. `uses` lists numbers that must appear in the prompt, so the
 * calculation cannot drift from the wording. A question asked in a worked or faded example continues the
 * example's text, so its inputs (marked `example`) come from that text and not from the prompt.
 */
const recompute: Record<string, { value: () => number; uses?: number[]; example?: string }> = {
  "open-table-formats-files-at-v3": {
    value: () => {
      const live = new Set(["m", "n"]);
      for (const file of ["o", "p"]) live.add(file);
      live.delete("m");
      live.add("q");
      live.delete("n");
      return live.size;
    },
    uses: [3],
  },
  "cleaning-and-deduplicating-dedupe-total": {
    value: () => {
      const rows: [string, number, string][] = [
        ["k1", 5, "03-01"],
        ["k1", 6, "03-02"],
        ["k2", 4, "03-01"],
        ["k2", 4, "03-03"],
        ["k3", 9, "03-01"],
      ];
      const latest = new Map<string, [number, string]>();
      for (const [key, amount, loaded] of rows) {
        const seen = latest.get(key);
        if (!seen || loaded > seen[1]) latest.set(key, [amount, loaded]);
      }
      return [...latest.values()].reduce((sum, [amount]) => sum + amount, 0);
    },
    example: "five rows over three keys",
  },
};
const mentions = (prompt: string, value: number) => {
  const text = prompt.replace(/,/gu, "");
  return new RegExp(
    `(^|[^\\d.])${String(value).replace(".", "\\.")}([^\\d]|\\.\\D|\\.$|$)`,
    "u",
  ).test(text);
};

describe("questions in Data Engineering", () => {
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

  it("keeps numeric questions to worked examples and to numbers that decide something", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(18);
    const blanks = new Set(
      bundle.lessons.flatMap((lesson) =>
        lesson.steps.flatMap((step) =>
          (step.workedSteps ?? []).map((line) => line.blank?.questionId ?? ""),
        ),
      ),
    );
    expect(numeric.filter((question) => !blanks.has(question.id)).length).toBeLessThanOrEqual(6);
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
    expect(numeric.map((question) => question.id.replace(/^date-/u, "")).sort()).toEqual(
      Object.keys(recompute).sort(),
    );
    for (const question of numeric) {
      const entry = recompute[question.id.replace(/^date-/u, "")];
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

  it("checks the figures that prompts, choices and feedback quote", () => {
    // A join against a product list that holds product 7 twice: orders (id, product, amount).
    const orders: [number, number, number][] = [
      [1, 7, 10],
      [2, 7, 15],
      [3, 2, 20],
      [4, 5, 30],
    ];
    const products = [7, 2, 5];
    const total = (list: number[]) =>
      orders.flatMap(([, product, amount]) =>
        list.filter((id) => id === product).map(() => amount),
      );
    expect(total(products).reduce((a, b) => a + b, 0)).toBe(75);
    const doubled = total([...products, 7]);
    expect(doubled.reduce((a, b) => a + b, 0)).toBe(100);
    expect(doubled).toHaveLength(6);
    // Columns read: 2 of 40 against all 40, and the Parquet bill.
    expect(40 / 2).toBe(20);
    expect(2 * 5).toBe(10);
    expect((2 / 4) * 5).toBeCloseTo(2.5, 9);
    expect(((2 * 3) / 25) * 5).toBeCloseTo(1.2, 9);
    // Incremental load, upsert and DO NOTHING on customers 1 to 3 with id 2 corrected.
    const customers = new Map([
      [1, "Ana"],
      [2, "Bea"],
      [3, "Cy"],
    ]);
    const doNothing = new Map(customers);
    if (!doNothing.has(2)) doNothing.set(2, "Beatrice");
    expect(doNothing.get(2)).toBe("Bea");
    const upserted = new Map(customers).set(2, "Beatrice");
    expect(upserted.get(2)).toBe("Beatrice");
    expect(3 + 2 + 2).toBe(7);
    // Retries with doubling and fixed waits.
    expect([10, 20, 40].reduce((a, b) => a + b, 0)).toBe(70);
    expect(3 * 10).toBe(30);
    expect(2 + 4 + 8).toBe(14);
    expect(3 * 2).toBe(6);
    expect(500 + 1000).toBe(1500);
    // The critical path before and after cutting B, and C.
    expect(5 + 10 + 6 + 2).toBe(23);
    expect(5 + 7 + 6 + 2).toBe(20);
    expect(5 + Math.max(10, 1) + 6 + 2).toBe(23);
    // Delta log, checkpoint and storage.
    expect(41 - 30).toBe(11);
    expect(8 - 5 + 5).toBe(8);
    // Partitions: one customer partition in kilobytes, and pruning shares.
    expect(1200e9 / 3_000_000 / 1e3).toBe(400);
    expect(900 / 360).toBe(2.5);
    // Waves, splits and the broadcast.
    expect(Math.ceil(48 / 16) * 30).toBe(90);
    expect(48 * 30).toBe(1440);
    expect((10 * 1024) / 128).toBe(80);
    expect(10 / 1).toBe(10);
    expect(Math.ceil(80 / 16)).toBe(5);
    expect(8 * 40).toBe(320);
    expect(8 * 1.5).toBe(12);
    // Skewed stage: 70% of 500 million rows at 1 million rows a second.
    expect((0.7 * 500e6) / 1e6).toBe(350);
    expect(500e6 / 5 / 1e6).toBe(100);
    // Cleaning: DISTINCT keeps 500 rows, the repeats add 500, a cast of x gives 0.
    expect(450 * 10 - 400 * 10).toBe(500);
    expect((10.5 + 7 + 0 + 4) / 4).toBe(5.375);
    expect((10.5 + 7 + 4) / 3).toBeCloseTo(7.1667, 4);
    // Streaming: sliding windows, watermark and the sample.
    expect(12 / 4).toBe(3);
    expect(600 * 3).toBe(1800);
    expect(minutes("11:20") - 15).toBe(minutes("11:05"));
    expect(minutes("14:55") - 20).toBe(minutes("14:35"));
    expect(0.99 ** 40).toBeCloseTo(0.669, 3);
    expect(40 * 0.01).toBeCloseTo(0.4, 9);
    // Gates and monitoring.
    expect(40 / 2500).toBeCloseTo(0.016, 9);
    expect(40 / 1000).toBeCloseTo(0.04, 9);
    expect(2500 - 40).toBe(2460);
    expect(minutes("13:10") - minutes("04:25")).toBe(525);
    expect(525 - 8 * 60).toBe(45);
    expect(900e6 / 200e3 / 60).toBe(75);
    expect(minutes("03:00") - minutes("01:50")).toBe(70);
    expect(0.8 * 1_200_000).toBe(960_000);
    // Judgement questions that used to ask for a number: the figures their options and feedback quote.
    expect(new Set([10, 11, 12, 13]).size).toBe(4);
    expect((200_000_000 * 12 * 4) / 1e9).toBe(9.6);
    expect((200_000_000 * 3 * 4) / 1e9).toBe(2.4);
    expect(3 / 12).toBe(0.25);
    expect((((2 / 4) * 3) / 25) * 5).toBeCloseTo(0.3, 9);
    expect((1 / 4) * (3 / 25)).toBeCloseTo(0.03, 9);
    expect(Math.round(10 / 0.3)).toBe(33);
    expect(3 + 8 + 2).toBe(13);
    expect(3 + 5 + 2).toBe(10);
    expect(3 + 5 + 8 + 2).toBe(18);
    expect(45 - 7 * 6).toBe(3);
    expect(Math.ceil(45 / 6)).toBe(8);
    expect(8 * 1 + 5).toBe(13);
    expect((1800 / 360) * 30).toBe(150);
    expect(360 / 30).toBe(12);
    expect(330 + 30).toBe(360);
    expect((7200 * 4) / 200).toBe(144);
    expect(200 / 4).toBe(50);
    expect(900 - (900 / 360) * 12).toBe(870);
    expect(360 / 12).toBe(30);
    expect((0.4 * 1000e6) / 2e6).toBe(200);
    expect(1000e6 / 10 / 2e6).toBe(50);
    expect(0.4 / (1 / 10)).toBeCloseTo(4, 9);
    expect(minutes("14:41") - 10).toBe(minutes("14:31"));
    expect(minutes("14:31")).toBeGreaterThan(minutes("14:05"));
    expect(30 + 60 + 20).toBe(110);
    expect((30 + 60 + 20) / 5000).toBeCloseTo(0.022, 9);
    expect(0.02 * 5000).toBe(100);
    expect(Math.max(30, 60, 20)).toBeLessThan(100);
    expect((12000 - 9000) * 20 * 60).toBe(3_600_000);
    expect((12000 - 9000) / 12000).toBe(0.25);
    expect(3_600_000 / 9000).toBe(400);
    expect(minutes("05:45") + (24 * 60 - minutes("23:20"))).toBe(385);
    expect(385 - (5 * 60 + 20)).toBe(65);
    expect(minutes("05:45") - (5 * 60 + 20)).toBe(25);
    expect(3 * 4).toBe(12);
    expect(4 * 4).toBe(16);
  });

  it("puts a situation in front of the learner in most questions", () => {
    const situation =
      /\b(you|your|team|pipeline|job|jobs|table|tables|query|queries|source|warehouse|lake|lakehouse|file|files|batch|stream|task|tasks|run|runs|engine|engineer|analyst|dashboard|report|consumer|schedule|scheduler|partition|partitions|rows?|records?|cluster|executors?|notebook|manager|auditor|support|developer|reader|writer|writers|statement|log|commit|commits|version|window|windows|pipelines)\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.9);
    const withCode = bundle.questions.filter((question) =>
      /`[^`]*(SELECT|INSERT|WHERE|ROW_NUMBER)[^`]*`/u.test(question.prompt),
    );
    expect(withCode.length).toBeGreaterThanOrEqual(5);
    for (const question of withCode)
      expect(question.prompt, question.id).toMatch(/\?\s*$|\?\s*\n/u);
  });

  it("keeps dashes out of questions, hints and feedback", () => {
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
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps)
        expect(JSON.stringify(step.reveal ?? []), `${lesson.id} ${step.id}`).not.toMatch(/[—–]/u);
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
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
    expect(counts.numeric).toBeLessThanOrEqual(18);
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

  it("covers the judgements a pipeline gets wrong", () => {
    const text = bundle.questions.map((question) =>
      [
        question.prompt,
        ...(question.choices ?? []).map((choice) => choice.label),
        ...(question.sort?.items ?? []).map((item) => item.label),
        ...(question.order?.items ?? []),
        ...(question.misconceptions ?? []).map((item) => item.feedback),
        question.onCorrect ?? "",
      ].join(" "),
    );
    for (const phrase of [
      /idempoten/iu,
      /upsert/iu,
      /late/iu,
      /watermark/iu,
      /exactly-once/iu,
      /streaming/iu,
      /Parquet/u,
      /partition/iu,
      /high cardinality|cardinality|tiny partitions/iu,
      /`SELECT \*/u,
      /rename/iu,
      /backfill/iu,
      /range check|not-null/iu,
      /event time/iu,
      /small files/iu,
      /vacuum/iu,
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
      for (const alternative of question.answerAuthority.acceptedAlternatives ?? [])
        expect(
          assessTextAnswer(alternative, question.answerAuthority).correct,
          `${question.id} ${alternative}`,
        ).toBe(true);
    }
  });

  it("gives hints that guide, with no first letters and no bare sums", () => {
    for (const question of bundle.questions) {
      for (const hint of question.hints) {
        expect(hint, question.id).not.toMatch(/begins with|starts with|first letter/iu);
        expect(hint, question.id).not.toMatch(/^[\d\s,.+−×÷*/=-]+\.?$/u);
      }
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(
        kind(question) === "numeric" ? 3 : 2,
      );
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
