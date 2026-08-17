import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { NotebookPage, Source } from "@discere/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createWorkingsReviewPacket: vi.fn(),
  importWorkingsReview: vi.fn(),
}));

vi.mock("../api", () => api);

import { WorkingsReview } from "./WorkingsReview";

const source: Source = {
  id: "openstax-circuits",
  title: "College Physics: Electric Current",
  publisher: "OpenStax",
  url: "https://openstax.org/books/college-physics/pages/20-1-current",
  licence: "CC BY 4.0",
  accessedAt: "2026-08-16",
};

const savedPage: NotebookPage = {
  lessonId: "lesson-current-ohms-law",
  pageType: "graph",
  note: "I divided voltage by resistance.",
  strokes: [
    {
      id: "working",
      width: 3,
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.35 },
      ],
    },
  ],
  updatedAt: "2026-08-17T05:00:00.000Z",
};

const packet = {
  filename: "discere-workings-review.md",
  text: "Prepared workings review prompt",
  requestId: "a8e0ae0e-f8cf-4835-9f15-45854b149afb",
  operation: "workings_review" as const,
  expectedFilename: "discere-lesson-current-ohms-law-workings.png",
};

beforeEach(() => {
  api.createWorkingsReviewPacket.mockReset();
  api.importWorkingsReview.mockReset();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("WorkingsReview", () => {
  it("requires a saved page", () => {
    const emptyPage: NotebookPage = {
      lessonId: savedPage.lessonId,
      pageType: "blank",
      note: "",
      strokes: [],
      updatedAt: null,
    };
    render(<WorkingsReview page={emptyPage} mode="coach" sources={[source]} />);
    expect(screen.getByText("Save a page before requesting feedback")).toBeInTheDocument();
  });

  it("stays unavailable during Exam mode", () => {
    render(<WorkingsReview page={savedPage} mode="exam" sources={[source]} />);
    expect(screen.getByText("Unavailable during Exam mode")).toBeInTheDocument();
    expect(screen.queryByText("Have ChatGPT inspect the saved page")).not.toBeInTheDocument();
  });

  it("prepares and displays an accepted review", async () => {
    api.createWorkingsReviewPacket.mockResolvedValue(packet);
    api.importWorkingsReview.mockResolvedValue({
      accepted: true,
      operation: "workings_review",
      requestId: packet.requestId,
      issues: [],
      review: {
        imageReviewed: true,
        transcription: "I = 5 / 100, followed by 0.5 A.",
        transcriptionConfidence: 0.93,
        assessment: "incorrect",
        feedback: "The formula uses the supplied values. The decimal written after division is inconsistent with the calculation.",
        firstMeaningfulError: "The decimal result is shifted one place.",
        nextStep: "Repeat the division and check the place value.",
        sourceIds: [source.id],
        uncertainty: [],
      },
    });

    render(<WorkingsReview page={savedPage} mode="coach" sources={[source]} />);
    fireEvent.click(screen.getByText("Have ChatGPT inspect the saved page"));
    fireEvent.click(screen.getByRole("button", { name: "Prepare review prompt" }));

    await waitFor(() =>
      expect(api.createWorkingsReviewPacket).toHaveBeenCalledWith({
        lessonId: savedPage.lessonId,
        reviewQuestion: "Check my workings and identify the first important step I should fix.",
        mode: "coach",
      }),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(packet.text);
    expect(screen.getByText(packet.expectedFilename)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("ChatGPT JSON response"), {
      target: { value: "{valid workings review}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate review" }));

    expect(await screen.findByText("93% reading confidence")).toBeInTheDocument();
    expect(screen.getByText("The decimal result is shifted one place.")).toBeInTheDocument();
    expect(screen.getByText("Repeat the division and check the place value.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: source.title })).toBeInTheDocument();
    expect(api.importWorkingsReview).toHaveBeenCalledWith({
      text: "{valid workings review}",
      mode: "coach",
      lessonId: savedPage.lessonId,
      expectedRequestId: packet.requestId,
    });
  });

  it("shows validation issues without displaying a rejected review", async () => {
    api.createWorkingsReviewPacket.mockResolvedValue(packet);
    api.importWorkingsReview.mockResolvedValue({
      accepted: false,
      operation: "workings_review",
      requestId: packet.requestId,
      issues: [
        {
          field: "imageReviewed",
          code: "IMAGE_NOT_REVIEWED",
          severity: "hard",
          message: "A usable image was not reviewed.",
        },
      ],
      review: {
        imageReviewed: false,
        transcription: "",
        transcriptionConfidence: 0,
        assessment: "unclear",
        feedback: "The page cannot be assessed without the image.",
        firstMeaningfulError: null,
        nextStep: "Attach the exported PNG.",
        sourceIds: [],
        uncertainty: ["No image was attached."],
      },
    });

    render(<WorkingsReview page={savedPage} mode="direct" sources={[source]} />);
    fireEvent.click(screen.getByText("Have ChatGPT inspect the saved page"));
    fireEvent.click(screen.getByRole("button", { name: "Prepare review prompt" }));
    await screen.findByLabelText("ChatGPT JSON response");
    fireEvent.change(screen.getByLabelText("ChatGPT JSON response"), {
      target: { value: "{review without image}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate review" }));

    expect(await screen.findByText("Needs correction")).toBeInTheDocument();
    expect(screen.getByText(/IMAGE_NOT_REVIEWED/)).toBeInTheDocument();
    expect(screen.queryByText("Attach the exported PNG.")).not.toBeInTheDocument();
  });
});
