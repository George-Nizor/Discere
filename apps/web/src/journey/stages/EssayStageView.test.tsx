import { screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByText("Submitted. The draft is now read-only.")).toBeInTheDocument();
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
