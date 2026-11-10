import { existsSync } from "node:fs";
import path from "node:path";
import type { PythonExecution, PythonInputs } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { assessPython, pythonTask } from "../src/python-projects/questions.js";
import { IsolatedPythonRuntime, type PythonRuntime } from "../src/python-projects/runtime.js";

const course = "python-for-data-analysis";
const lesson = "run-and-bind";
const exercise = "python-run-and-bind-code-total";
const SOLUTION = "total = price * quantity\ndelivery = 5\nto_pay = total + delivery\n";

/**
 * Stands in for the sandbox with just enough of this one exercise: it "runs" the worked
 * program, a program that adds where it should multiply, one that never sets `to_pay`, and one
 * that stops with an error.
 */
function scripted(available = true): PythonRuntime & { programs: string[] } {
  const programs: string[] = [];
  return {
    programs,
    available: async () => available,
    execute: async (code: string, inputs: PythonInputs): Promise<PythonExecution> => {
      programs.push(code);
      if (!available) return { error: "runtime", message: "Python practice is not set up." };
      const price = inputs["price"] as number;
      const quantity = inputs["quantity"] as number;
      if (code.includes("boom"))
        return { error: "code", message: "NameError on line 1. Check variable names and imports.", output: "" };
      const total = code.includes("price + quantity") ? price + quantity : price * quantity;
      return {
        output: code.includes("print(") ? "hello\n" : "",
        result: {
          total,
          delivery: 5,
          ...(code.includes("to_pay =") ? { to_pay: total + 5 } : {}),
        },
      };
    },
  };
}

const start = (pythonRuntime: PythonRuntime) =>
  createApp({ dbPath: ":memory:", migrate: true, revealDelayMs: 0, pythonRuntime });
type App = Awaited<ReturnType<typeof createApp>>["app"];
const step = { courseId: course, lessonId: lesson, stepId: "write-the-total" };
const check = (app: App, response: string, questionId = exercise, mode = "coach") =>
  app.inject({
    method: "POST",
    url: "/api/attempts",
    payload: { questionId, response, mode, lesson: step },
  });
const WRONG = SOLUTION.replace("*", "+");

