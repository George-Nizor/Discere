import type { LearnerQuestion } from "@discere/contracts";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { ModeProvider } from "../mode-context.js";
import { QuestionBlock } from "./QuestionBlock.js";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const STARTER = "SELECT id, amount\nFROM orders\nWHERE status = 'paid' OR item = 'Book';\n";
const question: LearnerQuestion = {
  id: "sql-paid-books",
  conceptIds: ["sql-filter-the-rows"],
  prompt: "Return the `id` and `amount` of the orders that are both paid and for a Book.",
  responseType: "code",
  difficulty: 1,
  hintCount: 2,
  sourceIds: ["sqlite-expr"],
  code: {
    language: "sql",
    starter: STARTER,
    ordered: false,
    tables: [
      {
        name: "orders",
        columns: [
          { name: "id", type: "INTEGER" },
          { name: "item", type: "TEXT" },
          { name: "amount", type: "INTEGER" },
          { name: "status", type: "TEXT" },
        ],
        rows: [
          [101, "Desk", 80, "paid"],
          [102, "Book", 20, "paid"],
          [106, "Lamp", null, "pending"],
        ],
      },
    ],
  },
};
// A checkout: the Python sandbox is absent, which says nothing about SQL.
const noSandbox = {
  body: {
    runtimes: [
      { id: "python", name: "Python with NumPy and pandas", state: "manual", message: "Run pnpm python:setup in WSL." },
    ],
  },
};
const sqlReady = { body: { ready: true } };
const attemptId = "22222222-2222-4222-8222-222222222222";
const marked = (extra: object) => ({
  body: { attemptId, xpAwarded: 0, xpGained: 0, mastery: 0, independent: false, ...extra },
});
const ran = (extra: object) => ({ status: "ok", diagnostics: "", stdout: "", stderr: "", ...extra });
const inLesson = { courseId: "sql", lessonId: "lesson", stepId: "write-paid-books" };

function renderExercise(onReady = vi.fn(), props: Partial<Parameters<typeof QuestionBlock>[0]> = {}) {
  renderWithProviders(
    <ModeProvider lessonId="lesson">
      <QuestionBlock inline context={undefined} question={question} onReady={onReady} {...props} />
    </ModeProvider>,
  );
  return onReady;
}
const editor = () => screen.getByLabelText("Your SQL query") as HTMLTextAreaElement;

