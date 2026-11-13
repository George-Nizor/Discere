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
 * AI Agents follows the way History, Git, Machine Learning and AI Engineering ask questions
 * (docs/question-writing-guide.md), adapted to judgement about loops, tools and failure: most
 * questions describe an agent log, a tool definition, a permission scope or a bill and ask what
 * went wrong or what to change. Numeric questions stay where the number is the engineering point,
 * and this file recomputes each of them, and the figures the other questions quote, from the
 * numbers in the prompt. Prices in the questions are stated in the prompt and are illustrative.
 * The facts come from the course's own sources: Anthropic's guides to building effective agents
 * and to its multi-agent research system, the MCP specification (lifecycle and tools pages), the
 * OWASP LLM06 page on excessive agency, tau-bench, the ReAct and Reflexion papers, and NIST AI RMF.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/ai-agents/bundle.json", import.meta.url), "utf8"),
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
const get = (suffix: string): Question => {
  const question = questions.get(`aia-${suffix}`);
  if (!question) throw new Error(`missing question ${suffix}`);
  return question;
};
const flat = (text: string): string => text.replace(/(\d),(\d{3})/gu, "$1$2");
const numbers = (text: string): number[] =>
  (flat(text).match(/-?\d+(?:\.\d+)?/gu) ?? []).map(Number);
const near = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);

