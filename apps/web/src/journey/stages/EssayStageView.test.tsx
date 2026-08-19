import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { essayStage } from "../../test/fixtures.js";
import { renderWithProviders, stubFetch } from "../../test/harness.js";
import { ModeProvider } from "../mode-context.js";
import { EssayStageView } from "./EssayStageView.js";

afterEach(() => vi.unstubAllGlobals());

const essayPath = `/api/essays/${encodeURIComponent(essayStage.essayId)}`;

function renderEssay(onContinue = vi.fn()) {
  renderWithProviders(
    <ModeProvider lessonId="lesson">
      <EssayStageView onContinue={onContinue} stage={essayStage} />
    </ModeProvider>,
  );
  return onContinue;
}

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
    const editor = await screen.findByLabelText("Your teach-back");
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
          feedback: "Your teach-back has been saved as submitted evidence.",
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
    await userEvent.click(await screen.findByRole("button", { name: /Submit teach-back/ }));
    expect(await screen.findByText("Style notes")).toBeInTheDocument();
    expect(
      screen.getByText("A negative parallelism appears in this sentence."),
    ).toBeInTheDocument();
    expect(screen.getByText("Submitted. The draft is now read-only.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
