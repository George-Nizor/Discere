import type {
  RomanReferenceAction,
  RomanReferenceProgress,
  RomanReferenceQuestionId,
  RomanReferenceQuestionResponse,
  RomanReferenceQuestionResult,
} from "@discere/contracts";
import { RomanReferenceActionSchema } from "@discere/contracts";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routes } from "../routes.js";
import { createTestQueryClient, stubFetch } from "../test/harness.js";
import { defaultRomanReferenceProgress } from "./roman-reference-test-fixtures.js";

const PROGRESS_PATH =
  "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/progress";
const REFERENCE_ROOT = "/courses/roman-empire/lessons/rise-of-the-roman-empire/reference";

function questionPath(questionId: RomanReferenceQuestionId): string {
  return `${REFERENCE_ROOT}/questions/${questionId}`;
}

function gate3Progress(): RomanReferenceProgress {
  const progress = defaultRomanReferenceProgress();
  progress.activeBeat = "questions";
  progress.activeQuestionId = "turning-points";
  progress.opening = {
    order: ["augustus", "extent", "division", "deposition"],
    submittedOrder: ["augustus", "extent", "division", "deposition"],
    status: "checked",
    wasCorrect: true,
  };
  progress.augustus.completed = true;
  progress.expansion = {
    milestoneId: "117-ce",
    answerOpen: true,
    answer: "Roman territory expanded.",
    saved: true,
    completed: true,
  };
  return progress;
}

function responseFor(questionId: RomanReferenceQuestionId): RomanReferenceQuestionResponse {
  switch (questionId) {
    case "turning-points":
      return {
        kind: "ordering",
        order: ["augustus", "extent", "division", "deposition"],
      };
    case "476-continuity":
      return { kind: "selection", choiceId: "western-change" };
    case "map-117":
      return { kind: "multi_select", choiceIds: ["britain", "mesopotamia"] };
    case "two-sentence":
      return {
        kind: "free_response",
        text: "Roman territory expanded by 117 CE. Augustus kept republican offices while controlling the army and government.",
      };
  }
}

function responsesMatch(
  questionId: RomanReferenceQuestionId,
  response: RomanReferenceQuestionResponse,
): boolean {
  const expected = responseFor(questionId);
  if (response.kind !== expected.kind) return false;
  if (response.kind === "ordering" && expected.kind === "ordering") {
    return response.order.every((id, index) => expected.order[index] === id);
  }
  if (response.kind === "selection" && expected.kind === "selection") {
    return response.choiceId === expected.choiceId;
  }
  if (response.kind === "multi_select" && expected.kind === "multi_select") {
    return (
      response.choiceIds.length === expected.choiceIds.length &&
      response.choiceIds.every((id) => expected.choiceIds.includes(id))
    );
  }
  return (
    response.kind === "free_response" &&
    expected.kind === "free_response" &&
    response.text === expected.text
  );
}

function cloneProgress(progress: RomanReferenceProgress): RomanReferenceProgress {
  return structuredClone(progress);
}

function questionView(progress: RomanReferenceProgress, questionId: RomanReferenceQuestionId) {
  const view = progress.questions.find((candidate) => candidate.content.id === questionId);
  if (!view) throw new Error(`Missing question fixture: ${questionId}`);
  return view;
}

/**
 * The server derives the beat and the active question from state rather than storing them, and the
 * shared contract rejects a response where they disagree. The stub has to derive them the same way
 * or the interface never sees the payload it is being tested against.
 */
function refreshFrontier(progress: RomanReferenceProgress): void {
  progress.activeBeat =
    progress.opening.status === "editing"
      ? "opening"
      : !progress.augustus.completed
        ? "augustus"
        : !progress.expansion.completed
          ? "expansion"
          : progress.assessmentFinished
            ? "essay"
            : "questions";
  if (progress.activeBeat !== "questions") {
    progress.activeQuestionId = null;
    return;
  }
  progress.activeQuestionId =
    progress.questions.find(({ progress: item }) => {
      if (item.status === "editing") return true;
      if (item.status === "revealed" || item.result === "correct") return false;
      return item.mode !== "exam";
    })?.content.id ?? null;
}

