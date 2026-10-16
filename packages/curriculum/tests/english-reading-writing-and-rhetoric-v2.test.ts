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

type Arc = { scenes: Array<{ label: string; rise: number; opens: string; closes: string }> };
const lessonOf = (id: string) => bundle.lessons.find((item) => item.id === id)!;
const arcOf = (lessonId: string, stepId: string, caseIndex: number): Arc["scenes"] => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId)!;
  const diagram = step.diagram as unknown as { cases: Array<{ model: Arc }> };
  return diagram.cases[caseIndex]!.model.scenes;
};
const turns = (scenes: Array<{ opens: string; closes: string }>) =>
  scenes.filter((scene) => scene.opens !== scene.closes).length;

type Part = { role: string };
const clausesOf = (lessonId: string, stepId: string, caseIndex: number) => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId)!;
  const diagram = step.diagram as unknown as {
    cases: Array<{ model: { clauses: Array<{ kind: string; parts: Part[] }> } }>;
  };
  return diagram.cases[caseIndex]!.model.clauses;
};
const rolesOf = (lessonId: string, stepId: string, caseIndex: number) => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId)!;
  const diagram = step.diagram as unknown as {
    cases: Array<{ model: { statements: Array<{ role: string }> } }>;
  };
  return diagram.cases[caseIndex]!.model.statements.map((statement) => statement.role);
};

type Case = { id: string; model: Record<string, unknown> };
const casesIn = (lessonId: string, stepId: string): Case[] => {
  const step = lessonOf(lessonId).steps.find((item) => item.id === stepId);
  if (!step) throw new Error(`no step ${lessonId}/${stepId}`);
  return (step.diagram as unknown as { cases: Case[] }).cases;
};
const caseIn = (lessonId: string, stepId: string, caseId: string) =>
  casesIn(lessonId, stepId).find((item) => item.id === caseId)!.model;
type Span = { text: string; mark?: string };
const spansOf = (model: Record<string, unknown>) =>
  (model["lines"] as Array<{ spans: Span[] }>).flatMap((line) => line.spans);
const marked = (model: Record<string, unknown>, mark: string) =>
  spansOf(model).filter((span) => span.mark === mark);
type Syllable = { text: string; stress: boolean; wordEnd: boolean };
const syllablesIn = (model: Record<string, unknown>) => model["syllables"] as Syllable[];
type SonnetLine = { text: string; sound: string };
const sonnetLines = (model: Record<string, unknown>) => model["lines"] as SonnetLine[];

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

const STORY_IDS = ids;
const wordsIn = (blocks: Array<{ text?: string }> | undefined) =>
  (blocks ?? []).reduce((sum, block) => sum + words(block.text ?? ""), 0);
const isTeaching = (step: { kind: string; checkQuestionId?: string }) =>
  step.kind === "explain" && !step.checkQuestionId;
/** Every learner-facing sentence of a lesson's prose, for checking what the text claims. */
const proseOf = (lessonId: string) => {
  const lesson = lessonOf(lessonId);
  const texts = [
    ...(lesson.intro?.hook.blocks ?? []),
    ...lesson.steps.flatMap((step) => [...(step.lead ?? []), ...(step.afterFigure ?? [])]),
    ...(lesson.recap?.blocks ?? []),
  ].map((block) => (block as { text?: string }).text ?? "");
  return texts.join(" ");
};

