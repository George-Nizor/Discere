import { readdirSync } from "node:fs";
import path from "node:path";
import { CODE_ANSWER_IDEA, type CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  checkPythonExercises,
  findPython,
  importedLibraries,
  loadCourseBundle,
  pythonLibraries,
  validateCourseBundle,
} from "../src/index.js";

const content = path.resolve(import.meta.dirname, "../../../content");
const python = findPython();
const libraries = python ? pythonLibraries(python) : [];
const dataLibraries = libraries.includes("numpy") && libraries.includes("pandas");
const courses = readdirSync(content, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name);

/** The Python course with one exercise changed, to show the checks notice. */
async function withExercise(
  change: (question: CourseBundle["questions"][number]) => void,
): Promise<CourseBundle> {
  const bundle = structuredClone(
    await loadCourseBundle(path.join(content, "python-for-data-analysis", "bundle.json")),
  );
  change(bundle.questions.find((item) => item.id === "python-run-and-bind-code-total")!);
  return bundle;
}

describe("Python exercises in lessons", () => {
  it("keeps the shape the app marks: named values or a call, the example first, hints", async () => {
    const wrongExample = await withExercise((question) => {
      question.pythonCases!.reverse();
    });
    const noHints = await withExercise((question) => {
      question.hints = [];
    });
    const missingName = await withExercise((question) => {
      if (question.code?.language === "python") question.code.names = ["total", "missing"];
    });
    const messages = (bundle: CourseBundle) =>
      validateCourseBundle(bundle)
        .issues.filter((issue) => issue.code === "CODE_QUESTION_SHAPE")
        .map((issue) => issue.message);
    expect(messages(wrongExample)).toContain("The visible example must be the first case.");
    expect(messages(noHints)).toContain("A Python exercise offers a hint.");
    expect(messages(missingName)).toContain(
      "Every case gives an expected value for each judged name.",
    );
  });

  it("gives every lesson two or three exercises, each with a worked program", async () => {
    const bundle = await loadCourseBundle(
      path.join(content, "python-for-data-analysis", "bundle.json"),
    );
    const questions = new Map(bundle.questions.map((question) => [question.id, question]));
    expect(bundle.lessons).toHaveLength(21);
    for (const lesson of bundle.lessons) {
      const exercises = lesson.steps.flatMap((step) => {
        const question = questions.get(step.checkQuestionId ?? "");
        return question?.code?.language === "python" ? [{ step, question }] : [];
      });
      expect(exercises.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(exercises.length, lesson.id).toBeLessThanOrEqual(3);
      for (const { step, question } of exercises) {
        expect(step.kind, question.id).toBe("try");
        expect(question.answerAuthority, question.id).toMatchObject({
          kind: "text",
          acceptedIdeas: [CODE_ANSWER_IDEA],
        });
        expect(question.pythonCases!.length, question.id).toBeGreaterThanOrEqual(3);
        expect(question.sourceIds.length, question.id).toBeGreaterThan(0);
      }
      // Exercises get harder within the lesson.
      const levels = exercises.map(({ question }) => question.difficulty);
      expect(levels, lesson.id).toEqual([...levels].sort((a, b) => a - b));
    }
  });

  // These run real Python. Without an interpreter they are reported as skipped, never as passed.
  describe.skipIf(!python)("run with " + (python ?? "no Python 3.10 or later on this machine"), () => {
    it("passes every worked program and no starter, in every course", async () => {
      let exercises = 0;
      for (const course of courses) {
        const bundle = await loadCourseBundle(path.join(content, course, "bundle.json"));
        const report = checkPythonExercises(bundle, python!);
        expect(report.issues, course).toEqual([]);
        exercises += report.exercises - report.skipped.length;
      }
      // The 24 exercises of lessons 1 to 8 need nothing but Python itself.
      expect(exercises).toBeGreaterThanOrEqual(24);
    }, 240000);

    it("lists an exercise that needs NumPy or pandas as skipped where the library is absent", async () => {
      const bundle = await loadCourseBundle(
        path.join(content, "python-for-data-analysis", "bundle.json"),
      );
      const needing = bundle.questions
        .filter(
          (question) =>
            question.code?.language === "python" &&
            importedLibraries(
              question.code.starter +
                "\n" +
                (question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : ""),
            ).length > 0,
        )
        .map((question) => question.id);
      // Lessons 9 to 21 use the libraries: three exercises each.
      expect(needing).toHaveLength(39);
      const report = checkPythonExercises(bundle, python!, []);
      expect(report.exercises).toBe(63);
      expect(report.skipped).toEqual(needing);
      expect(report.issues).toEqual([]);
      // A fault in a skipped exercise is not reported, which is why skipped is never "passed".
      const broken = structuredClone(bundle);
      const question = broken.questions.find((item) => item.id === needing[0])!;
      if (question.answerAuthority.kind === "text") question.answerAuthority.exampleAnswer += "\nrow_count = -1\n";
      expect(checkPythonExercises(broken, python!, []).issues).toEqual([]);
    }, 120000);

    // Shown as skipped unless this Python has both libraries (DISCERE_PYTHON can name one that
    // has, such as data/python-runtime/bin/python). The sandbox test in apps/server covers them.
    it.skipIf(!dataLibraries)(
      "passes every NumPy and pandas worked program and no starter",
      async () => {
        const bundle = await loadCourseBundle(
          path.join(content, "python-for-data-analysis", "bundle.json"),
        );
        const report = checkPythonExercises(bundle, python!);
        expect(report.skipped).toEqual([]);
        expect(report.issues).toEqual([]);
        const broken = structuredClone(bundle);
        const question = broken.questions.find(
          (item) => item.id === "python-arrays-and-shape-code-measure",
        )!;
        if (question.answerAuthority.kind === "text") question.answerAuthority.exampleAnswer += "\nrow_count = -1\n";
        expect(checkPythonExercises(broken, python!).issues[0]).toContain(
          "python-arrays-and-shape-code-measure: the worked program fails test 1",
        );
      },
      240000,
    );

    it("reports a worked program that fails a test, with expected and actual values", async () => {
      const bundle = await withExercise((question) => {
        if (question.answerAuthority.kind === "text")
          question.answerAuthority.exampleAnswer = "total = price + quantity\ndelivery = 5\nto_pay = total + delivery\n";
      });
      const report = checkPythonExercises(bundle, python!);
      expect(report.issues).toHaveLength(4);
      expect(report.issues[0]).toBe(
        "python-run-and-bind-code-total: the worked program fails test 1 (price = 4, quantity = 3): expected total = 12, got total = 7",
      );
    });

    it("reports a worked program that stops with an error", async () => {
      const bundle = await withExercise((question) => {
        if (question.answerAuthority.kind === "text")
          question.answerAuthority.exampleAnswer = "total = cost * quantity\n";
      });
      expect(checkPythonExercises(bundle, python!).issues[0]).toContain("NameError");
    });

    it("reports a starter that already passes every test", async () => {
      const bundle = await withExercise((question) => {
        if (question.code?.language === "python" && question.answerAuthority.kind === "text")
          question.code.starter = question.answerAuthority.exampleAnswer;
      });
      expect(checkPythonExercises(bundle, python!).issues).toEqual([
        "python-run-and-bind-code-total: the starter code already passes every test",
      ]);
    });
  });
});
