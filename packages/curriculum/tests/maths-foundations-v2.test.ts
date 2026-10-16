import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, LessonStep, Question, RichTextBlock } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { lessonQuestionRefs, validateCourseBundle } from "../src/index.js";

/**
 * Maths Foundations v2 lessons 1 to 6. Every key is recomputed here from the arithmetic the item
 * describes. Each lesson is read from its migration draft and merged onto the published bundle in
 * memory, so the test holds before and after the course is published. All six lessons are in the
 * story format (screens that teach, then questions).
 */
const root = new URL("../../../content/maths-foundations/", import.meta.url);
type Lesson = CourseBundle["lessons"][number];
const published = JSON.parse(readFileSync(new URL("bundle.json", root), "utf8")) as CourseBundle;
type Draft = {
  lesson: Lesson;
  questions: Question[];
  citations: NonNullable<CourseBundle["authoringMetadata"]>[number]["citations"];
};
const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`.authoring/migration/${name}.json`, root), "utf8")) as Draft;
const drafts = {
  letter: load("what-a-letter-stands-for"),
  balance: load("keeping-the-balance"),
  undoing: load("undoing-in-the-right-order"),
  point: load("a-point-is-a-pair"),
  steep: load("how-steep-is-it"),
  line: load("from-equation-to-line"),
};
const reader = (draft: Draft, prefix: string) => {
  const question = (suffix: string): Question =>
    draft.questions.find((item) => item.id === `${prefix}${suffix}`)!;
  const key = (suffix: string) => {
    const authority = question(suffix).answerAuthority;
    if (authority.kind !== "numeric") throw new Error(`${suffix} is not numeric`);
    return authority.value;
  };
  const choiceMarked = (suffix: string) => {
    const item = question(suffix);
    if (item.answerAuthority.kind !== "text") throw new Error("not a choice");
    const authority = item.answerAuthority;
    return item
      .choices!.filter((choice) => assessTextAnswer(choice.label, authority).correct)
      .map((c) => c.id);
  };
  const slips = (suffix: string) =>
    (question(suffix).misconceptions ?? []).flatMap((m) => m.match.numeric ?? []).sort();
  return { question, key, choiceMarked, slips };
};
const sorted = (values: number[]) => [...values].sort();

const balance = reader(drafts.balance, "maths-keeping-the-balance-");
const undoing = reader(drafts.undoing, "maths-undoing-in-the-right-order-");
const letter = reader(drafts.undoing, "maths-what-a-letter-stands-for-");
const first = reader(drafts.letter, "maths-what-a-letter-stands-for-");
const point = reader(drafts.point, "maths-a-point-is-a-pair-");
const steep = reader(drafts.steep, "maths-how-steep-is-it-");
const line = reader(drafts.line, "maths-from-equation-to-line-");
const lesson = drafts.balance.lesson;
const draft = drafts.balance;
const key = balance.key;
const question = balance.question;
const choiceMarked = balance.choiceMarked;

/** Solves a·x + b = c by balancing: subtract b from both sides, then divide both by a. */
const solve = (a: number, b: number, c: number) => (c - b) / a;

