import type {
  RomanReferenceAction,
  RomanReferenceProgress,
  RomanReferenceTurningPointId,
} from "@discere/contracts";
import { RomanReferenceActionSchema } from "@discere/contracts";
import { QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routes } from "../routes.js";
import { createTestQueryClient, stubFetch } from "../test/harness.js";
import { defaultRomanReferenceProgress } from "./roman-reference-test-fixtures.js";

const PROGRESS_PATH =
  "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/progress";

const CANONICAL_ORDER: RomanReferenceTurningPointId[] = [
  "augustus",
  "extent",
  "division",
  "deposition",
];

const OPENING_FEEDBACK_CASES: Array<{
  name: string;
  opening: RomanReferenceProgress["opening"];
  message: string;
  hasSuccessIcon: boolean;
}> = [
  {
    name: "a correct checked order",
    opening: {
      order: [...CANONICAL_ORDER],
      submittedOrder: [...CANONICAL_ORDER],
      status: "checked",
      wasCorrect: true,
    },
    message: "The sequence runs from Augustus in 27 BCE to the western deposition in 476 CE.",
    hasSuccessIcon: true,
  },
  {
    name: "a wrong checked order",
    opening: {
      order: [...CANONICAL_ORDER],
      submittedOrder: ["division", "augustus", "deposition", "extent"],
      status: "checked",
      wasCorrect: false,
    },
    message: "Compare your order with this sequence. You will return to it after the lesson.",
    hasSuccessIcon: false,
  },
  {
    name: "a skipped order",
    opening: {
      order: ["division", "augustus", "deposition", "extent"],
      submittedOrder: null,
      status: "skipped",
      wasCorrect: null,
    },
    message: "Your opening estimate is saved without a judgement. Continue when you are ready.",
    hasSuccessIcon: false,
  },
];

function defaultProgress(): RomanReferenceProgress {
  return defaultRomanReferenceProgress();
}

function progressAtExpansion(): RomanReferenceProgress {
  const progress = defaultProgress();
  progress.opening = {
    order: [...CANONICAL_ORDER],
    submittedOrder: [...CANONICAL_ORDER],
    status: "checked",
    wasCorrect: true,
  };
  progress.augustus.completed = true;
  progress.activeBeat = "expansion";
  return progress;
}

function cloneProgress(progress: RomanReferenceProgress): RomanReferenceProgress {
  return structuredClone(progress);
}

function applyAction(
  progress: RomanReferenceProgress,
  action: RomanReferenceAction,
): RomanReferenceProgress {
  const next = cloneProgress(progress);
  next.updatedAt = "2026-08-22T08:00:00.000Z";
  switch (action.action) {
    case "reorder_opening":
      next.opening.order = [...action.order];
      return next;
    case "check_opening":
      next.activeBeat = "augustus";
      next.opening = {
        order: [...CANONICAL_ORDER],
        submittedOrder: [...action.order],
        status: "checked",
        wasCorrect: false,
      };
      return next;
    case "skip_opening":
      next.activeBeat = "augustus";
      next.opening = {
        order: [...action.order],
        submittedOrder: null,
        status: "skipped",
        wasCorrect: null,
      };
      return next;
    case "complete_augustus":
      next.augustus.completed = true;
      if (next.opening.status !== "editing") next.activeBeat = "expansion";
      return next;
    case "select_expansion_milestone":
      next.expansion.milestoneId = action.milestoneId;
      return next;
    case "update_expansion_draft":
      next.expansion.answerOpen = action.answerOpen;
      next.expansion.answer = action.answer;
      next.expansion.saved = false;
      return next;
    case "save_expansion_response":
      next.expansion.answerOpen = true;
      next.expansion.answer = action.answer;
      next.expansion.saved = true;
      return next;
    case "complete_expansion":
      next.expansion.completed = true;
      next.activeBeat = "questions";
      next.activeQuestionId = "turning-points";
      return next;
  }
  return next;
}

function installProgressStub(
  initial = defaultProgress(),
  options: { failAction?: RomanReferenceAction["action"]; failResponseSave?: boolean } = {},
) {
  let canonical = cloneProgress(initial);
  const result = stubFetch({
    [`GET ${PROGRESS_PATH}`]: () => ({ body: cloneProgress(canonical) }),
    [`PUT ${PROGRESS_PATH}`]: ({ body }) => {
      const action = RomanReferenceActionSchema.parse(body);
      if (
        options.failAction === action.action ||
        (options.failResponseSave && action.action === "save_expansion_response")
      ) {
        return {
          status: 500,
          body: { code: "SAVE_FAILED", message: "The response could not be saved." },
        };
      }
      canonical = applyAction(canonical, action);
      return { body: cloneProgress(canonical) };
    },
  });
  return { ...result, read: () => cloneProgress(canonical) };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as Response;
}

