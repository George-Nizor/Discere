import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { platform, tmpdir } from "node:os";
import { join } from "node:path";
import { assessTextAnswer } from "@discere/assessment-engine";
import {
  type CourseBundle,
  ORDER_ANSWER_IDEA,
  type Question,
  SORT_ANSWER_IDEA,
} from "@discere/contracts";
import { describe, expect, it } from "vitest";

/**
 * Linux and the Command Line follows the way Git and Version Control asks questions
 * (docs/question-writing-guide.md), adapted to a tool used in situations: most questions put a
 * listing, an error message or the output of a pipeline in front of the learner and ask what it
 * means or what to run. Every output was produced by running the command in bash with GNU
 * coreutils, and the scenarios below run them again, so a change in a tool shows up here.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL("../../../content/linux-and-the-command-line/bundle.json", import.meta.url),
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

type Scenario = {
  script: string;
  opts?: { inodes?: boolean; unordered?: boolean; nonRoot?: boolean };
  lines: string[];
};
const scenarios = JSON.parse(
  readFileSync(new URL("./linux-questions-scenarios.json", import.meta.url), "utf8"),
) as Scenario[];

/** Long listings show the owner, group, date and directory size of whoever runs the test. */
function normalise(text: string, dir: string): string {
  const out = text
    .split(dir)
    .join("/home/ana/work")
    .replace(/^(bash|[\w.-]+\.sh): line \d+: /gmu, (match, program: string) =>
      program === "bash" ? "bash: " : match,
    );
  return out
    .split("\n")
    .map((line) => {
      const m = /^( *\d+ )?([-dl][rwxsStT-]{9}\.? +\d+ )(\S+) +(\S+) /u.exec(line);
      if (!m) return line;
      let next = line.replace(m[0], `${m[1] ?? ""}${m[2]}bo dev `);
      next = next.replace(/ [A-Z][a-z]{2} [ \d]\d [\d:]{4,5} /u, " Nov 14 09:30 ");
      return next.replace(/^( *\d+ )?(d\S+ +\d+ bo dev +)\d+/u, "$1$24096");
    })
    .join("\n");
}
function renumberInodes(text: string): string {
  const seen = new Map<string, number>();
  return text.replace(/^ *(\d+) (?=[-dl][rwxsStT-]{9})/gmu, (_all, n: string) => {
    if (!seen.has(n)) seen.set(n, 1170391 + seen.size);
    return `${seen.get(n)} `;
  });
}
function run(scenario: Scenario): string[] {
  const dir = mkdtempSync(join(tmpdir(), "linux-q-"));
  try {
    const result = spawnSync(
      "bash",
      ["--noprofile", "--norc", "-c", `exec 2>&1; export LC_ALL=C; ${scenario.script}`],
      {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, HOME: dir, LC_ALL: "C" },
      },
    );
    let text = (result.stdout ?? "").replace(/\n$/u, "");
    if (scenario.opts?.inodes) text = renumberInodes(text);
    return normalise(text, realpathSync(dir)).split("\n");
  } finally {
    spawnSync("chmod", ["-R", "u+rwx", dir]);
    rmSync(dir, { recursive: true, force: true });
  }
}
const canRun =
  platform() === "linux" && spawnSync("bash", ["-c", "true"]).status === 0 && !!process.getuid;
const isRoot = process.getuid?.() === 0;

describe("outputs shown in the questions of Linux and the Command Line", () => {
  it.skipIf(!canRun)("come from running the commands", () => {
    for (const scenario of scenarios) {
      if (scenario.opts?.nonRoot && isRoot) continue;
      let got = run(scenario);
      let want = scenario.lines;
      if (scenario.opts?.unordered) {
        got = [...got].sort();
        want = [...want].sort();
      }
      expect(got, scenario.script).toEqual(want);
    }
  });

  it("shows only lines that a scenario printed, apart from two kept commands and three lines of systemctl status", () => {
    const printed = new Set(scenarios.flatMap((scenario) => scenario.lines));
    const status = new Set([
      "echo one  two   three",
      "head -n 2 notes.txt | tail -n 1",
      "× report-web.service - /usr/bin/cat /etc/report-web.conf",
      "     Active: failed (Result: exit-code) since Sat 2026-11-14 01:23:42 AEDT; 1s ago",
      "    Process: 402055 ExecStart=/usr/bin/cat /etc/report-web.conf (code=exited, status=1/FAILURE)",
    ]);
    let shown = 0;
    for (const question of bundle.questions)
      for (const line of question.prompt.split("\n")) {
        const fenced = /^`(.+)`$/u.exec(line);
        if (!fenced?.[1]) continue;
        shown += 1;
        expect(printed.has(fenced[1]) || status.has(fenced[1]), `${question.id}: ${line}`).toBe(
          true,
        );
      }
    expect(shown).toBeGreaterThanOrEqual(40);
  });
});

