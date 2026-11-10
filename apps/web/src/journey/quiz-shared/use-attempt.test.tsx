import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { ModeProvider } from "../mode-context.js";
import { useAttempt } from "./use-attempt.js";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function Answer() {
  const attempt = useAttempt({
    id: "q",
    conceptIds: [],
    prompt: "A question",
    responseType: "short_text",
    difficulty: 1,
    hintCount: 0,
    sourceIds: [],
  });
  return (
    <>
      <input
        aria-label="Response"
        value={attempt.draft.kind === "text" ? attempt.draft.text : ""}
        onChange={(event) => attempt.setDraft({ kind: "text", text: event.currentTarget.value })}
      />
      <button
        type="button"
        onClick={() => {
          void attempt.send();
          void attempt.send();
        }}
      >
        Check
      </button>
      <p role="status">
        {attempt.busy ? "Checking" : (attempt.failure ?? attempt.result?.feedback ?? "Ready")}
      </p>
    </>
  );
}
describe("rapid answer submission", () => {
  it("keeps one request in flight and allows retry after a network failure", async () => {
    let reject: (reason: Error) => void = () => {};
    const fetch = vi.fn(
      () =>
        new Promise<Response>((_resolve, fail) => {
          reject = fail;
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const user = (await import("@testing-library/user-event")).default.setup();
    renderWithProviders(
      <ModeProvider lessonId="q">
        <Answer />
      </ModeProvider>,
    );
    await user.type(screen.getByLabelText("Response"), "my response");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(fetch).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Checking");
    await act(async () => reject(new Error("Offline")));
    expect(screen.getByRole("status")).toHaveTextContent("Discere’s engine isn’t responding.");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(fetch).toHaveBeenCalledTimes(2);
    await act(async () => reject(new Error("Offline")));
    vi.unstubAllGlobals();
  });
});

const lesson = { courseId: "course", lessonId: "lesson", stepId: "step" };
function LessonAnswer() {
  const attempt = useAttempt(
    {
      id: "q",
      conceptIds: [],
      prompt: "A question",
      responseType: "short_text",
      difficulty: 1,
      hintCount: 0,
      sourceIds: [],
    },
    lesson,
  );
  return (
    <>
      <button
        type="button"
        onClick={() => {
          attempt.setDraft({ kind: "text", text: "a guess" });
        }}
      >
        Fill
      </button>
      <button type="button" onClick={() => void attempt.send()}>
        Check
      </button>
      <p role="status">
        {attempt.phase}:{attempt.misses}:{attempt.lessonFeedback?.answer ?? "none"}
      </p>
    </>
  );
}
const wrongReply = {
  attemptId: "00000000-0000-4000-8000-000000000001",
  correct: false,
  feedback: "That is not the answer.",
  xpAwarded: 0,
  xpGained: 0,
  mastery: 0,
  independent: false,
  credit: "none",
  qualifying: true,
};
async function submitOnce(mode: "coach" | "exam", reply: Record<string, unknown>) {
  window.localStorage.setItem("discere:tutoring-mode:lesson", mode);
  const { calls } = stubFetch({
    "POST /api/attempts": { body: reply },
    "POST /api/attempts/00000000-0000-4000-8000-000000000001/lesson-feedback": {
      body: {
        attemptId: wrongReply.attemptId,
        correct: false,
        answer: "The worked answer.",
        blocks: [],
        reviewRequired: true,
      },
    },
  });
  const user = (await import("@testing-library/user-event")).default.setup();
  renderWithProviders(
    <ModeProvider lessonId="lesson">
      <LessonAnswer />
    </ModeProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Fill" }));
  await user.click(screen.getByRole("button", { name: "Check" }));
  return calls;
}
describe("the miss limit after a reload", () => {
  it("names the lesson so the server can count misses", async () => {
    const calls = await submitOnce("coach", { ...wrongReply, misses: 1, allowedMisses: 2 });
    expect(calls[0]).toMatchObject({ key: "POST /api/attempts", body: { lesson } });
    expect(screen.getByRole("status")).toHaveTextContent("retry:1:none");
  });
  it("opens the worked answer when the server says the last miss has been used", async () => {
    // The page was reloaded after one miss, so this is the first miss this page has seen.
    await submitOnce("coach", { ...wrongReply, misses: 2, allowedMisses: 2, closed: true });
    expect(screen.getByRole("status")).toHaveTextContent("revealed:2:The worked answer.");
  });
  it("closes the question in Exam mode without a worked answer", async () => {
    const calls = await submitOnce("exam", {
      ...wrongReply,
      misses: 2,
      allowedMisses: 2,
      closed: true,
    });
    expect(screen.getByRole("status")).toHaveTextContent("closed:2:none");
    expect(calls).toHaveLength(1);
  });
});
