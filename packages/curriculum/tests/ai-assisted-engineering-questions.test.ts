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
 * AI-Assisted Engineering and Code Review follows the way History, Git, AI Engineering and AI Agents
 * ask questions (docs/question-writing-guide.md), adapted to judgement about generated code: most
 * questions show a short diff, a function, a log or a search result and ask what a reviewer should
 * catch or what makes a workflow safe. The code in the questions was run, and this file reruns the
 * same logic in TypeScript so that each shown result and each numeric answer is recomputed from the
 * code or the numbers in the prompt. The questions about rates, shares and counts ask for a judgement,
 * such as how far an acceptance rate sits below what reached the codebase, and the figures behind each
 * of those answers are recomputed from the scenario. The course's own sources are Anthropic's best-practice guide for
 * Claude Code, the AGENTS.md convention, Google's code review guide, the OWASP Top 10 and cheat
 * sheets, NIST SSDF, Pro Git, DORA, the METR trial, Pearce et al. and NIST AI RMF.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/ai-assisted-engineering/bundle.json", import.meta.url),
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
const get = (suffix: string): Question => {
  const question = questions.get(`aiae-${suffix}`);
  if (!question) throw new Error(`missing question ${suffix}`);
  return question;
};
const rightLabel = (suffix: string): string | undefined => {
  const question = get(suffix);
  const authority = question.answerAuthority;
  if (authority.kind !== "text") throw new Error(suffix);
  return question.choices?.find((choice) => assessTextAnswer(choice.label, authority).correct)
    ?.label;
};
const near = (a: number, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits);
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

// The code shown in the questions, rewritten with the behaviour Python gave when it was run.
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
const buggySlugify = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/gu, "-");
const isLeap = (year: number): boolean => year % 4 === 0;
const trueLeap = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const page = (items: number[], p: number, size: number): number[] =>
  items.slice(p * size, (p + 1) * size);
const myMax = (xs: number[]): number => {
  let m = 0;
  for (const x of xs) if (x > m) m = x;
  return m;
};
const myMin = (xs: number[]): number => {
  let m = 100;
  for (const x of xs) if (x < m) m = x;
  return m;
};
const pySum = (items: (number | string)[]): number => {
  let total = 0;
  for (const item of items) {
    if (typeof item === "string") throw new TypeError("unsupported operand type(s) for +");
    total += item;
  }
  return total;
};
const billingTotal = (items: (number | string)[]): number => {
  try {
    return pySum(items);
  } catch {
    return 0;
  }
};
const mutants: [string, (year: number) => boolean][] = [
  ["year % 8 == 0", (y) => y % 8 === 0],
  ["year % 2 == 0", (y) => y % 2 === 0],
  ["year % 4 != 0", (y) => y % 4 !== 0],
  ["year % 4 == 1", (y) => y % 4 === 1],
  ["True", () => true],
];
const killed = (f: (year: number) => boolean): boolean => f(2024) !== true || f(2023) !== false;

