import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RomanStoryFixture } from "./RomanStoryFixture";

describe("Roman Empire visual QA fixture", () => {
  it("moves through five separate learner screens", () => {
    render(<RomanStoryFixture />);
    expect(screen.getByRole("heading", { name: "Explainer" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("heading", { name: "Diagram / visual" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("heading", { name: "Quiz / check" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /go to essay studio/i }));
    expect(screen.getByRole("heading", { name: "Essay studio" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /go to flashcards \/ review/i }));
    expect(screen.getByRole("heading", { name: "Flashcards / review" })).toBeInTheDocument();
  });
});
