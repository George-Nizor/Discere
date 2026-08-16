import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModeSelector } from "./ModeSelector";
describe("ModeSelector", () => {
  it("reports the chosen mode", () => {
    const onChange = vi.fn();
    render(<ModeSelector value="coach" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Exam/ }));
    expect(onChange).toHaveBeenCalledWith("exam");
  });
});
