import type { LearnerQuestion } from "@discere/contracts";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { highlight } from "../../sql-projects/CodeEditor.js";
import { ModeProvider } from "../mode-context.js";
import { QuestionBlock } from "./QuestionBlock.js";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const question: LearnerQuestion = {
  id: "ts-add",
  conceptIds: ["static-type"],
  prompt: "Annotate both parameters, so that `add` takes two numbers.",
  responseType: "code",
  difficulty: 1,
  hintCount: 2,
  sourceIds: ["ts-handbook"],
  code: {
    language: "typescript",
    starter: "function add(a, b) {\n  return a + b;\n}\n",
    call: { name: "add", arguments: ["a", "b"] },
    example: { inputs: { a: 2, b: 3 }, expected: 5 },
    typeCheck: true,
  },
};
const ready = { body: { ready: true } };
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
const editor = () => screen.getByLabelText("Your TypeScript code") as HTMLTextAreaElement;
const settled = () => waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull());

describe("a TypeScript exercise in a lesson", () => {
  it("shows the starter, the example call and that the types are checked, with nothing to download", async () => {
    const { calls } = stubFetch({ "GET /api/typescript-runtime": ready });
    renderExercise();
    expect(editor().value).toBe(question.code!.starter);
    expect(screen.getByText("Example call")).toBeInTheDocument();
    expect(screen.getByText("add(2, 3)")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/Checked by the compiler before anything runs/)).toBeInTheDocument();
    await waitFor(() => expect(calls.some((call) => call.key.includes("/api/typescript-runtime"))).toBe(true));
    expect(screen.queryByText(/can't run on this computer/)).toBeNull();
    expect(calls.some((call) => call.key.includes("/api/code-runtimes"))).toBe(false);
  });

  it("shows the compiler's errors from Run, then what a program that compiles returned", async () => {
    let runs = 0;
    stubFetch({
      "GET /api/typescript-runtime": ready,
      "POST /api/questions/ts-add/run": () => {
        runs += 1;
        return runs === 1
          ? {
              body: {
                status: "compile_error",
                diagnostics: "Line 1: This parameter has no type, and the compiler will not guess one.",
                stdout: "",
                stderr: "",
                message: "The compiler found a type error, so the program was not run.",
              },
            }
          : { body: { status: "ok", diagnostics: "", stdout: "adding\n", stderr: "", returned: "5" } };
      },
    });
    renderExercise();
    await userEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("Did not compile")).toBeInTheDocument();
    expect(screen.getByText(/Line 1: This parameter has no type/)).toBeInTheDocument();
    fireEvent.change(editor(), { target: { value: "function add(a: number, b: number) { return a + b; }" } });
    await userEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("Ran successfully")).toBeInTheDocument();
    expect(screen.getByLabelText("Printed output")).toHaveTextContent("adding");
    expect(screen.getByText("Returned")).toHaveTextContent("Returned 5");
  });

  it("does not treat a type error as a miss, and reports a failed type test with its message", async () => {
    let checks = 0;
    stubFetch({
      "GET /api/typescript-runtime": ready,
      "POST /api/attempts": () => {
        checks += 1;
        return checks === 1
          ? marked({
              correct: false,
              qualifying: false,
              misses: 0,
              closed: false,
              feedback: "No test ran, because the compiler stopped first.",
              codeRun: { status: "compile_error", diagnostics: "Line 1: no type", stdout: "", stderr: "" },
            })
          : marked({
              correct: false,
              qualifying: true,
              misses: 1,
              closed: false,
              feedback: "The values are right, but the types are not what was asked for.",
              codeRun: {
                status: "ok",
                diagnostics: "",
                stdout: "",
                stderr: "",
                passed: 5,
                total: 6,
                message: "`add` still accepts a string.",
              },
            });
      },
    });
    const onReady = renderExercise();
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await settled();
    expect(await screen.findByText("The program does not compile yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show the worked program" })).toBeNull();
    fireEvent.change(editor(), { target: { value: "function add(a: number | string, b: number) { return 1; }" } });
    await userEvent.click(screen.getByRole("button", { name: /^Check/ }));
    await settled();
    expect(await screen.findByText("A test failed: 5 of 6 tests passed")).toBeInTheDocument();
    expect(document.querySelector(".rust-console-message")).toHaveTextContent("add still accepts a string.");
    expect(document.querySelector(".rust-console-message code")).toHaveTextContent("add");
    expect(onReady).not.toHaveBeenCalled();
  });

  it("says so where TypeScript cannot run, and lets the lesson go on without the exercise", async () => {
    stubFetch({ "GET /api/typescript-runtime": { body: { ready: false } } });
    const onReady = renderExercise();
    expect(await screen.findByText("TypeScript can't run on this computer yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue without this exercise" }));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(screen.getByText("This exercise is set aside. Continue when you're ready.")).toBeInTheDocument();
  });

  it("colours TypeScript's keywords, strings and comments", () => {
    const kinds = (code: string) =>
      highlight(code, "typescript").flatMap((part) =>
        typeof part === "object" && part !== null && "props" in part
          ? [String((part.props as { className: string }).className).replace("code-token code-token--", "")]
          : [],
      );
    expect(kinds('const a: number = 1; // note\nconst s = `x ${a}`;')).toEqual([
      "keyword",
      "keyword",
      "number",
      "comment",
      "keyword",
      "string",
    ]);
  });
});
