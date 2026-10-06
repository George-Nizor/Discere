import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LanguageDiagram as Spec, LanguageModel } from "@discere/contracts";
import { LanguageDiagram, LanguageGivenVisual } from "./LanguageDiagram.js";

const experience = vi.hoisted(() => ({ reduced: false }));
vi.mock("../../study/experience.js", () => ({ useExperience: () => experience }));
afterEach(() => {
  experience.reduced = false;
  vi.unstubAllGlobals();
});

const spec = (...models: LanguageModel[]): Spec => ({
  type: "language_explorer",
  initialCaseId: "c0",
  cases: models.map((model, i) => ({ id: "c" + i, label: "Case " + (i + 1), model })),
});
const splice: LanguageModel = {
  kind: "clauses",
  clauses: [
    {
      kind: "independent",
      parts: [
        { text: "The vote", role: "subject" },
        { text: "was", role: "verb" },
        { text: "close", role: "complement" },
      ],
    },
    {
      kind: "independent",
      parts: [
        { text: "the motion", role: "subject" },
        { text: "failed.", role: "verb" },
      ],
    },
  ],
  join: { mark: "comma", conjunction: "but", relation: "contrast" },
};
const motion: LanguageModel = {
  kind: "voice",
  agent: "the committee",
  active: "rejected",
  passive: "was rejected",
  patient: "the motion",
  display: "passive",
};
const line: LanguageModel = {
  kind: "scansion",
  source: "Sonnet 116, line 6",
  syllables: [
    ["That", false, true],
    ["looks", true, true],
    ["on", false, true],
    ["tem", true, false],
    ["pests", false, true],
    ["and", true, true],
    ["is", false, true],
    ["ne", true, false],
    ["ver", false, true],
    ["sha", true, false],
    ["ken", false, true],
  ].map(([text, stress, wordEnd]) => ({
    text: text as string,
    stress: stress as boolean,
    wordEnd: wordEnd as boolean,
  })),
};
const arc: LanguageModel = {
  kind: "arc",
  title: "A heist",
  scenes: [
    { label: "The plan", rise: 2, opens: "-", closes: "+" },
    { label: "The vault", rise: 7, opens: "+", closes: "+" },
    { label: "The alarm", rise: 10, opens: "+", closes: "-" },
    { label: "The chase", rise: 4, opens: "-", closes: "-" },
  ],
};

