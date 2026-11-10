import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/harness.js";
import { CheckSessionScreen } from "./CheckScreen.js";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const sessionId = "33333333-3333-4333-8333-333333333333";
const question = {
  id: "check-q",
  conceptIds: ["c"],
  responseType: "short_text",
  difficulty: 1,
  hintCount: 0,
  sourceIds: ["s"],
  choices: [
    { id: "a", label: "His image" },
    { id: "b", label: "The facts" },
  ],
};
function session(extra: object) {
  return {
    body: {
      id: sessionId,
      courseId: "history",
      courseTitle: "History",
      checkId: "checkpoint",
      kind: "checkpoint",
      title: "Checkpoint",
      description: "A check.",
      createdAt: "2026-11-11T09:00:00.000Z",
      total: 4,
      answered: 0,
      current: {
        lessonId: "l",
        visual: {
          type: "statements",
          title: "Statements",
          statements: [
            { label: "1", text: "One." },
            { label: "2", text: "Two." },
          ],
        },
        question: { ...question, ...extra },
      },
    },
  };
}
function open(extra: object) {
  stubFetch({ [`GET /api/course-check-sessions/${sessionId}`]: session(extra) });
  return renderWithProviders(
    <Routes>
      <Route path="/checks/:sessionId" element={<CheckSessionScreen />} />
    </Routes>,
    `/checks/${sessionId}`,
  );
}

describe("extracts in a course check", () => {
  it("shows a question's extract with its attribution, before the question", async () => {
    const { container } = open({
      prompt: "The text opens with this sentence. What is it evidence of?",
      extracts: [
        { text: "I restored liberty.", who: "Augustus, Res Gestae", when: "14 CE", kind: "His own record" },
      ],
    });
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveClass("has-quote");
    expect(heading.querySelector(".prompt-quote")).toHaveTextContent("I restored liberty.");
    expect(heading.querySelector(".prompt-attribution")).toHaveTextContent(
      "Augustus, Res Gestae, 14 CE. His own record.",
    );
    expect(heading.querySelector(".prompt-ask")).toHaveTextContent("What is it evidence of?");
    expect(container.textContent).not.toContain("> ");
  });

  it("shows a quoted paragraph of an older prompt as a quotation, without its marks", async () => {
    open({ prompt: "A chronicler writes.\n\n> So very narrowly did he survey.\n\nWhat does he think?" });
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading.querySelector(".prompt-quote")).toHaveTextContent(
      "So very narrowly did he survey.",
    );
    expect(heading.textContent).not.toContain(">");
  });

  it("leaves a plain prompt as one line", async () => {
    open({ prompt: "Which unit measures current?" });
    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).not.toHaveClass("has-quote");
    expect(heading).toHaveTextContent("Which unit measures current?");
  });
});
