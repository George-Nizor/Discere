import { readdirSync } from "node:fs";
import path from "node:path";
import { CODE_ANSWER_IDEA, type CourseBundle } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import {
  checkTypeScriptExercises,
  findTypeScriptTools,
  loadCourseBundle,
  validateCourseBundle,
} from "../src/index.js";

const content = path.resolve(import.meta.dirname, "../../../content");
const tools = findTypeScriptTools();
const courses = readdirSync(content, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name);
const course = "typescript-and-node";
const exercise = "typn-what-types-are-for-code-annotate-add";

/** The TypeScript course with one exercise changed, to show the checks notice. */
async function withExercise(
  change: (question: CourseBundle["questions"][number]) => void,
  id = exercise,
): Promise<CourseBundle> {
  const bundle = structuredClone(await loadCourseBundle(path.join(content, course, "bundle.json")));
  change(bundle.questions.find((item) => item.id === id)!);
  return bundle;
}

describe("TypeScript exercises in lessons", () => {
  it("keeps the shape the app marks: a call or named values, the example first, hints", async () => {
    const messages = (bundle: CourseBundle) =>
      validateCourseBundle(bundle)
        .issues.filter((issue) => issue.code === "CODE_QUESTION_SHAPE")
        .map((issue) => issue.message);
    expect(messages(await withExercise((question) => question.typescriptCases!.reverse()))).toContain(
      "The visible example must be the first case.",
    );
    expect(messages(await withExercise((question) => (question.hints = [])))).toContain(
      "A TypeScript exercise offers a hint.",
    );
    expect(
      messages(
        await withExercise((question) => {
          if (question.code?.language === "typescript") delete question.code.typeCheck;
        }),
      ),
    ).toContain("Type tests need typeCheck, since they are compiled and never run.");
    expect(
      messages(
        await withExercise((question) => {
          if (question.code?.language === "typescript") question.code.names = ["sum"];
        }),
      ),
    ).toContain("A TypeScript exercise is judged on a function call or on named values, one of them.");
  });

  it("gives each lesson of the first module's first five three exercises, getting harder", async () => {
    const bundle = await loadCourseBundle(path.join(content, course, "bundle.json"));
    const questions = new Map(bundle.questions.map((question) => [question.id, question]));
    for (const lesson of bundle.lessons.slice(0, 5)) {
      const exercises = lesson.steps.flatMap((step) => {
        const question = questions.get(step.checkQuestionId ?? "");
        return question?.code?.language === "typescript" ? [{ step, question }] : [];
      });
      expect(exercises.length, lesson.id).toBe(3);
      for (const { step, question } of exercises) {
        expect(step.kind, question.id).toBe("try");
        expect(question.answerAuthority, question.id).toMatchObject({
          kind: "text",
          acceptedIdeas: [CODE_ANSWER_IDEA],
        });
        expect(question.hints, question.id).toHaveLength(3);
        expect(question.sourceIds.length, question.id).toBeGreaterThan(0);
        // An exercise never comes first: the idea it practises is taught before it.
        expect(lesson.steps.indexOf(step), question.id).toBeGreaterThan(0);
      }
      const levels = exercises.map(({ question }) => question.difficulty);
      expect(levels, lesson.id).toEqual([...levels].sort((a, b) => a - b));
    }
    // The questions that were there before are all still there.
    expect(bundle.questions.filter((question) => !question.code)).toHaveLength(160);
  });

  // These run the real compiler and Node. Without them they are reported as skipped.
  describe.skipIf(!tools)("run with " + (tools ? "tsc and Node" : "no TypeScript compiler here"), () => {
    it("passes every worked program and no starter, in every course", async () => {
      let exercises = 0;
      for (const name of courses) {
        const bundle = await loadCourseBundle(path.join(content, name, "bundle.json"));
        const report = checkTypeScriptExercises(bundle, tools!);
        expect(report.issues, name).toEqual([]);
        exercises += report.exercises;
      }
      expect(exercises).toBeGreaterThanOrEqual(15);
    }, 240000);

    it("reports a worked program that returns the wrong value", async () => {
      const bundle = await withExercise((question) => {
        if (question.answerAuthority.kind === "text")
          question.answerAuthority.exampleAnswer =
            "function add(a: number, b: number): number {\n  return a - b;\n}\n";
      });
      const report = checkTypeScriptExercises(bundle, tools!);
      expect(report.issues[0]).toBe(
        exercise + ": the worked program fails, test 1 (add(2, 3)): expected 5, got -1",
      );
    }, 60000);

    it("reports a worked program with a type error, one that uses any, and one a type test catches", async () => {
      const answer = (program: string) =>
        withExercise((question) => {
          if (question.answerAuthority.kind === "text") question.answerAuthority.exampleAnswer = program;
        });
      const typed = checkTypeScriptExercises(
        await answer("function add(a: number, b: number): string {\n  return a + b;\n}\n"),
        tools!,
      ).issues;
      expect(typed[0]).toContain("Line 2: A value is being stored where its type does not fit.");
      const loose = checkTypeScriptExercises(
        await answer("function add(a: any, b: any): number {\n  return a + b;\n}\n"),
        tools!,
      ).issues;
      expect(loose[0]).toContain("line 1: This exercise does not allow 'any'");
      const strings = checkTypeScriptExercises(
        await answer("function add(a: number | string, b: number): number {\n  return Number(a) + b;\n}\n"),
        tools!,
      ).issues;
      expect(strings).toEqual([
        exercise + ": the worked program fails, type test: `add` still accepts a string. Annotate both parameters as `number`.",
      ]);
    }, 60000);

    it("reports a starter that already passes, and counts a type test as a way to fail", async () => {
      const bundle = await withExercise((question) => {
        if (question.code?.language === "typescript" && question.answerAuthority.kind === "text")
          question.code.starter = question.answerAuthority.exampleAnswer;
      });
      expect(checkTypeScriptExercises(bundle, tools!).issues).toEqual([
        exercise + ": the starter code already compiles and passes every test",
      ]);
      // This starter returns the right values; only its types are wrong.
      const zip = await loadCourseBundle(path.join(content, course, "bundle.json"));
      const question = zip.questions.find((item) => item.id === "typn-generics-code-generic-zip")!;
      delete question.typescriptTypeTests;
      expect(checkTypeScriptExercises(zip, tools!).issues).toEqual([
        "typn-generics-code-generic-zip: the starter code already compiles and passes every test",
      ]);
    }, 60000);
  });
});
