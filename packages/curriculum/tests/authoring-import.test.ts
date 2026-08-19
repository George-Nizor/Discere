import type { ImportedLesson, TopicMap } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { importedToSteps, lessonPrompt, mergeLesson, textToBlocks } from "../src/index.js";

const map: TopicMap = {
  courseId: "logic-and-reasoning",
  title: "Logic and Reasoning",
  description: "Work out what follows from what.",
  audience: "A general reader.",
  accent: "#3856c4",
  coverAsset: "cover.svg",
  sources: [{ title: "Open Logic Project", url: "https://openlogicproject.org/" }],
  modules: [
    {
      id: "deduction",
      title: "Deduction",
      summary: "What follows from what.",
      concepts: [
        { id: "conditional", title: "Conditional", summary: "An if-then claim." },
      ],
      lessons: [
        {
          slug: "if-then-claims",
          title: "If-then claims",
          outcome: "State exactly when a conditional is false.",
          outline: ["Hook", "Explain", "Check"],
          conceptIds: ["conditional"],
          activityKinds: ["diagram_choice"],
        },
      ],
    },
  ],
};

const topicLesson = map.modules[0]?.lessons[0];
if (!topicLesson) throw new Error("The fixture topic map lost its lesson.");
const entry = { module: "Deduction", lesson: topicLesson };

const imported: ImportedLesson = {
  slug: "if-then-claims",
  title: "If-then claims",
  orientation: "Work out the one case in which an if-then claim is broken.",
  reviewLabel: "Conditionals",
  nextAction: "Try turning a conditional around.",
  stageTitles: { quiz: "Check understanding", review: "Recall", completion: "Done" },
  steps: [
    { id: "hook", kind: "hook", text: "First line.\n\nSecond line.", visualStateId: "", checkQuestionId: "", activityId: "" },
    { id: "explain", kind: "explain", text: "The four cases.", visualStateId: "", checkQuestionId: "", activityId: "" },
    { id: "check", kind: "check", text: "Your turn.", visualStateId: "", checkQuestionId: "falsifies", activityId: "" },
    { id: "close", kind: "explain", text: "A narrow promise.", visualStateId: "", checkQuestionId: "", activityId: "" },
  ],
  questions: [
    {
      id: "falsifies",
      prompt: "Which situation shows the claim is false?",
      responseType: "short_text",
      difficulty: 1,
      hints: ["Look for the case it commits to."],
      answerAuthority: {
        kind: "text",
        value: 0,
        unit: "",
        workedAnswer: "",
        acceptedIdeas: ["it rains and the match goes ahead"],
        rejectedIdeas: [],
        exampleAnswer: "It rains and the match goes ahead.",
      },
      choices: [
        { id: "a", label: "It rains and the match goes ahead" },
        { id: "b", label: "It does not rain" },
      ],
    },
    {
      id: "silent-case",
      prompt: "What does the claim say when it does not rain?",
      responseType: "short_text",
      difficulty: 1,
      hints: ["Which part was triggered?"],
      answerAuthority: {
        kind: "text",
        value: 0,
        unit: "",
        workedAnswer: "",
        acceptedIdeas: ["nothing"],
        rejectedIdeas: [],
        exampleAnswer: "Nothing at all.",
      },
      choices: [],
    },
  ],
  flashcards: [
    { id: "when-false", front: "When is a conditional false?", back: "Antecedent true, consequent false.", conceptIds: ["conditional"] },
  ],
  uncertainty: [],
};

function emptyBundle(): Record<string, unknown> {
  return {
    course: { id: "logic-and-reasoning", sourceIds: ["src-1"] },
    lessons: [],
    questions: [],
    flashcards: [],
  };
}

describe("text to blocks", () => {
  it("splits on blank lines and keeps the author's paragraphing", () => {
    expect(textToBlocks("One.\n\nTwo.\n\n\nThree.")).toEqual([
      { kind: "paragraph", text: "One." },
      { kind: "paragraph", text: "Two." },
      { kind: "paragraph", text: "Three." },
    ]);
  });

  it("returns a single block for prose with no breaks", () => {
    expect(textToBlocks("Just one.")).toEqual([{ kind: "paragraph", text: "Just one." }]);
  });
});

