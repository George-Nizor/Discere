import { readdirSync } from "node:fs";
import path from "node:path";
import { CODE_ANSWER_IDEA, type CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  checkSqlExercises,
  findPython,
  loadCourseBundle,
  validateCourseBundle,
} from "../src/index.js";

const content = path.resolve(import.meta.dirname, "../../../content");
const python = findPython();
const courses = readdirSync(content, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name);
const sqlCourse = () =>
  loadCourseBundle(path.join(content, "sql-from-rows-to-reports", "bundle.json"));
const FIRST = "sql-rows-and-keys-code-names-and-regions";

/** The SQL course with one exercise changed, to show the checks notice. */
async function withExercise(
  change: (question: CourseBundle["questions"][number]) => void,
  id = FIRST,
): Promise<CourseBundle> {
  const bundle = structuredClone(await sqlCourse());
  change(bundle.questions.find((item) => item.id === id)!);
  return bundle;
}

describe("SQL exercises in lessons", () => {
  it("keeps the shape the app marks: the visible tables first, the same columns, hints", async () => {
    const wrongFirst = await withExercise((question) => {
      question.sqlCases!.reverse();
    });
    const noHints = await withExercise((question) => {
      question.hints = [];
    });
    const otherColumns = await withExercise((question) => {
      question.sqlCases![1]!.tables[0]!.columns[1]!.name = "full_name";
    });
    const pythonCases = await withExercise((question) => {
      question.pythonCases = [
        { inputs: {}, expected: 1 },
        { inputs: { a: 1 }, expected: 2 },
      ];
    });
    const messages = (bundle: CourseBundle) =>
      validateCourseBundle(bundle)
        .issues.filter((issue) => issue.code === "CODE_QUESTION_SHAPE")
        .map((issue) => issue.message);
    expect(messages(await sqlCourse())).toEqual([]);
    expect(messages(wrongFirst)).toContain("The visible tables must be the first case.");
    expect(messages(noHints)).toContain("An SQL exercise offers a hint.");
    expect(messages(otherColumns)).toContain(
      "Every case uses the tables and columns the learner is shown.",
    );
    expect(messages(pythonCases)).toContain("An SQL exercise carries sqlCases and no other cases.");
  });

  it("gives every lesson two or three exercises and keeps the 148 questions it had", async () => {
    const bundle = await sqlCourse();
    const questions = new Map(bundle.questions.map((question) => [question.id, question]));
    expect(bundle.lessons).toHaveLength(15);
    expect(bundle.questions.filter((question) => question.responseType !== "code")).toHaveLength(148);
    for (const lesson of bundle.lessons) {
      const exercises = lesson.steps.flatMap((step) => {
        const question = questions.get(step.checkQuestionId ?? "");
        return question?.code?.language === "sql" ? [{ step, question }] : [];
      });
      expect(exercises.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(exercises.length, lesson.id).toBeLessThanOrEqual(3);
      // An exercise practises an idea, so it never opens a lesson.
      expect(lesson.steps[0]!.checkQuestionId, lesson.id).not.toBe(exercises[0]!.question.id);
      for (const { step, question } of exercises) {
        expect(step.kind, question.id).toBe("try");
        expect(question.answerAuthority, question.id).toMatchObject({
          kind: "text",
          acceptedIdeas: [CODE_ANSWER_IDEA],
        });
        // The visible rows and at least two other sets of rows.
        expect(question.sqlCases!.length, question.id).toBeGreaterThanOrEqual(3);
        expect(question.sourceIds.length, question.id).toBeGreaterThan(0);
        expect(question.prompt, question.id).not.toMatch(/—/u);
      }
      // Exercises get harder within the lesson.
      const levels = exercises.map(({ question }) => question.difficulty);
      expect(levels, lesson.id).toEqual([...levels].sort((a, b) => a - b));
    }
  });

  // These run real SQLite. Without an interpreter they are reported as skipped, never as passed.
  describe.skipIf(!python)("run with " + (python ?? "no Python 3.10 or later on this machine"), () => {
    it("returns the expected rows from every reference query and from no starter, in every course", async () => {
      let exercises = 0;
      for (const course of courses) {
        const bundle = await loadCourseBundle(path.join(content, course, "bundle.json"));
        const report = checkSqlExercises(bundle, python!);
        expect(report.issues, course).toEqual([]);
        exercises += report.exercises;
      }
      expect(exercises).toBeGreaterThanOrEqual(45);
    }, 240000);

    it("reports a reference query that returns other rows, one SQLite refuses, and a starter that passes", async () => {
      const otherRows = await withExercise((question) => {
        if (question.answerAuthority.kind === "text")
          question.answerAuthority.exampleAnswer = "SELECT name, region\nFROM customers\nWHERE id > 1;\n";
      });
      expect(checkSqlExercises(otherRows, python!).issues).toEqual([
        `${FIRST}: the reference query fails test 1: Your query returned 3 rows and 4 were expected.`,
        `${FIRST}: the reference query fails test 2: Your query returned 4 rows and 5 were expected.`,
        `${FIRST}: the reference query fails test 3: Your query returned 2 rows and 3 were expected.`,
      ]);
      const refused = await withExercise((question) => {
        if (question.answerAuthority.kind === "text")
          question.answerAuthority.exampleAnswer = "SELECT name, town\nFROM customers;\n";
      });
      expect(checkSqlExercises(refused, python!).issues[0]).toBe(
        `${FIRST}: the reference query fails test 1: no such column: town`,
      );
      const solved = await withExercise((question) => {
        if (question.code?.language === "sql" && question.answerAuthority.kind === "text")
          question.code.starter = question.answerAuthority.exampleAnswer;
      });
      expect(checkSqlExercises(solved, python!).issues).toEqual([
        `${FIRST}: the starter query already passes every test`,
      ]);
    });

    it("fails a query written to the visible rows alone on the rows it cannot see", async () => {
      // The average of the visible amounts is 48, and the starter has it typed in.
      const bundle = await withExercise((question) => {
        if (question.answerAuthority.kind === "text" && question.code?.language === "sql")
          question.answerAuthority.exampleAnswer = question.code.starter;
      }, "sql-ask-a-query-inside-a-query-code-below-the-average");
      const issues = checkSqlExercises(bundle, python!).issues;
      expect(issues.some((issue) => issue.includes("fails test 1"))).toBe(false);
      expect(issues.some((issue) => /fails test [23]/u.test(issue))).toBe(true);
    });
  });
});
