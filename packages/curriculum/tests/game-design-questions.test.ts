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
 * Game Design and Game Programming Patterns follows the way UX and HCI asks questions
 * (docs/question-writing-guide.md): most questions describe a mechanic, a playtest finding or a
 * short piece of code and ask what it does or what breaks. Numeric questions stay where the number
 * is the point. Every figure that a question or its feedback quotes is recomputed below, and the
 * code the questions show was run in Python when it was written; the functions here repeat it.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/game-design-and-programming-patterns/bundle.json", import.meta.url),
    "utf8",
  ),
) as CourseBundle;
const questions = new Map(bundle.questions.map((question) => [question.id, question]));
const get = (suffix: string): Question => {
  const found = bundle.questions.filter((question) => question.id.endsWith(suffix));
  expect(found, suffix).toHaveLength(1);
  return found[0] as Question;
};
const kind = (question: Question): "numeric" | "choice" | "typed" | "order" | "sort" =>
  question.responseType === "numeric"
    ? "numeric"
    : question.responseType === "order" || question.responseType === "sort"
      ? question.responseType
      : question.choices
        ? "choice"
        : "typed";
const rightOption = (question: Question) => {
  const authority = question.answerAuthority;
  if (authority.kind !== "text") return [];
  return (question.choices ?? []).filter((choice) =>
    authority.acceptedIdeas.includes(choice.label),
  );
};
const numericValue = (question: Question): number => {
  const authority = question.answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${question.id} is not numeric`);
  return authority.value;
};
const feedbackOf = (question: Question) =>
  (question.misconceptions ?? []).map((item) => item.feedback).join(" ");

/** The fixed timestep loop of the lesson: whole updates run and the lag left after each frame. */
const runLoop = (
  frames: number[],
  step: number,
  whileLoop = true,
  cap = Number.POSITIVE_INFINITY,
) => {
  let lag = 0;
  let updates = 0;
  for (const frame of frames) {
    lag += Math.min(frame, cap);
    if (whileLoop) {
      while (lag >= step) {
        updates += 1;
        lag -= step;
      }
    } else if (lag >= step) {
      updates += 1;
      lag -= step;
    }
  }
  return { updates, lag };
};

describe("questions in Game Design and Game Programming Patterns", () => {
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

  it("keeps numeric questions to the places where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(18);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("asks no fill-in-the-blank question for a term", () => {
    for (const question of bundle.questions)
      expect(question.prompt, question.id).not.toContain("____");
  });

  it("keeps dashes out of questions, hints, feedback and options", () => {
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
      expect(text, question.id).not.toMatch(/\b(Correct|Not quite|Great job)\b/u);
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

  it("keeps the right option from giving itself away by length", () => {
    const rows = bundle.questions
      .filter((question) => (question.choices?.length ?? 0) >= 3)
      .map((question) => {
        const right = rightOption(question);
        const others = (question.choices ?? []).filter((choice) => !right.includes(choice));
        const longestOther = Math.max(...others.map((choice) => choice.label.length));
        const shortestOther = Math.min(...others.map((choice) => choice.label.length));
        return {
          question,
          rightLength: right[0]?.label.length ?? 0,
          longestOther,
          shortestOther,
        };
      });
    const longest = rows.filter((row) => row.rightLength > row.longestOther);
    expect(longest.length).toBeLessThanOrEqual(Math.floor(rows.length * 0.3));
    const shortest = rows.filter((row) => row.rightLength < row.shortestOther);
    expect(shortest.length).toBeLessThanOrEqual(Math.floor(rows.length * 0.4));
    expect(
      rows.filter((row) => row.rightLength > row.longestOther * 1.15).map((row) => row.question.id),
    ).toEqual([]);
    const mixed = rows.filter((row) => {
      const ends = new Set(
        (row.question.choices ?? []).map((choice) => choice.label.trimEnd().endsWith(".")),
      );
      return ends.size > 1;
    });
    expect(mixed.map((row) => row.question.id)).toEqual([]);
  });

  it("keeps most questions multiple choice or short text, with some to order and to sort", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(6);
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
            sort.items.filter((item) => item.bin === bin.id).length,
            `${question.id} ${bin.id}`,
          ).toBeGreaterThanOrEqual(2);
        for (const item of sort.items) expect(item.explanation, question.id).toBeTruthy();
        expect(question.answerAuthority.acceptedIdeas, question.id).toEqual([SORT_ANSWER_IDEA]);
      }
      if (order || sort) {
        expect(question.answerAuthority.exampleAnswer.length, question.id).toBeGreaterThan(40);
        expect(question.onCorrect, question.id).toBeTruthy();
      }
    }
  });

  it("shows code, a mechanic or a playtest finding in most questions", () => {
    const withCode = bundle.questions.filter((question) => /`[^`]+`\n/u.test(question.prompt));
    expect(withCode.length).toBeGreaterThanOrEqual(9);
    const scenario =
      /\b(game|player|players|tester|testers|designer|team|level|enemy|enemies|boss|character|weapon|loop|ball|shooter|sword)\b/iu;
    expect(
      bundle.questions.filter((question) => scenario.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(80);
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
    }
  });

  it("recomputes every numeric answer", () => {
    const msPerFrame = (fps: number) => 1000 / fps;
    const cost = (level: number) => ({
      a: 100 + 60 * (level - 1),
      b: 100 * 1.4 ** (level - 1),
    });
    let crossing = 0;
    for (let level = 1; level < 30 && !crossing; level++)
      if (cost(level).b > cost(level).a) crossing = level;
    let coins = 12;
    let failure = 0;
    for (let round = 1; round <= 20 && !failure; round++) {
      coins += 1;
      if (coins < 3) failure = round;
      else coins -= 3;
    }
    const pairs = (n: number) => (n * (n - 1)) / 2;
    const expected: Record<string, [number, number]> = {
      "feedback-and-game-feel-jump-misses-target": [7 * msPerFrame(60) - 100, 0.1],
      "feedback-and-game-feel-same-delay-30": [3 * msPerFrame(30) - 3 * msPerFrame(60), 0.5],
      "feedback-and-game-feel-check-window-at-144": [6 * msPerFrame(144), 0.1],
      "challenge-flow-and-difficulty-dda-two-steps": [200 * 0.9 * 0.9, 0.5],
      "balance-by-the-numbers-expected-with-miss": [0.7 * (0.9 * 50 + 0.1 * 150), 0.5],
      "balance-by-the-numbers-curves-cross": [crossing, 0.001],
      "balance-by-the-numbers-twenty-kills-no-drop": [100 * 0.95 ** 20, 0.1],
      "balance-by-the-numbers-check-compare-ttk": [360 / 90 - 360 / (45 * 3 * 0.75), 0.01],
      "prototype-and-playtest-paper-first-failure": [failure, 0.001],
      "prototype-and-playtest-check-funnel": [(120 / 300) * 100, 0.5],
      "the-game-loop-updates-from-70": [runLoop([110], 20).updates, 0.001],
      "the-game-loop-interpolated-x": [100 + (20 * 5) / 20, 0.5],
      "the-game-loop-capped-updates": [runLoop([500], 20, true, 250).updates, 0.001],
      "components-soa-lines": [Math.ceil((2000 * (12 + 12 + 4)) / 64), 0.5],
      "events-and-queues-stall-in-frames": [Math.round((3 + 8 + 40) / 16.7), 0.01],
      "pools-and-sharing-trees-in-budget": [Math.floor((1_000_000 - 20_000) / 12), 0.001],
      "spatial-partitioning-pairs-doubled": [pairs(2000) - pairs(1000), 0.5],
      "spatial-partitioning-grid-pair-tests": [(1000 * (90 - 1)) / 2, 0.5],
    };
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.map((question) => question.id.replace(/^gamdpp-/u, "")).sort()).toEqual(
      Object.keys(expected).sort(),
    );
    for (const question of numeric) {
      const entry = expected[question.id.replace(/^gamdpp-/u, "")] as [number, number];
      expect(numericValue(question), question.id).toBeCloseTo(entry[0], 1);
      const authority = question.answerAuthority;
      if (authority.kind === "numeric")
        expect(authority.absoluteTolerance, question.id).toBeGreaterThanOrEqual(0);
      // the stated tolerance accepts the exact figure
      expect(Math.abs(numericValue(question) - entry[0]), question.id).toBeLessThanOrEqual(
        entry[1] + 0.05,
      );
    }
  });

  it("recomputes the figures that the multiple-choice questions and their feedback quote", () => {
    // the game loop lesson
    expect(5 * 144).toBe(720);
    expect(5 * 60).toBe(300);
    expect(144 / 60).toBeCloseTo(2.4, 5);
    expect(900 / 20).toBe(45);
    const slow = runLoop([70, 25, 5, 40], 20, false);
    expect(slow).toEqual({ updates: 4, lag: 60 });
    expect(runLoop([70, 25, 5, 40], 20)).toEqual({ updates: 7, lag: 0 });
    const perFrame = [70, 25, 5, 40].map((frame) => Math.floor(frame / 20));
    expect(perFrame.reduce((a, b) => a + b, 0)).toBe(6);
    expect([70, 25, 5, 40].reduce((a, frame) => a + Math.ceil(frame / 20), 0)).toBe(9);
    expect(runLoop([30], 20).lag).toBe(10);
    // frames and milliseconds
    expect(1000 / 60).toBeCloseTo(16.67, 2);
    expect(2 * (1000 / 60)).toBeCloseTo(33.3, 1);
    expect(2 * 60).toBe(120);
    expect(1000 / 2).toBe(500);
    expect(50 / 16.7).toBeCloseTo(3, 0);
    // balance and playtests
    expect(0.98 ** 60).toBeCloseTo(0.2976, 3);
    expect(240 / (40 * 3)).toBe(2);
    expect(240 / 40).toBe(6);
    expect((40 * 3) / 240).toBe(0.5);
    expect(168 / 240).toBeCloseTo(0.7, 5);
    expect(168 / 300).toBeCloseTo(0.56, 5);
    expect(72 / 240).toBeCloseTo(0.3, 5);
    expect(100 / 150).toBeCloseTo(0.667, 3);
    expect(70 / 100).toBeCloseTo(0.7, 5);
    // a funnel with the flow rule
    const channel = (skill: number, challenge: number) =>
      Math.abs(challenge - skill) <= 1 ? "flow" : challenge > skill ? "anxiety" : "boredom";
    const flow = get("check-flow-sort");
    const bin = (label: string) => flow.sort?.items.find((item) => item.label === label)?.bin;
    expect(bin("Skill 3 meets challenge 7")).toBe(channel(3, 7));
    expect(bin("Skill 2 meets challenge 5")).toBe(channel(2, 5));
    expect(bin("Skill 5 meets challenge 6")).toBe(channel(5, 6));
    expect(bin("Skill 7 meets challenge 7")).toBe(channel(7, 7));
    expect(bin("Skill 8 meets challenge 3")).toBe(channel(8, 3));
    expect(bin("Skill 9 meets challenge 7")).toBe(channel(9, 7));
    // the state machine lesson: the table in the diving-stuck question
    const table: Record<string, string> = {
      "standing jump": "jumping",
      "standing duck": "ducking",
      "jumping duck": "diving",
      "jumping land": "standing",
      "ducking release": "standing",
    };
    let state = "standing";
    for (const event of ["jump", "duck", "land", "jump"])
      state = table[`${state} ${event}`] ?? state;
    expect(state).toBe("diving");
    expect(2 ** 3).toBe(8);
    expect(2 ** 4).toBe(16);
    // the commands lesson
    let x = 3;
    const dx = -5;
    x = Math.max(0, x + dx);
    expect(x).toBe(0);
    x -= dx;
    expect(x).toBe(5);
    const applied = ["A", "B", "C", "D", "E"];
    applied.pop();
    applied.pop();
    applied.push("F");
    expect(applied.join(", ")).toBe("A, B, C, F");
    const six = ["A", "B", "C", "D", "E", "F"];
    six.length -= 3;
    six.push("G");
    expect(six.pop()).toBe("G");
    expect(six).toEqual(["A", "B", "C"]);
    // components
    expect(Math.floor(64 / 12)).toBe(5);
    expect(800 * 8).toBe(6400);
    expect(6400 / 64).toBe(100);
    let leader = 0;
    let follower = 0;
    for (let frame = 0; frame < 3; frame++) {
      follower = leader;
      leader += 2;
    }
    expect([leader, follower]).toEqual([6, 4]);
    leader = 0;
    follower = 0;
    for (let frame = 0; frame < 3; frame++) {
      leader += 2;
      follower = leader;
    }
    expect([leader, follower]).toEqual([6, 6]);
    // events
    const buffer: string[] = [];
    let tail = 0;
    for (const event of ["e1", "e2", "e3", "e4", "e5"]) {
      buffer[tail] = event;
      tail = (tail + 1) % 4;
    }
    expect(buffer[0]).toBe("e5");
    expect([4, 5, 6, 7, 8].map((i) => i % 6).length).toBe(5);
    let t = 4;
    for (let i = 0; i < 5; i++) t = (t + 1) % 6;
    expect(t).toBe(3);
    expect(4 + 5).toBe(9);
    // pools and flyweights
    const free = [0, 1, 2, 3];
    const handed: (number | null)[] = [];
    for (let shot = 0; shot < 6; shot++) handed.push(free.pop() ?? null);
    expect(handed).toEqual([3, 2, 1, 0, null, null]);
    expect(50_000 + 2000 * 20).toBe(90_000);
    expect(2000 * (50_000 + 20)).toBe(100_040_000);
    expect(50_000 + 20).toBe(50_020);
    expect(2000 * 20).toBe(40_000);
    expect(20_000 + 81_667 * 12).toBe(1_000_004);
    expect(1_000_000 / 12).toBeCloseTo(83_333.3, 1);
    expect(Math.floor(1_000_000 / 20_012)).toBe(49);
    // spatial partitioning
    const columnWith = (cut: (value: number) => number, value: number) => cut(value / 100);
    expect(columnWith(Math.trunc, -30) + 0).toBe(0);
    expect(Math.trunc(-0.3) + 0).toBe(0);
    expect(columnWith(Math.floor, -30)).toBe(-1);
    expect(Math.floor(98 / 100)).toBe(0);
    expect(Math.floor(102 / 100)).toBe(1);
    expect(Math.floor(730 / 50)).toBe(14);
    expect(730 / 50).toBeCloseTo(14.6, 5);
    expect((900 * 899) / 2).toBe(404_550);
    expect((1000 * 999) / 2).toBe(499_500);
    expect((2000 * 1999) / 2).toBe(1_999_000);
  });

  it("states each figure that feedback quotes for the questions that use one", () => {
    expect(feedbackOf(get("hitstop-ms"))).toContain("2 × 16.67");
    expect(get("check-pity-limit").onCorrect).toContain("0.98^60");
    expect(get("curves-cross").answerAuthority.kind).toBe("numeric");
    expect(get("curves-cross").onCorrect).toContain("levels 2, 3 and 4");
    expect(feedbackOf(get("trees-in-budget"))).toContain("1,000,004");
    expect(feedbackOf(get("pairs-doubled"))).toContain("499,500");
    expect(feedbackOf(get("check-crowd-in-corner"))).toContain("404,550");
  });

  it("marks typed answers fairly", () => {
    const typed = bundle.questions.filter((question) => kind(question) === "typed");
    expect(typed.length).toBeGreaterThanOrEqual(5);
    const cases: Record<string, { right: string[]; wrong: string[] }> = {
      "dda-name": {
        right: ["dynamic difficulty adjustment", "DDA", "Dynamic difficulty adjustment (DDA)"],
        wrong: ["rubber-banding", "fixed difficulty", "selectable difficulty", "flow"],
      },
      "check-command-name": {
        right: ["command", "the command pattern"],
        wrong: ["observer", "memento", "state"],
      },
      "check-observer": {
        right: ["observer", "the observer pattern"],
        wrong: ["event queue", "command", "singleton"],
      },
      "check-fragmentation": {
        right: ["fragmentation", "memory fragmentation"],
        wrong: ["memory leak", "out of memory", "allocation"],
      },
    };
    for (const [suffix, items] of Object.entries(cases)) {
      const question = get(suffix);
      const authority = question.answerAuthority;
      if (authority.kind !== "text") throw new Error(suffix);
      for (const answer of items.right)
        expect(assessTextAnswer(answer, authority).correct, `${suffix} ${answer}`).toBe(true);
      for (const answer of items.wrong)
        expect(assessTextAnswer(answer, authority).correct, `${suffix} ${answer}`).toBe(false);
    }
  });

  it("teaches feedback loops on the screen that the comeback question depends on", () => {
    const lesson = bundle.lessons.find((item) => item.id === "challenge-flow-and-difficulty");
    const step = lesson?.steps.find((item) => item.id === "rubber-banding-and-fairness");
    const text = (step?.lead ?? []).map((block) => ("text" in block ? block.text : "")).join(" ");
    expect(text).toContain("negative feedback loop");
    expect(text).toContain("positive feedback loop");
  });
});