describe("language explorer", () => {
  it("rebuilds the sentence for each join and keeps verdicts and roles hidden until grading", async () => {
    const { container, rerender } = render(<LanguageDiagram spec={spec(splice, motion)} />);
    const sentence = () =>
      container.querySelector(".lang-sentence")!.textContent!.replace(/\s+/g, " ");
    expect(sentence()).toBe("The vote was close, the motion failed.");
    await userEvent.click(screen.getByRole("button", { name: "Semicolon" }));
    expect(sentence()).toBe("The vote was close; the motion failed.");
    await userEvent.click(screen.getByRole("button", { name: "Full stop" }));
    expect(sentence()).toBe("The vote was close. The motion failed.");
    expect(screen.queryByText("Comma splice.")).not.toBeInTheDocument();
    expect(container.querySelector(".lang-part-tag")).toBeNull();
    expect(container.querySelector(".lang-measures")).toBeNull();
    rerender(<LanguageDiagram spec={spec(splice, motion)} showResults />);
    expect(screen.getByText("Standard.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Comma" }));
    expect(screen.getByText("Comma splice.")).toBeVisible();
    expect(container.querySelectorAll(".lang-part-tag").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Reading revealed after your answer")).toHaveTextContent(
      "Comma splice",
    );
  });
  it("moves the actor between voices and switches cases from the keyboard", async () => {
    const { container } = render(<LanguageDiagram spec={spec(motion, splice)} />);
    const voiceLine = () => container.querySelector(".lang-voice-line")!.getAttribute("aria-label");
    expect(voiceLine()).toBe("The motion was rejected by the committee.");
    await userEvent.click(screen.getByRole("button", { name: "Active" }));
    expect(voiceLine()).toBe("The committee rejected the motion.");
    await userEvent.click(screen.getByRole("button", { name: "Remove the actor" }));
    expect(voiceLine()).toBe("The motion was rejected.");
    expect(screen.queryByText(/words in this version/)).not.toBeInTheDocument();
    screen.getByRole("button", { name: "Case 2" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Case 2" })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector(".lang-sentence")).not.toBeNull();
  });
  it("lets the learner strike words and count what is left before the authored edit", async () => {
    const cut: LanguageModel = {
      kind: "compress",
      segments: [
        { text: "The committee", edit: "keep" },
        { text: "made a decision", edit: "replace", replacement: "decided" },
        { text: "to act.", edit: "keep" },
      ],
    };
    const { rerender } = render(<LanguageDiagram spec={spec(cut, motion)} />);
    expect(screen.getByText(/words as drafted/)).toHaveTextContent("7 words as drafted");
    await userEvent.click(screen.getByRole("button", { name: "made" }));
    await userEvent.click(screen.getByRole("button", { name: "a" }));
    expect(screen.getByText(/words left after your cuts/)).toHaveTextContent(
      "5 words left after your cuts",
    );
    rerender(<LanguageDiagram spec={spec(cut, motion)} showResults />);
    expect(screen.getByText("The committee decided to act.")).toBeVisible();
    expect(screen.getByLabelText("Reading revealed after your answer")).toHaveTextContent(
      "Saved2 words",
    );
  });
  it("hides the scansion until grading, then plays a finite beat that reduced motion removes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { container, rerender } = render(<LanguageDiagram spec={spec(line, motion)} />);
    expect(container.querySelector(".lang-syllable")).toBeNull();
    expect(container.querySelector(".lang-scan-line")).toHaveTextContent(
      "That looks on tempests and is never shaken",
    );
    const pad = screen.getByRole("button", { name: /Tap once per syllable/ });
    fireEvent.click(pad);
    fireEvent.click(pad);
    expect(pad).toHaveAccessibleName("Tap once per syllable. Taps so far: 2");
    rerender(<LanguageDiagram spec={spec(line, motion)} showResults />);
    expect(container.querySelectorAll(".lang-syllable")).toHaveLength(11);
    expect(container.querySelectorAll('.lang-syllable[data-stress="true"]')).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Hear the beat" }));
    act(() => vi.advanceTimersByTime(420 * 3));
    expect(container.querySelector('.lang-syllable[data-now="true"]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(420 * 12));
    expect(container.querySelector('.lang-syllable[data-now="true"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Hear the beat" })).toBeVisible();
    experience.reduced = true;
    rerender(<LanguageDiagram spec={spec(line, motion)} showResults />);
    expect(screen.queryByRole("button", { name: "Hear the beat" })).not.toBeInTheDocument();
    vi.useRealTimers();
  });
  it("walks the plot by slider, finishes playback and marks the climax only after grading", async () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let next = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.set(++next, callback);
      return next;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
    const { container, rerender } = render(<LanguageDiagram spec={spec(arc, motion)} />);
    expect(container.querySelector('[data-climax="true"]')).toBeNull();
    fireEvent.change(screen.getByRole("slider", { name: "Position in the plot" }), {
      target: { value: "100" },
    });
    expect(screen.getByText(/The chase/, { selector: ".lang-scrubber span" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    await userEvent.click(screen.getByRole("button", { name: "Walk the plot" }));
    act(() => callbacks.get(1)!(0));
    act(() => callbacks.get(2)!(5000));
    expect(screen.getByRole("slider")).toHaveValue("100");
    expect(screen.getByRole("button", { name: "Replay" })).toBeVisible();
    rerender(<LanguageDiagram spec={spec(arc, motion)} showResults />);
    expect(container.querySelector('[data-climax="true"]')).not.toBeNull();
    expect(container.querySelectorAll('.lang-scene[data-turn="true"]')).toHaveLength(2);
    experience.reduced = true;
    rerender(<LanguageDiagram spec={spec(arc, motion)} showResults />);
    expect(screen.queryByRole("button", { name: /Walk the plot|Replay/ })).not.toBeInTheDocument();
  });
  it("labels Toulmin roles and rhyme letters only after grading", () => {
    const argument: LanguageModel = {
      kind: "toulmin",
      statements: [
        { text: "Sales fell after the price rise.", role: "grounds" },
        { text: "The price should fall.", role: "claim" },
      ],
    };
    const { rerender, container } = render(<LanguageDiagram spec={spec(argument, motion)} />);
    expect(screen.queryByText("Claim")).not.toBeInTheDocument();
    expect(container.querySelector(".lang-toulmin")).toHaveAttribute("data-built", "false");
    rerender(<LanguageDiagram spec={spec(argument, motion)} showResults />);
    expect(container.querySelector(".lang-card-role")).toHaveTextContent("Grounds");
    expect(container.querySelector(".lang-toulmin")).toHaveAttribute("data-built", "true");
  });
  it("renders check visuals with given text and no controls or readings", () => {
    render(<LanguageGivenVisual model={splice} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByText(/Comma splice|subject/i)).not.toBeInTheDocument();
    expect(screen.getByText("the motion")).toBeVisible();
  });
});
