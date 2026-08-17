import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Source } from "@discere/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createTutorReplyPacket: vi.fn(),
  importTutorReply: vi.fn(),
}));

vi.mock("../api", () => api);

import { TutorCompanion } from "./TutorCompanion";

const sources: Source[] = [
  {
    id: "openstax-circuits",
    title: "College Physics: Electric Current",
    publisher: "OpenStax",
    url: "https://openstax.org/books/college-physics/pages/20-1-current",
    licence: "CC BY 4.0",
    accessedAt: "2026-08-16",
  },
];

const packet = {
  filename: "discere-tutor-reply.md",
  text: "Prepared tutor prompt",
  requestId: "b3428b5b-07b2-4ab4-840f-c1d723c714b2",
  operation: "tutor_reply" as const,
};

beforeEach(() => {
  api.createTutorReplyPacket.mockReset();
  api.importTutorReply.mockReset();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("TutorCompanion", () => {
  it("keeps external tutoring unavailable in Exam mode", () => {
    render(<TutorCompanion mode="exam" sources={sources} />);
    expect(screen.getByText("Unavailable during Exam mode")).toBeInTheDocument();
    expect(screen.queryByLabelText("What do you want help with?")).not.toBeInTheDocument();
  });

  it("prepares, copies, validates, and displays an accepted tutor reply", async () => {
    api.createTutorReplyPacket.mockResolvedValue(packet);
    api.importTutorReply.mockResolvedValue({
      accepted: true,
      operation: "tutor_reply",
      requestId: packet.requestId,
      issues: [],
      reply: {
        answer: "Current falls because the same voltage is pushing through a larger resistance.",
        followUpQuestion: "What would you expect if the resistance doubled?",
        sourceIds: [sources[0]?.id],
        uncertainty: [],
      },
    });

    render(<TutorCompanion mode="coach" sources={sources} />);
    fireEvent.click(screen.getByText("Ask a question using your ChatGPT subscription"));
    fireEvent.change(screen.getByLabelText("What do you want help with?"), {
      target: { value: "Why does current fall?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare tutor prompt" }));

    await waitFor(() => expect(api.createTutorReplyPacket).toHaveBeenCalledWith({
      question: "Why does current fall?",
      mode: "coach",
    }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(packet.text);
    expect(screen.getByRole("link", { name: "Open ChatGPT" })).toHaveAttribute("href", "https://chatgpt.com/");

    fireEvent.change(screen.getByLabelText("ChatGPT JSON response"), {
      target: { value: "{valid response}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate tutor reply" }));

    expect(await screen.findByText("Current falls because the same voltage is pushing through a larger resistance.")).toBeInTheDocument();
    expect(screen.getByText("What would you expect if the resistance doubled?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: sources[0]?.title })).toBeInTheDocument();
  });

  it("shows validation issues instead of rendering a rejected reply", async () => {
    api.createTutorReplyPacket.mockResolvedValue(packet);
    api.importTutorReply.mockResolvedValue({
      accepted: false,
      operation: "tutor_reply",
      requestId: packet.requestId,
      issues: [{ field: "answer", code: "ANS001", severity: "hard", message: "The guided reply exposed the final answer." }],
      reply: {
        answer: "The current is 0.05 A.",
        followUpQuestion: "Can you repeat it?",
        sourceIds: [],
        uncertainty: [],
      },
    });

    render(<TutorCompanion mode="assisted" sources={sources} />);
    fireEvent.click(screen.getByText("Ask a question using your ChatGPT subscription"));
    fireEvent.change(screen.getByLabelText("What do you want help with?"), {
      target: { value: "Can you help?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare tutor prompt" }));
    await screen.findByLabelText("ChatGPT JSON response");
    fireEvent.change(screen.getByLabelText("ChatGPT JSON response"), {
      target: { value: "{leaking response}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate tutor reply" }));

    expect(await screen.findByText("Needs correction")).toBeInTheDocument();
    expect(screen.getByText(/ANS001/)).toBeInTheDocument();
    expect(screen.queryByText("The current is 0.05 A.")).not.toBeInTheDocument();
  });

  it("rejects a response from an older prepared request", async () => {
    api.createTutorReplyPacket.mockResolvedValue(packet);
    api.importTutorReply.mockResolvedValue({
      accepted: true,
      operation: "tutor_reply",
      requestId: "8aa30879-b240-465d-ae16-adb4d5906834",
      issues: [],
      reply: {
        answer: "A reply from another request.",
        followUpQuestion: "Continue?",
        sourceIds: [],
        uncertainty: [],
      },
    });

    render(<TutorCompanion mode="direct" sources={sources} />);
    fireEvent.click(screen.getByText("Ask a question using your ChatGPT subscription"));
    fireEvent.change(screen.getByLabelText("What do you want help with?"), {
      target: { value: "Explain it directly." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare tutor prompt" }));
    await screen.findByLabelText("ChatGPT JSON response");
    fireEvent.change(screen.getByLabelText("ChatGPT JSON response"), {
      target: { value: "{old response}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Validate tutor reply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("different tutor request");
    expect(screen.queryByText("A reply from another request.")).not.toBeInTheDocument();
  });
});
