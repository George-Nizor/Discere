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
 * No question asks the learner to compute an exact figure, because a calculator or an assistant does that in
 * practice. The estimates (a fleet size, a hit rate, a restore time, a burn rate) are multiple choice: the
 * learner judges which option the figures support, and each wrong option is a slip people make with them.
 * Everything else puts a requirement, a failure or an architecture in front of the learner and asks which
 * choice fits or what fails.
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
 * Each converted estimate is checked here against its figures. `right` is the label of the right option,
 * `holds` recomputes the fact that option states, and `mistakes` recomputes the figures that the wrong
 * options come from. `uses` lists numbers that must appear in the prompt, so the question cannot drift from
 * the figures it is checked against.
 */
type Judged = { right: string; holds: () => boolean; mistakes?: () => boolean; uses: number[] };
const servers = (urlsPerMonth: number, readsPerWrite: number) =>
  Math.ceil((((urlsPerMonth / 2_592_000) * readsPerWrite) * 3) / (2000 * 0.7));
const judged: Record<string, Judged> = {
  "requirements-and-scope-faded-reads": {
    right: "About 1,800 reads per second",
    holds: () => 12 * 150 === 1800 && 12 / (12 * 150 + 12) < 0.01,
    mistakes: () => 12 + 150 === 162 && 10 * 150 === 1500,
    uses: [12, 150],
  },
  "requirements-and-scope-writes-from-reads": {
    right: "About 20 writes per second, just within the limit",
    holds: () => 3000 / 150 === 20 && 3000 / 150 < 25,
    mistakes: () => 3000 * 150 === 450_000,
    uses: [3000, 150, 25],
  },
  "back-of-the-envelope-estimation-why-twelve": {
    right: "About 1 TB",
    holds: () => 80 * 12 === 960 && Math.round((80 * 12) / 1000) === 1,
    mistakes: () => 80 + 12 === 92 && Math.round(80 / 12) === 7,
    uses: [80, 12],
  },
  "back-of-the-envelope-estimation-faded-five-years": {
    right: "About 4 TB",
    holds: () => 2 * 5 * 365 === 3650 && Math.round((2 * 5 * 365) / 1000) === 4,
    mistakes: () => 2 * 5 === 10 && 2 * 365 === 730,
    uses: [2, 5],
  },
  "back-of-the-envelope-estimation-practice-1-v2": {
    right: "About 5 servers",
    holds: () => Math.ceil((((5e6 * 40) / 86_400) * 3) / (2000 * 0.7)) === 5,
    mistakes: () =>
      Math.ceil((5e6 * 40) / 86_400 / 2000) === 2 &&
      Math.round((((5e6 * 40) / 3600) * 3) / 1400 / 10) * 10 === 120,
    uses: [5, 40, 2000, 70],
  },
  "latency-throughput-and-tails-littles-law-1": {
    right: "About 100, so the pool runs out",
    holds: () => 400 * (250 / 1000) === 100 && 400 * (250 / 1000) > 80,
    mistakes: () => 400 * (50 / 1000) === 20 && 400 + 250 === 650 && 400 * 250 === 100_000,
    uses: [400, 50, 250, 80],
  },
  "latency-throughput-and-tails-why-subtract": {
    right: "About 5% of the time",
    holds: () => Math.abs(0.99 ** 5 - 0.951) < 0.001 && Math.round((1 - 0.951) * 100) === 5,
    mistakes: () => Math.round((0.951 * 100) / 5) * 5 === 95,
    uses: [5, 0.951],
  },
  "latency-throughput-and-tails-faded-twenty": {
    right: "About 20% of the time",
    holds: () => Math.round((1 - 0.99 ** 20) * 100) === 18 && Math.round(20 * 1) === 20,
    mistakes: () => 1 - 0.99 ** 100 > 0.63,
    uses: [20, 1],
  },
  "latency-throughput-and-tails-practice-3-v2": {
    right: "A little over half the time",
    holds: () => 1 - 0.98 ** 40 > 0.5 && 1 - 0.98 ** 40 < 0.6,
    mistakes: () => Math.round(40 * 2) === 80,
    uses: [40, 98],
  },
  "scaling-and-load-balancing-after-a-failure": {
    right: "About 96%, close to full",
    holds: () => Math.round((2400 / 5 / 500) * 100) === 96,
    mistakes: () => 2400 / 6 / 500 === 0.8 && 5 * 500 === 2500 && 5 * 500 > 2400,
    uses: [2400, 6, 500],
  },
  "scaling-and-load-balancing-faded-fleet": {
    right: "About 23 servers",
    holds: () => Math.ceil(8000 / (600 * 0.6)) === 23,
    mistakes: () =>
      Math.round((8000 * 0.6) / 600) === 8 &&
      Math.round(8000 / 600) === 13 &&
      Math.round(8000 / (600 * 0.4)) === 33,
    uses: [8000, 600, 60],
  },
  "caching-faded-latency": {
    right: "About 1.2 ms",
    holds: () => Math.abs(1 + (1 - 0.99) * 20 - 1.2) < 1e-9,
    mistakes: () => Math.floor((1 + 20) / 2) === 10 && 1 + 20 === 21,
    uses: [1, 20, 99],
  },
  "caching-practice-1-v2": {
    right: "About 85%",
    holds: () => Math.round((1 - 1500 / 10_000) * 100) === 85,
    mistakes: () =>
      (1500 / 10_000) * 100 === 15 && 10_000 * (1 - 0.5) === 5000 && Math.round(10_000 * (1 - 0.99)) === 100,
    uses: [1500, 10_000],
  },
  "databases-and-indexes-levels-for-hundred-million": {
    right: "About 4 levels",
    holds: () => {
      let levels = 0;
      while (100 ** levels < 100_000_000) levels += 1;
      return levels === 4;
    },
    mistakes: () => String(100_000_000).length - 1 === 8 && 100 ** 2 === 10_000,
    uses: [100, 100_000_000],
  },
  "databases-and-indexes-faded-scan-v2": {
    right: "About 300,000 pages",
    holds: () => 30_000_000 / 100 === 300_000 && 300_000 / 5 > 10_000,
    mistakes: () => 30_000_000 / 100 / 100 === 3000,
    uses: [30_000_000, 100],
  },
  "replication-and-partitioning-faded-keys": {
    right: "About a third of them",
    holds: () =>
      Array.from({ length: 24 }, (_, key) => key).filter((key) => key % 4 === key % 6).length / 24 === 1 / 3,
    uses: [24, 4, 6],
  },
  "replication-and-partitioning-shard-of-eleven": {
    right: "It moves, because dividing by 4 changes the remainder",
    holds: () => 11 % 3 === 2 && 11 % 4 === 3,
    uses: [11, 3, 4],
  },
  "replication-and-partitioning-practice-2-v2": {
    right: "Storage, which needs about 12 shards",
    holds: () =>
      Math.ceil(6000 / 500) === 12 &&
      Math.ceil(24_000 / 2500) === 10 &&
      24_000 / 12 / 2500 === 0.8,
    mistakes: () => Math.ceil(6000 / 500) + Math.ceil(24_000 / 2500) === 22,
    uses: [6, 500, 24_000, 2500],
  },
  "consistency-and-quorums-faded-read": {
    right: "4 replicas",
    holds: () => {
      let reads = 1;
      while (reads + 4 <= 7) reads += 1;
      return reads === 4 && 3 + 4 === 7 && 7 - 4 === 3;
    },
    uses: [7, 4],
  },
  "queues-and-event-streams-time-to-the-limit": {
    right: "About 50 minutes",
    holds: () => 90_000 / (130 - 100) / 60 === 50,
    mistakes: () =>
      Math.round(90_000 / (130 + 100) / 60) === 7 &&
      Math.round(90_000 / 130 / 60) === 12 &&
      90_000 / (130 - 100) === 3000,
    uses: [90_000, 130, 100],
  },
  "queues-and-event-streams-net-drain": {
    right: "By 40 messages per second",
    holds: () => 100 - 60 === 40,
    mistakes: () => 100 + 60 === 160,
    uses: [100, 60],
  },
  "queues-and-event-streams-faded-drain": {
    right: "About 4 minutes",
    holds: () => 9000 / (100 - 60) === 225 && Math.round(225 / 60) === 4,
    mistakes: () => 9000 / 100 === 90,
    uses: [9000, 100, 60],
  },
  "timeouts-retries-and-circuit-breakers-four-layers": {
    right: "About 540 per second, well over its limit",
    holds: () => 20 * 3 ** 3 === 540 && 540 > 300,
    mistakes: () => 20 * 3 === 60 && 20 * (3 + 3 + 3) === 180,
    uses: [3, 300, 20],
  },
  "timeouts-retries-and-circuit-breakers-faded-chain-v2": {
    right: "About 18 calls",
    holds: () => 3 * 2 * 3 === 18,
    mistakes: () => 3 + 2 + 3 === 8 && 3 * 3 * 3 === 27,
    uses: [3, 2],
  },
  "availability-and-redundancy-four-in-series": {
    right: "About 99.6%",
    holds: () => Math.round(0.999 ** 4 * 1000) / 10 === 99.6,
    uses: [99.9, 99.95],
  },
  "availability-and-redundancy-faded-series": {
    right: "The web tier and the database, since the pair adds almost no downtime",
    holds: () => {
      const pair = 1 - 0.001 * 0.001;
      return (
        1 - pair < (1 - 0.999) / 500 &&
        Math.round(0.999 * pair * 0.999 * 1000) / 10 === 99.8 &&
        Math.round(pair * 1e6) / 1e4 === 99.9999
      );
    },
    uses: [99.9, 99.9999],
  },
  "availability-and-redundancy-restore-time": {
    right: "About 4 hours",
    holds: () => Math.round(2_000_000 / 125 / 3600) === 4 && 2_000_000 / 125 / 3600 > 1,
    mistakes: () => Math.round(2000 / 60 / 5) * 5 === 35 && (125 * 3600) / 1000 === 450,
    uses: [2, 125, 1],
  },
  "observability-and-slos-fast-burn": {
    right: "About 2%",
    holds: () => Math.round(((14.4 * 1) / (30 * 24)) * 100) === 2 && Math.round(30 * 24 / 14.4) === 50,
    mistakes: () => Math.round((100 / 720) * 10) / 10 === 0.1,
    uses: [14.4, 30],
  },
  "observability-and-slos-even-pace-six": {
    right: "About 4,000 failures",
    holds: () => (20_000 * 6) / 30 === 4000,
    mistakes: () => 20_000 * 0.06 === 1200 && Math.round(20_000 / 6 / 100) * 100 === 3300,
    uses: [20_000, 6, 30],
  },
  "observability-and-slos-faded-burn": {
    right: "About twice as fast as an even pace",
    holds: () => 4000 / ((6000 * 10) / 30) === 2 && 30 / 2 === 15,
    uses: [6000, 4000, 10, 30],
  },
  "design-a-url-shortener-practice-1-v2": {
    right: "About 8 servers",
    holds: () => servers(60e6, 150) === 8 && servers(100e6, 100) === 9,
    mistakes: () => Math.round(9 * (60 / 100)) === 5 && Math.round(9 * (150 / 100)) === 14,
    uses: [100, 9, 60, 150],
  },
  "design-a-feed-and-review-hanging-rate": {
    right: "About 20 calls per second",
    holds: () => Math.round(200 * 0.1) === 20,
    mistakes: () => Math.round(200 * 0.9) === 180,
    uses: [200, 10],
  },
  "design-a-feed-and-review-faded-threads-v2": {
    right: "About 12 seconds",
    holds: () => (20 * 30) / (500 * 0.1) === 12,
    mistakes: () => Math.round(((20 * 30) / 500) * 10) / 10 === 1.2 && (20 * 30) / 10 === 60,
    uses: [20, 30, 500, 10],
  },
};
const words = (text: string) => text.split(/\s+/u).filter(Boolean).length;
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

  it("ends each lesson with three questions, of at least two types unless one was an estimate", () => {
    // These four lessons used to end on one sum and two choices. The sum is now a choice as well, so each
    // of them ends on three choices, and none ends on a question that asks for a computed number.
    const estimateLessons = new Set([
      "back-of-the-envelope-estimation",
      "latency-throughput-and-tails",
      "caching",
      "design-a-url-shortener",
    ]);
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      if (!estimateLessons.has(lesson.id))
        expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
      expect(types.filter((type) => type === "numeric"), lesson.id).toEqual([]);
    }
  });

  it("asks for no computed number", () => {
    expect(
      bundle.questions.filter((question) => kind(question) === "numeric").map((question) => question.id),
    ).toEqual([]);
    expect(
      bundle.flashcards.filter((card) => card.answerAuthority?.kind === "numeric").map((card) => card.id),
    ).toEqual([
      "sysd-back-of-the-envelope-estimation-card-1",
      "sysd-latency-throughput-and-tails-card-1",
      "sysd-replication-and-partitioning-card-2",
    ]);
  });

  it("keeps each converted estimate true to its figures", () => {
    expect(Object.keys(judged)).toHaveLength(33);
    for (const [id, entry] of Object.entries(judged)) {
      const question = questions.get(`sysd-${id}`);
      if (!question) throw new Error(id);
      expect(kind(question), id).toBe("choice");
      expect(question.answerAuthority.kind, id).toBe("text");
      if (question.answerAuthority.kind !== "text") continue;
      expect(question.answerAuthority.exampleAnswer, id).toBe(entry.right);
      expect(question.answerAuthority.acceptedIdeas, id).toEqual([entry.right]);
      expect(
        question.choices?.filter((choice) => choice.label === entry.right),
        id,
      ).toHaveLength(1);
      expect(entry.holds(), `${id} holds`).toBe(true);
      if (entry.mistakes) expect(entry.mistakes(), `${id} mistakes`).toBe(true);
      for (const number of entry.uses)
        expect(mentions(question.prompt, number), `${id} mentions ${number}`).toBe(true);
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
    // Figures quoted by the feedback and answers of the converted estimates.
    expect(0.99 ** 20).toBeCloseTo(0.818, 3);
    expect(1 - 0.99 ** 20).toBeCloseTo(0.182, 3);
    expect(0.98 ** 40).toBeCloseTo(0.446, 3);
    expect(1 / (500 - 400)).toBeCloseTo(0.01, 9);
    expect(1 / (500 - 480)).toBeCloseTo(0.05, 9);
    expect(((5e6 * 40) / 86_400) * 3).toBeCloseTo(6944, 0);
    expect(((5e6 * 40) / 86_400) * 3 / 4 / 2000).toBeCloseTo(0.868, 3);
    expect(12 / (12 + 12 * 150)).toBeLessThan(0.01);
    expect(1 / 720).toBeCloseTo(0.00139, 5);
    expect(100_000_000 / (100 * 100 * 100 * 100)).toBe(1);
    expect(2000 / 450).toBeGreaterThan(4);
    expect(10_000 * (1 - 0.99)).toBeCloseTo(100, 6);
    expect(1 + 0.01 * 20).toBeCloseTo(1.2, 9);
    expect(0.9999 * 0.999 * 100).toBeCloseTo(99.89, 2);
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
      for (const item of question.misconceptions ?? []) {
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
        expect(item.feedback.toLowerCase(), question.id).not.toContain(right[0]?.label.toLowerCase());
      }
      expect(words(question.onCorrect ?? ""), question.id).toBeLessThanOrEqual(45);
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
    expect(counts.numeric).toBe(0);
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
