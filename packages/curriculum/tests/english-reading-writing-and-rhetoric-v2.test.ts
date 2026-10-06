import { readFileSync } from "node:fs";
import { assessTextAnswer } from "@discere/assessment-engine";
import type { CourseBundle, Question } from "@discere/contracts";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

/**
 * English: Reading, Writing and Rhetoric, all twelve lessons rewritten to the v2 format. Most items
 * are text answers, so the content test checks that every choice item has exactly one correct
 * option and that no misconception matches the key. The numeric items are counts and positions;
 * each key is recomputed here from the words, letters or diagram data the item describes.
 */
const bundle = JSON.parse(
  readFileSync(
    new URL(
      "../../../content/english-reading-writing-and-rhetoric/.authoring/candidate.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as CourseBundle;

const question = (id: string): Question => {
  const found = bundle.questions.find((item) => item.id === id);
  if (!found) throw new Error(`no question ${id}`);
  return found;
};
const key = (id: string) => {
  const authority = question(id).answerAuthority;
  if (authority.kind !== "numeric") throw new Error(`${id} is not numeric`);
  return authority.value;
};
const words = (text: string) => text.split(/\s+/u).filter(Boolean).length;
const syllables = (hyphenated: string) => hyphenated.split("-").length;
const distinct = (letters: string) => new Set(letters).size;
const argmax = (values: number[]) => values.indexOf(Math.max(...values)) + 1;

type Arc = { scenes: Array<{ rise: number; opens: string; closes: string }> };
const lessonOf = (id: string) => bundle.lessons.find((item) => item.id === id)!;
const arcOf = (lessonId: string, stepId: string, caseIndex: number): Arc["scenes"] => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId)!;
  const diagram = step.diagram as unknown as { cases: Array<{ model: Arc }> };
  return diagram.cases[caseIndex]!.model.scenes;
};
const turns = (scenes: Array<{ opens: string; closes: string }>) =>
  scenes.filter((scene) => scene.opens !== scene.closes).length;

const ids = [
  "clause-anatomy",
  "joining-clauses",
  "actors-and-actions",
  "claim-grounds-warrant",
  "appeals-and-occasion",
  "figures-of-speech",
  "metre-and-scansion",
  "sound-and-image",
  "sonnet-and-volta",
  "point-of-view",
  "irony-and-reliability",
  "structure-and-scenes",
];

describe("English v2 lessons", () => {
  it("validates, and every lesson has the v2 anatomy", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(bundle.lessons.map((lesson) => lesson.id)).toEqual(ids);
    for (const lesson of bundle.lessons) {
      expect(lesson.intro?.hook.questionId).toBeTruthy();
      expect(lesson.recap).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length).toBeLessThanOrEqual(7);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
      expect(lesson.calculator).toBe("off");
    }
  });

  it("keeps multiple choice to at most 35% of the course", () => {
    const choices = bundle.questions.filter((item) => item.choices).length;
    expect(choices / bundle.questions.length).toBeLessThanOrEqual(0.35);
  });

  it("gives every choice item exactly one correct option", () => {
    const withChoices = bundle.questions.filter((item) => item.choices);
    expect(withChoices.length).toBeGreaterThan(0);
    for (const item of withChoices) {
      const authority = item.answerAuthority;
      if (authority.kind !== "text") throw new Error(`${item.id} is not a text item`);
      const correct = item.choices!.filter(
        (choice) => assessTextAnswer(choice.label, authority).correct,
      );
      expect(correct.map((choice) => choice.label), item.id).toEqual([authority.acceptedIdeas[0]]);
      // No misconception may match the key.
      for (const misconception of item.misconceptions ?? [])
        expect(misconception.match.choiceIds ?? [], item.id).not.toContain(correct[0]!.id);
    }
  });

  it("never lets a misconception match the key, numeric or text", () => {
    for (const item of bundle.questions) {
      const authority = item.answerAuthority;
      for (const misconception of item.misconceptions ?? []) {
        if (authority.kind === "numeric")
          expect(misconception.match.numeric ?? [], item.id).not.toContain(authority.value);
        else
          for (const idea of misconception.match.textIdeas ?? [])
            expect(assessTextAnswer(idea, authority).correct, `${item.id}: ${idea}`).toBe(false);
      }
    }
  });

  it("keeps numeric keys equal to what the item counts", () => {
    // Inside a clause
    expect(key("lang-clause-anatomy-4")).toBe(["is", "alters", "finds"].length);
    expect(key("lang-clause-anatomy-5")).toBe(["You may rejoice", "I must mourn"].length);
    const present = "The dog chases the ball".split(" ");
    const past = "The dog chased the ball".split(" ");
    expect(key("lang-clause-anatomy-7")).toBe(present.filter((w, i) => w !== past[i]).length);
    // Joining clauses
    expect(key("lang-joining-clauses-6")).toBe(
      "The hall was full; the speaker was late: his train had stopped outside the city.".split(
        /[;:]/u,
      ).length,
    );
    expect(key("lang-joining-clauses-7")).toBe("We waited, the bus never came".split(",").length);
    // Actors and actions
    expect(key("lang-actors-and-actions-1")).toBe(words("The committee rejected the motion."));
    expect(key("lang-actors-and-actions-7")).toBe(words("Sam broke the window."));
    expect(key("lang-actors-and-actions-3")).toBe(
      words("The committee made a decision to conduct a review of the policy") -
        words("The committee decided to review the policy"),
    );
    const padded = "In my personal opinion, it is basically true that the final outcome depends on the weather.";
    expect(key("lang-actors-and-actions-4")).toBe(
      words("The outcome depends on the weather."),
    );
    expect(words(padded) - words("The outcome depends on the weather.")).toBe(
      words("In my opinion, it is true that") + ["personal", "basically", "final"].length,
    );
    expect(key("lang-actors-and-actions-5")).toBe(
      words("The budget was approved by the council in March.") -
        words("The council approved the budget in March."),
    );
    // Claim, grounds and warrant: roles of the numbered statements
    const pricing = ["grounds", "warrant", "claim", "rebuttal"];
    expect(key("lang-claim-grounds-warrant-4")).toBe(pricing.indexOf("warrant") + 1);
    const museum = ["claim", "grounds", "warrant", "rebuttal"];
    expect(key("lang-claim-grounds-warrant-5")).toBe(museum.indexOf("grounds") + 1);
    expect(key("lang-claim-grounds-warrant-7")).toBe([true, true, false].filter(Boolean).length);
    // Appeals and occasion
    expect(key("lang-appeals-and-occasion-3")).toBe(1863 - (4 * 20 + 7));
    // Figures of repetition and balance
    const dickens =
      "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.";
    expect(key("lang-figures-of-speech-1")).toBe(
      dickens.split(",").filter((part) => part.trim().toLowerCase().startsWith("it was")).length,
    );
    expect(key("lang-figures-of-speech-7")).toBe(
      "I came, I saw, I conquered".split(", ").filter((part) => part.startsWith("I ")).length,
    );
    // Metre and scansion
    expect(key("lang-metre-and-scansion-1")).toBe(syllables("shall-I-com-pare-thee-to-a-sum-mer's-day"));
    expect(key("lang-metre-and-scansion-2")).toBe([2, 4, 6, 8, 10][2]);
    expect(key("lang-metre-and-scansion-3")).toBe(
      syllables("that-looks-on-tem-pests-and-is-nev-er-sha-ken"),
    );
    expect(key("lang-metre-and-scansion-5")).toBe(syllables("that-per-ches-in-the-soul"));
    expect(key("lang-metre-and-scansion-7")).toBe(
      "TWIN-kle TWIN-kle LIT-tle STAR".split(/[ -]/u).filter((s) => s === s.toUpperCase()).length,
    );
    expect(key("lang-metre-and-scansion-11")).toBe(4 * 2);
    // Sound and image
    const sonnet30 = "When to the sessions of sweet silent thought".toLowerCase().split(" ");
    expect(key("lang-sound-and-image-1")).toBe(sonnet30.filter((w) => w.startsWith("s")).length);
    const longI: Record<string, boolean> = { still: false, "unravish'd": false, bride: true, quietness: true };
    expect(key("lang-sound-and-image-2")).toBe(Object.values(longI).filter(Boolean).length);
    expect(key("lang-sound-and-image-7")).toBe(
      "Peter Piper picked a peck of pickled peppers".split(" ").filter((w) => w.startsWith("P") || w.startsWith("p")).length,
    );
    const onset: Record<string, string> = { knee: "n", nose: "n", cat: "k", city: "s", phone: "f", fish: "f" };
    const pairs = [["knee", "nose"], ["cat", "city"], ["phone", "fish"]] as const;
    expect(key("lang-sound-and-image-8")).toBe(pairs.filter(([a, b]) => onset[a] === onset[b]).length);
    // Sonnet and volta
    expect(key("lang-sonnet-and-volta-1")).toBe(distinct("ABABCDCDEFEFGG"));
    expect(key("lang-sonnet-and-volta-2")).toBe(distinct("ABBAABBA"));
    expect(key("lang-sonnet-and-volta-3")).toBe(8 + 1);
    expect(key("lang-sonnet-and-volta-4")).toBe(3 * 4 + 1);
    const ending: Record<string, string> = { red: "ed", blue: "oo", sweet: "eet", you: "oo" };
    const verse = ["red", "blue", "sweet", "you"];
    expect(key("lang-sonnet-and-volta-7")).toBe(
      verse.findIndex((w, i) => i !== 1 && ending[w] === ending[verse[1]!]) + 1,
    );
    const quatrain = "ABAB";
    expect(key("lang-sonnet-and-volta-8")).toBe(quatrain.indexOf("A", 1) + 1);
    expect(key("lang-sonnet-and-volta-9")).toBe("ABBAABBA".length);
    expect(key("lang-sonnet-and-volta-10")).toBe(distinct("CDECDE"));
    // Point of view
    expect(key("lang-point-of-view-4")).toBe(["direct", "narration", "free-indirect"].indexOf("free-indirect") + 1);
    // Irony
    const antony = lessonOf("irony-and-reliability").steps.find((s) => s.id === "predict")!.diagram as unknown as {
      cases: Array<{ model: { lines: Array<{ spans: Array<{ mark?: string }> }> } }>;
    };
    expect(key("lang-irony-and-reliability-1")).toBe(
      antony.cases[0]!.model.lines.filter((line) => line.spans.some((span) => span.mark === "irony")).length,
    );
    expect(key("lang-irony-and-reliability-9")).toBe([true, false, true].filter(Boolean).length);
    // Structure and scenes, from the diagrams themselves
    expect(key("lang-structure-and-scenes-1")).toBe(argmax(arcOf("structure-and-scenes", "predict", 0).map((s) => s.rise)));
    expect(key("lang-structure-and-scenes-3")).toBe(turns(arcOf("structure-and-scenes", "predict", 1)));
    expect(key("lang-structure-and-scenes-4")).toBe(argmax(arcOf("structure-and-scenes", "transfer", 0).map((s) => s.rise)));
    expect(key("lang-structure-and-scenes-7")).toBe(argmax([1, 3, 6, 9, 5]));
    expect(key("lang-structure-and-scenes-9")).toBe(turns([{ opens: "+", closes: "-" }, { opens: "-", closes: "+" }, { opens: "+", closes: "+" }]));
    expect(key("lang-structure-and-scenes-10")).toBe(
      turns([{ opens: "-", closes: "+" }, { opens: "+", closes: "+" }, { opens: "+", closes: "-" }, { opens: "-", closes: "-" }]),
    );
    expect(argmax([2, 5, 9, 7, 4, 1])).toBe(3);
  });
});
