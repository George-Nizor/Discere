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
 * AI Engineering follows the way History, Git and Machine Learning ask questions
 * (docs/question-writing-guide.md), adapted to judgement about building on language models: most
 * questions describe a prompt, a pipeline, an evaluation or a bill and ask what to change or what
 * the result shows. Every question asks for a judgement and none for an exact figure, since a
 * calculator or a spreadsheet does that in practice, and this file recomputes the figures behind
 * each judgement, and the figures the other questions quote, from the numbers in the prompt.
 * Prices in the questions are stated in the prompt and are illustrative. The facts come
 * from the course's own sources: the providers' documentation (prompt caching, tool use), the
 * OWASP LLM01 page, Zheng et al. on judge bias, Husain on evaluation, Anthropic's guide to
 * building agents, Lewis et al. on retrieval and Liu et al. on position in long contexts.
 */
const bundle = JSON.parse(
  readFileSync(new URL("../../../content/ai-engineering/bundle.json", import.meta.url), "utf8"),
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
  const question = questions.get(`aie-${suffix}`);
  if (!question) throw new Error(`missing question ${suffix}`);
  return question;
};
const near = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);
const softmax = (logits: number[], temperature = 1): number[] => {
  const e = logits.map((x) => Math.exp(x / temperature));
  const sum = e.reduce((s, x) => s + x, 0);
  return e.map((x) => x / sum);
};
const cosine = (a: number[], b: number[]): number => {
  const dot = a.reduce((s, x, i) => s + x * (b[i] as number), 0);
  const len = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return dot / (len(a) * len(b));
};
const cost = (input: number, output: number, pin: number, pout: number): number =>
  (input * pin + output * pout) / 1_000_000;
const kappa = (both: number, neither: number, judgeOnly: number, humanOnly: number): number => {
  const n = both + neither + judgeOnly + humanOnly;
  const po = (both + neither) / n;
  const pj = (both + judgeOnly) / n;
  const ph = (both + humanOnly) / n;
  const pe = pj * ph + (1 - pj) * (1 - ph);
  return (po - pe) / (1 - pe);
};

