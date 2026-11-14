import { readFileSync } from "node:fs";
import vm from "node:vm";
import { assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * The Web: HTML, CSS and JavaScript follows the way History asks questions
 * (docs/question-writing-guide.md), adapted to a subject of judgement about what a browser does:
 * which rule wins and why, what a layout declaration produces, which element suits a stated
 * control, what a script logs. Every JavaScript snippet that prints something is run again below
 * and compared with the stated answer. DOM behaviour (child nodes, event order, innerHTML) was run
 * in jsdom, and CSS behaviour was checked against the specifications and MDN (the cascade and
 * inheritance tables, the Flexbox rule that adjacent flex item margins do not collapse, `width`
 * not applying to non-replaced inline elements, the browser's `a:link` colour, `HttpOnly`,
 * WCAG 2.2 contrast minimums). Numeric questions stay where the calculation is the skill.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/the-web-html-css-javascript/bundle.json", import.meta.url),
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
  const question = questions.get(`webhcj-${id}`);
  if (!question) throw new Error(`no question ${id}`);
  return question;
};
const rightLabel = (question: Question): string => {
  if (question.answerAuthority.kind !== "text") throw new Error(question.id);
  const authority = question.answerAuthority;
  const right = (question.choices ?? []).filter(
    (choice) => assessTextAnswer(choice.label, authority).correct,
  );
  return right[0]?.label ?? "";
};