describe("Maths Foundations lesson 2 (v2, keeping the balance)", () => {
  it("has the v2 anatomy", () => {
    expect(lesson.steps.map((step) => step.kind)).toEqual([
      "explain",
      "try",
      "explain",
      "predict",
      "explain",
      "try",
      "explain",
      "worked_example",
      "faded_example",
      "explain",
      "transfer",
    ]);
    expect(lesson.questionIds).toHaveLength(3);
    expect(lesson.calculator).toBe("off");
  });

  it("has keys that match the arithmetic each item describes", () => {
    // Hook: a bag plus 3 spare marbles balances 11 marbles.
    expect(key("hook")).toBe(11 - 3);
    // Predict: subtracting 6 from both sides is the only listed move that keeps 2x + 6 = 18.
    expect(choiceMarked("1")).toEqual(["a"]);
    expect(solve(2, 6, 18)).toBe(6); // x = 6 satisfies both 2x + 6 = 18 and 2x = 12
    expect(2 * 6).toBe(18 - 6);
    // Worked example: 3x + 2 = 23, x = 7, and the check line.
    expect(solve(3, 2, 23)).toBe(7);
    expect(3 * 7 + 2).toBe(23);
    expect(choiceMarked("why-both")).toEqual(["a"]);
    // Faded: 2x + 8 = 20 becomes 2x = 12, so x = 6, and the check gives 20.
    expect(20 - 8).toBe(12);
    expect(key("2")).toBe(12 / 2);
    expect(key("2")).toBe(solve(2, 8, 20));
    expect(key("verify")).toBe(2 * 6 + 8);
    expect(key("verify")).toBe(20);
    // Try: 4x = 20.
    expect(key("3")).toBe(solve(4, 0, 20));
    // Transfer: 3x − 9 = −15, add 9 first, then divide by 3.
    expect(key("4")).toBe(solve(3, -9, -15));
    expect(-15 + 9).toBe(-6);
    expect(3 * key("4") - 9).toBe(-15);
    // Skill check.
    expect(key("practice-1")).toBe(solve(5, 2, 27));
    expect(choiceMarked("practice-2")).toEqual(["a"]);
    expect(key("practice-3")).toBe(solve(2, -5, 13));
    expect(2 * key("practice-3") - 5).toBe(13);
  });

  it("matches each slip to the value it really produces, never the key", () => {
    const slips: Record<string, number[]> = {
      hook: [11 + 3, 11],
      "2": [12 - 2, 12 * 2],
      "3": [20 - 4, 20 * 4],
      "4": [(-15 - 9) / 3, -15 + 9, 2],
      "practice-1": [27 - 2, (27 + 2) / 5],
      "practice-3": [(13 - 5) / 2, 13 + 5],
    };
    for (const [suffix, values] of Object.entries(slips)) {
      const matched = (question(suffix).misconceptions ?? []).flatMap((m) => m.match.numeric ?? []);
      expect(matched.sort()).toEqual([...values].sort());
      expect(matched).not.toContain(key(suffix));
    }
    for (const item of draft.questions) {
      if (item.answerAuthority.kind !== "numeric") continue;
      const value = item.answerAuthority.value;
      for (const m of item.misconceptions ?? [])
        expect(m.feedback).not.toMatch(
          new RegExp(`(^|[^\\d.])[-−]?${Math.abs(value)}($|[^\\d.a-z])`, "u"),
        );
    }
  });

  it("grades only taught skills", () => {
    const skills = new Set(lesson.taughtSkills);
    for (const id of lesson.questionIds)
      expect(skills.has(draft.questions.find((q) => q.id === id)!.skill!)).toBe(true);
  });
});

const all = Object.values(drafts);
const mergeAll = (): CourseBundle => {
  const ids = new Set(all.flatMap((item) => item.questions.map((q) => q.id)));
  const byLesson = new Map(all.map((item) => [item.lesson.id, item]));
  return {
    ...published,
    lessons: published.lessons.map((item) => byLesson.get(item.id)?.lesson ?? item),
    questions: [
      ...published.questions.filter((q) => !ids.has(q.id)),
      ...all.flatMap((item) => item.questions),
    ],
    authoringMetadata: (published.authoringMetadata ?? []).map((entry) => {
      const item = byLesson.get(entry.lessonId);
      return item ? { ...entry, citations: item.citations } : entry;
    }),
  };
};

