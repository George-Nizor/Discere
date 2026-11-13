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
 * System Design follows the way DevOps and Delivery and History ask questions (docs/question-writing-guide.md),
 * adapted to a course with two skills: estimation, where a number is the design point, and design judgement.
 * Numeric questions stay where an estimate decides something (a fleet size, a hit rate, a restore time, a
 * burn rate) or where a worked example asks for one step of arithmetic. Everything else puts a requirement,
 * a failure or an architecture in front of the learner and asks which choice fits or what fails.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/system-design/bundle.json", import.meta.url), "utf8"),
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

/**
 * Each numeric answer is recomputed here. `uses` lists numbers that must appear in the prompt, so the
 * calculation cannot drift from the wording. A question asked in a worked or faded example continues the
 * example's text, so its inputs (marked `example`) come from that text and not from the prompt.
 */
const recompute: Record<string, { value: () => number; uses?: number[]; example?: string }> = {
  "requirements-and-scope-faded-reads": { value: () => 12 * 150, uses: [12, 150] },
  "requirements-and-scope-writes-from-reads": { value: () => 3000 / 150, uses: [3000, 150, 25] },
  "back-of-the-envelope-estimation-why-twelve": { value: () => 80 * 12, uses: [80, 12] },
  "back-of-the-envelope-estimation-faded-five-years": {
    value: () => (2_000_000 * 1000 * 5 * 365) / 1e12,
    example: "2,000,000 records of 1,000 bytes a day for 5 x 365 days",
  },
  "back-of-the-envelope-estimation-practice-1-v2": {
    value: () => Math.ceil(((5e6 * 40) / 86400) * 3 / (2000 * 0.7)),
    uses: [5, 40, 3, 2000, 70, 86400],
  },
  "latency-throughput-and-tails-littles-law-1": { value: () => 400 * (250 / 1000), uses: [400, 50, 250, 80] },
  "latency-throughput-and-tails-why-subtract": { value: () => 1 - 0.951, uses: [0.951] },
  "latency-throughput-and-tails-faded-twenty": { value: () => Math.round((1 - 0.99 ** 20) * 100), uses: [20, 1] },
  "latency-throughput-and-tails-practice-3-v2": { value: () => Math.round((1 - 0.98 ** 40) * 100), uses: [40, 98] },
  "scaling-and-load-balancing-after-a-failure": { value: () => (2400 / 5 / 500) * 100, uses: [2400, 6, 500] },
  "scaling-and-load-balancing-faded-fleet": {
    value: () => Math.ceil(8000 / (600 * 0.6)),
    example: "peak 8,000, servers of 600 at 60%",
  },
  "caching-faded-latency": { value: () => 1 + (1 - 0.99) * 20, uses: [1, 20, 99] },
  "caching-practice-1-v2": { value: () => (1 - 1500 / 10000) * 100, uses: [1500, 10000] },
  "databases-and-indexes-levels-for-hundred-million": {
    value: () => {
      let levels = 0;
      while (100 ** levels < 100_000_000) levels += 1;
      return levels;
    },
    uses: [100, 100000000],
  },
  "databases-and-indexes-faded-scan-v2": { value: () => 30_000_000 / 100, uses: [30000000, 100] },
  "replication-and-partitioning-shard-of-eleven": { value: () => 11 % 3, uses: [11, 3] },
  "replication-and-partitioning-faded-keys": {
    value: () => Array.from({ length: 24 }, (_, key) => key).filter((key) => key % 4 === key % 6).length,
    uses: [24, 4, 6],
  },
  "replication-and-partitioning-practice-2-v2": {
    value: () => Math.max(Math.ceil(6000 / 500), Math.ceil(24000 / 2500)),
    uses: [6, 500, 24000, 2500],
  },
  "consistency-and-quorums-faded-read": {
    value: () => {
      let reads = 1;
      while (reads + 4 <= 7) reads += 1;
      return reads;
    },
    example: "N = 7 and W = 4",
  },
  "queues-and-event-streams-time-to-the-limit": { value: () => 90000 / (130 - 100) / 60, uses: [90000, 130, 100] },
  "queues-and-event-streams-net-drain": { value: () => 100 - 60, uses: [100, 60] },
  "queues-and-event-streams-faded-drain": { value: () => 9000 / 40, example: "9,000 messages at 40 per second" },
  "timeouts-retries-and-circuit-breakers-four-layers": { value: () => 20 * 3 ** 3, uses: [3, 300, 20] },
  "timeouts-retries-and-circuit-breakers-faded-chain-v2": {
    value: () => 3 * 2 * 3,
    example: "attempts of 3, 2 and 3 at A, B and C",
  },
  "availability-and-redundancy-four-in-series": { value: () => 0.999 ** 4 * 100, uses: [99.9, 99.95] },
  "availability-and-redundancy-faded-series": {
    value: () => 0.999 * (1 - 0.001 * 0.001) * 0.999 * 100,
    example: "a 99.9% web tier, a pair of 99.9% replicas in parallel and a 99.9% database",
  },
  "availability-and-redundancy-restore-time": { value: () => 2_000_000 / 125 / 3600, uses: [2, 125, 1] },
  "observability-and-slos-fast-burn": { value: () => ((14.4 * 1) / (30 * 24)) * 100, uses: [14.4, 30] },
  "observability-and-slos-even-pace-six": { value: () => (20000 * 6) / 30, uses: [20000, 6, 30] },
  "observability-and-slos-faded-burn": { value: () => 4000 / ((6000 * 10) / 30), example: "4,000 failures against a 6,000 budget at day 10" },
  "design-a-url-shortener-practice-1-v2": {
    value: () => Math.ceil((((60e6 / 2592000) * 150) * 3) / (2000 * 0.7)),
    uses: [60, 150, 2592000, 3, 2000, 70],
  },
  "design-a-feed-and-review-hanging-rate": { value: () => 200 * 0.1, uses: [200, 10] },
  "design-a-feed-and-review-faded-threads-v2": {
    value: () => (20 * 30) / (500 * 0.1),
    example: "20 servers of 30 threads, 500 requests per second, 10% hanging",
  },
};
const mentions = (prompt: string, value: number) => {
  const text = prompt.replace(/,/gu, "");
  return new RegExp(`(^|[^\\d.])${String(value).replace(".", "\\.")}([^\\d]|\\.\\D|\\.$|$)`, "u").test(text);
};

