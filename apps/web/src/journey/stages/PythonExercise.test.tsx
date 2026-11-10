import type { LearnerQuestion } from "@discere/contracts";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { ModeProvider } from "../mode-context.js";
import { QuestionBlock } from "./QuestionBlock.js";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const question: LearnerQuestion = {
  id: "python-total",
  conceptIds: ["python-run-and-bind"],
  prompt: "The names `price` and `quantity` are already set. Store the cost under `total`.",
  responseType: "code",
  difficulty: 1,
  hintCount: 2,
  sourceIds: ["py-intro"],
  code: {
    language: "python",
    starter: "# price and quantity are already set.\ntotal = 0\n",
    names: ["total"],
    example: { inputs: { price: 4, quantity: 3 }, expected: { total: 12 } },
  },
};
const ready = { body: { runtimes: [{ id: "python", name: "Python with NumPy and pandas", state: "ready" }] } };
const manual = {
  body: {
    runtimes: [
      {
        id: "python",
        name: "Python with NumPy and pandas",
        state: "manual",
        message: "Python practice needs its isolated runtime. Run pnpm python:setup in WSL, then restart Discere.",
      },
    ],
  },
};
const attemptId = "11111111-1111-4111-8111-111111111111";
const marked = (extra: object) => ({
  body: { attemptId, xpAwarded: 0, xpGained: 0, mastery: 0, independent: false, ...extra },
});

function renderExercise(onReady = vi.fn()) {
  renderWithProviders(
    <ModeProvider lessonId="lesson">
      <QuestionBlock inline context={undefined} question={question} onReady={onReady} />
    </ModeProvider>,
  );
  return onReady;
}
const editor = () => screen.getByLabelText("Your Python code") as HTMLTextAreaElement;

describe("a Python exercise in a lesson", () => {
  it("shows the prompt, the starter in an editor and the one visible example", async () => {
    stubFetch({ "GET /api/code-runtimes": ready });
    renderExercise();
    expect(screen.getByRole("heading")).toHaveTextContent("Store the cost under total.");
    expect(editor().value).toBe(question.code!.starter);
    expect(screen.getByText("Already set")).toBeInTheDocument();
    expect(screen.getByText("price = 4, quantity = 3")).toBeInTheDocument();
    expect(screen.getByText("total = 12")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/can't run on this computer/)).toBeNull());
  });

  it("runs the example and shows what was printed and what each name holds, or the error", async () => {
    let runs = 0;
    const { calls } = stubFetch({
      "GET /api/code-runtimes": ready,
      "POST /api/questions/python-total/run": () => {
        runs += 1;
        return runs === 1
          ? {
              body: {
                status: "ok",
                diagnostics: "",
                stdout: "working\n",
                stderr: "",
                values: [{ name: "total", value: "0" }],
              },
            }
          : {
              body: {
                status: "runtime_error",
                diagnostics: "",
                stdout: "",
                stderr: "",
                message: "NameError on line 2. Check variable names and imports.",
              },
            };
      },
    });
    renderExercise();
    await userEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("Ran successfully")).toBeInTheDocument();
    expect(screen.getByLabelText("Printed output")).toHaveTextContent("working");
    expect(screen.getByText("total = 0")).toBeInTheDocument();
    expect(calls.at(-1)).toMatchObject({ body: { code: question.code!.starter } });

    fireEvent.change(editor(), { target: { value: "total = cost\n" } });
    await userEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("Stopped with an error")).toBeInTheDocument();
    expect(screen.getByText(/NameError on line 2/)).toBeInTheDocument();
  });

  it("checks against the tests: the failed test with expected and actual values, then a pass", async () => {
    let checks = 0;
    stubFetch({
      "GET /api/code-runtimes": ready,
      "POST /api/attempts": () => {
        checks += 1;
        return checks === 1
          ? marked({
              correct: false,
              qualifying: true,
              misses: 1,
              feedback:
                "Test 2 of 3 failed. With `price = 10, quantity = 1`, the program should end with `total = 10`, but it ends with `total = 12`.",
              codeRun: {
                status: "ok",
                diagnostics: "",
                stdout: "",
                stderr: "",
                passed: 1,
                total: 3,
                failed: {
                  test: 2,
                  given: "price = 10, quantity = 1",
                  expected: "total = 10",
                  actual: "total = 12",
                },
              },
            })
          : marked({
              correct: true,
              qualifying: true,
              feedback: "It passes all 3 tests.",
              codeRun: { status: "ok", diagnostics: "", stdout: "", stderr: "", passed: 3, total: 3 },
            });
      },
    });
    const onReady = renderExercise();
    fireEvent.change(editor(), { target: { value: "total = 12\n" } });
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("A test failed: 1 of 3 tests passed")).toBeInTheDocument();
    expect(screen.getByText("Test 2")).toBeInTheDocument();
    expect(screen.getByText("Expected").nextElementSibling).toHaveTextContent("total = 10");
    expect(screen.getByText("Got").nextElementSibling).toHaveTextContent("total = 12");
    expect(screen.getByText("Not quite")).toBeInTheDocument();
    expect(onReady).not.toHaveBeenCalled();

    fireEvent.change(editor(), { target: { value: "total = price * quantity\n" } });
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByText("Ran successfully: 3 of 3 tests passed")).toBeInTheDocument();
    expect(screen.getByText("Correct")).toBeInTheDocument();
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  });

  it("offers a hint after a program that stopped with an error, which is not a miss", async () => {
    stubFetch({
      "GET /api/code-runtimes": ready,
      "POST /api/attempts": marked({
        correct: false,
        qualifying: false,
        misses: 0,
        feedback: "It stopped with an error, so no test could finish. The console shows what Python said. Fixing it does not use up a try.",
        codeRun: {
          status: "runtime_error",
          diagnostics: "",
          stdout: "",
          stderr: "",
          message: "NameError on line 1. Check variable names and imports.",
          passed: 0,
          total: 3,
        },
      }),
      [`POST /api/attempts/${attemptId}/hints`]: {
        body: { hint: "Use the names that are already set.", level: 1, remaining: 1 },
      },
    });
    renderExercise();
    fireEvent.change(editor(), { target: { value: "total = cost\n" } });
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("The program did not finish")).toBeInTheDocument();
    expect(screen.queryByText("Not quite")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Get a hint" }));
    expect(await screen.findByText("Use the names that are already set.")).toBeInTheDocument();
  });

  it("says so when Python cannot run, and lets the learner carry on without the exercise", async () => {
    stubFetch({ "GET /api/code-runtimes": manual });
    const onReady = renderExercise();
    expect(await screen.findByText("Python can't run on this computer yet")).toBeInTheDocument();
    expect(screen.getByText(/Run pnpm python:setup in WSL/)).toBeInTheDocument();
    expect(onReady).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Continue without this exercise" }));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/This exercise is set aside/)).toBeInTheDocument();
  });
});