interface StubOptions {
  failActions?: ReadonlySet<RomanReferenceAction["action"]>;
  results?: Partial<Record<RomanReferenceQuestionId, RomanReferenceQuestionResult>>;
}

function applyQuestionAction(
  progress: RomanReferenceProgress,
  action: RomanReferenceAction,
  options: StubOptions = {},
): RomanReferenceProgress {
  const next = cloneProgress(progress);
  next.updatedAt = "2026-08-22T09:00:00.000Z";

  switch (action.action) {
    case "update_question_draft": {
      questionView(next, action.questionId).progress.draft = structuredClone(action.response);
      break;
    }
    case "submit_question": {
      const item = questionView(next, action.questionId).progress;
      const result =
        options.results?.[action.questionId] ??
        (responsesMatch(action.questionId, action.response) ? "correct" : "incorrect");
      item.mode ??= action.mode;
      item.draft = structuredClone(action.response);
      item.submittedResponse = structuredClone(action.response);
      item.status = "submitted";
      item.result = action.mode === "exam" ? null : result;
      item.feedback =
        action.mode === "exam"
          ? null
          : action.questionId === "turning-points" && result === "correct"
            ? "Server feedback: 27 BCE, 117 CE, 395 CE, then 476 CE."
            : action.questionId === "476-continuity" && result !== "correct"
              ? "Server feedback: the western court changed while eastern Roman government continued."
              : result === "correct"
                ? "Server feedback: correct."
                : "Server feedback: revise this response.";
      item.revealedAnswer = null;
      break;
    }
    case "request_question_hint": {
      const item = questionView(next, action.questionId).progress;
      item.mode ??= action.mode;
      item.hints = [
        ...item.hints,
        { level: item.hints.length === 0 ? 1 : 2, text: "Server hint: compare the two sides." },
      ];
      break;
    }
    case "reveal_question": {
      const item = questionView(next, action.questionId).progress;
      item.mode ??= action.mode;
      item.status = "revealed";
      item.revealedAnswer = responseFor(action.questionId);
      break;
    }
    case "access_question_sources":
    case "access_question_tutor": {
      const item = questionView(next, action.questionId).progress;
      item.mode ??= action.mode;
      break;
    }
    case "finish_assessment":
      next.assessmentFinished = true;
      for (const view of next.questions) {
        const response = view.progress.submittedResponse;
        if (!response) continue;
        const result = responsesMatch(view.content.id, response) ? "correct" : "incorrect";
        view.progress.result = result;
        view.progress.feedback =
          result === "correct"
            ? `Server feedback released for ${view.content.id}.`
            : `Server revision feedback released for ${view.content.id}.`;
      }
      break;
    case "complete_expansion":
      next.expansion.completed = true;
      break;
    default:
      break;
  }

  refreshFrontier(next);
  return next;
}

function installQuestionStub(initial = gate3Progress(), options: StubOptions = {}) {
  let canonical = cloneProgress(initial);
  const actions: RomanReferenceAction[] = [];
  const fetch = stubFetch({
    [`GET ${PROGRESS_PATH}`]: () => ({ body: cloneProgress(canonical) }),
    [`PUT ${PROGRESS_PATH}`]: ({ body }) => {
      const action = RomanReferenceActionSchema.parse(body);
      actions.push(action);
      if (options.failActions?.has(action.action)) {
        return {
          status: 500,
          body: { code: "ACCESS_FAILED", message: "The authorised action failed." },
        };
      }
      canonical = applyQuestionAction(canonical, action, options);
      return { body: cloneProgress(canonical) };
    },
  });
  return { ...fetch, actions, read: () => cloneProgress(canonical) };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}