describe("questions in System Design", () => {
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
    expect([...cards].filter((id) => !bundle.flashcards.some((card) => card.id === id))).toEqual([]);
  });

  it("ends each lesson with three questions of at least two types and at most one sum", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
      expect(types.filter((type) => type === "numeric").length, lesson.id).toBeLessThanOrEqual(1);
    }
  });

  it("keeps numeric questions to estimates that decide something and to worked-example steps", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(35);
    const blanks = new Set(
      bundle.lessons.flatMap((lesson) =>
        lesson.steps.flatMap((step) =>
          (step.workedSteps ?? []).map((line) => line.blank?.questionId ?? ""),
        ),
      ),
    );
    // Outside the worked and faded examples there are few, and each one sets a number against a limit.
    expect(numeric.filter((question) => !blanks.has(question.id)).length).toBeLessThanOrEqual(15);
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
    expect(numeric.map((question) => question.id.replace(/^sysd-/u, "")).sort()).toEqual(
      Object.keys(recompute).sort(),
    );
    for (const question of numeric) {
      const entry = recompute[question.id.replace(/^sysd-/u, "")];
      if (!entry || question.answerAuthority.kind !== "numeric") throw new Error(question.id);
      const { value, absoluteTolerance } = question.answerAuthority;
      expect(Math.abs(entry.value() - value), `${question.id} recomputed ${entry.value()}`).toBeLessThanOrEqual(
        absoluteTolerance + 1e-9,
      );
      for (const number of entry.uses ?? [])
        expect(mentions(question.prompt, number), `${question.id} mentions ${number}`).toBe(true);
      if (!entry.uses) expect(entry.example, question.id).toBeTruthy();
    }
  });

  it("checks the numbers that choices and feedback quote", () => {
    // Series and parallel availability, tail amplification, collisions, overlap of quorums and key moves.
    expect(0.9995 ** 5).toBeCloseTo(0.9975, 4);
    expect(0.99 ** 3).toBeCloseTo(0.9703, 4);
    expect(1 - 0.99 ** 30).toBeCloseTo(0.2603, 3);
    expect(1 - 0.99 ** 10).toBeCloseTo(0.0956, 3);
    expect(1 - 0.999 ** 30).toBeCloseTo(0.0296, 3);
    expect(0.8 ** (1 / 40)).toBeCloseTo(0.99443, 4);
    expect(6e9 / 62 ** 6).toBeCloseTo(0.1056, 3);
    expect(6e9 / 62 ** 7).toBeCloseTo(0.0017, 4);
    expect(0.0005 * 525_600).toBeCloseTo(262.8, 6);
    expect(14.4 / 720).toBeCloseTo(0.02, 9);
    expect(3 ** 5).toBe(243);
    const stay = Array.from({ length: 72 }, (_, key) => key).filter((key) => key % 8 === key % 9);
    expect(stay.length).toBe(8);
    expect(5 * 200 + 10).toBe(1010);
    expect(5 + 10 * 200).toBe(2005);
    expect(30e6 * 2000 * 36 * 3 / 1e12).toBeCloseTo(6.48, 6);
  });

  it("puts a situation in front of the learner in most questions", () => {
    const situation = /\byou\b|\byour\b|\b(team|service|services|fleet|cluster|server|servers|queue|cache|database|shop|page|app|feed|user|users|customer|bank|client|clients|engineer|designer|colleague|teammate|reviewer|requests?|messages?|table|key|keys|store|replicas?|backends?|shards?|queries|query|codes?|link|links|nodes?|region|regions|dependency|dependencies|account|accounts|post|posts|latency|consumers?|producers?|retries|retry|budget|cluster)\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.9);
    const withCode = bundle.questions.filter(
      (question) =>
        question.prompt.split("\n").filter((line) => /^\s*`[^`]+`$/u.test(line)).length >= 2,
    );
    expect(withCode.length).toBeGreaterThanOrEqual(2);
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
  });

  it("marks one option right, keeps options alike in length and form, and explains each wrong one", () => {
    const places = new Set<number>();
    let threeOrMore = 0;
    let rightLongest = 0;
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const rightLength = right[0]?.label.length ?? 0;
      if (question.choices.length >= 3) {
        threeOrMore += 1;
        if (rightLength > longestOther) rightLongest += 1;
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
    expect(counts.numeric).toBeLessThanOrEqual(35);
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
        expect(order.items.filter((item) => /^\d/u.test(item)), question.id).toEqual([]);
      }
      if (sort) {
        expect(new Set(sort.items.map((item) => item.label)).size, question.id).toBe(
          sort.items.length,
        );
        expect(sort.items.length, question.id).toBeGreaterThanOrEqual(5);
        for (const bin of sort.bins)
          expect(sort.items.some((item) => item.bin === bin.id), `${question.id} ${bin.id}`).toBe(true);
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
      ].join(" "),
    );
    for (const phrase of [
      /partition/iu,
      /idempotency key|idempotent/iu,
      /hot spot|hot key|today's date/iu,
      /replication lag|has not applied|not yet applied/iu,
      /invalidat|removes the cached|never removes/iu,
      /single point of failure/iu,
      /backlog/iu,
      /key-value store/iu,
      /relational database/iu,
      /consistent hashing/iu,
      /p99/u,
      /independently|independent/iu,
    ])
      expect(text.some((entry) => phrase.test(entry)), String(phrase)).toBe(true);
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
      if (kind(question) !== "numeric" && question.id.indexOf("-faded-") < 0)
        expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps a review card for each lesson that asks for a name, a number or a choice, or is self-rated", () => {
    for (const card of bundle.flashcards)
      expect(Boolean(card.answerAuthority) || card.recall === "self", card.id).toBe(true);
    for (const card of bundle.flashcards) {
      if (card.answerAuthority?.kind !== "text") continue;
      expect(assessTextAnswer(card.front, card.answerAuthority).correct, card.id).toBe(false);
      expect(card.back.toLowerCase(), card.id).toContain(
        card.answerAuthority.exampleAnswer.toLowerCase().split(" ")[0] ?? "",
      );
    }
  });
});
