import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { essayStage } from "../../test/fixtures.js";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { CapabilityProvider } from "../../capabilities/capability-context.js";
import { ModeProvider } from "../mode-context.js";
import { EssayStageView } from "./EssayStageView.js";

afterEach(() => vi.unstubAllGlobals());

const essayPath = `/api/essays/${encodeURIComponent(essayStage.essayId)}`;

function renderEssay(onContinue = vi.fn(), onSkip?: () => void, stage = essayStage) {
  renderWithProviders(
    <ModeProvider lessonId="lesson">
      <EssayStageView onContinue={onContinue} {...(onSkip ? { onSkip } : {})} stage={stage} />
    </ModeProvider>,
  );
  return onContinue;
}

const emptyDraft = {
  body: {
    essayId: essayStage.essayId,
    content: "",
    wordCount: 0,
    submitted: false,
    updatedAt: null,
  },
};
const tutorDown = {
  body: {
    capabilities: [
      {
        id: "tutor_generation",
        state: "unavailable",
        reason: "Claude Code is not installed, so the tutor cannot answer in place.",
        fallback: "",
      },
    ],
  },
};

describe("essay studio", () => {
  it("shows the prompt, the criteria and a live word count", async () => {
    stubFetch({
      [`GET ${essayPath}`]: {
        body: {
          essayId: essayStage.essayId,
          content: "",
          wordCount: 0,
          submitted: false,
          updatedAt: null,
        },
      },
    });
    renderEssay();
    expect(await screen.findByText(essayStage.prompt)).toBeInTheDocument();
    expect(screen.getByText("Names the relationship.")).toBeInTheDocument();
    expect(screen.getByText("0 words · 5 needed")).toBeInTheDocument();
    expect(screen.getByText("Not saved yet")).toBeInTheDocument();
  });

  it("autosaves the draft a moment after typing stops", async () => {
    const { calls } = stubFetch({
      [`GET ${essayPath}`]: {
        body: {
          essayId: essayStage.essayId,
          content: "",
          wordCount: 0,
          submitted: false,
          updatedAt: null,
        },
      },
      [`PUT ${essayPath}`]: ({ body }) => ({
        body: {
          essayId: essayStage.essayId,
          content: (body as { content: string }).content,
          wordCount: 6,
          submitted: false,
          updatedAt: new Date().toISOString(),
        },
      }),
    });
    renderEssay();
    const editor = await screen.findByLabelText("Your writing");
    await userEvent.type(editor, "Current is voltage divided by resistance");
    expect(calls.filter((call) => call.key === `PUT ${essayPath}`)).toHaveLength(0);
    await waitFor(() => expect(screen.getByText("Saved just now")).toBeInTheDocument(), {
      timeout: 4000,
    });
    expect(calls.at(-1)).toMatchObject({
      key: `PUT ${essayPath}`,
      body: { content: "Current is voltage divided by resistance" },
    });
    expect(editor).toHaveFocus();
  });

  it("submits successfully and surfaces style notes as advice", async () => {
    stubFetch({
      [`GET ${essayPath}`]: {
        body: {
          essayId: essayStage.essayId,
          content: "This is not a rule; it is a relationship between three quantities.",
          wordCount: 12,
          submitted: false,
          updatedAt: "2026-08-18T12:00:00.000Z",
        },
      },
      [`POST ${essayPath}/submit`]: {
        body: {
          essayId: essayStage.essayId,
          submitted: true,
          wordCount: 12,
          feedback: "Your writing has been saved as submitted.",
          styleNotes: [
            {
              ruleId: "negative-parallelism",
              severity: "warning",
              category: "style",
              message: "A negative parallelism appears in this sentence.",
              start: 0,
              end: 20,
              excerpt: "This is not a rule",
            },
          ],
        },
      },
      [`GET ${essayPath}/assessment`]: {
        status: 404,
        body: { code: "ESSAY_ASSESSMENT_NOT_FOUND" },
      },
    });
    const onContinue = renderEssay();
    await userEvent.click(await screen.findByRole("button", { name: /^Submit$/ }));
    expect(await screen.findByText("Style notes")).toBeInTheDocument();
    expect(
      screen.getByText("A negative parallelism appears in this sentence."),
    ).toBeInTheDocument();
    expect(screen.getByText("Submitted. Choose Revise to change it.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("can be skipped before anything is written", async () => {
    stubFetch({ [`GET ${essayPath}`]: emptyDraft });
    const onSkip = vi.fn();
    const onContinue = renderEssay(vi.fn(), onSkip);
    expect(
      await screen.findByText(
        "This task is optional. The lesson is complete whether or not you write it.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Skip this task" }));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("offers no skip when the lesson gives none", async () => {
    stubFetch({ [`GET ${essayPath}`]: emptyDraft });
    renderEssay();
    await screen.findByLabelText("Your writing");
    expect(screen.queryByRole("button", { name: "Skip this task" })).not.toBeInTheDocument();
  });

  it("sets supplied material under the task as its own paragraphs", async () => {
    stubFetch({ [`GET ${essayPath}`]: emptyDraft });
    renderEssay(vi.fn(), undefined, {
      ...essayStage,
      prompt: "Revise the paragraph below.\n\nThe draft: Buses are good.\n\nThe figures: 12%.",
    });
    expect((await screen.findByText("Revise the paragraph below.")).closest("p")).toHaveClass(
      "deck",
    );
    expect(
      screen.getByText("The draft: Buses are good.").closest(".essay-material"),
    ).not.toBeNull();
    expect(screen.getByText("The figures: 12%.")).toBeInTheDocument();
  });

  it("says the tutor is unavailable before writing and asks for no assessment after", async () => {
    stubFetch({
      [`GET ${essayPath}`]: {
        body: { ...emptyDraft.body, content: "Current is voltage divided by resistance." },
      },
      "GET /api/capabilities": tutorDown,
      [`POST ${essayPath}/submit`]: {
        body: {
          essayId: essayStage.essayId,
          submitted: true,
          wordCount: 6,
          feedback: "Your writing has been saved as submitted.",
          styleNotes: [],
        },
      },
      [`GET ${essayPath}/assessment`]: {
        status: 404,
        body: { code: "ESSAY_ASSESSMENT_NOT_FOUND" },
      },
    });
    renderWithProviders(
      <CapabilityProvider>
        <ModeProvider lessonId="lesson">
          <EssayStageView onContinue={vi.fn()} stage={essayStage} />
        </ModeProvider>
      </CapabilityProvider>,
    );
    expect(await screen.findByText(/You can still write and submit/)).toHaveTextContent(
      "Claude Code is not installed",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Submit$/ }));
    expect(await screen.findByText(/Your writing is saved\. Read it against each line/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask for an assessment" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Continue/ })).toBeInTheDocument();
  });
});

const submittedDraft = {
  essayId: essayStage.essayId,
  content: "Current is voltage divided by resistance.",
  wordCount: 6,
  submitted: true,
  updatedAt: "2026-11-09T12:00:00.000Z",
};
const readyAssessment = {
  essayId: essayStage.essayId,
  status: "ready",
  provider: "mock",
  requestId: "5b0f5f0e-2f0c-4c0e-9d57-0d6c1f6f7a11",
  accepted: true,
  assessment: {
    assessment: "partly_correct",
    summary: "The relationship is named and the equation is missing.",
    firstMeaningfulError: "The equation is never written.",
    nextStep: "Write I = V / R after the first sentence.",
    criteria: [
      {
        criterion: "Names the relationship.",
        result: "met",
        evidence: "“voltage divided by resistance”",
      },
      {
        criterion: "Uses the equation.",
        result: "not_met",
        evidence: "The equation is never written.",
      },
    ],
    sourceIds: [],
    uncertainty: [],
  },
  issues: [],
  error: null,
  packet: null,
  updatedAt: "2026-11-09T12:01:00.000Z",
};

describe("assessment of a writing task", () => {
  it("shows the result for each criterion beside it", async () => {
    stubFetch({
      [`GET ${essayPath}`]: { body: submittedDraft },
      [`GET ${essayPath}/assessment`]: { body: readyAssessment },
    });
    renderEssay();
    const heading = await screen.findByRole("heading", { name: "Result for each criterion" });
    const rows = within(heading.parentElement as HTMLElement).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Names the relationship.");
    expect(rows[0]).toHaveTextContent("Met");
    expect(rows[0]).toHaveTextContent("“voltage divided by resistance”");
    expect(rows[1]).toHaveTextContent("Uses the equation.");
    expect(rows[1]).toHaveTextContent("Not met");
    // The overall verdict is still there.
    expect(screen.getByText("The relationship is named and the equation is missing.")).toBeInTheDocument();
    expect(screen.getByText("Write I = V / R after the first sentence.")).toBeInTheDocument();
  });

  it("still shows an assessment stored before per-criterion results existed", async () => {
    const { criteria: _criteria, ...older } = readyAssessment.assessment;
    stubFetch({
      [`GET ${essayPath}`]: { body: submittedDraft },
      [`GET ${essayPath}/assessment`]: { body: { ...readyAssessment, assessment: older } },
    });
    renderEssay();
    expect(
      await screen.findByText("The relationship is named and the equation is missing."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Result for each criterion" }),
    ).not.toBeInTheDocument();
  });
});

describe("an assessment that failed on sign-in", () => {
  it("shows the cause and then the notice that the tutor is unavailable", async () => {
    let capabilityReads = 0;
    stubFetch({
      [`GET ${essayPath}`]: { body: submittedDraft },
      [`GET ${essayPath}/assessment`]: {
        body: {
          ...readyAssessment,
          status: "failed",
          accepted: false,
          assessment: null,
          error: {
            code: "PROVIDER_EXITED",
            message:
              "The local model exited with code 1. The tutor's sign-in has probably expired. Sign in to it again, then ask for the assessment.",
          },
        },
      },
      // Available on the first read; unavailable once the server has seen the refusal.
      "GET /api/capabilities": () => {
        capabilityReads += 1;
        return capabilityReads === 1
          ? {
              body: {
                capabilities: [
                  { id: "tutor_generation", state: "available", reason: "", fallback: "" },
                ],
              },
            }
          : {
              body: {
                capabilities: [
                  {
                    id: "tutor_generation",
                    state: "unavailable",
                    reason:
                      "Claude Code refused the tutor's last request because its sign-in has expired. Run `claude` and log in again.",
                    fallback: "",
                  },
                ],
              },
            };
      },
    });
    renderWithProviders(
      <CapabilityProvider>
        <ModeProvider lessonId="lesson">
          <EssayStageView onContinue={vi.fn()} stage={essayStage} />
        </ModeProvider>
      </CapabilityProvider>,
    );
    expect(await screen.findByText(/sign-in has probably expired/)).toBeInTheDocument();
    expect(await screen.findByText(/its sign-in has expired\. Run `claude`/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try the assessment again" }),
    ).not.toBeInTheDocument();
  });
});

describe("revising a writing task", () => {
  it("opens the submitted text for editing and keeps the earlier version with its feedback", async () => {
    const earlierVersions = [
      { version: 1, wordCount: 6, submittedAt: "2026-11-09T12:00:00.000Z", assessed: true },
    ];
    const { calls } = stubFetch({
      [`GET ${essayPath}`]: { body: submittedDraft },
      [`GET ${essayPath}/assessment`]: { body: readyAssessment },
      [`POST ${essayPath}/revise`]: {
        body: { ...submittedDraft, submitted: false, version: 2, earlierVersions },
      },
      [`GET ${essayPath}/versions/1`]: {
        body: {
          essayId: essayStage.essayId,
          version: 1,
          content: submittedDraft.content,
          wordCount: 6,
          submittedAt: submittedDraft.updatedAt,
          assessment: readyAssessment,
        },
      },
      [`PUT ${essayPath}`]: ({ body }) => ({
        body: {
          ...submittedDraft,
          content: (body as { content: string }).content,
          submitted: false,
          version: 2,
          earlierVersions,
        },
      }),
      [`POST ${essayPath}/submit`]: {
        body: {
          essayId: essayStage.essayId,
          submitted: true,
          wordCount: 9,
          feedback: "Your writing has been saved as submitted.",
          styleNotes: [],
        },
      },
    });
    renderEssay();
    const editor = await screen.findByLabelText("Your writing");
    expect(editor).toHaveAttribute("readonly");
    await userEvent.click(await screen.findByRole("button", { name: "Revise" }));

    await waitFor(() => expect(editor).not.toHaveAttribute("readonly"));
    expect(editor).toHaveValue(submittedDraft.content);
    // The assessment panel belongs to a submitted version, so it goes while version 2 is written.
    expect(screen.queryByRole("region", { name: "Assessment" })).not.toBeInTheDocument();
    // Version 1 and what the tutor said about it stay on the page, read-only.
    const earlier = await screen.findByRole("region", { name: "Earlier versions" });
    expect(
      within(earlier).getByText(/Version 1, submitted .+\. 6 words, assessed\./),
    ).toBeInTheDocument();
    expect(await within(earlier).findByText("Feedback on version 1")).toBeInTheDocument();
    expect(within(earlier).getByText("First thing to fix.")).toBeInTheDocument();
    expect(within(earlier).getAllByText("Not met")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Skip this task" })).not.toBeInTheDocument();

    await userEvent.type(editor, " I = V / R.");
    await userEvent.click(screen.getByRole("button", { name: "Submit version 2" }));
    await waitFor(() =>
      expect(
        screen.getByText("Version 2, submitted. Choose Revise to change it."),
      ).toBeInTheDocument(),
    );
    expect(calls.find((call) => call.key === `POST ${essayPath}/submit`)?.body).toEqual({
      content: `${submittedDraft.content} I = V / R.`,
    });
  });

  it("lists earlier versions closed until one is opened", async () => {
    stubFetch({
      [`GET ${essayPath}`]: {
        body: {
          ...submittedDraft,
          version: 2,
          earlierVersions: [
            { version: 1, wordCount: 6, submittedAt: "2026-11-08T12:00:00.000Z", assessed: false },
          ],
        },
      },
      [`GET ${essayPath}/assessment`]: { body: { ...readyAssessment, version: 2 } },
      [`GET ${essayPath}/versions/1`]: {
        body: {
          essayId: essayStage.essayId,
          version: 1,
          content: "An earlier attempt at the same idea.",
          wordCount: 7,
          submittedAt: "2026-11-08T12:00:00.000Z",
          assessment: null,
        },
      },
    });
    renderEssay();
    expect(await screen.findByRole("heading", { name: "Assessment of version 2" })).toBeInTheDocument();
    expect(screen.queryByText("An earlier attempt at the same idea.")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open version 1" }));
    expect(await screen.findByText("An earlier attempt at the same idea.")).toBeInTheDocument();
    expect(screen.getByText("This version was not assessed.")).toBeInTheDocument();
  });
});
