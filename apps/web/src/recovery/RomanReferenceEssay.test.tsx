import type {
  RomanReferenceAction,
  RomanReferenceEssayFeedback,
  RomanReferenceProgress,
} from "@discere/contracts";
import { RomanReferenceActionSchema } from "@discere/contracts";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routes } from "../routes.js";
import { createTestQueryClient, stubFetch } from "../test/harness.js";
import { essayReadyProgress, referenceEssayEvidence } from "./roman-reference-test-fixtures.js";

const PROGRESS_PATH =
  "/api/courses/roman-empire/lessons/rise-of-the-roman-empire/reference/progress";
const REFERENCE_ROOT = "/courses/roman-empire/lessons/rise-of-the-roman-empire/reference";
const ESSAY_PATH = `${REFERENCE_ROOT}/essay`;
const COURSE_PATH = "/courses/roman-empire";

const DRAFT = [
  "Political conflict mattered more than size, because Rome kept governing a large territory long",
  "after its politics stopped working. Augustus settled the succession in 27 BCE by keeping",
  "republican offices while holding the powers that decided things. The third-century crisis from",
  "235 CE produced repeated claimants and civil wars, and that instability is what emptied the",
  "treasury. Diocletian answered it in 284 CE by dividing rule between four emperors, which shows",
  "the problem was political. Although size made succession harder to contain, the tetrarchy shows",
  "Rome could hold the territory once the political question was addressed.",
].join(" ");

function clone(progress: RomanReferenceProgress): RomanReferenceProgress {
  return structuredClone(progress);
}

function feedbackFor(revision: number, content: string): RomanReferenceEssayFeedback {
  return {
    revision,
    submittedAt: "2026-08-22T09:00:00.000Z",
    wordCount: content.trim().split(/\s+/).length,
    content,
    summary: "The argument states a position and supports it with dated examples.",
    nextStep: "Read the final version once for sentence-level clarity before finishing.",
    dimensions: [
      {
        id: "claim",
        label: "Claim",
        status: "met",
        comment: "The comparison has a clear position.",
        excerpt: "Political conflict mattered more than size",
      },
      {
        id: "evidence",
        label: "Evidence",
        status: "met",
        comment: "The response uses 4 distinct historical examples.",
        excerpt: null,
      },
      {
        id: "reasoning",
        label: "Reasoning",
        status: "developing",
        comment: "Link each example to the claim with a cause, consequence, or limit.",
        excerpt: null,
      },
      {
        id: "complication",
        label: "Complication",
        status: "met",
        comment: "The response recognises a limit in the argument.",
        excerpt: null,
      },
      {
        id: "accuracy",
        label: "Accuracy",
        status: "met",
        comment: "No conflict with the checked chronology was detected.",
        excerpt: null,
      },
    ],
    usedEvidenceIds: ["augustus-27-bce", "third-century-crisis", "tetrarchy-284-ce"],
  };
}

interface StubOptions {
  /** Action names the server refuses, with the code it refuses them under. */
  refuse?: Map<RomanReferenceAction["action"], { status: number; code: string; message: string }>;
}

/**
 * A stand-in for the server's essay authority. It applies only the transitions the real server
 * applies, so a test cannot pass against behaviour the server would refuse.
 */
function installEssayStub(initial = essayReadyProgress(), options: StubOptions = {}) {
  let canonical = clone(initial);
  const actions: RomanReferenceAction[] = [];
  const fetched = stubFetch({
    [`GET ${PROGRESS_PATH}`]: () => ({ body: clone(canonical) }),
    [`PUT ${PROGRESS_PATH}`]: ({ body }) => {
      const action = RomanReferenceActionSchema.parse(body);
      actions.push(action);
      const refusal = options.refuse?.get(action.action);
      if (refusal) {
        return { status: refusal.status, body: { code: refusal.code, message: refusal.message } };
      }
      const next = clone(canonical);
      const essay = next.essay.progress;
      switch (action.action) {
        case "update_essay_draft":
          essay.draft = action.draft;
          essay.claimPlan = action.claimPlan;
          essay.evidencePlan = [...action.evidencePlan];
          essay.complicationPlan = action.complicationPlan;
          break;
        case "access_essay_sources":
          essay.mode ??= action.mode;
          essay.sourcesOpened = true;
          next.essay.content.evidence = referenceEssayEvidence();
          break;
        case "access_essay_tutor":
          essay.mode ??= action.mode;
          break;
        case "submit_essay_revision":
          essay.mode ??= action.mode;
          essay.draft = action.content;
          essay.status = "submitted";
          essay.submissions = [
            ...essay.submissions,
            feedbackFor(essay.submissions.length + 1, action.content),
          ];
          break;
        case "start_essay_revision":
          essay.status = "editing";
          break;
        case "finish_essay":
          essay.finished = true;
          break;
        default:
          break;
      }
      canonical = next;
      return { body: clone(canonical) };
    },
  });
  return { ...fetched, actions, read: () => clone(canonical) };
}