describe("lesson questions answered with Python", () => {
  it("sends the starter and one example, and never the tests or the worked program", async () => {
    const { app } = await start(scripted());
    try {
      const journey = await app.inject({ url: `/api/courses/${course}/lessons/${lesson}/journey` });
      expect(journey.statusCode).toBe(200);
      expect(journey.body).toContain('"language":"python"');
      expect(journey.body).toContain("# price and quantity are already set.");
      expect(journey.body).toContain('"example":{"inputs":{"price":4,"quantity":3}');
      expect(journey.body).not.toContain("pythonCases");
      expect(journey.body).not.toContain("total = price * quantity");
      expect(journey.body).not.toContain('"quantity":6');
    } finally {
      await app.close();
    }
  });

  it("runs the example without marking it", async () => {
    const runtime = scripted();
    const { app } = await start(runtime);
    try {
      const run = await app.inject({
        method: "POST",
        url: `/api/questions/${exercise}/run`,
        payload: { code: "print('hello')\ntotal = price * quantity\ndelivery = 5\n" },
      });
      expect(run.json()).toEqual({
        status: "ok",
        diagnostics: "",
        stdout: "hello\n",
        stderr: "",
        values: [
          { name: "total", value: "12" },
          { name: "delivery", value: "5" },
          { name: "to_pay", value: "not set yet" },
        ],
      });
      // The judged names are gathered by a line added after the learner's own.
      expect(runtime.programs[0]).toContain('for name in ("total", "delivery", "to_pay",)');
      const stopped = await app.inject({
        method: "POST",
        url: `/api/questions/${exercise}/run`,
        payload: { code: "boom" },
      });
      expect(stopped.json()).toMatchObject({ status: "runtime_error", message: expect.stringContaining("NameError") });
    } finally {
      await app.close();
    }
  });

  it("marks by running every test, and names the first test that fails with both values", async () => {
    const { app } = await start(scripted());
    try {
      const wrong = (await check(app, SOLUTION.replace("*", "+"))).json();
      expect(wrong).toMatchObject({
        correct: false,
        qualifying: true,
        misses: 1,
        codeRun: {
          status: "ok",
          passed: 0,
          total: 4,
          failed: {
            test: 1,
            given: "price = 4, quantity = 3",
            expected: "total = 12",
            actual: "total = 7",
          },
        },
      });
      expect(wrong.feedback).toBe(
        "Test 1 of 4 failed. With `price = 4, quantity = 3`, the program should end with `total = 12`, but it ends with `total = 7`.",
      );
      const unset = (await check(app, "total = price * quantity\ndelivery = 5\n")).json();
      expect(unset.feedback).toContain("should end with `to_pay = 17`, but `to_pay` was never given a value.");
    } finally {
      await app.close();
    }
  });

  it("does not count a program that stops with an error as a miss, and accepts the worked one", async () => {
    const { app } = await start(scripted());
    try {
      const stopped = (await check(app, "boom")).json();
      expect(stopped).toMatchObject({
        correct: false,
        qualifying: false,
        misses: 0,
        codeRun: { status: "runtime_error", message: expect.stringContaining("NameError") },
      });
      expect(stopped.feedback).toContain("An error is not counted as a wrong answer.");
      const right = (await check(app, SOLUTION)).json();
      expect(right).toMatchObject({ correct: true, codeRun: { passed: 4, total: 4 } });
      expect(right.codeRun.failed).toBeUndefined();
      expect(right.feedback).toBe("It passes all 4 tests.");
    } finally {
      await app.close();
    }
  });

  it("never closes a program for wrong results, and pays the lowest step once it is right", async () => {
    const { app, store } = await start(scripted());
    try {
      for (let turn = 1; turn <= 5; turn += 1) {
        const wrong = (await check(app, WRONG + "# try " + turn + "\n")).json();
        expect(wrong).toMatchObject({ correct: false, closed: false, misses: turn });
        expect(wrong.allowedMisses).toBeUndefined();
      }
      expect(store.questionCards()).toEqual([]);
      const right = (await check(app, SOLUTION)).json();
      // Five misses and no help: recovered, at the quarter every late try is paid.
      expect(right).toMatchObject({ correct: true, credit: "recovered", independent: false, xpAwarded: 5 });
    } finally {
      await app.close();
    }
  });

  it("shows the worked program only on request after a wrong result, and closes the question as revealed", async () => {
    const { app, store } = await start(scripted());
    try {
      const reveal = (attemptId: string) =>
        app.inject({ method: "POST", url: `/api/attempts/${attemptId}/lesson-feedback`, payload: step });
      // An error alone is not a wrong result, so there is nothing to reveal yet.
      const stopped = (await check(app, "boom")).json();
      const early = await reveal(stopped.attemptId);
      expect(early.statusCode).toBe(409);
      expect(early.json()).toMatchObject({ code: "LESSON_NEEDS_RESPONSE" });
      const wrong = (await check(app, WRONG)).json();
      expect(wrong).toMatchObject({ correct: false, closed: false, misses: 1 });
      const shown = await reveal(wrong.attemptId);
      expect(shown.statusCode).toBe(200);
      expect(shown.json()).toMatchObject({ correct: false, reviewRequired: true });
      expect(shown.json().answer).toContain("total = price * quantity");
      expect(store.questionCards()).toMatchObject([{ questionId: exercise }]);
      const after = await app.inject({
        method: "POST",
        url: "/api/attempts",
        payload: { questionId: exercise, response: SOLUTION, mode: "coach", lesson: step, attemptId: wrong.attemptId },
      });
      expect(after.statusCode).toBe(409);
      expect(after.json()).toMatchObject({ code: "ANSWER_ALREADY_REVEALED" });
      // Typing the program in afterwards is a new attempt, and it is credited as revealed.
      expect((await check(app, SOLUTION)).json()).toMatchObject({ correct: true, credit: "revealed", independent: false });
    } finally {
      await app.close();
    }
  });

  it("keeps Exam mode's two misses for a program, since Exam mode shows no answer", async () => {
    const { app, store } = await start(scripted());
    try {
      // An error still costs nothing in Exam mode.
      expect((await check(app, "boom", exercise, "exam")).json()).toMatchObject({ misses: 0, closed: false });
      expect((await check(app, WRONG, exercise, "exam")).json()).toMatchObject({ misses: 1, allowedMisses: 2, closed: false });
      expect((await check(app, WRONG + "# again\n", exercise, "exam")).json()).toMatchObject({ misses: 2, closed: true });
      expect(store.questionCards()).toMatchObject([{ questionId: exercise }]);
    } finally {
      await app.close();
    }
  });

  it("says plainly when Python cannot run, records nothing, and still lets the lesson finish", async () => {
    for (const available of [false, true]) {
      const { app, store } = await start(scripted(available));
      try {
        if (!available) {
          const refused = await check(app, SOLUTION);
          expect(refused.statusCode).toBe(503);
          expect(refused.json()).toMatchObject({ code: "PYTHON_UNAVAILABLE" });
          expect(store.hasQuestionEvidence(exercise, false)).toBe(false);
        }
        const journey = (await app.inject({ url: `/api/courses/${course}/lessons/${lesson}/journey` })).json();
        const stage = journey.stages.find((item: { type: string }) => item.type === "explainer");
        // Answer every step that is not a Python exercise until it is right or closed.
        for (const step of stage.steps) {
          const question = step.question;
          if (!question || question.code) continue;
          for (let turn = 0; turn < 4; turn += 1) {
            const response = question.choices
              ? question.choices[turn % question.choices.length].label
              : question.responseType === "numeric"
                ? "-987654"
                : "zzz";
            const marked = (
              await app.inject({
                method: "POST",
                url: "/api/attempts",
                payload: { questionId: question.id, response, mode: "coach", lesson: { courseId: course, lessonId: lesson, stepId: step.id } },
              })
            ).json();
            if (marked.correct || marked.closed) break;
          }
        }
        const finished = await app.inject({
          method: "PUT",
          url: `/api/courses/${course}/lessons/${lesson}/progress`,
          payload: { stageId: stage.id, state: "completed" },
        });
        if (available) {
          expect(finished.statusCode).toBe(409);
          expect(finished.json()).toMatchObject({ code: "STAGE_NEEDS_RESPONSE", detail: "step:write-the-total" });
        } else expect(finished.statusCode).toBe(200);
      } finally {
        await app.close();
      }
    }
  });
});