describe("questions in Linux and the Command Line", () => {
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

  it("keeps numeric questions to places where the number is the point", () => {
    const numeric = bundle.questions.filter((question) => kind(question) === "numeric");
    expect(numeric.length).toBeLessThanOrEqual(12);
    for (const question of numeric) expect(question.hints.length, question.id).toBe(3);
  });

  it("puts a listing, an error or a command in front of the learner in most questions", () => {
    const outputs = bundle.questions.filter((question) =>
      question.prompt.split("\n").some((line) => /^`[^`]+`$/u.test(line)),
    );
    expect(outputs.length).toBeGreaterThanOrEqual(30);
    const situation =
      /`[^`]*\b(ls|cd|cat|grep|find|rm|cp|mv|kill|chmod|echo|sort|wc|man)\b[^`]*`|\byou\b|\byour\b/iu;
    expect(
      bundle.questions.filter((question) => situation.test(question.prompt)).length,
    ).toBeGreaterThanOrEqual(bundle.questions.length * 0.7);
  });

  it("keeps dashes out of questions, hints, feedback and review cards", () => {
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
  });

  it("keeps verdict words out of feedback", () => {
    for (const question of bundle.questions) {
      const text = [
        question.onCorrect ?? "",
        ...(question.misconceptions ?? []).map((m) => m.feedback),
      ];
      for (const entry of text)
        expect(entry, question.id).not.toMatch(/^(Correct|Not quite|Wrong|Right)\b/u);
    }
  });

  const choiceQuestions = bundle.questions.filter(
    (question) =>
      question.choices && question.choices.length >= 3 && question.answerAuthority.kind === "text",
  );
  const rightOf = (question: Question) => {
    const authority = question.answerAuthority;
    if (authority.kind !== "text") throw new Error("not text");
    return (question.choices ?? []).filter(
      (choice) => assessTextAnswer(choice.label, authority).correct,
    );
  };

  it("marks one option right and explains each wrong one", () => {
    const places = new Set<string>();
    for (const question of bundle.questions) {
      if (!question.choices || question.answerAuthority.kind !== "text") continue;
      const right = rightOf(question);
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

  it("makes the right option strictly the longest in at most 30%, never more than 15% longer, strictly the shortest in at most 40%", () => {
    let longest = 0;
    let shortest = 0;
    for (const question of choiceQuestions) {
      const right = rightOf(question)[0];
      const others = (question.choices ?? []).filter((choice) => choice !== right);
      const longestOther = Math.max(...others.map((choice) => choice.label.length));
      const shortestOther = Math.min(...others.map((choice) => choice.label.length));
      const length = right?.label.length ?? 0;
      if (length > longestOther) longest += 1;
      if (length < shortestOther) shortest += 1;
      expect(length, question.id).toBeLessThanOrEqual(longestOther * 1.15);
      const ends = new Set((question.choices ?? []).map((c) => c.label.trimEnd().endsWith(".")));
      expect(ends.size, `${question.id} full stops`).toBe(1);
    }
    expect(longest).toBeLessThanOrEqual(Math.floor(choiceQuestions.length * 0.3));
    expect(shortest).toBeLessThanOrEqual(Math.floor(choiceQuestions.length * 0.4));
  });

  it("uses all of order, sort, multiple choice and short text, with 8 to 12 order and sort questions", () => {
    const counts = { numeric: 0, choice: 0, typed: 0, order: 0, sort: 0 };
    for (const question of bundle.questions) counts[kind(question)] += 1;
    expect(counts.order).toBeGreaterThanOrEqual(3);
    expect(counts.sort).toBeGreaterThanOrEqual(5);
    expect(counts.order + counts.sort).toBeGreaterThanOrEqual(8);
    expect(counts.order + counts.sort).toBeLessThanOrEqual(12);
    expect(counts.choice + counts.typed).toBeGreaterThanOrEqual(bundle.questions.length * 0.8);
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

  it("teaches the usual mistakes: an unquoted name, a truncating redirect, chmod 777 and sudo as the fix", () => {
    const text = bundle.questions
      .map((question) =>
        [
          question.prompt,
          ...(question.choices ?? []).map((choice) => choice.label),
          ...(question.misconceptions ?? []).map((item) => item.feedback),
        ].join(" "),
      )
      .join("\n");
    for (const phrase of [
      /rm Q3 report\.txt/u,
      /sort data > data/u,
      /chmod 777/u,
      /sudo/u,
      /\$dir/u,
      /rm \*/u,
    ])
      expect(phrase.test(text), String(phrase)).toBe(true);
  });

  it("never offers chmod 777 or sudo as the right answer", () => {
    for (const question of choiceQuestions) {
      const right = rightOf(question)[0]?.label ?? "";
      expect(right, question.id).not.toMatch(/chmod 777|sudo/u);
    }
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

  it("marks the short-text answers that learners are likely to give", () => {
    const answers: Record<string, { right: string[]; wrong: string[] }> = {
      "lincl-looking-at-files-practice-2-v2": {
        right: ["newline", "a newline", "the newline character"],
        wrong: ["space", "word", "tab"],
      },
      "lincl-regular-expressions-practice-3-v2": {
        right: ["anchors", "anchor", "the anchors"],
        wrong: ["wildcards", "operators", "classes"],
      },
      "lincl-links-inodes-and-mounts-dangling-name": {
        right: ["dangling", "broken", "a broken link"],
        wrong: ["hard", "deleted", "empty"],
      },
      "lincl-variables-environment-and-path-practice-1-v2": {
        right: ["PATH", "$PATH", "the PATH variable"],
        wrong: ["HOME", "PWD", "SHELL"],
      },
    };
    for (const [id, cases] of Object.entries(answers)) {
      const question = questions.get(id) as Question;
      if (question.answerAuthority.kind !== "text") throw new Error(id);
      for (const text of cases.right)
        expect(assessTextAnswer(text, question.answerAuthority).correct, `${id} ${text}`).toBe(
          true,
        );
      for (const text of cases.wrong)
        expect(assessTextAnswer(text, question.answerAuthority).correct, `${id} ${text}`).toBe(
          false,
        );
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

  it("keeps review cards free of the arithmetic they once drilled", () => {
    const ids = new Set(bundle.flashcards.map((card) => card.id));
    for (const id of [
      "lincl-looking-at-files-card-3-v2",
      "lincl-changing-files-card-2-v2",
      "lincl-links-inodes-and-mounts-card-2-v2",
    ])
      expect(ids.has(id), id).toBe(true);
    for (const card of bundle.flashcards)
      expect(card.front, card.id).not.toMatch(/How many lines does/u);
  });
});