describe("an SQL exercise in a lesson", () => {
  it("shows the prompt, each table with its column types and rows, and the starter query", async () => {
    stubFetch({ "GET /api/code-runtimes": noSandbox, "GET /api/sql-runtime": sqlReady });
    renderExercise();
    expect(screen.getByRole("heading")).toHaveTextContent("both paid and for a Book");
    const table = within(screen.getByRole("region", { name: "orders input table" }));
    expect(table.getByRole("columnheader", { name: /amount\s*integer/ })).toBeInTheDocument();
    expect(table.getByRole("columnheader", { name: /item\s*text/ })).toBeInTheDocument();
    expect(table.getByText('"Desk"')).toBeInTheDocument();
    expect(table.getByText("NULL: missing value")).toBeInTheDocument();
    expect(editor().value).toBe(STARTER);
    // SQL does not run in the Python sandbox, so its setup message does not belong here.
    await waitFor(() => expect(screen.queryByText(/can't run on this computer/)).toBeNull());
    expect(screen.queryByText(/pnpm python:setup/)).toBeNull();
  });

  it("runs the query and shows the rows it returns, or what SQLite said", async () => {
    let runs = 0;
    const { calls } = stubFetch({
      "GET /api/code-runtimes": noSandbox,
      "GET /api/sql-runtime": sqlReady,
      "POST /api/questions/sql-paid-books/run": () => {
        runs += 1;
        return runs === 1
          ? {
              body: ran({
                table: {
                  columns: ["id", "amount"],
                  rows: [
                    [101, 80],
                    [102, 20],
                  ],
                  more: 3,
                },
              }),
            }
          : { body: { ...ran({}), status: "runtime_error", message: "no such column: statu" } };
      },
    });
    renderExercise();
    await userEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("Ran successfully")).toBeInTheDocument();
    const result = within(screen.getByRole("region", { name: "Query result" }));
    expect(result.getAllByRole("row")).toHaveLength(3);
    expect(result.getByRole("columnheader", { name: "amount" })).toBeInTheDocument();
    expect(screen.getByText(/The first 2 rows are shown, and 3 more rows were returned/)).toBeInTheDocument();
    expect(screen.queryByText("The program printed nothing.")).toBeNull();
    expect(calls.at(-1)).toMatchObject({ body: { code: STARTER } });

    fireEvent.change(editor(), { target: { value: "SELECT id FROM orders WHERE statu = 'paid'" } });
    await userEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(await screen.findByText("SQLite could not run the query")).toBeInTheDocument();
    expect(screen.getByText("no such column: statu")).toBeInTheDocument();
  });

  it("checks the result: what differs in plain words, an error that is not a miss, then a pass", async () => {
    let checks = 0;
    stubFetch({
      "GET /api/code-runtimes": noSandbox,
      "GET /api/sql-runtime": sqlReady,
      "POST /api/attempts": () => {
        checks += 1;
        return checks === 1
          ? marked({
              correct: false,
              qualifying: true,
              misses: 1,
              closed: false,
              feedback: "With the rows shown, your query returned 2 rows and 1 was expected.",
              codeRun: ran({
                passed: 0,
                total: 3,
                table: { columns: ["id", "amount"], rows: [[101, 80], [102, 20]] },
                failed: { test: 1, given: "the rows shown", expected: "1 row", actual: "2 rows" },
              }),
            })
          : checks === 2
            ? marked({
                correct: false,
                qualifying: false,
                misses: 1,
                closed: false,
                feedback:
                  "SQLite could not run the query. The console shows what it said. An error is not counted as a wrong answer.",
                codeRun: { ...ran({ passed: 0, total: 3 }), status: "runtime_error", message: 'near "FORM": syntax error' },
              })
            : marked({
                correct: true,
                qualifying: true,
                feedback: "It returns the expected rows in all 3 tests.",
                codeRun: ran({ passed: 3, total: 3, table: { columns: ["id", "amount"], rows: [[102, 20]] } }),
              });
      },
    });
    const onReady = renderExercise(vi.fn(), { context: inLesson });
    expect(screen.queryByRole("button", { name: "Show the worked query" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("A test failed: 0 of 3 tests passed")).toBeInTheDocument();
    expect(screen.getByText("With the rows shown, your query returned 2 rows and 1 was expected.")).toBeInTheDocument();
    expect(screen.getByText("Expected").nextElementSibling).toHaveTextContent("1 row");
    expect(screen.getByText("Got").nextElementSibling).toHaveTextContent("2 rows");
    expect(screen.getByText("Not quite")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show the worked query" })).toBeInTheDocument();
    expect(onReady).not.toHaveBeenCalled();

    fireEvent.change(editor(), { target: { value: "SELECT id, amount FORM orders" } });
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByText("The query did not run")).toBeInTheDocument();
    expect(screen.getByText('near "FORM": syntax error')).toBeInTheDocument();
    expect(screen.queryByText("Not quite")).toBeNull();

    fireEvent.change(editor(), { target: { value: STARTER.replace(" OR ", " AND ") } });
    await userEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByText("Ran successfully: 3 of 3 tests passed")).toBeInTheDocument();
    expect(screen.getByText("Correct")).toBeInTheDocument();
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  });

  it("shows the worked query only when asked for", async () => {
    stubFetch({
      "GET /api/code-runtimes": noSandbox,
      "GET /api/sql-runtime": sqlReady,
      "POST /api/attempts": marked({
        correct: false,
        qualifying: true,
        misses: 1,
        closed: false,
        feedback: "With the rows shown, your query returned 2 rows and 1 was expected.",
        codeRun: ran({ passed: 0, total: 3 }),
      }),
      [`POST /api/attempts/${attemptId}/lesson-feedback`]: {
        body: {
          attemptId,
          correct: false,
          answer: "SELECT id, amount\nFROM orders\nWHERE status = 'paid' AND item = 'Book';\n",
          blocks: [],
          reviewRequired: true,
        },
      },
    });
    const onReady = renderExercise(vi.fn(), { context: inLesson });
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await userEvent.click(await screen.findByRole("button", { name: "Show the worked query" }));
    expect(await screen.findByText("Here is the worked query")).toBeInTheDocument();
    expect(screen.getByText(/WHERE status = 'paid' AND item = 'Book';/)).toBeInTheDocument();
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  });

  it("says so when SQL cannot run, and lets the learner carry on without the exercise", async () => {
    stubFetch({ "GET /api/code-runtimes": noSandbox, "GET /api/sql-runtime": { body: { ready: false } } });
    const onReady = renderExercise();
    expect(await screen.findByText("SQL can't run on this computer yet")).toBeInTheDocument();
    expect(onReady).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Continue without this exercise" }));
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/This exercise is set aside/)).toBeInTheDocument();
  });

  it("offers the one-time download where an installed app has not fetched Python yet", async () => {
    stubFetch({
      "GET /api/code-runtimes": {
        body: {
          runtimes: [
            { id: "python", name: "Python with NumPy and pandas", state: "missing", downloadBytes: 62914560 },
          ],
        },
      },
      "GET /api/sql-runtime": { body: { ready: false } },
    });
    renderExercise();
    expect(
      await screen.findByRole("button", { name: "Download Python with NumPy and pandas" }),
    ).toBeInTheDocument();
  });
});