describe("imported to steps", () => {
  it("carries the references through and splits the prose", () => {
    const steps = importedToSteps(imported);
    expect(steps.map((step) => step.id)).toEqual(["hook", "explain", "check", "close"]);
    expect(steps[0]?.blocks).toHaveLength(2);
    expect(steps[2]?.checkQuestionId).toBe("falsifies");
  });

  it("refuses a step kind the player cannot render", () => {
    const [firstStep] = imported.steps;
    if (!firstStep) throw new Error("The fixture lesson lost its first step.");
    expect(() =>
      importedToSteps({
        ...imported,
        steps: [{ ...firstStep, kind: "ponder" }],
      }),
    ).toThrow(/not one of/);
  });
});

describe("merge", () => {
  it("keeps a question asked inline out of the quiz stages", () => {
    const bundle = emptyBundle();
    mergeLesson(bundle, map, entry, imported);
    const lesson = (bundle["lessons"] as Array<Record<string, unknown>>)[0];
    // 'falsifies' is asked by a check step, so it must not also become a quiz stage.
    expect(lesson?.["questionIds"]).toEqual(["silent-case"]);
  });

  it("converts the flat answer authority into the form the bundle stores", () => {
    const bundle = emptyBundle();
    mergeLesson(bundle, map, entry, imported);
    const question = (bundle["questions"] as Array<Record<string, unknown>>)[0];
    expect(question?.["answerAuthority"]).toEqual({
      kind: "text",
      acceptedIdeas: ["it rains and the match goes ahead"],
      rejectedIdeas: [],
      exampleAnswer: "It rains and the match goes ahead.",
    });
  });

  it("drops a choice list too short to be a choice", () => {
    const bundle = emptyBundle();
    mergeLesson(bundle, map, entry, imported);
    const [withChoices, withoutChoices] = bundle["questions"] as Array<Record<string, unknown>>;
    expect(withChoices?.["choices"]).toHaveLength(2);
    expect(withoutChoices).not.toHaveProperty("choices");
  });

  it("attributes sources and concepts the writer was never asked for", () => {
    const bundle = emptyBundle();
    mergeLesson(bundle, map, entry, imported);
    const question = (bundle["questions"] as Array<Record<string, unknown>>)[0];
    const card = (bundle["flashcards"] as Array<Record<string, unknown>>)[0];
    expect(question?.["sourceIds"]).toEqual(["src-1"]);
    expect(question?.["conceptIds"]).toEqual(["conditional"]);
    expect(card?.["sourceIds"]).toEqual(["src-1"]);
  });

  it("preserves hand-wired plumbing when a lesson is imported again", () => {
    const bundle = emptyBundle();
    mergeLesson(bundle, map, entry, imported);
    const lessons = bundle["lessons"] as Array<Record<string, unknown>>;
    // Something a person wired in after the first import.
    const wired = lessons[0];
    if (!wired) throw new Error("The merge produced no lesson.");
    wired["visualKind"] = "circuit";
    wired["circuitSpec"] = { id: "loop" };

    mergeLesson(bundle, map, entry, { ...imported, title: "Revised title" });
    expect(lessons).toHaveLength(1);
    expect(lessons[0]?.["title"]).toBe("Revised title");
    expect(lessons[0]?.["visualKind"]).toBe("circuit");
    expect(lessons[0]?.["circuitSpec"]).toEqual({ id: "loop" });
  });
});

describe("lesson prompt", () => {
  it("states the exact answer-authority shape, which is the thing that round-trips", () => {
    const prompt = lessonPrompt(map, "Deduction", entry.lesson);
    expect(prompt).toContain("seven fields must be present");
    expect(prompt).toContain("acceptedIdeas");
    expect(prompt).toContain("workedAnswer");
    // The outline and the concept ids the writer must use are both carried through.
    expect(prompt).toContain("1. Hook");
    expect(prompt).toContain("`conditional`");
    expect(prompt).toContain("diagram_choice");
  });

  it("names where the reply is saved and what to run next", () => {
    const prompt = lessonPrompt(map, "Deduction", entry.lesson);
    expect(prompt).toContain("content/logic-and-reasoning/.authoring/inbox/if-then-claims.json");
    expect(prompt).toContain("pnpm curate import logic-and-reasoning");
  });
});