function renderEssay(path = ESSAY_PATH) {
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

describe("Roman recovery reference Gate 4 essay", () => {
  it("shows the prompt, the rubric, and a word count that gates submission", async () => {
    installEssayStub();
    const user = userEvent.setup();
    renderEssay();

    expect(
      await screen.findByRole("heading", {
        name: "What mattered more to Rome's transformation: its size or its political conflicts?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Make a claim. Use three pieces of evidence. Address one complication."),
    ).toBeInTheDocument();

    const rubric = screen.getByRole("region", { name: "Rubric" });
    expect(within(rubric).getAllByRole("listitem")).toHaveLength(5);
    for (const label of ["Claim", "Evidence", "Reasoning", "Complication", "Accuracy"]) {
      expect(within(rubric).getByText(label)).toBeInTheDocument();
    }

    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();
    expect(screen.getByText(/80 to submit/)).toBeInTheDocument();

    await user.click(screen.getByLabelText("Draft"));
    await user.paste(DRAFT);
    await waitFor(() => expect(submit).toBeEnabled());
    expect(screen.queryByText(/to submit/)).not.toBeInTheDocument();
  });

  it("autosaves the draft and the plan, and reports the save state in a live region", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fixture = installEssayStub();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEssay();

    await user.click(await screen.findByLabelText("Draft"));
    await user.paste(DRAFT);
    await vi.advanceTimersByTimeAsync(1_000);

    await waitFor(() => {
      expect(fixture.actions.some((action) => action.action === "update_essay_draft")).toBe(true);
    });
    expect(fixture.read().essay.progress.draft).toBe(DRAFT);

    const status = screen.getByText("Saved");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByLabelText("Draft")).toHaveAttribute(
      "aria-describedby",
      status.getAttribute("id"),
    );
    vi.useRealTimers();
  });

  it("keeps the evidence pack closed until opening it locks the mode", async () => {
    const fixture = installEssayStub();
    const user = userEvent.setup();
    renderEssay();

    const rail = await screen.findByRole("complementary", { name: "Evidence" });
    expect(
      within(rail).getByRole("heading", { name: "Choose your mode first" }),
    ).toBeInTheDocument();
    expect(within(rail).queryAllByRole("checkbox")).toHaveLength(0);

    await user.click(within(rail).getByRole("button", { name: "Open evidence" }));

    const opened = await screen.findByRole("complementary", { name: "Evidence" });
    await waitFor(() => expect(within(opened).getAllByRole("checkbox")).toHaveLength(3));
    expect(within(opened).getByText("Tetrarchy")).toBeInTheDocument();
    expect(fixture.actions).toContainEqual({ action: "access_essay_sources", mode: "coach" });
    expect(fixture.read().essay.progress.mode).toBe("coach");
  });

  it("records the evidence a learner selects", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const opened = essayReadyProgress();
    opened.essay.content.evidence = referenceEssayEvidence();
    opened.essay.progress.sourcesOpened = true;
    opened.essay.progress.mode = "coach";
    const fixture = installEssayStub(opened);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEssay();

    const rail = await screen.findByRole("complementary", { name: "Evidence" });
    await user.click(within(rail).getAllByRole("checkbox")[1] as HTMLElement);
    await vi.advanceTimersByTimeAsync(1_000);

    await waitFor(() => {
      expect(fixture.read().essay.progress.evidencePlan).toEqual(["third-century-crisis"]);
    });
    expect(within(rail).getByText("1 selected")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders rubric feedback against the learner's own words and reopens on revise", async () => {
    const fixture = installEssayStub();
    const user = userEvent.setup();
    renderEssay();

    await user.click(await screen.findByLabelText("Draft"));
    await user.paste(DRAFT);
    await user.click(await screen.findByRole("button", { name: "Submit" }));

    const feedback = await screen.findByRole("region", { name: "Essay feedback" });
    expect(within(feedback).getByText("Revision 1")).toBeInTheDocument();
    expect(
      within(feedback).getByText(
        "The argument states a position and supports it with dated examples.",
      ),
    ).toBeInTheDocument();
    expect(within(feedback).getAllByRole("listitem")).toHaveLength(5);
    // The excerpt is quoted from the submission, so it must appear as a quotation.
    const quote = within(feedback).getByText("Political conflict mattered more than size");
    expect(quote.tagName).toBe("BLOCKQUOTE");
    expect(within(feedback).getByText(/Read the final version once/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();

    await user.click(within(feedback).getByRole("button", { name: "Revise" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument());
    // The previous feedback stays on screen while the learner revises against it.
    expect(screen.getByRole("region", { name: "Essay feedback" })).toBeInTheDocument();
    expect(fixture.read().essay.progress.status).toBe("editing");
  });

  it("finishes to the course home and leaves the final essay read-only", async () => {
    const submitted = essayReadyProgress();
    submitted.essay.progress.draft = DRAFT;
    submitted.essay.progress.status = "submitted";
    submitted.essay.progress.mode = "coach";
    submitted.essay.progress.submissions = [feedbackFor(1, DRAFT)];
    const fixture = installEssayStub(submitted);
    const user = userEvent.setup();
    const { router } = renderEssay();

    await user.click(await screen.findByRole("button", { name: "Finish" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(COURSE_PATH));
    expect(fixture.read().essay.progress.finished).toBe(true);
    expect(fixture.actions.at(-1)).toEqual({ action: "finish_essay" });
  });

  it("keeps a finished essay locked and offers only the way back", async () => {
    const finished = essayReadyProgress();
    finished.essay.progress.draft = DRAFT;
    finished.essay.progress.status = "submitted";
    finished.essay.progress.mode = "coach";
    finished.essay.progress.submissions = [feedbackFor(1, DRAFT)];
    finished.essay.progress.finished = true;
    installEssayStub(finished);
    renderEssay();

    expect(await screen.findByLabelText("Draft")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Course home" })).toHaveAttribute("href", COURSE_PATH);
  });

  it("closes evidence and the assistance controls in Exam mode", async () => {
    window.localStorage.setItem("discere:tutoring-mode:rise-of-the-roman-empire", "exam");
    installEssayStub();
    renderEssay();

    const rail = await screen.findByRole("complementary", { name: "Evidence" });
    expect(within(rail).getByRole("heading", { name: "Closed in Exam mode" })).toBeInTheDocument();
    expect(within(rail).queryByRole("button", { name: "Open evidence" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open the tutor in the current Roman lesson" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View sources" })).not.toBeInTheDocument();
  });

  it("authorises the tutor against the server before the drawer opens", async () => {
    const fixture = installEssayStub();
    const user = userEvent.setup();
    renderEssay();

    await user.click(
      await screen.findByRole("button", { name: "Open the tutor in the current Roman lesson" }),
    );
    await screen.findByRole("dialog");
    expect(fixture.actions).toContainEqual({ action: "access_essay_tutor", mode: "coach" });
    expect(fixture.read().essay.progress.mode).toBe("coach");
  });

  it("reports a refused submission and keeps the learner on the draft", async () => {
    const fixture = installEssayStub(essayReadyProgress(), {
      refuse: new Map([
        [
          "submit_essay_revision",
          {
            status: 409,
            code: "ESSAY_REVISION_REQUIRED",
            message: "Start a revision before submitting new writing.",
          },
        ],
      ]),
    });
    const user = userEvent.setup();
    const { router } = renderEssay();

    await user.click(await screen.findByLabelText("Draft"));
    await user.paste(DRAFT);
    await user.click(await screen.findByRole("button", { name: "Submit" }));

    const failure = await screen.findByText("Start a revision before submitting new writing.");
    expect(failure).toHaveAttribute("aria-live", "assertive");
    expect(router.state.location.pathname).toBe(ESSAY_PATH);
    expect(screen.queryByRole("region", { name: "Essay feedback" })).not.toBeInTheDocument();
    expect(fixture.read().essay.progress.submissions).toHaveLength(0);
  });

  it("reports a refused evidence pack without claiming a mode was locked", async () => {
    const fixture = installEssayStub(essayReadyProgress(), {
      refuse: new Map([
        [
          "access_essay_sources",
          { status: 403, code: "EXAM_GUARDRAIL", message: "Sources are unavailable in Exam mode." },
        ],
      ]),
    });
    const user = userEvent.setup();
    renderEssay();

    const rail = await screen.findByRole("complementary", { name: "Evidence" });
    await user.click(within(rail).getByRole("button", { name: "Open evidence" }));

    expect(await screen.findByText("Sources are unavailable in Exam mode.")).toBeInTheDocument();
    expect(fixture.read().essay.progress.mode).toBeNull();
    expect(fixture.read().essay.progress.sourcesOpened).toBe(false);
  });

  it("reports a failed autosave instead of showing the draft as saved", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    installEssayStub(essayReadyProgress(), {
      refuse: new Map([
        [
          "update_essay_draft",
          { status: 500, code: "SAVE_FAILED", message: "The draft was not saved." },
        ],
      ]),
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEssay();

    await user.click(await screen.findByLabelText("Draft"));
    await user.paste("A first sentence that the server refuses to keep.");
    await vi.advanceTimersByTimeAsync(1_000);

    expect(await screen.findByText("Not saved")).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("reports an unreadable saved essay rather than an empty editor", async () => {
    stubFetch({
      [`GET ${PROGRESS_PATH}`]: () => ({ status: 500, body: { message: "Unavailable." } }),
    });
    renderEssay();
    expect(
      await screen.findByRole("heading", { name: "The draft could not be opened" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Draft")).not.toBeInTheDocument();
  });
});