describe("Maths Foundations lessons 1 to 6 (v2)", () => {
  it("validates once merged onto the course", () => {
    const errors = validateCourseBundle(mergeAll()).issues.filter((i) => i.severity === "error");
    expect(errors).toEqual([]);
  });

  describe("the story format of lessons 1 to 6", () => {
    const story = Object.values(drafts);
    const words = (text: string) =>
      text
        .replace(/\$[^$]*\$/gu, "x")
        .split(/\s+/u)
        .filter(Boolean).length;
    const prose = (blocks: RichTextBlock[] | undefined) =>
      (blocks ?? []).reduce(
        (sum, block) => sum + (block.kind === "paragraph" ? words(block.text) : 0),
        0,
      );
    const teaching = (step: LessonStep) => step.kind === "explain" && !step.checkQuestionId;
    const asks = (step: LessonStep) =>
      Boolean(step.checkQuestionId) ||
      Boolean(step.workedSteps?.some((line) => line.blank || line.selfExplain));

    it("opens without a question and promises in the learner's voice", () => {
      for (const { lesson: item } of story) {
        expect(item.intro?.hook.questionId).toBeUndefined();
        const opener = prose(item.intro?.hook.blocks);
        expect(opener).toBeGreaterThanOrEqual(120);
        expect(opener).toBeLessThanOrEqual(200);
        expect(words(item.intro!.promise)).toBeLessThanOrEqual(25);
        expect(item.intro!.promise).toMatch(/^By the end you'll /u);
      }
    });

    it("has 8 to 12 steps, at least 40 percent of them teaching, 3 to 6 asking, and a transfer", () => {
      for (const { lesson: item } of story) {
        expect(item.steps.length).toBeGreaterThanOrEqual(8);
        expect(item.steps.length).toBeLessThanOrEqual(12);
        const taught = item.steps.filter(teaching).length;
        expect(taught / item.steps.length).toBeGreaterThanOrEqual(0.4);
        const asking = item.steps.filter(asks).length;
        expect(asking).toBeGreaterThanOrEqual(3);
        expect(asking).toBeLessThanOrEqual(6);
        expect(item.steps.some((step) => step.kind === "transfer")).toBe(true);
        expect(item.steps.some((step) => step.diagram)).toBe(true);
        expect(item.steps[0]!.kind).toBe("explain");
        let run = 0;
        for (const step of item.steps) {
          run = teaching(step) ? run + 1 : 0;
          expect(run).toBeLessThanOrEqual(3);
        }
      }
    });

    it("keeps each teaching screen to 100 to 250 words and each practice lead to 60", () => {
      for (const { lesson: item } of story)
        for (const step of item.steps) {
          if (teaching(step)) {
            const length = prose(step.lead) + prose(step.afterFigure);
            expect(length).toBeGreaterThanOrEqual(100);
            expect(length).toBeLessThanOrEqual(250);
            expect(step.headline).toBeTruthy();
            // A graded figure hides its answer; a teaching figure has nothing to hide.
            expect(step.answerVisibility).toBeUndefined();
          } else {
            expect(prose(step.lead)).toBeLessThanOrEqual(60);
            if (step.diagram) expect(step.answerVisibility).toBe("hidden-until-response");
          }
        }
    });

    it("closes with a statement that leads into the next opener", () => {
      story.forEach(({ lesson: item }) => {
        const hook = item.recap!.nextHook!;
        expect(hook).not.toMatch(/\?/u);
        expect(hook).not.toMatch(/—/u);
      });
      // Lesson 1 hands over to the balance, lesson 2 to undoing in order, lesson 3 to the grid,
      // lesson 4 to steepness, lesson 5 to the equation of a line. Lesson 6 ends the course.
      expect(drafts.letter.lesson.recap!.nextHook).toMatch(/balance/u);
      expect(drafts.balance.lesson.recap!.nextHook).toMatch(/order/u);
      expect(drafts.undoing.lesson.recap!.nextHook).toMatch(/grid/u);
      expect(drafts.point.lesson.recap!.nextHook).toMatch(/steep/u);
      expect(drafts.steep.lesson.recap!.nextHook).toMatch(/equation/u);
      expect(drafts.line.lesson.recap!.nextHook).toMatch(/review queue/u);
      expect(JSON.stringify(drafts.balance.lesson.intro!.hook.blocks)).toMatch(/scales/u);
      expect(JSON.stringify(drafts.undoing.lesson.intro!.hook.blocks)).toMatch(/order/u);
      expect(JSON.stringify(drafts.point.lesson.intro!.hook.blocks)).toMatch(/grid/u);
      expect(JSON.stringify(drafts.steep.lesson.intro!.hook.blocks)).toMatch(/grid/u);
      expect(JSON.stringify(drafts.steep.lesson.intro!.hook.blocks)).toMatch(/leans/u);
      expect(JSON.stringify(drafts.line.lesson.intro!.hook.blocks)).toMatch(/gradient says/u);
    });

    it("opens on a teaching screen and leaves out only the questions its notes name", () => {
      for (const { lesson: item } of story) expect(teaching(item.steps[0]!)).toBe(true);
      const unasked = (draft: Draft) => {
        const asked = new Set(lessonQuestionRefs(draft.lesson));
        return draft.questions.filter((item) => !asked.has(item.id)).map((item) => item.id);
      };
      // Lesson 1 keeps only what it asks; lesson 1's other two items stay in the bundle unchanged.
      expect(unasked(drafts.letter)).toEqual([]);
      expect(unasked(drafts.balance)).toEqual(["maths-keeping-the-balance-check-both-sides"]);
      expect(unasked(drafts.undoing)).toEqual(["maths-undoing-in-the-right-order-check-package"]);
      expect(unasked(drafts.point)).toEqual(["maths-a-point-is-a-pair-1"]);
      expect(unasked(drafts.steep)).toEqual([
        "maths-how-steep-is-it-check-run",
        "maths-how-steep-is-it-check-direction",
      ]);
      expect(unasked(drafts.line)).toEqual(["maths-from-equation-to-line-check-intercept"]);
    });
  });

  describe("the arithmetic quoted in the teaching screens", () => {
    type Machine = { operations: Array<{ operator: string; operand: number }> };
    const run = (diagram: Machine, input: number) =>
      diagram.operations.reduce(
        (value, { operator, operand }) =>
          operator === "add"
            ? value + operand
            : operator === "subtract"
              ? value - operand
              : operator === "multiply"
                ? value * operand
                : value / operand,
        input,
      );
    const figure = (draft: Draft, stepId: string) =>
      draft.lesson.steps.find((step) => step.id === stepId)!.diagram as unknown as Machine & {
        target?: number;
        coefficient?: number;
        constant?: number;
        right?: number;
      };
    const left = (diagram: { coefficient?: number; constant?: number }, x: number) =>
      diagram.coefficient! * x + diagram.constant!;

    it("lesson 1: the rounds, the machines and the balance", () => {
      // The game: take the added 8 back out, and halve the doubled number.
      expect(14 - 8).toBe(6);
      expect(6 + 8).toBe(14);
      expect(18 / 2).toBe(9);
      expect(9 * 2).toBe(18);
      // x + 5 with target 12: 3 gives 8, 10 gives 15, and only 7 reaches the target in range.
      const plus5 = figure(drafts.letter, "a-machine-with-a-gap");
      expect(run(plus5, 3)).toBe(8);
      expect(run(plus5, 10)).toBe(15);
      expect([...Array(21).keys()].filter((x) => run(plus5, x) === plus5.target)).toEqual([7]);
      expect(first.key("hook")).toBe(plus5.target! - 5);
      // 3x: 4 gives 12, not 34.
      expect(run(figure(drafts.letter, "three-lots-of-x"), 4)).toBe(12);
      expect(3 * 4).not.toBe(34);
      // 3x − 4 at 5: multiply first gives 11; subtracting first would give 3. 2 + 3 × 4 is 14.
      const threeX = figure(drafts.letter, "which-step-goes-first");
      expect(run(threeX, 5)).toBe(3 * 5 - 4);
      expect(3 * 5).toBe(15);
      expect(3 * 5 - 4).toBe(11);
      expect(3 * (5 - 4)).toBe(3);
      expect(2 + 3 * 4).toBe(14);
      // The practice machine runs 3x − 4 at 6, and every slip is what its mistake produces.
      expect(first.key("order")).toBe(run(figure(drafts.letter, "run-the-machine"), 6));
      expect(first.slips("order")).toEqual(
        sorted([
          3 * (6 - 4), // subtracted first
          6 - 4, // forgot the multiplication
          3 + 6 - 4, // read 3x as 3 + x
          3 * 6, // stopped after the first box
          Number("36") - 4, // read 3x as the digits 3 and 6
        ]),
      );
      // x + 5 = 12 at 4 leaves the balance tipped; 2x + 1 = 9 at 4 is level.
      const level = figure(drafts.letter, "testing-a-number");
      expect(left(level, 4)).toBe(9);
      expect(level.right).toBe(12);
      expect([...Array(21).keys()].filter((x) => left(level, x) === level.right)).toEqual([7]);
      const faded = figure(drafts.letter, "test-a-number-with-help");
      expect(left(faded, 4)).toBe(faded.right);
      // The taxi machine is 3 + 2m: multiply by 2, then add 3.
      expect(first.key("taxi")).toBe(run(figure(drafts.letter, "a-taxi-fare"), 7));
      // The skill check, and the near miss the closing screen mentions.
      expect(first.key("check-1")).toBe(3 * 4 + 2);
      expect(5 * 3 - 2).toBe(13);
    });

    it("lesson 2: the marbles, the scales and the temperature", () => {
      // Six loose marbles come off both pans: 10 − 6 leaves 4.
      expect(10 - 6).toBe(4);
      // x + 3 = 11 gives 8; taking 3 from the left only gives x = 11, and 11 + 3 is 14, not 11.
      const marbles = figure(drafts.balance, "an-equation-is-a-balance");
      expect(11 - 3).toBe(8);
      expect(left(marbles, 8)).toBe(marbles.right);
      expect(left(marbles, 11)).toBe(14);
      expect(left(marbles, 11)).not.toBe(marbles.right);
      // Three bags balance 12, so one bag balances 4.
      const bags = figure(drafts.balance, "undoing-with-the-opposite");
      expect(left(bags, 12 / 3)).toBe(bags.right);
      // 4x + 3 = 19 becomes 4x = 16 and x = 4, and the check is 4 × 4 + 3.
      const two = figure(drafts.balance, "two-moves-on-the-scales");
      expect(two.right! - two.constant!).toBe(16);
      expect(16 / two.coefficient!).toBe(4);
      expect(left(two, 4)).toBe(two.right);
      // 2x − 4 = −10: add 4 to get −6, halve to get −3, and the check is 2 × (−3) − 4.
      const below = figure(drafts.balance, "when-the-numbers-go-below-zero");
      expect(below.right! - below.constant!).toBe(-10 + 4);
      expect(-10 + 4).toBe(-6);
      expect(-6 / 2).toBe(-3);
      expect(left(below, -3)).toBe(below.right);
      // The worked example's check line and the practice figures match their questions.
      expect(3 * 7 + 2).toBe(23);
      expect(left(figure(drafts.balance, "one-move-on-the-scales"), key("3"))).toBe(20);
      expect(left(figure(drafts.balance, "keep-it-level"), solve(2, 6, 18))).toBe(18);
      expect(left(figure(drafts.balance, "your-turn-with-help"), key("2"))).toBe(20);
      expect(left(figure(drafts.balance, "a-different-sign"), key("4"))).toBe(-15);
    });

    it("lesson 3: the round run backwards, the machines and the fraction", () => {
      // Treble then take away 9 gives 21: undo by adding 9 and dividing by 3. The wrong order
      // (divide first, then add) lands on 16, which the machine turns into 39.
      const round = figure(drafts.undoing, "running-a-calculation-backwards");
      expect(round.target).toBe(21);
      expect((21 + 9) / 3).toBe(10);
      expect(run(round, 10)).toBe(21);
      expect(21 / 3 + 9).toBe(16);
      expect(run(round, 16)).toBe(39);
      // 2x + 5 = 11: subtract 5, halve, and the machine agrees at 3.
      const reading = figure(drafts.undoing, "reading-the-jobs-from-an-equation");
      expect((11 - 5) / 2).toBe(3);
      expect(run(reading, 3)).toBe(reading.target);
      // 5x − 3 = 12 and the worked check line.
      expect((12 + 3) / 5).toBe(3);
      expect(5 * 3 - 3).toBe(12);
      // 3(x + 2): add 2 then multiply by 3, so 4 gives 18.
      expect(run(figure(drafts.undoing, "brackets-make-a-package"), 4)).toBe(3 * (4 + 2));
      // 5x − 2 = 12 has the solution 14/5 = 2.8, which is not a whole number.
      const whole = figure(drafts.undoing, "answers-need-not-be-whole");
      expect(whole.target).toBe(12);
      expect(12 + 2).toBe(14);
      expect(14 / 5).toBeCloseTo(2.8, 10);
      expect(run(whole, 2.8)).toBeCloseTo(whole.target!, 9);
      expect(Number.isInteger(14 / 5)).toBe(false);
      expect([...Array(6).keys()].filter((x) => run(whole, x) === whole.target)).toEqual([]);
      // The first lesson's near miss: 3 gives 13, one too many.
      expect(run(whole, 3)).toBe(13);
      // The faded example reads the route off 2x + 3 and finishes at 7.
      expect(undoing.choiceMarked("1")).toEqual(["a"]);
      expect((17 - 3) / 2).toBe(7);
    });
  });

  describe("the arithmetic and figures quoted in lessons 4 to 6", () => {
    type Plane = {
      points: Array<{ x: number; y: number; label: string }>;
      line?: { gradient: number; intercept: number };
      min: number;
      max: number;
    };
    const plane = (draft: Draft, stepId: string) =>
      draft.lesson.steps.find((step) => step.id === stepId)!.diagram as unknown as Plane;
    const pair = (p: { x: number; y: number }) => [p.x, p.y] as const;
    const gradient = (a: readonly number[], b: readonly number[]) =>
      (b[1]! - a[1]!) / (b[0]! - a[0]!);

    it("lesson 4: the walks, the swap and the axes", () => {
      // The opener's note and the first figure: 3 across, 2 up.
      expect(pair(plane(drafts.point, "directions-from-the-camp").points[0]!)).toEqual([3, 2]);
      // Swapping (4, 1) gives (1, 4), a different spot.
      const [p, q] = plane(drafts.point, "which-number-comes-first").points;
      expect(pair(p!)).toEqual([4, 1]);
      expect(pair(q!)).toEqual([p!.y, p!.x]);
      expect(pair(p!)).not.toEqual(pair(q!));
      // The two diggers: out by one square across and one up. Each slip is what its mistake gives.
      expect(Math.abs(3 - 2) + Math.abs(2 - 3)).toBe(point.key("hook"));
      expect(point.slips("hook")).toEqual(sorted([0, 1, 3 + 2]));
      // Signs: (−5, 2) is left and up, (3, −4) is right and down.
      const [r, s] = plane(drafts.point, "past-the-camp").points;
      expect([Math.sign(r!.x), Math.sign(r!.y)]).toEqual([-1, 1]);
      expect([Math.sign(s!.x), Math.sign(s!.y)]).toEqual([1, -1]);
      // The axes: (−4, 0) is on the x-axis and (0, 3) on the y-axis.
      const [e, f] = plane(drafts.point, "the-lines-through-the-camp").points;
      expect(e!.y).toBe(0);
      expect(f!.x).toBe(0);
      // The chest at (−2, −3) is 2 + 3 squares away and the faded example places (4, −2).
      expect(point.key("walk")).toBe(Math.abs(-2) + Math.abs(-3));
      expect(point.slips("walk")).toEqual(sorted([-5, 3 - 2]));
      expect(point.key("4")).toBe(-2);
      // Every figure sits inside its grid.
      for (const step of drafts.point.lesson.steps) {
        const grid = step.diagram as unknown as Plane | undefined;
        for (const g of grid?.points ?? [])
          for (const v of [g.x, g.y]) {
            expect(v).toBeGreaterThanOrEqual(grid!.min);
            expect(v).toBeLessThanOrEqual(grid!.max);
          }
      }
    });

    it("lesson 5: the two paths, the staircase and the falling line", () => {
      // 30 metres over 15 and over 60: 2 and 0.5, so the short path is four times as steep.
      expect(30 / 15).toBe(2);
      expect(30 / 60).toBe(0.5);
      expect(30 / 15 / (30 / 60)).toBe(4);
      expect(steep.key("hook")).toBe(18 / 6);
      // (1, 2) to (4, 5): run 3, rise 3, gradient 1, and the drawn line passes through both.
      const rise = plane(drafts.steep, "rise-and-run");
      const [a, b] = rise.points;
      expect(b!.x - a!.x).toBe(3);
      expect(b!.y - a!.y).toBe(3);
      expect(gradient(pair(a!), pair(b!))).toBe(1);
      // (2, 3) to (5, 9): rise 6, run 3, gradient 2. Reversing only the run gives −2.
      expect(9 - 3).toBe(6);
      expect(5 - 2).toBe(3);
      expect(6 / 3).toBe(2);
      expect(6 / (2 - 5)).toBe(-2);
      // (0, 6) to (3, 0): rise −6, run 3, gradient −2, flat lines give 0, and 3 climbs faster than 1/2.
      const fall = plane(drafts.steep, "uphill-downhill-and-flat");
      expect(gradient(pair(fall.points[0]!), pair(fall.points[1]!))).toBe(-2);
      expect(fall.line).toEqual({ gradient: -2, intercept: 6 });
      expect(0 / 3).toBe(0);
      expect(3).toBeGreaterThan(1 / 2);
      // The practice figures show the points their questions ask about.
      const lone = (id: string) => plane(drafts.steep, id).points.map(pair);
      expect(steep.key("1")).toBe(lone("measure-the-rise")[1]![1] - lone("measure-the-rise")[0]![1]);
      expect(steep.key("3")).toBe(gradient(lone("on-your-own")[0]!, lone("on-your-own")[1]!));
      expect(steep.key("4")).toBe(gradient(lone("a-gentle-slope")[0]!, lone("a-gentle-slope")[1]!));
    });

    it("lesson 6: the candle, the drawn lines and the reading of an equation", () => {
      // The candle: 12 cm, 2 cm an hour. 5 hours leaves 2, and 3 hours leaves 6.
      const height = (hours: number) => 12 - 2 * hours;
      expect(height(1)).toBe(10);
      expect(height(2)).toBe(8);
      expect(height(5)).toBe(2);
      expect(line.key("hook")).toBe(height(3));
      const candle = plane(drafts.line, "the-candle-on-a-graph");
      expect(candle.line).toEqual({ gradient: -2, intercept: 12 });
      for (const p of candle.points) {
        expect(p.y).toBe(height(p.x));
        expect(p.y).toBe(candle.line!.gradient * p.x + candle.line!.intercept);
      }
      // The grid is too short for the 12 cm start, so the candle's first point is hour 1.
      expect(candle.max).toBeLessThan(12);
      expect(candle.points.map((p) => p.x)).not.toContain(0);
      // y = 2x − 3 through (0, −3) and (3, 3), gradient 2, and 2x = 14 gives x = 7.
      const drawn = plane(drafts.line, "drawing-a-line-from-its-equation");
      expect(drawn.points.map(pair)).toEqual([
        [0, 2 * 0 - 3],
        [3, 2 * 3 - 3],
      ]);
      expect(gradient([0, -3], [3, 3])).toBe(2);
      expect(14 / 2).toBe(7);
      // The line through (0, 5) and (2, 1): c = 5, m = −2, and x = 2 gives 1.
      const read = plane(drafts.line, "reading-the-equation-off-a-line");
      expect(gradient(pair(read.points[0]!), pair(read.points[1]!))).toBe(-2);
      expect(-2 * 2 + 5).toBe(1);
      expect(read.line).toEqual({ gradient: -2, intercept: 5 });
      // Every line drawn in a teaching figure passes through each of its points.
      for (const step of drafts.line.lesson.steps) {
        const grid = step.diagram as unknown as Plane | undefined;
        if (!grid?.line) continue;
        for (const p of grid.points)
          expect(grid.line.gradient * p.x + grid.line.intercept).toBe(p.y);
      }
      for (const step of drafts.steep.lesson.steps) {
        const grid = step.diagram as unknown as Plane | undefined;
        if (!grid?.line) continue;
        for (const p of grid.points)
          expect(grid.line.gradient * p.x + grid.line.intercept).toBe(p.y);
      }
      // The container: 0.5 litres a minute from 2 litres, 4 minutes.
      expect(line.key("4")).toBe(0.5 * 4 + 2);
    });
  });

  it("lesson 3, undoing in the right order: keys match the arithmetic", () => {
    expect(undoing.key("hook")).toBe((20 - 4) / 2);
    expect(undoing.choiceMarked("1")).toEqual(["a"]);
    // Worked example 5x − 3 = 12 and the faded 2x + 3 = 17.
    expect((12 + 3) / 5).toBe(3);
    expect(5 * 3 - 3).toBe(12);
    expect(undoing.key("2")).toBe((17 - 3) / 2);
    expect(undoing.key("verify")).toBe(2 * 7 + 3);
    expect(letter.key("4")).toBe((14 + 4) / 3);
    expect(3 * letter.key("4") - 4).toBe(14);
    expect(undoing.key("3")).toBe(21 / 3 - 2);
    expect(3 * (undoing.key("3") + 2)).toBe(21);
    expect(undoing.key("4")).toBe((1.5 + 2) * 4);
    expect(undoing.key("4") / 4 - 2).toBe(1.5);
    expect(undoing.key("practice-1")).toBe((14 - 2) / 4 + 1);
    expect(4 * (undoing.key("practice-1") - 1) + 2).toBe(14);
    expect(undoing.key("practice-2")).toBe((4 - 1) / 4);
    expect(letter.key("practice-1")).toBe((4 - 1) * 2);
    expect(letter.key("practice-1") / 2 + 1).toBe(4);
    expect(undoing.choiceMarked("why-last-first")).toEqual(["a"]);
    // Slips: each wrong value is what the named mistake really produces.
    expect(undoing.slips("hook")).toEqual(sorted([(20 + 4) / 2, 20 - 4]));
    expect(undoing.slips("2")).toEqual(sorted([14, (17 + 3) / 2, 17 / 2 - 3]));
    expect(undoing.slips("3")).toEqual(sorted([21 / 3, 21 - 2]));
    expect(undoing.slips("4")).toEqual(sorted([1.5 + 2, 1.5 * 4]));
    expect(undoing.slips("practice-1")).toEqual(sorted([(14 - 2) / 4, 14 - 2]));
    expect(undoing.slips("practice-2")).toEqual(sorted([4 - 1, (4 + 1) / 4]));
    expect(letter.slips("4")).toEqual(sorted([3 * 6, 14 - 4]));
    expect(letter.slips("practice-1")).toEqual(sorted([4 - 1, (4 + 1) * 2]));
  });

  it("lesson 4, a point is a pair: keys match the coordinates", () => {
    // Hook: treasure (3, 2), friend (2, 3): one square along each axis.
    expect(point.key("hook")).toBe(Math.abs(3 - 2) + Math.abs(2 - 3));
    expect(point.key("1")).toBe([3, 2][0]);
    expect(point.choiceMarked("2")).toEqual(["a"]);
    expect(point.key("3")).toBe([-3, 2][0]);
    expect(point.key("4")).toBe([4, -2][1]);
    expect(point.choiceMarked("why-left")).toEqual(["a"]);
    expect(point.key("walk")).toBe(Math.abs(-2) + Math.abs(-3));
    expect(point.key("practice-1")).toBe(-5);
    expect(point.key("practice-2")).toBe(0);
    const swapped = [7, -4].reverse();
    expect(point.key("practice-3")).toBe(swapped[0]);
    expect(point.slips("3")).toEqual(sorted([3, 2]));
    expect(point.slips("4")).toEqual(sorted([2, 4]));
    expect(point.slips("practice-3")).toEqual(sorted([4, 7]));
  });

  it("lesson 5, how steep is it: keys match rise over run", () => {
    const gradient = (a: number[], b: number[]) => (b[1]! - a[1]!) / (b[0]! - a[0]!);
    expect(steep.key("hook")).toBe(18 / 6);
    expect(steep.key("1")).toBe(5 - 1);
    expect(gradient([1, 2], [3, 12])).toBe(5);
    expect(steep.key("2")).toBe(gradient([0, 1], [2, 5]));
    expect(steep.key("3")).toBe(gradient([-2, 3], [2, -1]));
    expect(steep.key("4")).toBe(gradient([-2, -1], [2, 1]));
    expect(steep.choiceMarked("why-same-order")).toEqual(["a"]);
    expect(steep.choiceMarked("practice-1")).toEqual(["a"]);
    expect(steep.key("practice-2")).toBe(gradient([1, 4], [5, 4]));
    expect(steep.key("practice-3")).toBe(gradient([2, 9], [4, 3]));
    expect(steep.slips("hook")).toEqual(sorted([18 * 6, 18 - 6]));
    expect(steep.slips("1")).toEqual(sorted([5, 1 + 5]));
    expect(steep.slips("2")).toEqual(sorted([2 / 4, 4]));
    expect(steep.slips("3")).toEqual(sorted([1, -4]));
    expect(steep.slips("practice-3")).toEqual(sorted([3, 3 - 9]));
  });

  it("lesson 6, from equation to line: keys match the equations", () => {
    expect(line.key("hook")).toBe(12 - 3 * 2);
    expect(line.key("1")).toBe(2 * 0 + 1);
    expect(3 * 0 - 1).toBe(-1);
    expect(3 * 2 - 1).toBe(5);
    expect((5 - -1) / 2).toBe(3);
    expect(line.key("2")).toBe(-2 + 3);
    // Through (0, −2) and (2, 2): c = −2, m = (2 − −2) / 2 = 2, so y = 2x − 2.
    expect(line.choiceMarked("3")).toEqual(["a"]);
    expect((2 - -2) / 2).toBe(2);
    expect(2 * 2 - 2).toBe(2);
    expect(line.key("4")).toBe(0.5 * 4 + 2);
    expect(line.key("practice-1")).toBe((6 - 2) / (3 - 1));
    expect(line.key("practice-2")).toBe(10 / 2);
    expect(line.key("practice-3")).toBe(3 * 2 + 4);
    expect(line.choiceMarked("why-two-points")).toEqual(["a"]);
    expect(line.slips("hook")).toEqual(sorted([12 - 2, 12 + 3 * 2]));
    expect(line.slips("1")).toEqual(sorted([2 + 1, 0]));
    expect(line.slips("2")).toEqual(sorted([2 + 3, -2 - 3]));
    expect(line.slips("4")).toEqual(sorted([0.5 * 4, 4 + 2]));
    expect(line.slips("practice-1")).toEqual(sorted([2 / 4, 4]));
    expect(line.slips("practice-2")).toEqual(sorted([2 * 10, 10 - 2]));
    expect(line.slips("practice-3")).toEqual(sorted([3 * 2, 3 + 4 + 2]));
  });

  it("the one-tap checks left in the drafts match their arithmetic", () => {
    expect(balance.key("check-both-sides")).toBe(9 - 2);
    expect(balance.slips("check-both-sides")).toEqual(sorted([9 + 2, 9]));
    expect(balance.choiceMarked("check-inverse")).toEqual(["a"]);
    expect(undoing.choiceMarked("check-package")).toEqual(["a"]);
    expect(steep.key("check-run")).toBe(6 - 2);
    expect(steep.slips("check-run")).toEqual(sorted([9 - 1, 2 - 6]));
    // (1, 7) to (3, 1): y falls as x rises, so the gradient is negative.
    expect(Math.sign((1 - 7) / (3 - 1))).toBe(-1);
    expect(steep.choiceMarked("check-direction")).toEqual(["b"]);
    expect(line.key("check-intercept")).toBe(5 * 0 + 2);
    expect(line.slips("check-intercept")).toEqual(sorted([5, 5 + 2]));
    // Every screen asks something, except a story lesson's screens that only teach.
    for (const { lesson: item } of all)
      for (const step of item.steps)
        if (!(step.kind === "explain" && !step.checkQuestionId))
          expect(step.checkQuestionId || step.workedSteps?.length).toBeTruthy();
  });

  it("never lets a misconception match the key or print it", () => {
    for (const { questions } of all)
      for (const item of questions) {
        if (item.answerAuthority.kind !== "numeric") continue;
        const value = item.answerAuthority.value;
        for (const m of item.misconceptions ?? []) {
          expect(m.match.numeric ?? []).not.toContain(value);
          expect(m.feedback).not.toMatch(
            new RegExp(`(^|[^\\d.])[-−]?${Math.abs(value)}($|[^\\d.a-z])`, "u"),
          );
        }
      }
  });

  it("grades only skills taught so far", () => {
    const taught = new Set<string>();
    for (const { lesson: item, questions } of all) {
      for (const skill of item.taughtSkills ?? []) taught.add(skill);
      for (const id of item.questionIds)
        expect(taught.has(questions.find((q) => q.id === id)!.skill!)).toBe(true);
    }
  });
});