describe("English v2 lessons", () => {
  it("validates, and every lesson has the v2 anatomy", () => {
    const validation = validateCourseBundle(bundle);
    expect(validation.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(bundle.lessons.map((lesson) => lesson.id)).toEqual(ids);
    for (const lesson of bundle.lessons) {
      expect(lesson.recap).toBeDefined();
      expect(lesson.questionIds).toHaveLength(3);
      expect(lesson.steps.some((step) => step.kind === "transfer")).toBe(true);
      expect(lesson.calculator).toBe("off");
      if (STORY_IDS.includes(lesson.id)) continue;
      expect(lesson.intro?.hook.questionId).toBeTruthy();
      expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
      expect(lesson.steps.length).toBeLessThanOrEqual(7);
    }
  });

  it("writes all twelve lessons in the story format", () => {
    for (const id of STORY_IDS) {
      const lesson = lessonOf(id);
      const intro = lesson.intro!;
      // The opener asks nothing, and the promise is one short sentence.
      expect(intro.hook.questionId, id).toBeUndefined();
      expect(wordsIn(intro.hook.blocks as Array<{ text?: string }>), id).toBeGreaterThanOrEqual(120);
      expect(wordsIn(intro.hook.blocks as Array<{ text?: string }>), id).toBeLessThanOrEqual(200);
      expect(JSON.stringify(intro.hook.blocks), id).not.toContain("?");
      expect(words(intro.promise), id).toBeLessThanOrEqual(25);
      // Eight to fourteen steps, at least 40% teaching, never more than three teaching in a row.
      expect(lesson.steps.length, id).toBeGreaterThanOrEqual(8);
      expect(lesson.steps.length, id).toBeLessThanOrEqual(14);
      const teaching = lesson.steps.filter(isTeaching);
      expect(teaching.length / lesson.steps.length, id).toBeGreaterThanOrEqual(0.4);
      let run = 0;
      for (const step of lesson.steps) {
        run = isTeaching(step) ? run + 1 : 0;
        expect(run, `${id}/${step.id}`).toBeLessThanOrEqual(3);
      }
      const asked = lesson.steps.filter(
        (step) =>
          step.checkQuestionId ||
          step.workedSteps?.some((line) => line.blank || line.selfExplain),
      );
      expect(asked.length, id).toBeGreaterThanOrEqual(3);
      expect(asked.length, id).toBeLessThanOrEqual(7);
      expect(lesson.steps.some((step) => step.diagram), id).toBe(true);
      expect(lesson.steps[0]!.kind, id).toBe("explain");
      // Teaching screens carry 80 to 280 words and no question; practice leads stay short.
      for (const step of lesson.steps) {
        const body = wordsIn([...(step.lead ?? []), ...(step.afterFigure ?? [])] as Array<{ text?: string }>);
        if (isTeaching(step)) {
          expect(body, `${id}/${step.id}`).toBeGreaterThanOrEqual(80);
          expect(body, `${id}/${step.id}`).toBeLessThanOrEqual(280);
          expect(step.headline, `${id}/${step.id}`).toBeTruthy();
        } else {
          expect(wordsIn(step.lead as Array<{ text?: string }>), `${id}/${step.id}`).toBeLessThanOrEqual(60);
          expect(step.afterFigure ?? [], `${id}/${step.id}`).toEqual([]);
        }
        // A figure on a graded screen hides its answer until the learner responds.
        const graded = step.checkQuestionId || step.workedSteps?.some((line) => line.blank);
        if (graded && step.diagram) expect(step.answerVisibility, `${id}/${step.id}`).toBe("hidden-until-response");
      }
      // Every question the lesson asks exists, and the skill check stays out of the steps.
      const inSteps = lesson.steps.flatMap((step) => [
        step.checkQuestionId,
        ...(step.workedSteps ?? []).flatMap((line) => [line.blank?.questionId, line.selfExplain?.questionId]),
      ]);
      for (const questionId of [...inSteps, ...lesson.questionIds].filter(Boolean) as string[])
        expect(question(questionId).skill, questionId).toBeTruthy();
      for (const questionId of lesson.questionIds) expect(inSteps, questionId).not.toContain(questionId);
      // The skill check teaches nothing new: every skill belongs to this lesson.
      for (const questionId of lesson.questionIds)
        expect(lesson.taughtSkills, questionId).toContain(question(questionId).skill);
    }
  });

  it("leads each recap into the opener of the next lesson", () => {
    const nextOpener: Record<string, string> = {
      "clause-anatomy": "bus",
      "joining-clauses": "window",
      "actors-and-actions": "dog",
      "claim-grounds-warrant": "guide",
      "appeals-and-occasion": "Caesar",
      "figures-of-speech": "nursery",
      "metre-and-scansion": "tongue-twister",
      "sound-and-image": "Roses",
      "sonnet-and-volta": "entrance",
      "point-of-view": "mean",
      "irony-and-reliability": "scene",
    };
    for (const [id, keyword] of Object.entries(nextOpener)) {
      const next = lessonOf(ids[ids.indexOf(id) + 1]!);
      expect(lessonOf(id).recap!.nextHook, id).toContain(keyword);
      // The keyword the recap promises is in the next lesson's opener.
      expect(JSON.stringify(next.intro!.hook.blocks), next.id).toContain(keyword);
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
    // Inside a clause: the counts also come from the figures the lesson draws.
    const finiteVerbs = (stepId: string, caseIndex: number) =>
      clausesOf("clause-anatomy", stepId, caseIndex)
        .flatMap((clause) => clause.parts)
        .filter((part) => part.role === "verb").length;
    expect(key("lang-clause-anatomy-4")).toBe(finiteVerbs("count-in-verse", 0));
    expect(finiteVerbs("one-verb-each", 0)).toBe(2);
    expect(finiteVerbs("one-verb-each", 1)).toBe(1);
    expect(clausesOf("clause-anatomy", "the-first-word", 0).filter((c) => c.kind === "independent")).toHaveLength(1);
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
    // Claim, grounds and warrant: roles of the numbered statements, read from the figures
    expect(rolesOf("claim-grounds-warrant", "name-the-warrant", 0)).toEqual(["grounds", "warrant", "claim", "rebuttal"]);
    expect(key("lang-claim-grounds-warrant-4")).toBe(rolesOf("claim-grounds-warrant", "name-the-warrant", 0).indexOf("warrant") + 1);
    expect(rolesOf("claim-grounds-warrant", "find-the-claim", 1)).toEqual(["claim", "grounds", "warrant", "rebuttal"]);
    expect(key("lang-claim-grounds-warrant-5")).toBe(rolesOf("claim-grounds-warrant", "find-the-claim", 1).indexOf("grounds") + 1);
    expect(key("lang-claim-grounds-warrant-7")).toBe([true, true, false].filter(Boolean).length);
    // Counts the story prose states aloud
    const courier = [
      "The delivery of the parcels was completed by the courier on Monday.",
      "The courier completed the delivery of the parcels on Monday.",
      "The courier delivered the parcels on Monday.",
    ].map(words);
    expect(courier).toEqual([12, 10, 7]);
    expect(proseOf("actors-and-actions")).toContain("twelve words");
    expect(proseOf("actors-and-actions")).toContain("ten");
    expect(proseOf("actors-and-actions")).toContain("seven");
    expect([words("The board gave approval to the plan."), words("The board approved the plan.")]).toEqual([7, 5]);
    expect(words("The sandwich was eaten by the dog.") - words("The dog ate the sandwich.")).toBe(2);
    // The recap of the actors lesson: two verbs unburied saved five words, and sixteen became six.
    expect(proseOf("actors-and-actions")).toContain("saved five words");
    expect(words("In my personal opinion, it is basically true that the final outcome depends on the weather.")).toBe(16);
    expect(proseOf("actors-and-actions")).toContain("sixteen-word sentence down to six");
    expect(proseOf("joining-clauses")).toContain("counted three clauses");
    expect(proseOf("clause-anatomy")).toContain("three finite verbs");
    // Appeals and occasion: a score is twenty, so four score and seven reaches back to 1776
    expect(4 * 20 + 7).toBe(87);
    expect(1863 - 87).toBe(1776);
    expect(key("lang-appeals-and-occasion-3")).toBe(1776);
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
    const antony = lessonOf("irony-and-reliability").steps.find((s) => s.id === "count-the-refrain")!.diagram as unknown as {
      cases: Array<{ model: { lines: Array<{ spans: Array<{ mark?: string }> }> } }>;
    };
    expect(key("lang-irony-and-reliability-1")).toBe(
      antony.cases[0]!.model.lines.filter((line) => line.spans.some((span) => span.mark === "irony")).length,
    );
    expect(key("lang-irony-and-reliability-9")).toBe([true, false, true].filter(Boolean).length);
    // Structure and scenes, from the diagrams themselves
    expect(key("lang-structure-and-scenes-1")).toBe(argmax(arcOf("structure-and-scenes", "which-act", 0).map((s) => s.rise)));
    expect(key("lang-structure-and-scenes-3")).toBe(turns(arcOf("structure-and-scenes", "count-the-turns", 0)));
    expect(key("lang-structure-and-scenes-4")).toBe(argmax(arcOf("structure-and-scenes", "find-the-peak", 0).map((s) => s.rise)));
    expect(key("lang-structure-and-scenes-7")).toBe(argmax([1, 3, 6, 9, 5]));
    expect(key("lang-structure-and-scenes-9")).toBe(turns([{ opens: "+", closes: "-" }, { opens: "-", closes: "+" }, { opens: "+", closes: "+" }]));
    expect(key("lang-structure-and-scenes-10")).toBe(
      turns([{ opens: "-", closes: "+" }, { opens: "+", closes: "+" }, { opens: "+", closes: "-" }, { opens: "-", closes: "-" }]),
    );
    expect(argmax([2, 5, 9, 7, 4, 1])).toBe(3);
  });

  it("keeps the keys of lessons 11 and 12 equal to the figures and prose they rest on", () => {
    // Irony: Antony's refrain marks four lines, and the dramatic-irony sort picks statements 1 and 3
    const refrain = lessonOf("irony-and-reliability").steps.find((s) => s.id === "count-the-refrain")!;
    const lines = (
      refrain.diagram as unknown as { cases: Array<{ model: { lines?: Array<{ spans: Span[] }> } }> }
    ).cases[0]!.model.lines!;
    const honourable = lines.filter((line) =>
      line.spans.some((span) => span.mark === "irony" && span.text === "an honourable man"),
    );
    expect(honourable).toHaveLength(4);
    expect(key("lang-irony-and-reliability-1")).toBe(honourable.length);
    expect(lines).toHaveLength(8);
    const statements = [
      { audienceKnowsMore: true },
      { audienceKnowsMore: false },
      { audienceKnowsMore: true },
    ];
    expect(key("lang-irony-and-reliability-9")).toBe(statements.filter((item) => item.audienceKnowsMore).length);
    // The opener's soup and the picnic both call for the opposite of the words
    expect(proseOf("irony-and-reliability")).toContain("Lovely, thank you");
    // The lesson never uses the term before the screen that teaches it
    const irony = lessonOf("irony-and-reliability");
    expect(JSON.stringify(irony.intro!.hook.blocks)).not.toContain("irony");
    const taughtAt = (term: string) => irony.steps.findIndex((s) => s.introducesTerms?.includes(term));
    expect([taughtAt("irony"), taughtAt("dramatic irony"), taughtAt("situational irony"), taughtAt("unreliable narrator")]).toEqual([0, 4, 6, 9]);
    // Every question the steps ask is answered from the figure or screen before it
    expect(irony.steps.map((s) => s.checkQuestionId).filter(Boolean)).toEqual([
      "lang-irony-and-reliability-7",
      "lang-irony-and-reliability-1",
      "lang-irony-and-reliability-2",
      "lang-irony-and-reliability-3",
      "lang-irony-and-reliability-9",
      "lang-irony-and-reliability-4",
    ]);
    expect(irony.questionIds).toEqual([
      "lang-irony-and-reliability-5",
      "lang-irony-and-reliability-6",
      "lang-irony-and-reliability-10",
    ]);

    // Structure: heights and charges come from the figures
    const structure = lessonOf("structure-and-scenes");
    const romeoActs = arcOf("structure-and-scenes", "which-act", 0);
    expect(romeoActs).toHaveLength(5);
    expect(argmax(romeoActs.map((s) => s.rise))).toBe(3);
    const romeoScenes = arcOf("structure-and-scenes", "count-the-turns", 0);
    expect(romeoScenes).toHaveLength(8);
    expect(turns(romeoScenes)).toBe(5);
    expect(romeoScenes.filter((s) => s.opens !== s.closes).map((s) => s.label.split(" ")[0])).toEqual(["1.5", "3.1", "3.5", "4.1", "5.1"]);
    expect(key("lang-structure-and-scenes-3")).toBe(5);
    const heist = arcOf("structure-and-scenes", "find-the-peak", 0);
    expect(heist).toHaveLength(6);
    expect(heist[3]!.label).toBe("The alarm");
    expect(key("lang-structure-and-scenes-4")).toBe(argmax(heist.map((s) => s.rise)));
    expect(key("lang-structure-and-scenes-7")).toBe(argmax([1, 3, 6, 9, 5]));
    expect(key("lang-structure-and-scenes-9")).toBe(turns([{ opens: "+", closes: "-" }, { opens: "-", closes: "+" }, { opens: "+", closes: "+" }]));
    expect(key("lang-structure-and-scenes-10")).toBe(
      turns([{ opens: "-", closes: "+" }, { opens: "+", closes: "+" }, { opens: "+", closes: "-" }, { opens: "-", closes: "-" }]),
    );
    // The prose counts: Cinderella has three turning scenes and Red Riding Hood two; four of the five turns come after the wedding
    expect(turns(arcOf("structure-and-scenes", "scenes-that-turn", 0))).toBe(3);
    expect(turns(arcOf("structure-and-scenes", "scenes-that-turn", 1))).toBe(2);
    expect(proseOf("structure-and-scenes")).toContain("Cinderella has three turning scenes");
    expect(proseOf("structure-and-scenes")).toContain("Red Riding Hood has two");
    expect(romeoScenes.slice(3).filter((s) => s.opens !== s.closes)).toHaveLength(4);
    expect(proseOf("structure-and-scenes")).toContain("four in the second half");
    // The taught terms arrive before the questions that use them
    const taughtIn = (term: string) => structure.steps.findIndex((s) => s.introducesTerms?.includes(term));
    const asking = (id: string) => structure.steps.findIndex((s) => s.checkQuestionId === id);
    expect(taughtIn("climax")).toBeLessThan(asking("lang-structure-and-scenes-7"));
    expect(taughtIn("exposition")).toBeLessThan(asking("lang-structure-and-scenes-2"));
    expect(taughtIn("turning scene")).toBeLessThan(asking("lang-structure-and-scenes-3"));
    expect(structure.questionIds).toEqual([
      "lang-structure-and-scenes-5",
      "lang-structure-and-scenes-6",
      "lang-structure-and-scenes-10",
    ]);
  });

  it("keeps the keys of lessons 6 to 10 equal to the figures and prose they rest on", () => {
    // Figures of speech: the Dickens extract in the counting step has four "it was" openings
    const dickens = caseIn("figures-of-speech", "dickens-count", "first");
    expect(marked(dickens, "anaphora")).toHaveLength(key("lang-figures-of-speech-1"));
    expect(key("lang-figures-of-speech-1")).toBe(4);
    // Caesar's line: three parts, each opening with "I"
    const caesar = "I came, I saw, I conquered".split(", ");
    expect(key("lang-figures-of-speech-7")).toBe(caesar.filter((part) => part.startsWith("I ")).length);
    expect(caesar).toHaveLength(3);
    // Kennedy's chiasmus reverses the order of its two terms
    const kennedy = caseIn("figures-of-speech", "turning-the-words-round", "kennedy");
    const order = spansOf(kennedy).filter((span) => span.mark).map((span) => span.text);
    expect(order).toEqual(["your country", "you", "you", "your country"]);
    // The stacked line has three "we can not" openings and three verbs
    const stacked = caseIn("figures-of-speech", "figures-stack", "verbs");
    expect(marked(stacked, "anaphora")).toHaveLength(3);
    expect(marked(stacked, "tricolon")).toHaveLength(3);

    // Metre and scansion: syllables and beats come from the figures
    const hickory = syllablesIn(caseIn("metre-and-scansion", "syllables-and-beats", "hickory"));
    expect([hickory.length, hickory.filter((s) => s.stress).length]).toEqual([7, 3]);
    expect(proseOf("metre-and-scansion")).toContain("seven syllables");
    expect(proseOf("metre-and-scansion")).toContain("three times");
    const twinkle = syllablesIn(caseIn("metre-and-scansion", "falling-feet", "twinkle"));
    expect(key("lang-metre-and-scansion-7")).toBe(twinkle.filter((s) => s.stress).length);
    const compare = syllablesIn(caseIn("metre-and-scansion", "count-the-line", "first"));
    expect(key("lang-metre-and-scansion-1")).toBe(compare.length);
    const rough = syllablesIn(caseIn("metre-and-scansion", "place-the-beats", "s18c"));
    const beats = rough.flatMap((s, i) => (s.stress ? [i + 1] : []));
    expect(beats).toEqual([2, 4, 6, 8, 10]);
    expect(key("lang-metre-and-scansion-2")).toBe(beats[2]);
    const shaken = syllablesIn(caseIn("metre-and-scansion", "sonnet-116", "first"));
    expect(key("lang-metre-and-scansion-3")).toBe(shaken.length);
    const tomorrow = syllablesIn(caseIn("metre-and-scansion", "one-syllable-too-many", "macbeth"));
    expect(tomorrow).toHaveLength(11);
    expect(tomorrow.flatMap((s, i) => (s.stress ? [i + 1] : []))).toEqual([2, 4, 6, 8, 10]);
    expect(proseOf("metre-and-scansion")).toContain("eleven syllables");
    const witches = syllablesIn(caseIn("metre-and-scansion", "witches", "first"));
    expect(witches.filter((s) => s.stress)).toHaveLength(4);
    expect(witches.every((s, i) => s.stress === (i % 2 === 0))).toBe(true);
    expect(key("lang-metre-and-scansion-11")).toBe(4 * 2);

    // Sound and image: counts come from the marked spans
    const sessions = caseIn("sound-and-image", "sessions-of-sweet", "first");
    expect(key("lang-sound-and-image-1")).toBe(marked(sessions, "alliteration").length);
    expect(marked(sessions, "alliteration").every((span) => span.text.startsWith("s"))).toBe(true);
    const bride = caseIn("sound-and-image", "bride-of-quietness", "first");
    expect(key("lang-sound-and-image-2")).toBe(marked(bride, "assonance").length);
    expect(key("lang-sound-and-image-7")).toBe(6);

    // Sonnet and volta: rhyme letters and turns come from the sonnet figures
    const letters = (lines: SonnetLine[]) => {
      const seen: string[] = [];
      return lines.map((line) => {
        if (!seen.includes(line.sound)) seen.push(line.sound);
        return String.fromCharCode(65 + seen.indexOf(line.sound));
      });
    };
    const s18 = sonnetLines(caseIn("sonnet-and-volta", "seven-rhymes", "first"));
    expect(letters(s18).join("")).toBe("ABABCDCDEFEFGG");
    expect(key("lang-sonnet-and-volta-1")).toBe(new Set(letters(s18)).size);
    const milton = sonnetLines(caseIn("sonnet-and-volta", "milton-octave", "first"));
    expect(letters(milton).join("")).toBe("ABBAABBACDECDE");
    expect(key("lang-sonnet-and-volta-2")).toBe(new Set(letters(milton).slice(0, 8)).size);
    expect(key("lang-sonnet-and-volta-10")).toBe(new Set(letters(milton).slice(8)).size);
    const s29 = caseIn("sonnet-and-volta", "sonnet-29", "first");
    expect(key("lang-sonnet-and-volta-3")).toBe(s29["turn"]);
    expect(sonnetLines(s29)[(s29["turn"] as number) - 1]!.text).toMatch(/^Yet /u);
    const s130 = caseIn("sonnet-and-volta", "sonnet-130", "first");
    expect(key("lang-sonnet-and-volta-4")).toBe(s130["turn"]);
    expect(key("lang-sonnet-and-volta-4")).toBe(3 * 4 + 1);
    expect(sonnetLines(s130)[12]!.text).toMatch(/^And yet /u);
    // Point of view: the one free indirect sentence among three
    const three = caseIn("point-of-view", "three-sentences", "first");
    const modes = (three["lines"] as Array<{ spans: Span[] }>).map((line) => line.spans[0]!.mark);
    expect(modes).toEqual(["direct_speech", "narration", "free_indirect"]);
    expect(key("lang-point-of-view-4")).toBe(modes.indexOf("free_indirect") + 1);
  });
});