describe("questions in AI Engineering", () => {
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
    expect(numeric.length).toBeLessThanOrEqual(25);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("recomputes any numeric answer from the numbers in its prompt", () => {
    // Every question is asked as a judgement now, so nothing is left to recompute here. The figures
    // behind each judgement are recomputed in the next test. A numeric question added later needs
    // an entry in this table.
    const checks: Record<string, (text: string) => number> = {};
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace("aie-", "")).sort()).toEqual(
      Object.keys(checks).sort(),
    );
    for (const question of numeric) {
      const check = checks[question.id.replace("aie-", "")];
      const authority = question.answerAuthority;
      if (!check || authority.kind !== "numeric") throw new Error(question.id);
      const computed = check(question.prompt);
      expect(Math.abs(computed - authority.value), question.id).toBeLessThanOrEqual(
        Math.max(authority.absoluteTolerance, 1e-6),
      );
    }
  });

  it("recomputes the figures behind the questions that ask for a judgement and not a number", () => {
    // A request of 3,000 input and 1,000 output tokens: the output costs two thirds more.
    near(cost(3000, 0, 3, 0), 0.009, 10);
    near(cost(0, 1000, 0, 15), 0.015, 10);
    near(cost(0, 1000, 0, 15) / cost(3000, 0, 3, 0), 1.667, 3);
    // 1,000 input and 400 output tokens, 50,000 requests a month: $450, two thirds of it output.
    near(50_000 * cost(1000, 400, 3, 15), 450, 8);
    near(cost(0, 400, 0, 15) / cost(1000, 400, 3, 15), 0.667, 3);
    near(400 / 1400, 0.286, 3);
    near(15 / 18, 0.833, 3);
    // Logits 2, 2 and 0.
    near(softmax([2, 2, 0])[0] as number, 0.468, 3);
    near(softmax([2, 2, 0])[2] as number, 0.063, 3);
    // Temperature 0.5 on 2, 1 and 0: the leader goes from 0.665 to 0.867.
    near(softmax([2, 1, 0])[0] as number, 0.665, 3);
    near(softmax([2, 1, 0], 0.5)[0] as number, 0.867, 3);
    near(Math.exp(4), 54.6, 1);
    // Five examples of 120 tokens on 20,000 requests a day: 12 million tokens and $36 a day.
    expect(5 * 120 * 20_000).toBe(12_000_000);
    near((5 * 120 * 20_000 * 3) / 1_000_000, 36, 8);
    near(((5 * 120 * 20_000 * 3) / 1_000_000) * 30, 1080, 6);
    // Three examples on 40,000 requests a day: 1.2 times the cost.
    near(((3 * 120 * 40_000 * 3) / 1_000_000) * 30, 1296, 6);
    near((3 * 120 * 40_000) / (5 * 120 * 20_000), 1.2, 8);
    // Up to four attempts at 0.7, and two at 0.9.
    near(1 - 0.3 ** 4, 0.9919, 4);
    near(0.3 ** 4, 0.0081, 4);
    expect(4 * 0.7).toBeCloseTo(2.8, 10);
    near(0.1 ** 2, 0.01, 10);
    near(0.9 + 0.9, 1.8, 10);
    // (1, 2, 2) and (2, 0, 1): dot product 4, lengths 3 and the square root of 5.
    expect(1 * 2 + 2 * 0 + 2 * 1).toBe(4);
    near(Math.sqrt(5), 2.236, 3);
    near(cosine([1, 2, 2], [2, 0, 1]), 0.596, 3);
    near(4 / (3 + Math.sqrt(5)), 0.764, 3);
    near(4 / (9 + 5), 0.286, 3);
    // The query (1, 1) against d1, d2 and d3, by cosine and by angle.
    near(cosine([1, 1], [2, 1]), 0.949, 3);
    near(cosine([1, 1], [1, 3]), 0.894, 3);
    near(cosine([1, 1], [3, 0]), 0.707, 3);
    const degrees = (v: [number, number]) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
    near(Math.abs(45 - degrees([2, 1])), 18.4, 1);
    near(Math.abs(45 - degrees([1, 3])), 26.6, 1);
    near(Math.abs(45 - degrees([3, 0])), 45, 6);
    expect(Math.hypot(1, 3)).toBeGreaterThan(Math.hypot(3, 0));
    expect(Math.hypot(3, 0)).toBeGreaterThan(Math.hypot(2, 1));
    // 3,000 tokens in 600-token chunks with 200 overlap: stride 400 and 7 chunks, against 5.
    expect(Math.ceil((3000 - 200) / (600 - 200))).toBe(7);
    expect(3000 / 600).toBe(5);
    expect(3000 / 200).toBe(15);
    // Ranks 1, 3 and 2, and the two moves up one place.
    const mrr = (ranks: number[]) => ranks.reduce((s, r) => s + 1 / r, 0) / ranks.length;
    near(mrr([1, 3, 2]), 0.611, 3);
    near(mrr([1, 2, 2]) - mrr([1, 3, 2]), 0.0556, 4);
    near(mrr([1, 3, 1]) - mrr([1, 3, 2]), 0.1667, 4);
    near(1 - 1 / 2, 0.5, 10);
    near(1 / 2 - 1 / 3, 0.1667, 4);
    // Recall at 5 for ranks 1, 2, 4, 6 and a miss.
    expect([1, 2, 4, 6].filter((rank) => rank <= 5).length / 5).toBeCloseTo(0.6, 10);
    // The window of 12,000 tokens, and the 8,000-token window with a reserve of 800 and of 1,500.
    expect(12000 - 600 - 200 - 1200).toBe(10000);
    expect(Math.floor(10000 / 750)).toBe(13);
    expect(13 * 750).toBe(9750);
    near((12000 - 800) / 750, 14.93, 2);
    expect(12000 / 750).toBe(16);
    expect(Math.floor((8000 - 500 - 100 - 800) / 500)).toBe(13);
    expect(Math.floor((8000 - 500 - 100 - 1500) / 500)).toBe(11);
    near(700 / 6600, 0.106, 3);
    // 27 of 30 cases and 140 of 200.
    const se = (passes: number, n: number) => Math.sqrt(((passes / n) * (1 - passes / n)) / n);
    near(se(27, 30), 0.0548, 4);
    near(1.96 * se(27, 30), 0.107, 3);
    near(1.96 * se(34, 40), 0.111, 3);
    near(se(140, 200), 0.0324, 4);
    near(1.96 * se(140, 200), 0.0635, 4);
    near(2 * 1.96 * se(140, 200), 0.127, 3);
    near(1.96 * se(28, 40), 0.142, 3);
    // Kappa for 55 and 25 agreements, and chance agreement for 45, 35, 10 and 10.
    near(kappa(55, 25, 15, 5), 0.565, 3);
    near(0.7 * 0.6 + 0.3 * 0.4, 0.54, 10);
    near((0.8 - 0.54) / (1 - 0.54), 0.565, 3);
    near(0.8 - 0.54, 0.26, 10);
    near(0.55 * 0.55 + 0.45 * 0.45, 0.505, 10);
    near(0.55 * 0.55, 0.3025, 10);
    near(kappa(45, 35, 10, 10), 0.596, 3);
    // The attack: 16 million input tokens at $48 and 1 million output tokens at $15.
    expect(2000 * 8000).toBe(16_000_000);
    near(cost(2000 * 8000, 0, 3, 0), 48, 8);
    near(cost(0, 2000 * 500, 0, 15), 15, 8);
    near((16 * 3) / (1 * 15), 3.2, 8);
    // 450 tokens at 75 a second after 0.6 s.
    near(450 / 75, 6, 10);
    near(450 / 75 / 0.6, 10, 8);
    near(0.6 + 450 / 75, 6.6, 10);
    // 1,200 of 1,500 tokens cached at a tenth of the price: $450 falls to $126, a saving of 72%.
    const uncached = 100_000 * cost(1500, 0, 3, 0);
    const cached = 100_000 * (cost(300, 0, 3, 0) + cost(1200, 0, 3, 0) * 0.1);
    near(uncached, 450, 8);
    near(cached, 126, 8);
    near(1 - cached / uncached, 0.72, 8);
    near(cached / uncached, 0.28, 8);
    near(1200 / 1500, 0.8, 10);
    // A rank-4 adapter on a 3072 x 3072 matrix, and 32 rank-8 adapters on 4096 x 4096 matrices.
    expect(4 * (3072 + 3072)).toBe(24576);
    expect(3072 * 3072).toBe(9_437_184);
    near(9_437_184 / 24576, 384, 6);
    expect(3072 * 4).toBe(12288);
    expect(8 * (4096 + 4096)).toBe(65536);
    expect(32 * 65536).toBe(2_097_152);
    expect(32 * 4096 * 4096).toBe(536_870_912);
    near(2_097_152 / 536_870_912, 0.0039, 4);
    // The gate on 60 cases: a baseline of 51, one lost case and two lost cases.
    near(0.85 * 60, 51, 8);
    near(1 / 60, 0.0167, 4);
    near(2 / 60, 0.0333, 4);
    expect(1 / 60).toBeLessThanOrEqual(0.03);
    expect(2 / 60).toBeGreaterThan(0.03);
    near(0.03 * 60, 1.8, 10);
    // The review cards: retries at 0.9, kappa from 0.80 and 0.58, and routing 70% to a tenth.
    near(0.1 ** 3, 0.001, 10);
    near((0.8 - 0.58) / (1 - 0.58), 0.524, 3);
    near(0.7 * 0.1 + 0.3, 0.37, 10);
  });

  it("recomputes the figures that the judgement questions quote", () => {
    // Code is cut into more tokens than English: 2,400 characters at four per token is 600.
    expect(2400 / 4).toBe(600);
    expect(Math.round((2400 / 900) * 10) / 10).toBe(2.7);

    // Five turns and ten turns of a chat that resends its history.
    const input = (n: number) => 500 + 300 * (n - 1) + 100;
    const total = (turns: number) =>
      Array.from({ length: turns }, (_, i) => input(i + 1)).reduce((s, x) => s + x, 0);
    expect([total(5), total(10)]).toEqual([6000, 19500]);
    expect(cost(19500, 0, 3, 0)).toBeCloseTo(0.0585, 10);
    expect(cost(6000, 0, 3, 0)).toBeCloseTo(0.018, 10);
    expect(get("tokens-and-context-ten-turns-budget").prompt).toContain("6,000");
    expect(get("tokens-and-context-ten-turns-budget").prompt).toContain("19,500");

    // The window left after a long prompt.
    expect(8000 - 7300).toBe(700);

    // Probabilities at temperatures 1, 2 and 0.5 for the scores 2, 1 and 0.
    const round = (xs: number[]) => xs.map((x) => Math.round(x * 1000) / 1000);
    expect(round(softmax([2, 1, 0]))).toEqual([0.665, 0.245, 0.09]);
    expect(round(softmax([2, 1, 0], 2))).toEqual([0.506, 0.307, 0.186]);
    expect(round(softmax([2, 1, 0], 0.5))).toEqual([0.867, 0.117, 0.016]);
    expect(get("how-a-model-predicts-varied-ideas").prompt).toContain("0.506, 0.307 and 0.186");
    expect(get("how-a-model-predicts-settings-stack").prompt).toContain("0.867, 0.117 and 0.016");

    // Top-p 0.85 and 0.9 keep different numbers of tokens.
    const kept = (probs: number[], p: number) => {
      let sum = 0;
      let count = 0;
      for (const x of probs) {
        sum += x;
        count += 1;
        if (sum >= p - 1e-9) break;
      }
      return count;
    };
    expect(kept([0.665, 0.245, 0.09], 0.85)).toBe(2);
    expect(kept([0.867, 0.117, 0.016], 0.85)).toBe(1);
    expect([kept([0.95, 0.03, 0.02], 0.9), kept([0.35, 0.3, 0.2, 0.15], 0.9)]).toEqual([1, 4]);
    expect(0.35 + 0.3 + 0.2).toBeCloseTo(0.85, 10);

    // Version C against version A.
    expect(14 + 5 - 3).toBe(16);
    expect(20 - 14).toBe(6);

    // The long article and the short question have the same direction.
    expect(cosine([1, 2], [2.5, 5])).toBeCloseTo(1, 10);
    expect(2.5 + 10).toBe(12.5);

    // Exact search over 20 million vectors of 768 numbers.
    expect(20_000_000 * 768).toBe(15_360_000_000);

    // Reciprocal rank fusion for a document at 1st and 40th, and one at 4th in both.
    const rrf = (...ranks: number[]) => ranks.reduce((s, r) => s + 1 / (60 + r), 0);
    expect(rrf(1, 40)).toBeCloseTo(0.0264, 4);
    expect(Math.round(rrf(4, 4) * 10000) / 10000).toBe(0.0313);
    expect(rrf(4, 4)).toBeGreaterThan(rrf(1, 40));
    expect(1 / 61).toBeCloseTo(0.0164, 4);
    expect(1 / 100).toBeCloseTo(0.01, 10);

    // A split rule: 500-token chunks with a 100-token overlap store 20% more.
    expect(4 * 500 + 400).toBe(2400);
    expect(2400 / 2000).toBeCloseTo(1.2, 10);

    // The budget of a RAG prompt.
    const left = 8000 - 500 - 100 - 800;
    expect(left).toBe(6600);
    expect(Math.floor(left / 700)).toBe(9);
    expect(10 * 700).toBe(7000);

    // The interval of 34 of 40 and the position of 37 of 40 within it.
    const wald = (passes: number, n: number) => {
      const p = passes / n;
      const half = 1.96 * Math.sqrt((p * (1 - p)) / n);
      return [p - half, p + half];
    };
    const [low, high] = wald(34, 40) as [number, number];
    expect([Math.round(low * 100), Math.round(high * 100)]).toEqual([74, 96]);
    expect(37 / 40).toBeGreaterThan(low);
    expect(37 / 40).toBeLessThan(high);
    expect(Math.round(Math.sqrt((0.85 * 0.15) / 40) * 1000) / 1000).toBe(0.056);

    // The width of an interval falls with the square root of the cases.
    expect(Math.sqrt(40 / 80)).toBeCloseTo(0.707, 3);
    expect(Math.sqrt(40 / 160)).toBeCloseTo(0.5, 10);

    // A judge that passes everything against humans who pass 70%.
    expect(kappa(70, 0, 30, 0)).toBeCloseTo(0, 10);
    expect(0.7 * 1 + 0.3 * 0).toBeCloseTo(0.7, 10);

    // Retries when 20% of inputs never succeed.
    expect(1 - 0.1 ** 3).toBeCloseTo(0.999, 10);
    expect(0.8 * 0.999).toBeCloseTo(0.7992, 10);

    // The bill of 250,000 requests of 800 input and 300 output tokens.
    expect(250_000 * cost(800, 300, 3, 15)).toBeCloseTo(1725, 8);
    expect(250_000 * cost(800, 0, 3, 0)).toBeCloseTo(600, 8);
    expect(250_000 * cost(0, 300, 0, 15)).toBeCloseTo(1125, 8);
    expect(250_000 * cost(0, 100, 0, 15)).toBeCloseTo(375, 8);
    expect(250_000 * cost(200, 0, 3, 0)).toBeCloseTo(150, 8);

    // Streaming leaves the total at 6.4 seconds.
    expect(0.4 + 300 / 50).toBeCloseTo(6.4, 10);

    // Routing 70% of requests to a model at a tenth of the cost.
    expect(0.7 * 0.1 + 0.3).toBeCloseTo(0.37, 10);

    // A rank-16 adapter on a 1,024 x 4,096 matrix.
    expect(16 * (1024 + 4096)).toBe(81_920);
    expect(Math.round(((16 * (1024 + 4096)) / (1024 * 4096)) * 10000) / 100).toBe(1.95);

    // The gate: falls against a limit of 0.03.
    expect(Math.round((0.85 - 0.8) * 100) / 100).toBe(0.05);
    expect(38 - 5 + 1).toBe(34);
    expect(Math.round((38 / 40 - 34 / 40) * 100) / 100).toBe(0.1);
    expect(Math.round((0.9 - 35 / 40) * 1000) / 1000).toBe(0.025);
    expect(Math.round((1 / 40) * 1000) / 1000).toBe(0.025);
    expect(0.025).toBeLessThan(0.03);

    // Attack cost used in the feedback of the unbounded consumption question.
    expect(2000 * cost(8000, 500, 3, 15)).toBeCloseTo(63, 8);
  });

  it("puts a case in front of the learner: a prompt, a pipeline, a result or a bill", () => {
    const situation = /\d|`[^`]+`|\byou\b|\bteam\b|\bmodel\b|\bassistant\b|\bchat\b|\bservice\b/iu;
    const withFigures = bundle.questions.filter((question) => /\d/u.test(question.prompt));
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.8);
    expect(withFigures.length).toBeGreaterThanOrEqual(bundle.questions.length * 0.6);
    const cases = bundle.questions.filter(
      (question) =>
        kind(question) === "choice" &&
        /\b(team|developer|service|chat|assistant|chatbot|pipeline|tool|search|prompt|colleague|teammate)\b/iu.test(
          question.prompt,
        ),
    );
    expect(cases.length).toBeGreaterThanOrEqual(35);
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
      choices += 1;
      if (length > longestOther) longest += 1;
      expect(length, question.id).toBeLessThanOrEqual(longestOther * 1.15);
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

  it("covers the usual mistakes: a bigger model first, one eval run, tuning on the test set, a judge as ground truth, injection, temperature 0 and stuffing the context", () => {
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
      /larger model|larger judge|larger embedding/iu,
      /golden set|held apart|tuned on/iu,
      /position bias|both orders|swaps? the order/iu,
      /kappa/iu,
      /indirect injection|fetched content|web page/iu,
      /least privilege|read-only|tools? (the|that) task does not need|send-email/iu,
      /maximum number of steps/iu,
      /temperature to 0|lower(s|ing)? the temperature/iu,
      /paste all the regulations|whole library/iu,
      /permission/iu,
      /cache/iu,
      /parameter/iu,
      /pinned|pinning|the pin\b/iu,
      /flipped|flips/iu,
    ])
      expect(
        text.some((entry) => phrase.test(entry)),
        String(phrase),
      ).toBe(true);
  });

  it("asks about a tool loop that never ends, retrieval that returns the wrong chunk and a permission filter", () => {
    expect(get("structured-output-and-tools-endless-loop").choices?.length).toBeGreaterThanOrEqual(
      3,
    );
    const example = (id: string): string => {
      const authority = get(id).answerAuthority;
      return authority.kind === "text" ? authority.exampleAnswer : "";
    };
    expect(example("rag-pipeline-salary-leak")).toMatch(/permissions/u);
    expect(example("retrieval-and-chunking-split-rule")).toMatch(/overlap/u);
    expect(get("rag-pipeline-sort-failures").sort?.items).toHaveLength(6);
  });

  it("does not state a current price or limit for a named real model", () => {
    const text = JSON.stringify(bundle.questions);
    expect(text).not.toMatch(/\b(gpt|claude|gemini|llama|mistral)[- ]?\d/iu);
    expect(text).not.toMatch(/\b(opus|sonnet|haiku)\b/iu);
  });
});