function installDeferredExpansionSaveStub(initial: RomanReferenceProgress) {
  let canonical = cloneProgress(initial);
  let releaseSaveResponse: () => void = () => undefined;
  const saveResponseGate = new Promise<void>((resolve) => {
    releaseSaveResponse = resolve;
  });
  const actions: RomanReferenceAction[] = [];
  const stub = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const address = typeof url === "string" ? url : url.toString();
    const path = address.split("?")[0] ?? address;
    const method = (init?.method ?? "GET").toUpperCase();
    if (path !== PROGRESS_PATH) throw new Error(`Unexpected request path: ${path}`);

    if (method === "GET") return jsonResponse(cloneProgress(canonical));
    if (method !== "PUT" || typeof init?.body !== "string") {
      throw new Error(`Unexpected request method: ${method}`);
    }

    const action = RomanReferenceActionSchema.parse(JSON.parse(init.body) as unknown);
    actions.push(action);
    canonical = applyAction(canonical, action);
    const response = cloneProgress(canonical);
    if (action.action === "save_expansion_response") await saveResponseGate;
    return jsonResponse(response);
  });
  vi.stubGlobal("fetch", stub);

  return {
    actions,
    read: () => cloneProgress(canonical),
    releaseSaveResponse,
  };
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

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.style.overflow = "";
});