describe("questions in AI-Assisted Engineering and Code Review", () => {
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

  it("gives every question two hints, and three to a calculation", () => {
    for (const question of bundle.questions) {
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
      if (kind(question) === "numeric") expect(question.hints.length, question.id).toBe(3);
    }
  });

  it("keeps numeric questions to places where the number carries a decision", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(15);
  });

  it("recomputes every numeric answer from the numbers or the code in its prompt", () => {
    const checks: Record<string, (text: string) => number> = {
      // Matches per module: config.py 2, billing.py 3, mail.py 1. The claim allows config.py.
      "recovering-an-unfamiliar-codebase-faded-violators-v2": () =>
        Object.entries({ "config.py": 2, "billing.py": 3, "mail.py": 1 }).filter(
          ([name, matches]) => name !== "config.py" && matches > 0,
        ).length,
      "defects-machines-make-check-first": () => page(range(100), 3, 20)[0] as number,
      // 4 failed + 6 skipped + 2 errors do not show the code works.
      "verifying-behaviour-try-notpass": () => 4 + 6 + 2,
    };
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace("aiae-", "")).sort()).toEqual(
      Object.keys(checks).sort(),
    );
    for (const question of numeric) {
      const check = checks[question.id.replace("aiae-", "")];
      const authority = question.answerAuthority;
      if (!check || authority.kind !== "numeric") throw new Error(question.id);
      const computed = check(question.prompt);
      expect(Math.abs(computed - authority.value), question.id).toBeLessThanOrEqual(
        Math.max(authority.absoluteTolerance, 1e-6),
      );
    }
  });

  it("recomputes the figures behind each judgement answer", () => {
    // 96 of 150 lines kept unchanged is 64%, a little under two thirds. Half of 150 is 75 and the
    // share not kept unchanged is 54 of 150.
    expect(96 / 150).toBeGreaterThan(0.6);
    expect(96 / 150).toBeLessThan(2 / 3);
    expect(96).toBeGreaterThan(150 / 2);
    expect(150 - 96).toBe(54);
    expect(rightLabel("what-an-assistant-does-faded-acceptance")).toBe(
      "About two thirds of the lines suggested",
    );
    // 150 kept unchanged and 60 edited and kept, out of 240: the 60 edited lines are a quarter of the
    // suggestion, the 30 deleted lines an eighth, and 90 lines short of the whole is 37.5%.
    near((150 + 60) / 240 - 150 / 240, 0.25, 12);
    near(30 / 240, 0.125, 12);
    expect((240 - 150) / 240).toBeGreaterThan(0.35);
    expect(150 + 60 + 30).toBe(240);
    expect(rightLabel("what-an-assistant-does-check-rate")).toBe(
      "Lower by about a quarter of the suggestion",
    );
    // 60,000 lines at 10 tokens a line need 600,000 tokens, and a 200,000-token window holds a third.
    expect(200000 / (60000 * 10)).toBeGreaterThan(0.3);
    expect(200000 / (60000 * 10)).toBeLessThan(0.4);
    expect(200000 / (40000 * 10)).toBe(0.5);
    expect(rightLabel("context-and-instructions-worked-fit")).toBe("About a third of the codebase");
    // 3,000 + 90,000 + 60,000 = 153,000 tokens used, so 47,000 of 200,000 are left, about a quarter.
    const left = 200000 - 3000 - 90000 - 60000;
    expect(left).toBe(47000);
    expect(left / 200000).toBeGreaterThan(0.2);
    expect(left / 200000).toBeLessThan(0.3);
    expect(200000 - 3000 - 90000).toBeGreaterThan(200000 / 2);
    expect(rightLabel("context-and-instructions-transfer-left")).toBe(
      "About a quarter of it is free",
    );
    // Three of the five mutants are killed and two survive, and the two tests run every line.
    expect(mutants.filter(([, f]) => killed(f))).toHaveLength(3);
    expect(mutants.filter(([, f]) => !killed(f))).toHaveLength(2);
    expect(rightLabel("tests-as-the-contract-worked-score")).toBe(
      "About three in five faults are caught, and two could still pass",
    );
    // 80% of 20 mutants is 16 kills, 15 is 75%, and the gap is one mutant.
    expect(0.8 * 20).toBe(16);
    expect(15 / 20).toBeLessThan(0.8);
    expect(0.8 * 20 - 15).toBe(1);
    expect(20 - 15).toBe(5);
    expect(rightLabel("tests-as-the-contract-check-score")).toBe(
      "It is one mutant short of the requirement",
    );
    // Two steps of 250 lines hold 500 and three hold 750, so 700 lines need three.
    expect(2 * 250).toBeLessThan(700);
    expect(3 * 250).toBeGreaterThanOrEqual(700);
    expect(Math.ceil(700 / 250)).toBe(3);
    expect(rightLabel("small-steps-and-version-control-worked-split")).toBe("3 steps");
    // 12 of 120 lines is a tenth of the file.
    near(12 / 120, 0.1, 12);
    expect(rightLabel("ownership-licensing-and-privacy-worked-share")).toBe(
      "Check the block's licence, since size is not the test",
    );
    // 5% of 140 merges is 7 failed and 133 good.
    near(140 * 0.05, 7, 12);
    expect(140 - 7).toBe(133);
    expect(rightLabel("working-rules-and-measurement-worked-failed")).toBe("About 7");
    // 6 of 30 merges is 20%, and 24 of 30 is 80%.
    near(6 / 30, 0.2, 12);
    expect(30 / 6).toBe(5);
    expect(30 - 6).toBe(24);
    expect(rightLabel("working-rules-and-measurement-try-rate")).toBe("About 20%");
    // 50 merges at 4% fail 2 times, 100 merges at 8% fail 8 times: four times as many.
    expect(50 * 0.04).toBe(2);
    expect(100 * 0.08).toBe(8);
    expect((100 * 0.08) / (50 * 0.04)).toBe(4);
    expect(rightLabel("working-rules-and-measurement-transfer-times")).toBe(
      "About four times as many",
    );
  });

  it("recomputes the results that the code in the judgement questions shows", () => {
    // slugify under the four criteria, and the one-line version that skips the trim.
    expect(slugify("Top  10--Tips")).toBe("top-10-tips");
    expect(slugify("  Release Notes, v2! ")).toBe("release-notes-v2");
    expect(slugify("  ...  ")).toBe("");
    expect(slugify("Rust 2024: Edition!")).toBe("rust-2024-edition");
    expect(buggySlugify("  Hello, World! ")).toBe("-hello-world-");
    expect(buggySlugify("Rust 2024: Edition!")).toBe("rust-2024-edition-");
    expect(buggySlugify("  ...  ")).toBe("-");
    expect(buggySlugify("A  B--C")).toBe("a-b-c");
    expect(buggySlugify("")).toBe("");
    expect(get("specification-first-transfer-broken-criterion").prompt).toContain("-hello-world-");
    // The leap-year shortcut is wrong for the century years that are not leap, and right for 2000.
    expect([1900, 2000, 2023, 2024, 2100].filter((y) => isLeap(y) !== trueLeap(y))).toEqual([
      1900, 2100,
    ]);
    expect(isLeap(2000)).toBe(trueLeap(2000));
    // Two mutants survive the two tests, and 2026 separates the % 2 mutant from the original.
    expect(mutants.filter(([, f]) => !killed(f)).map(([name]) => name)).toEqual([
      "year % 8 == 0",
      "year % 2 == 0",
    ]);
    expect(isLeap(2026)).toBe(false);
    expect(2026 % 2 === 0).toBe(true);
    // Slices on pages counted from 0 and read by a caller who counts from 1.
    expect(page(range(25), 1, 10)).toEqual(range(10).map((i) => i + 10));
    expect(range(25).slice(21, 28)).toEqual([21, 22, 23, 24]);
    expect(range(25).slice(24, 32)).toEqual([24]);
    expect(page(range(12), 2, 5)).toEqual([10, 11]);
    // The billing function turns a TypeError into 0.
    expect(billingTotal([10, 20, "5", 5])).toBe(0);
    expect(billingTotal([10, 20, 5, 5])).toBe(40);
    // my_max and my_min start from a fixed value.
    expect(myMax([3, 1, 2])).toBe(3);
    expect(myMax([5])).toBe(5);
    expect(myMax([-3, -1, -2])).toBe(0);
    expect(
      [[-1, -5], [-2], [-7, -8], [4, 2], [0, 3]].filter((xs) => !xs.includes(myMax(xs))),
    ).toEqual([[-1, -5], [-2], [-7, -8]]);
    expect(myMin([250, 400])).toBe(100);
    expect(myMin([120, 90])).toBe(90);
    // A hostile name matches every row of a four-row table; a bound value matches none of them.
    const names = ["Ana", "Ben", "Chloe", "Dev"];
    expect(names.filter(() => true)).toHaveLength(4);
    expect(names.filter((n) => n === "' OR 1=1 --")).toHaveLength(0);
    // A git revert adds a commit, and the soft reset in the figure leaves three.
    expect(4 + 1).toBe(5);
    // Four steps of 300 lines cover 1,200; three of 300 cover only 900 of 1,000.
    expect(Math.ceil(1000 / 300)).toBe(4);
    expect(3 * 300).toBeLessThan(1000);
    // 130 kept, 50 edited and 20 deleted of 200 suggested lines.
    expect(130 + 50 + 20).toBe(200);
    near((130 / 200) * 100, 65, 10);
    near(((130 + 50) / 200) * 100, 90, 10);
    // The grep counts: 7 routes, 5 with the decorator, all 2 missing in export.py.
    expect(3 + 2 + 2).toBe(7);
    expect(3 + 2 + 0).toBe(5);
    // 64 passing tests and 9 skipped make 73.
    expect(64 + 0 + 9).toBe(73);
    // 140 merges at 5% and 150 at 6%.
    near(140 * 0.05, 7, 10);
    near(150 * 0.06, 9, 10);
    near(150 - 9, 141, 10);
    expect(Math.round((150 / 140 - 1) * 100)).toBe(7);
    expect(Math.round((9 / 7 - 1) * 100)).toBe(29);
    // 40 merges at 5% and 60 at 10%: 2 and 6 failed.
    near(40 * 0.05, 2, 10);
    near(60 * 0.1, 6, 10);
  });

  it("puts a case in front of the learner: a diff, a function, a log or a search", () => {
    const situation = /\d|`[^`]+`|\byou\b|\bteam\b|\bassistant\b|\bagent\b|\bdiff\b|\bspec\b/iu;
    const withCode = bundle.questions.filter((question) => /^`[^`]+`$/mu.test(question.prompt));
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.9);
    expect(withCode.length).toBeGreaterThanOrEqual(12);
    const cases = bundle.questions.filter(
      (question) =>
        kind(question) === "choice" &&
        /\b(assistant|agent|diff|spec|change|team|log|search|function|package)\b/iu.test(
          question.prompt,
        ),
    );
    expect(cases.length).toBeGreaterThanOrEqual(35);
  });

  it("writes code lines in a prompt as one code span each", () => {
    for (const question of bundle.questions)
      for (const line of question.prompt.split("\n"))
        if (line.trim().startsWith("`") && line.trim().endsWith("`") && line.trim().length > 1)
          expect(line.trim().split("`").length, `${question.id}: ${line}`).toBe(3);
  });

  it("keeps dashes out of questions, hints, feedback and the cards", () => {
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
    }
    for (const card of bundle.flashcards)
      expect(`${card.front} ${card.back}`, card.id).not.toMatch(/[—–]/u);
    for (const lesson of bundle.lessons)
      for (const step of lesson.steps)
        expect(JSON.stringify(step.reveal ?? []), step.id).not.toMatch(/[—–]/u);
  });

  it("marks one option right, keeps the right one from standing out, and explains each wrong one", () => {
    const places = new Set<string>();
    let choices = 0;
    let longest = 0;
    let shortest = 0;
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
      const length = right[0]?.label.length ?? 0;
      if (question.choices.length >= 3) {
        choices += 1;
        if (length > longestOther) longest += 1;
        if (length < shortestOther) shortest += 1;
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
    expect(shortest / choices).toBeLessThanOrEqual(0.4);
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("gives no verdict words in feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((m) => m.feedback),
      ];
      for (const line of text)
        expect(line, question.id).not.toMatch(/^(correct|not quite|well done|great|right)\b/iu);
    }
  });

  it("uses order and sort questions where the sequence or the kinds are the point", () => {
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
        expect(sort.items.length, question.id).toBeLessThanOrEqual(10);
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

  it("orders the review pass and the safe change the way the lessons teach them", () => {
    expect(get("reading-a-diff-for-intent-read-order").order?.items[0]).toMatch(/specification/iu);
    expect(get("reading-a-diff-for-intent-read-order").order?.items.at(-1)).toMatch(/details/iu);
    const safe = get("small-steps-and-version-control-check-order").order?.items ?? [];
    expect(safe.findIndex((item) => /checkpoint/iu.test(item))).toBeLessThan(
      safe.findIndex((item) => /assistant for one/iu.test(item)),
    );
    const tests = get("tests-as-the-contract-check-tests-first").order?.items ?? [];
    expect(tests.findIndex((item) => /watch each one fail/iu.test(item))).toBeLessThan(
      tests.findIndex((item) => /make the tests pass/iu.test(item)),
    );
    const triage = get("defects-machines-make-check-triage").order?.items ?? [];
    expect(triage.findIndex((item) => /spec/iu.test(item))).toBeLessThan(
      triage.findIndex((item) => /Change only/iu.test(item)),
    );
  });

  it("covers the usual mistakes of reviewing generated code", () => {
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
      /tests pass|all 42 tests|green/iu, // trusting green tests
      /does not exist|hallucinated|nobody on the team has used|never heard of/iu, // an invented import
      /ask the assistant (whether|to confirm)|assistant's (confirmation|answer|review)/iu, // asking the model
      /1,200|large diff|one 1,200/iu, // a diff too large to read
      /loosened|update the expected value|bent to pass/iu, // tests edited to pass
      /API_KEY|production API key|key/iu, // secrets
      /f-string/iu, // injection
      /owner/iu, // access control
      /beyond the spec|scope creep/iu, // a change larger than the request
      /GPL|licence/iu, // licensing
      /mutant|mutation/iu,
      /skipped/iu,
    ])
      expect(
        text.some((entry) => phrase.test(entry)),
        String(phrase),
      ).toBe(true);
  });

  it("does not name a real model or state a price for one", () => {
    const text = JSON.stringify([bundle.questions, bundle.flashcards]);
    expect(text).not.toMatch(/\b(gpt|claude|gemini|llama|mistral|deepseek|qwen)[- ]?\d/iu);
    expect(text).not.toMatch(/\b(opus|sonnet|haiku|gpt|gemini|llama|mistral|chatgpt|copilot)\b/iu);
  });
});