function installDeferredDraftStub(initial = gate3Progress()) {
  let canonical = cloneProgress(initial);
  let releaseFirstDraft: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    releaseFirstDraft = resolve;
  });
  const actions: RomanReferenceAction[] = [];
  let draftCount = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const path = (typeof url === "string" ? url : url.toString()).split("?")[0];
      const method = (init?.method ?? "GET").toUpperCase();
      if (path !== PROGRESS_PATH) throw new Error(`Unexpected request: ${method} ${path}`);
      if (method === "GET") return jsonResponse(cloneProgress(canonical));
      if (method !== "PUT" || typeof init?.body !== "string") {
        throw new Error(`Unexpected request: ${method} ${path}`);
      }
      const action = RomanReferenceActionSchema.parse(JSON.parse(init.body) as unknown);
      actions.push(action);
      canonical = applyQuestionAction(canonical, action);
      const response = cloneProgress(canonical);
      if (action.action === "update_question_draft") {
        draftCount += 1;
        if (draftCount === 1) await gate;
      }
      return jsonResponse(response);
    }),
  );

  return { actions, read: () => cloneProgress(canonical), releaseFirstDraft };
}

function renderReference(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const rendered = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...rendered, router };
}

function submitAllAsExam(progress: RomanReferenceProgress): RomanReferenceProgress {
  for (const view of progress.questions) {
    const response = responseFor(view.content.id);
    view.progress = {
      ...view.progress,
      draft: response,
      submittedResponse: response,
      status: "submitted",
      result: null,
      feedback: null,
      mode: "exam",
    };
  }
  progress.activeQuestionId = null;
  return progress;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

describe("Roman recovery reference Gate 3 questions", () => {
  it("keys valid future direct links by slug and recovers an invalid slug without a write", async () => {
    const fixture = installQuestionStub();
    const user = userEvent.setup();
    const { router } = renderReference(questionPath("476-continuity"));

    expect(
      await screen.findByRole("heading", {
        name: "Why is 476 CE an incomplete date for the end of Rome?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("?", { selector: "strong" })).toBeInTheDocument();
    expect(screen.queryByText("continues", { selector: "strong" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute(
      "href",
      questionPath("turning-points"),
    );

    await act(async () => router.navigate(questionPath("map-117")));
    expect(
      await screen.findByRole("heading", {
        name: "Select the two regions that show Rome’s reach from northwest to east in 117 CE.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Choose two.")).toBeInTheDocument();
    await user.click(screen.getByText("Read the map as text"));
    expect(
      screen.getByText(
        "The shaded territory surrounds the Mediterranean. Its northwestern edge crosses the Channel beyond Gaul, while its far eastern edge reaches beyond Syria.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Step 4").closest("li")).not.toHaveClass("is-reached");
    expect(screen.getByText("Step 7").closest("li")).toHaveAttribute("aria-current", "step");

    await act(async () => router.navigate(`${REFERENCE_ROOT}/questions/not-a-question`));
    expect(await screen.findByRole("heading", { name: "Question not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Course home" })).toHaveAttribute(
      "href",
      "/courses/roman-empire",
    );
    expect(fixture.actions).toEqual([]);
  });

  it("resumes the active question, then sends a finished assessment to the essay", async () => {
    const active = gate3Progress();
    for (const questionId of ["turning-points", "476-continuity"] as const) {
      const item = questionView(active, questionId).progress;
      const response = responseFor(questionId);
      item.draft = response;
      item.submittedResponse = response;
      item.status = "submitted";
      item.result = "correct";
      item.feedback = "Server feedback: correct.";
      item.mode = "coach";
    }
    active.activeQuestionId = "map-117";
    installQuestionStub(active);
    const first = renderReference("/courses/roman-empire");
    expect(await screen.findByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      questionPath("map-117"),
    );
    first.unmount();

    vi.unstubAllGlobals();
    const finished = applyQuestionAction(submitAllAsExam(gate3Progress()), {
      action: "finish_assessment",
    });
    installQuestionStub(finished);
    renderReference("/courses/roman-empire");
    expect(await screen.findByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      `${REFERENCE_ROOT}/essay`,
    );
  });

  it("supports Q1 keyboard and mouse ordering, hides dates, and renders only server feedback", async () => {
    const fixture = installQuestionStub(undefined, { results: { "turning-points": "correct" } });
    const user = userEvent.setup();
    renderReference(questionPath("turning-points"));

    const extent = await screen.findByRole("button", {
      name: "Roman territory reaches its greatest extent, position 1 of 4",
    });
    expect(screen.queryByText(/27 BCE|117 CE|395 CE|476 CE/)).not.toBeInTheDocument();
    extent.focus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("button", {
        name: "Roman territory reaches its greatest extent, position 2 of 4",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Roman territory reaches its greatest extent moved to position 2 of 4."),
    ).toBeInTheDocument();

    const division = screen.getByRole("button", {
      name: "The empire passes to separate eastern and western rulers, position 4 of 4",
    });
    const deposition = screen.getByRole("button", {
      name: "The last western emperor is removed, position 1 of 4",
    });
    fireEvent.dragStart(division);
    fireEvent.dragOver(deposition);
    fireEvent.drop(deposition);
    await waitFor(() =>
      expect(
        fixture.actions.filter(({ action }) => action === "update_question_draft"),
      ).toHaveLength(2),
    );

    await user.click(screen.getByRole("button", { name: "Check order" }));
    const feedback = await screen.findByText(
      "Server feedback: 27 BCE, 117 CE, 395 CE, then 476 CE.",
    );
    expect(feedback.closest("section")).toHaveAttribute("data-result", "correct");
    expect(feedback.closest("section")?.querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Check order" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("keeps a wrong formative answer editable, gated, and revisable with server hints", async () => {
    const fixture = installQuestionStub();
    const user = userEvent.setup();
    renderReference(questionPath("476-continuity"));

    await user.click(
      await screen.findByRole("radio", {
        name: "The empire disappeared everywhere at the same moment.",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Check answer" }));

    const feedback = await screen.findByText(/Server feedback: the western court changed/);
    expect(feedback.closest("section")).toHaveAttribute("data-result", "incorrect");
    expect(screen.getByText("continues", { selector: "strong" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check again" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ask for a hint" }));
    expect(await screen.findByText("Server hint: compare the two sides.")).toBeInTheDocument();
    await user.click(
      screen.getByRole("radio", {
        name: "It marks a western political change while Roman government continued in the east.",
      }),
    );
    expect(await screen.findByRole("button", { name: "Check again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(fixture.read().activeQuestionId).toBe("turning-points");
  });

  it("autosaves Q4 with a revision guard when an older response arrives late", async () => {
    const fixture = installDeferredDraftStub();
    renderReference(questionPath("two-sentence"));
    const answer = await screen.findByRole("textbox", { name: "Your two sentences" });

    fireEvent.change(answer, { target: { value: "An older draft." } });
    await waitFor(() =>
      expect(
        fixture.actions.filter(({ action }) => action === "update_question_draft"),
      ).toHaveLength(1),
    );
    fireEvent.change(answer, {
      target: { value: "Territory grew by 117 CE. Augustus kept offices but controlled power." },
    });
    expect(answer).toHaveValue(
      "Territory grew by 117 CE. Augustus kept offices but controlled power.",
    );
    expect(screen.getByText("2 sentences")).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();

    fixture.releaseFirstDraft();
    await waitFor(() =>
      expect(
        fixture.actions.filter(({ action }) => action === "update_question_draft"),
      ).toHaveLength(2),
    );
    expect(answer).toHaveValue(
      "Territory grew by 117 CE. Augustus kept offices but controlled power.",
    );
    expect(questionView(fixture.read(), "two-sentence").progress.draft).toEqual({
      kind: "free_response",
      text: "Territory grew by 117 CE. Augustus kept offices but controlled power.",
    });
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("suppresses Exam assistance, advances clean submissions, and releases feedback in place", async () => {
    window.localStorage.setItem("discere:tutoring-mode:rise-of-the-roman-empire", "exam");
    installQuestionStub();
    const user = userEvent.setup();
    const first = renderReference(questionPath("turning-points"));

    await screen.findByRole("heading", { name: "Put these turning points in order" });
    expect(screen.queryByRole("button", { name: "View sources" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open the tutor in the current Roman lesson" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask for a hint" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal answer" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Check order" }));
    expect(
      await screen.findByText("Answer saved. Feedback opens after you finish."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Server feedback/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByText("Exam").closest("p")).toHaveClass("reference-mode-locked");
    first.unmount();

    vi.unstubAllGlobals();
    const allSubmitted = submitAllAsExam(gate3Progress());
    const finished = installQuestionStub(allSubmitted);
    const { router } = renderReference(questionPath("two-sentence"));
    await user.click(await screen.findByRole("button", { name: "Finish" }));
    expect(
      await screen.findByText("Server feedback released for two-sentence."),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(questionPath("two-sentence"));
    expect(screen.getByRole("button", { name: "Course home" })).toBeInTheDocument();
    expect(finished.actions.at(-1)).toEqual({ action: "finish_assessment" });
  });

  it("requires exact Direct reveal friction and displays only the server reveal", async () => {
    window.localStorage.setItem("discere:tutoring-mode:rise-of-the-roman-empire", "direct");
    const fixture = installQuestionStub();
    const user = userEvent.setup();
    renderReference(questionPath("476-continuity"));

    await user.click(
      await screen.findByRole("radio", {
        name: "The empire disappeared everywhere at the same moment.",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Check answer" }));
    await user.click(await screen.findByRole("button", { name: "Reveal answer" }));
    await user.type(
      screen.getByRole("textbox", { name: "Why do you need the answer?" }),
      "I have tried two different approaches.",
    );
    const confirmation = screen.getByRole("textbox", { name: /Type show answer to confirm/ });
    await user.type(confirmation, "SHOW ANSWER");
    expect(screen.getByRole("button", { name: "Show answer" })).toBeDisabled();
    await user.clear(confirmation);
    await user.type(confirmation, "show answer");
    await user.click(screen.getByRole("button", { name: "Show answer" }));

    const answer = await screen.findByRole("heading", { name: "Answer" });
    expect(answer.parentElement).toHaveTextContent(
      "It marks a western political change while Roman government continued in the east.",
    );
    expect(fixture.actions.at(-1)).toMatchObject({
      action: "reveal_question",
      questionId: "476-continuity",
      confirmation: "show answer",
    });
  });

  it("authorises exact sources, locks the mode, and leaves failed utilities closed", async () => {
    const user = userEvent.setup();
    const sourceFixture = installQuestionStub();
    const first = renderReference(questionPath("turning-points"));
    await user.click(await screen.findByRole("button", { name: "View sources" }));
    const dialog = await screen.findByRole("dialog", { name: "Sources" });
    expect(within(dialog).getByRole("link", { name: "Augustus" })).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "World History Volume 1: The Eastward Shift" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("link", { name: "Map: the Roman Empire in 117 CE" }),
    ).toBeNull();
    expect(sourceFixture.actions.at(-1)).toMatchObject({
      action: "access_question_sources",
      questionId: "turning-points",
      mode: "coach",
    });
    await user.click(within(dialog).getByRole("button", { name: "Close sources" }));
    expect(screen.queryByRole("group", { name: "Learning mode" })).not.toBeInTheDocument();
    expect(screen.getByText("Coach").closest("p")).toHaveClass("reference-mode-locked");
    first.unmount();

    vi.unstubAllGlobals();
    installQuestionStub(gate3Progress(), {
      failActions: new Set(["access_question_sources", "access_question_tutor"]),
    });
    renderReference(questionPath("476-continuity"));
    await user.click(await screen.findByRole("button", { name: "View sources" }));
    expect(screen.queryByRole("dialog", { name: "Sources" })).not.toBeInTheDocument();
    expect(await screen.findByText("The authorised action failed.")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Open the tutor in the current Roman lesson" }),
    );
    expect(screen.queryByRole("dialog", { name: "Ask the tutor" })).not.toBeInTheDocument();
  });

  it("renders an explicit recovered error instead of an indefinite loading state", async () => {
    stubFetch({
      [`GET ${PROGRESS_PATH}`]: {
        status: 500,
        body: { code: "LOAD_FAILED", message: "Progress could not be loaded." },
      },
    });
    renderReference(questionPath("turning-points"));
    expect(
      await screen.findByRole("heading", { name: "Question unavailable" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Restoring your question…")).not.toBeInTheDocument();
  });
});