// The same marking on the real sandbox, where this machine has it (pnpm python:setup).
const directory =
  process.env["DISCERE_PYTHON_RUNTIME_DIR"] ??
  path.resolve(import.meta.dirname, "../../../data/python-runtime");
const sandboxed =
  process.platform === "linux" &&
  existsSync(path.join(directory, "lib/python3.12/site-packages/pandas")) &&
  existsSync("/usr/bin/bwrap");

describe.skipIf(!sandboxed)("Python exercises in the sandbox", () => {
  it("passes every worked program and fails every starter", async () => {
    const runtime = new IsolatedPythonRuntime({ directory });
    const { app, content } = await start(runtime);
    try {
      const exercises = content
        .bundle(course)!
        .questions.filter((question) => question.code?.language === "python");
      // Three in each of the 21 lessons, 39 of them written with NumPy or pandas.
      expect(exercises.length).toBe(63);
      expect(exercises.filter((question) => /^import (numpy|pandas)/mu.test(question.code!.starter)).length).toBe(39);
      for (const question of exercises) {
        const task = pythonTask(question)!;
        const worked = question.answerAuthority.kind === "text" ? question.answerAuthority.exampleAnswer : "";
        const solved = await assessPython(runtime, task, worked);
        expect(solved.correct, question.id + ": " + solved.feedback).toBe(true);
        const started = await assessPython(runtime, task, question.code!.starter);
        expect(started.correct, question.id).toBe(false);
      }
      // An error that only a hidden test provokes is reported against that test.
      const basket = await assessPython(
        runtime,
        pythonTask(content.getQuestion("python-keys-and-sets-code-basket")!)!,
        "total = prices[first] + prices[second]\nfirst_listed = first in prices\nsecond_listed = second in prices\n",
      );
      expect(basket).toMatchObject({ correct: false, qualifying: false });
      expect(basket.run.failed).toMatchObject({ test: 2, expected: "no error" });
      expect(basket.feedback).toContain("Test 2 of 4 stopped with an error");
      expect(basket.run.message).toContain("KeyError on line 1");
    } finally {
      await app.close();
    }
  }, 600000);
});