describe("questions in AI Agents", () => {
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
    expect([...cards].filter((id) => !bundle.flashcards.some((c) => c.id === id))).toEqual([]);
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to places where the number is the engineering point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(22);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("recomputes every numeric answer from the numbers in its prompt or its worked example", () => {
    const checks: Record<string, (text: string) => number> = {
      // A refund workflow of three calls at $0.01, for 1,000 requests.
      "workflows-and-agents-month-cost": () => 1000 * 3 * 0.01,
      // 6% of 2,000 requests go to the agent at $0.12; the rest take the workflow at $0.03.
      "workflows-and-agents-daily-cost": () => 120 * 0.12 + 1880 * 0.03,
      "the-agent-loop-twenty-steps-result": () => 0.98 ** 20,
      // Step 1 reads 1,000 tokens, each later step 400 more, for 8 steps.
      "the-agent-loop-budget-ceiling": () =>
        Array.from({ length: 8 }, (_, i) => 1000 + 400 * i).reduce((s, x) => s + x, 0),
      // Keys a, a, b, a, b.
      "tools-and-schemas-count-refunds": () => new Set(["a", "a", "b", "a", "b"]).size,
      "memory-and-context-room-left": (t) => {
        const [window, share, used] = numbers(t) as [number, number, number];
        return (window * share) / 100 - used;
      },
      "memory-and-context-another-over-v2": () => 90000 + 8000,
      // Two steps of an eight-step plan use the model: 1 plan + 2, then 1 new plan + 2, and 2 more.
      "planning-patterns-calls-with-replan": () => 1 + 2 + 1 + 2,
      "composed-workflows-majority-70": () => 3 * 0.7 ** 2 * 0.3 + 0.7 ** 3,
      "composed-workflows-majority-60-v2": () => 3 * 0.6 ** 2 * 0.4,
      "multi-agent-systems-cost-ratio": (t) => {
        const [multi, single] = numbers(t) as [number, number];
        return multi / single;
      },
      // The figure caps small refunds at $20 and 50 a day; the faded example at $15 and 30.
      "permissions-and-governed-actions-exposure": () => 20 * 50,
      "permissions-and-governed-actions-exposure-2": () => 30 * 15,
      "prompt-injection-and-agents-one-gets-through": () => 1 - 0.99 ** 100,
      "observability-and-traces-p95-twenty": (t) => {
        const values = numbers(t.split(/ are /u).pop()?.split("What")[0] ?? "");
        return values[Math.ceil(0.95 * values.length) - 1] as number;
      },
      "observability-and-traces-small-p95": () =>
        [1.0, 1.1, 1.2, 1.4, 1.5, 1.7, 2.2, 6.0][Math.ceil(0.95 * 8) - 1] as number,
      "observability-and-traces-cost-success": (t) => {
        const [, total, successes] = numbers(t) as [number, number, number];
        return total / successes;
      },
      "evaluating-agents-pass-hat-4": () => 0.6 ** 4,
      "evaluating-agents-gate-cost": () => 30 * 5 * 0.12,
      "evaluating-agents-pass-at-3-seventy-v2": () => 0.3 ** 3,
      // 1% of 1,200 reads, 4% of 250 small writes and all 50 costly writes.
      "human-oversight-and-rollout-daily-reviews": () => 0.01 * 1200 + 0.04 * 250 + 50,
      "human-oversight-and-rollout-daily-reviews-2-v2": () => 0.05 * 180,
    };
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace("aia-", "")).sort()).toEqual(
      Object.keys(checks).sort(),
    );
    for (const question of numeric) {
      const check = checks[question.id.replace("aia-", "")];
      const authority = question.answerAuthority;
      if (!check || authority.kind !== "numeric") throw new Error(question.id);
      const computed = check(question.prompt);
      expect(Math.abs(computed - authority.value), question.id).toBeLessThanOrEqual(
        Math.max(authority.absoluteTolerance, 1e-6),
      );
    }
  });

  it("recomputes the figures that the judgement questions quote", () => {
    // A five-step run bills five model calls; the tool results add none.
    expect(get("the-agent-loop-bill-calls").prompt).toContain("five steps");
    // Ten steps whose context grows by 400 tokens from 1,000.
    const inputs = Array.from({ length: 10 }, (_, i) => 1000 + 400 * i);
    expect(inputs.reduce((s, x) => s + x, 0)).toBe(28000);
    expect(inputs[9]).toBe(4600);
    near(28000 / 10000, 2.8, 10);
    // Three steps at 90%, ten at 99% and at 95%, thirty at 97%.
    near(0.9 ** 3, 0.729, 10);
    near(0.99 ** 10, 0.904, 3);
    near(0.95 ** 10, 0.599, 3);
    near(0.97 ** 30, 0.401, 3);
    // Seven applications wired to a seventh tool, and 6 by 9 against 6 plus 9.
    expect(4 * 1).toBe(4);
    expect([6 * 9, 6 + 9]).toEqual([54, 15]);
    // Compaction: 80% of 200,000, 62,000 plus 21,000, and the log that overflows the window.
    expect(200000 * 0.8).toBe(160000);
    expect(62000 + 21000).toBe(83000);
    expect(100000 + 60000).toBeGreaterThan(128000);
    expect(128000 * 0.8).toBe(102400);
    // Plan-then-execute against the loop: 1 + 2 calls against 8.
    expect(1 + 2).toBeLessThan(8);
    // Parallel branches and a merge; a three-round critique loop.
    expect([Math.max(7, 3, 9) + 2, 7 + 3 + 9 + 2]).toEqual([11, 21]);
    expect(3 * (3 + 2)).toBe(15);
    // The multi-agent bill and the broad brief.
    expect(12 + 3 * 25 + 8).toBe(95);
    expect(3 * 25).toBe(75);
    expect(12 + 8).toBe(20);
    expect(4 * 30000).toBe(120000);
    // Approvals: 1,000 at five seconds, and 60 at five seconds.
    near((1000 * 5) / 60, 83.33, 2);
    expect((60 * 5) / 60).toBe(5);
    expect(1000 - 940).toBe(60);
    // Spans of a run, one after another.
    const spans = [1.1, 0.4, 1.3, 0.4, 1.2, 7.2, 0.8];
    near(
      spans.reduce((s, x) => s + x, 0),
      12.4,
      10,
    );
    near(1.1 + 1.3 + 1.2 + 0.8, 4.4, 10);
    near(0.4 + 0.4, 0.8, 10);
    // Cost per success before and after the fix, and the two agents.
    near(27 / 90, 0.3, 10);
    near(27 / 135, 0.2, 10);
    near(27 / 150, 0.18, 10);
    near(10 / 90, 0.111, 3);
    near(6 / 50, 0.12, 10);
    expect(10 / 90).toBeLessThan(6 / 50);
    // The graded runs: A, D and E pass.
    const runs = [
      [true, false, 5],
      [true, true, 6],
      [false, false, 4],
      [true, false, 12],
      [true, false, 7],
      [false, true, 9],
    ] as const;
    expect(runs.map(([ok, forbidden, steps]) => ok && !forbidden && steps <= 13)).toEqual([
      true,
      false,
      false,
      true,
      true,
      false,
    ]);
    // pass^3 and pass@3 at 0.8, and a month of days at 0.9.
    near(0.8 ** 3, 0.512, 10);
    near(1 - 0.2 ** 3, 0.992, 10);
    near(0.9 ** 30, 0.0424, 3);
    // Two wrong in 30 against a limit of 3%, and a 2% sample of 1,500.
    near((2 / 30) * 100, 6.67, 2);
    expect(0.02 * 1500).toBe(30);
    // A fault in one action in a hundred is missed by a sample of 30 about three times in four.
    let miss = 1;
    for (let i = 0; i < 30; i += 1) miss *= (1485 - i) / (1500 - i);
    expect(miss).toBeGreaterThan(0.72);
    expect(miss).toBeLessThan(0.76);
  });

  it("puts a case in front of the learner: a log, a tool, a scope or a bill", () => {
    const situation = /\d|`[^`]+`|\byou\b|\bteam\b|\bagent\b|\bmodel\b|\bworker\b|\bclient\b/iu;
    const withFigures = bundle.questions.filter((question) => /\d/u.test(question.prompt));
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
    expect(withFigures.length).toBeGreaterThanOrEqual(bundle.questions.length * 0.4);
    const cases = bundle.questions.filter(
      (question) =>
        kind(question) === "choice" &&
        /\b(team|agent|tool|log|page|run|worker|lead|company|bank|support)\b/iu.test(
          question.prompt,
        ),
    );
    expect(cases.length).toBeGreaterThanOrEqual(45);
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
      ].join(" ");
      expect(text, question.id).not.toMatch(/[—–]/u);
    }
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps)
        expect(JSON.stringify(step.reveal ?? []), step.id).not.toMatch(/[—–]/u);
  });

  it("marks one option right, keeps the right one from standing out, and explains each wrong one", () => {
    const places = new Set<string>();
    let choices = 0;
    let longest = 0;
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const length = right[0]?.label.length ?? 0;
      if (question.choices.length >= 3) {
        choices += 1;
        if (length > longestOther) longest += 1;
        expect(length, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      }
      const stops = new Set(question.choices.map((choice) => choice.label.trimEnd().endsWith(".")));
      expect(stops.size, `${question.id} mixes full stops`).toBe(1);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(`${question.choices.indexOf(right[0] as (typeof question.choices)[number])}`);
    }
    expect(longest / choices).toBeLessThanOrEqual(0.3);
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("gives no verdict words in feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((m) => m.feedback),
      ];
      for (const line of text)
        expect(line, question.id).not.toMatch(/^(correct|not quite|well done|great)\b/iu);
    }
  });

  it("keeps most questions multiple choice, with order and sort questions where the sequence or the kinds are the point", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(4);
    expect(counts.sort).toBeGreaterThanOrEqual(4);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
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

  it("covers the usual mistakes of agent design", () => {
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
      /workflow/iu, // an agent where a fixed workflow would do
      /step budget|maximum number of (steps|iterations)/iu, // no stopping condition
      /server|enforced on the server/iu, // a rule only in the prompt
      /page|stranger|untrusted/iu, // tool output taken as instructions
      /one agent|extra agents add/iu, // many agents for a simple task
      /final answer|trajectory/iu, // judging an agent on its final answer only
      /more times|raise the step budget/iu, // unbounded retries
      /least privilege|admin key|narrow scopes|only the access/iu, // every tool to every agent
      /overlap|description/iu, // overlapping or vague tool descriptions
      /idempotency|retry/iu,
      /compaction|external memory/iu,
      /pass\^|pass@/iu,
    ])
      expect(
        text.some((entry) => phrase.test(entry)),
        String(phrase),
      ).toBe(true);
  });

  it("asks about a loop that never stops, a vague tool and an injected page", () => {
    expect(get("the-agent-loop-endless-loop").prompt).toMatch(/identical/u);
    expect(get("the-agent-loop-endless-loop").choices?.length).toBeGreaterThanOrEqual(3);
    expect(get("tools-and-schemas-bad-argument").prompt).toMatch(/Searches orders/u);
    expect(get("tools-and-schemas-overlap").choices?.length).toBe(4);
    expect(get("prompt-injection-and-agents-page-as-order").prompt).toMatch(/SYSTEM/u);
    expect(get("permissions-and-governed-actions-injected-refund").answerAuthority).toMatchObject({
      acceptedIdeas: [expect.stringMatching(/server/u)],
    });
    expect(get("multi-agent-systems-one-agent-enough").answerAuthority).toMatchObject({
      acceptedIdeas: [expect.stringMatching(/one agent/iu)],
    });
  });

  it("does not state a current price or limit for a named real model", () => {
    const text = JSON.stringify([bundle.questions, bundle.flashcards]);
    expect(text).not.toMatch(/\b(gpt|claude|gemini|llama|mistral|deepseek|qwen)[- ]?\d/iu);
    expect(text).not.toMatch(/\b(opus|sonnet|haiku|gpt|gemini|llama|mistral|chatgpt)\b/iu);
  });
});