describe("questions in The Web: HTML, CSS and JavaScript", () => {
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
  });

  it("ends each lesson with three questions of at least two types", () => {
    for (const lesson of bundle.lessons) {
      const types = lesson.questionIds.map((id) => kind(questions.get(id) as Question));
      expect(types, lesson.id).toHaveLength(3);
      expect(new Set(types).size, lesson.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps numeric questions to calculations that are the skill", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(15);
    for (const question of numeric)
      expect(question.hints.length, question.id).toBeGreaterThanOrEqual(2);
  });

  it("recomputes every numeric answer", () => {
    const contrast = (hex: string): number => {
      const channel = (index: number): number => {
        const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      };
      const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
      return (1 + 0.05) / (luminance + 0.05);
    };
    const expected: Record<string, number> = {
      // content 160, padding 12 each side, border 3 each side, margin 20 each side
      "the-box-and-the-flow-margin-box-width": 160 + 2 * 12 + 2 * 3 + 2 * 20,
      "the-box-and-the-flow-border-box-content": 300 - 2 * 25 - 2 * 2,
      "the-box-and-the-flow-check-border-box": 240 + 2 * 16 + 2 * 3,
      "the-box-and-the-flow-check-content": 320 - 2 * 24 - 2 * 4,
      // 720px, bases 100 each, grow 1, 2, 3: 420px free in 6 shares
      "layout-with-flexbox-and-grid-third-item": 100 + (3 * (720 - 300)) / 6,
      "layout-with-flexbox-and-grid-grid-two-fr": ((900 - 2 * 20 - 140) / 3) * 2,
      // 240px row, bases 200 and 100, 60px overflow shared by shrink times basis
      "layout-with-flexbox-and-grid-weighted-shrink": 200 - (60 * 200) / (200 + 100),
      "layout-with-flexbox-and-grid-check-fr": ((900 - 3 * 30 - 150) / 4) * 2,
      "responsive-design-em-chain": 12 * 1.5 * 2,
      "responsive-design-percent-of-container": 480 * 0.75,
      // an ol with three li, indented: 3 elements and 4 text nodes
      "the-dom-and-events-worked-seven": 3 + 4,
      // four li each on its own line with no indentation: 5 line breaks around and between
      "the-dom-and-events-four-items": 4 + 5,
      "accessible-and-fast-worked-seven": Math.round(contrast("#595959") * 10) / 10,
      "accessible-and-fast-shift-score": 0.75 * 0.25,
    };
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace("webhcj-", "")).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const question of numeric) {
      const authority = question.answerAuthority;
      if (authority.kind !== "numeric") throw new Error(question.id);
      expect(authority.value, question.id).toBeCloseTo(
        expected[question.id.replace("webhcj-", "")] as number,
        6,
      );
    }
  });

  it("states the contrast ratios the questions quote", () => {
    const ratio = (hex: string): number => {
      const channel = (index: number): number => {
        const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      };
      return 1.05 / (0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5) + 0.05);
    };
    expect(ratio("#777777").toFixed(2)).toBe("4.48");
    expect(ratio("#707070").toFixed(2)).toBe("4.95");
    expect(ratio("#888888").toFixed(2)).toBe("3.54");
    const quoted = get("accessible-and-fast-predict-contrast").choices!.map((c) => c.label).join("|");
    expect(quoted).toContain("4.48:1");
    expect(quoted).toContain("3.54:1");
    expect(get("accessible-and-fast-compute-ratio").prompt).toContain("4.95:1");
  });

  it("runs every snippet that prints and compares the output with the answer", async () => {
    const lines = (prompt: string): string => {
      const own = prompt
        .split("\n")
        .filter((line) => /^`.*`$/u.test(line.trim()))
        .map((line) => line.trim().slice(1, -1));
      if (own.length > 0) return own.join("\n");
      return (prompt.match(/`[^`]*console\.log[^`]*`/gu) ?? [])
        .map((span) => span.slice(1, -1))
        .join("\n");
    };
    const run = async (source: string): Promise<string> => {
      const out: string[] = [];
      const show = (value: unknown): string =>
        Array.isArray(value)
          ? `[ ${value.map(show).join(", ")} ]`
          : typeof value === "string"
            ? value
            : String(value);
      const context = vm.createContext({
        console: { log: (...args: unknown[]) => out.push(args.map(show).join(" ")) },
        setTimeout,
        queueMicrotask,
        Promise,
      });
      vm.runInContext(source, context);
      await new Promise((resolve) => setTimeout(resolve, 120));
      return out.join(" ");
    };
    // id, the output the snippet must give, and how the stated answer must start
    const printed: [string, string][] = [
      ["values-types-and-coercion-plus-and-minus", "53 2"],
      ["values-types-and-coercion-null-undefined-v2", "false true"],
      ["values-types-and-coercion-float-diff-v2", "false"],
      ["values-types-and-coercion-check-coerce", "12 34"],
      ["functions-scope-and-closures-predict-counter", "3"],
      ["functions-scope-and-closures-shadowing", "3"],
      ["functions-scope-and-closures-two-counters", "3 2"],
      ["functions-scope-and-closures-transfer-variable-v2", "10"],
      ["functions-scope-and-closures-let-loop", "0 2 4"],
      ["functions-scope-and-closures-check-closure", "4"],
      ["functions-scope-and-closures-check-loop", "4 4 4"],
      ["functions-scope-and-closures-var-loop", "3 3 3"],
      ["objects-arrays-and-references-predict-push", "3"],
      ["objects-arrays-and-references-predict-sort", "1"],
      ["objects-arrays-and-references-sorted-copy-v2", "4"],
      ["objects-arrays-and-references-pipeline-fourteen", "14"],
      ["objects-arrays-and-references-check-pipe", "12"],
      ["objects-arrays-and-references-check-alias-v2", "6"],
      ["the-event-loop-and-promises-predict-timer", "x z y"],
      ["the-event-loop-and-promises-four-timers-v2", "d b c a"],
      ["the-event-loop-and-promises-predict-promise", "1 4 3 2"],
      ["the-event-loop-and-promises-trace-await-try", "c a d b"],
      ["the-event-loop-and-promises-timer-then-microtask", "t1 m t2"],
      ["the-event-loop-and-promises-check-await", "1 3 2"],
      ["talking-to-servers-predict-stringify", '{"c":null}'],
      ["talking-to-servers-check-stringify", '{"x":1,"z":[null,2]}'],
    ];
    for (const [id, output] of printed) {
      const question = get(id);
      const source = lines(question.prompt);
      const logged = await run(source);
      expect(logged, id).toBe(output);
      const stated =
        question.choices !== undefined
          ? rightLabel(question)
          : question.answerAuthority.kind === "text"
            ? (question.answerAuthority.acceptedIdeas[0] ?? "")
            : "";
      // A typed answer is the printed output. A choice states it somewhere in its label.
      const clean = stated.replace(/`/gu, "");
      if (question.choices !== undefined) expect(clean, id).toContain(output);
      else expect(clean.replace(/[,\s]+/gu, " "), id).toBe(output.replace(/[,\s]+/gu, " "));
    }
  });

  it("puts the six letters of the microtask order question in the order the code prints them", async () => {
    const question = get("the-event-loop-and-promises-order-six-lines");
    const source = question.prompt
      .split("\n")
      .filter((line) => line.startsWith("`"))
      .map((line) => line.slice(1, -1))
      .join("\n");
    const out: string[] = [];
    const context = vm.createContext({
      console: { log: (value: string) => out.push(value) },
      setTimeout,
      queueMicrotask,
      Promise,
    });
    vm.runInContext(source, context);
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(question.order?.items.map((item) => item.replace(/[` ]|is printed/gu, ""))).toEqual(out);
  });

  it("sorts the hoisting lines by what each one does when run", () => {
    const question = get("functions-scope-and-closures-sort-hoist");
    for (const item of question.sort?.items ?? []) {
      const source = item.label.replace(/`/gu, "");
      let result: string;
      const out: string[] = [];
      try {
        vm.runInNewContext(source, {
          console: {
            log: (value: unknown) => out.push(typeof value === "function" ? "fn" : String(value)),
          },
        });
        result = out[0] === "undefined" ? "undef" : "value";
      } catch (error) {
        result = (error as Error).name === "ReferenceError" ? "throws" : "other";
      }
      expect(item.bin, item.label).toBe(result);
    }
  });

  it("sorts the copy-depth statements by whether o changes", () => {
    const question = get("objects-arrays-and-references-check-depth-sort");
    for (const item of question.sort?.items ?? []) {
      const o = { a: 1, b: { c: 1 } } as Record<string, unknown>;
      const k = { ...o } as Record<string, unknown> & { b: Record<string, unknown> };
      const before = JSON.stringify(o);
      vm.runInNewContext(item.label.replace(/`/gu, ""), { k });
      expect(item.bin, item.label).toBe(JSON.stringify(o) === before ? "same" : "changes");
    }
  });

  it("sorts the falsy and truthy values by running them", () => {
    const question = get("values-types-and-coercion-falsy-sort");
    for (const item of question.sort?.items ?? []) {
      const source = item.label.replace(/`/gu, "").replace(/, a string.*$/u, "");
      const value = vm.runInNewContext(`(${source})`);
      expect(item.bin, item.label).toBe(value ? "truthy" : "falsy");
    }
  });

  it("scores the specificity order from the selectors themselves", () => {
    const score = (selector: string): number => {
      const ids = (selector.match(/#/gu) ?? []).length;
      const classes = (selector.match(/\./gu) ?? []).length;
      const elements = (selector.match(/(^|\s)[a-z]+/gu) ?? []).length;
      return ids * 10000 + classes * 100 + elements;
    };
    const items = get("which-rule-wins-order-specificity").order?.items ?? [];
    const scores = items.map((item) => score(item.replace(/`/gu, "")));
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
    expect(new Set(scores).size).toBe(scores.length);
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
  });

  it("marks one option right and explains each wrong one", () => {
    const places = new Set<string>();
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(right, question.id).toHaveLength(1);
      const others = question.choices.filter((choice) => choice !== right[0]);
      const explained = new Set(
        (question.misconceptions ?? []).flatMap((item) => item.match.choiceIds ?? []),
      );
      for (const choice of others)
        expect(explained.has(choice.id), `${question.id} ${choice.id}`).toBe(true);
      for (const item of question.misconceptions ?? [])
        expect(item.feedback.trim().length, question.id).toBeGreaterThan(20);
      places.add(`${question.choices.indexOf(right[0] as (typeof question.choices)[number])}`);
    }
    expect([...places].sort()).toEqual(["0", "1", "2", "3"]);
  });

  it("keeps the right option from standing out by length", () => {
    const withThree = bundle.questions.filter(
      (question) => question.choices && question.choices.length >= 3,
    );
    let longest = 0;
    let shortest = 0;
    for (const question of withThree) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const authority = question.answerAuthority;
      const right = question.choices.find(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      const others = question.choices.filter((choice) => choice !== right);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const shortestOther = Math.min(...others.map((choice) => choice.label.length));
      const length = right?.label.length ?? 0;
      if (length > longestOther) {
        longest += 1;
        expect(length, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      }
      if (length < shortestOther) shortest += 1;
      const stops = new Set(question.choices.map((choice) => /\.$/u.test(choice.label)));
      expect(stops.size, `${question.id} mixes full stops`).toBe(1);
    }
    expect(longest).toBeLessThanOrEqual(withThree.length * 0.3);
    expect(shortest).toBeLessThanOrEqual(withThree.length * 0.4);
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(3);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
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

  it("sorts and orders what the lessons teach to sort and order", () => {
    const sorts = bundle.questions.filter((question) => question.sort);
    const labels = sorts.flatMap((question) => question.sort?.bins.map((bin) => bin.label) ?? []);
    for (const phrase of [
      /Redirection/u,
      /Link/u,
      /Inherited/u,
      /Falsy/u,
      /Throws a ReferenceError/u,
      /microtask/u,
    ])
      expect(
        labels.some((label) => phrase.test(label)),
        String(phrase),
      ).toBe(true);
    const orders = bundle.questions.filter((question) => question.order);
    expect(orders.some((question) => /DNS/u.test(question.order?.items.join(" ") ?? ""))).toBe(
      true,
    );
    expect(
      orders.some((question) => /min-width: 1200px/u.test(question.order?.items.join(" ") ?? "")),
    ).toBe(true);
  });

  it("does not mark a typed answer right when it only repeats the prompt", () => {
    for (const question of bundle.questions) {
      if (question.choices || question.answerAuthority.kind !== "text") continue;
      if (question.order || question.sort) continue;
      expect(assessTextAnswer(question.prompt, question.answerAuthority).correct, question.id).toBe(
        false,
      );
    }
  });

  it("marks the answers of the typed questions this rewrite wrote", () => {
    for (const id of [
      "functions-scope-and-closures-adder-q",
      "objects-arrays-and-references-sorted-copy-v2",
      "objects-arrays-and-references-pipeline-fourteen",
      "objects-arrays-and-references-check-pipe",
      "storing-state-and-trusting-input-worked-restore",
    ]) {
      const question = get(id);
      if (question.answerAuthority.kind !== "text") throw new Error(id);
      const authority = question.answerAuthority;
      expect(assessTextAnswer(authority.exampleAnswer, authority).correct, id).toBe(true);
      for (const item of question.misconceptions ?? [])
        for (const idea of item.match.textIdeas ?? [])
          expect(assessTextAnswer(idea, authority).correct, `${id} ${idea}`).toBe(false);
    }
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

  it("puts code, selectors and properties of a prompt in backticks", () => {
    for (const question of bundle.questions) {
      const outside = question.prompt.replace(/`[^`]*`/gu, "");
      expect(outside, question.id).not.toMatch(
        /\b(console\.log|setTimeout|querySelector|addEventListener|box-sizing|flex-grow|flex-shrink|flex-basis|grid-template-columns|childNodes|textContent|innerHTML)\b/u,
      );
    }
  });
});