describe("Roman recovery reference Gate 2", () => {
  it("continues from the course home to the server's active beat", async () => {
    const progress = defaultProgress();
    progress.activeBeat = "expansion";
    progress.opening = {
      order: [...CANONICAL_ORDER],
      submittedOrder: ["division", "augustus", "deposition", "extent"],
      status: "checked",
      wasCorrect: false,
    };
    progress.augustus.completed = true;
    installProgressStub(progress);
    renderReference("/courses/roman-empire");

    expect(await screen.findByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      expect.stringContaining("/reference/expansion"),
    );
  });

  it("hydrates the opening order, persists a keyboard move, and reveals only the server result", async () => {
    const { calls } = installProgressStub();
    const user = userEvent.setup();
    renderReference("/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/opening");

    const division = await screen.findByRole("button", {
      name: "Empire divided, 395 CE, position 1 of 4",
    });
    expect(
      screen.getByRole("button", { name: "Augustus, 27 BCE, position 2 of 4" }),
    ).toBeInTheDocument();

    division.focus();
    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByRole("button", { name: "Empire divided, 395 CE, position 2 of 4" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        calls.some(
          ({ key, body }) =>
            key === `PUT ${PROGRESS_PATH}` &&
            (body as { action?: string }).action === "reorder_opening",
        ),
      ).toBe(true),
    );

    await user.click(screen.getByRole("button", { name: "Check order" }));

    expect(await screen.findByText(/Compare your order with this sequence/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Augustus, 27 BCE, position 1 of 4" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Largest extent, 117 CE, position 2 of 4" }),
    ).toBeInTheDocument();
    const writes = calls
      .filter(({ key }) => key === `PUT ${PROGRESS_PATH}`)
      .map(({ body }) => body);
    expect(writes).toEqual([
      {
        action: "reorder_opening",
        order: ["augustus", "division", "deposition", "extent"],
      },
      {
        action: "check_opening",
        order: ["augustus", "division", "deposition", "extent"],
      },
    ]);
  });

  it("persists a mouse drag and updates the opening positions", async () => {
    const { calls } = installProgressStub();
    renderReference("/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/opening");

    const division = await screen.findByRole("button", {
      name: "Empire divided, 395 CE, position 1 of 4",
    });
    const deposition = screen.getByRole("button", {
      name: "Western emperor removed, 476 CE, position 3 of 4",
    });
    expect(division.closest("li")).toHaveAttribute("draggable", "true");

    fireEvent.dragStart(division);
    fireEvent.dragOver(deposition);
    fireEvent.drop(deposition);

    expect(
      screen.getByRole("button", { name: "Augustus, 27 BCE, position 1 of 4" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Western emperor removed, 476 CE, position 2 of 4",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Empire divided, 395 CE, position 3 of 4" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Empire divided moved to position 3 of 4.")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        calls.filter(({ key }) => key === `PUT ${PROGRESS_PATH}`).map(({ body }) => body),
      ).toContainEqual({
        action: "reorder_opening",
        order: ["augustus", "deposition", "division", "extent"],
      }),
    );
  });

  it.each(OPENING_FEEDBACK_CASES)(
    "renders a success icon only for $name",
    async ({ opening, message, hasSuccessIcon }) => {
      const progress = defaultProgress();
      progress.activeBeat = "augustus";
      progress.opening = opening;
      installProgressStub(progress);
      renderReference("/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/opening");

      const feedback = await screen.findByText(message);
      expect(feedback).toHaveAttribute("aria-live", "polite");
      if (hasSuccessIcon) expect(feedback.querySelector("svg")).not.toBeNull();
      else expect(feedback.querySelector("svg")).toBeNull();
    },
  );

  it("shows one specific error when footer Next cannot check the opening", async () => {
    installProgressStub(defaultProgress(), { failAction: "check_opening" });
    const user = userEvent.setup();
    const { router } = renderReference(
      "/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/opening",
    );

    const next = screen.getByRole("button", { name: "Next" });
    await waitFor(() => expect(next).toBeEnabled());
    await user.click(next);

    expect(
      await screen.findByText("Your answer was not checked. Stay here and try again."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Your progress was not saved. Stay here and try again."),
    ).not.toBeInTheDocument();
    expect(router.state.location.pathname).toContain("/reference/opening");
  });

  it("hydrates and persists the expansion milestone, draft, and explicit save", async () => {
    const progress = progressAtExpansion();
    progress.expansion = {
      milestoneId: "284-ce",
      answerOpen: true,
      answer: "An existing draft.",
      saved: false,
      completed: false,
    };
    const fixture = installProgressStub(progress);
    const user = userEvent.setup();
    renderReference("/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/expansion");

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "284 CE" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    const answer = screen.getByRole("textbox", { name: "Your answer" });
    await waitFor(() => expect(answer).toHaveValue("An existing draft."));

    await user.click(screen.getByRole("button", { name: "476 CE" }));
    fireEvent.change(answer, { target: { value: "Rome expanded substantially." } });
    await user.click(screen.getByRole("button", { name: "Save answer" }));

    expect(await screen.findByText("Saved for the end-of-lesson comparison.")).toBeInTheDocument();
    expect(fixture.read().expansion).toEqual({
      milestoneId: "476-ce",
      answerOpen: true,
      answer: "Rome expanded substantially.",
      saved: true,
      completed: false,
    });
    expect(
      fixture.calls
        .filter(({ key }) => key === `PUT ${PROGRESS_PATH}`)
        .map(({ body }) => (body as { action: string }).action),
    ).toEqual(["select_expansion_milestone", "update_expansion_draft", "save_expansion_response"]);
  });

  it("keeps newer expansion input unsaved when an older save response arrives", async () => {
    const progress = progressAtExpansion();
    progress.expansion = {
      milestoneId: "117-ce",
      answerOpen: true,
      answer: "The earlier answer.",
      saved: false,
      completed: false,
    };
    const fixture = installDeferredExpansionSaveStub(progress);
    const user = userEvent.setup();
    renderReference("/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/expansion");

    const answer = await screen.findByRole("textbox", { name: "Your answer" });
    await user.click(screen.getByRole("button", { name: "Save answer" }));
    await waitFor(() =>
      expect(fixture.actions.map(({ action }) => action)).toEqual(["save_expansion_response"]),
    );

    fireEvent.change(answer, { target: { value: "A newer answer typed during the save." } });
    expect(answer).toHaveValue("A newer answer typed during the save.");
    expect(screen.queryByText("Saved for the end-of-lesson comparison.")).not.toBeInTheDocument();

    fixture.releaseSaveResponse();
    await waitFor(() =>
      expect(fixture.actions.map(({ action }) => action)).toEqual([
        "save_expansion_response",
        "update_expansion_draft",
      ]),
    );
    await waitFor(() =>
      expect(fixture.read().expansion).toMatchObject({
        answer: "A newer answer typed during the save.",
        saved: false,
      }),
    );
    expect(answer).toHaveValue("A newer answer typed during the save.");
    expect(screen.queryByText("Saved for the end-of-lesson comparison.")).not.toBeInTheDocument();
  });

  it("never reports a failed expansion save as saved", async () => {
    const progress = progressAtExpansion();
    progress.expansion = {
      milestoneId: "117-ce",
      answerOpen: true,
      answer: "Rome grew around the Mediterranean.",
      saved: false,
      completed: false,
    };
    installProgressStub(progress, { failResponseSave: true });
    const user = userEvent.setup();
    renderReference("/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/expansion");

    await user.click(await screen.findByRole("button", { name: "Save answer" }));

    expect(await screen.findByText(/Your answer was not saved/)).toBeInTheDocument();
    expect(screen.queryByText("Saved for the end-of-lesson comparison.")).not.toBeInTheDocument();
  });

  it("opens the accessible source dialog", async () => {
    installProgressStub();
    const user = userEvent.setup();
    renderReference("/courses/roman-empire");
    await screen.findByRole("link", { name: "Continue" });

    await user.click(screen.getByRole("button", { name: "View sources" }));

    expect(await screen.findByRole("dialog", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Augustus and the principate" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("opens the tutor in place and returns focus to its trigger on close", async () => {
    installProgressStub();
    const user = userEvent.setup();
    const { router } = renderReference("/courses/roman-empire");
    await screen.findByRole("link", { name: "Continue" });
    const trigger = screen.getByRole("button", {
      name: "Open the tutor in the current Roman lesson",
    });

    await user.click(trigger);
    expect(await screen.findByRole("dialog", { name: "Ask the tutor" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/courses/roman-empire");

    await user.click(screen.getByRole("button", { name: "Close the tutor" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Ask the tutor" })).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(router.state.location.pathname).toBe("/courses/roman-empire");
  });

  it("suppresses sources and tutoring when the lesson is in Exam mode", async () => {
    window.localStorage.setItem("discere:tutoring-mode:rise-of-the-roman-empire", "exam");
    installProgressStub();
    renderReference("/courses/roman-empire");

    await screen.findByRole("link", { name: "Continue" });

    expect(screen.queryByRole("button", { name: "View sources" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open the tutor in the current Roman lesson" }),
    ).not.toBeInTheDocument();
  });
});
