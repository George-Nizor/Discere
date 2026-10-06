/**
 * Maths Foundations 1.2.0: lesson 1 rewritten to the v2 lesson anatomy
 * (docs/learning-experience/README.md §8, conversion rules in docs/learning-experience/style-guide.md).
 *
 * The lesson now teaches one idea — what a letter stands for, substituting it, and testing a
 * candidate — and grades nothing it does not teach. Solving by inverse operations leaves for
 * lesson 3, which absorbs the two items that asked for it.
 *
 * Run: pnpm tsx scripts/prepare-maths-gold-lesson.ts
 * It reads the published bundle and writes `.authoring/candidate.json`; review and publish with
 * `pnpm curate review maths-foundations` and `pnpm curate publish maths-foundations`.
 * Re-running on the 1.2.0 bundle rebuilds the same candidate.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CourseBundle, LessonBeat, Question } from "@discere/contracts";
import { bundleDigest, validateCourseBundle } from "@discere/curriculum";

const directory = resolve(import.meta.dirname, "../content/maths-foundations");
const bundle = JSON.parse(
  await readFile(resolve(directory, "bundle.json"), "utf8"),
) as CourseBundle;

const L1 = "what-a-letter-stands-for";
const L3 = "undoing-in-the-right-order";
const SOURCE = "openstax-algebra-language";
const SECTION = "1.2 Use the Language of Algebra";
const concepts = ["variable", "substitution"];
const id = (suffix: string) => `maths-${L1}-${suffix}`;

type NumericSpec = {
  id: string;
  prompt: string;
  value: number;
  workedAnswer: string;
  hints: [string, string, string];
  onCorrect: string;
  skill: string;
  misconceptions?: Question["misconceptions"];
  usesTerms?: string[];
};
function numeric(spec: NumericSpec): Question {
  return {
    id: spec.id,
    conceptIds: concepts,
    prompt: spec.prompt,
    responseType: "numeric",
    difficulty: 1,
    hints: spec.hints,
    answerAuthority: {
      kind: "numeric",
      value: spec.value,
      unit: "",
      absoluteTolerance: 1e-9,
      relativeTolerance: 0,
      workedAnswer: spec.workedAnswer,
    },
    sourceIds: [SOURCE],
    onCorrect: spec.onCorrect,
    skill: spec.skill,
    calculator: "off",
    ...(spec.misconceptions ? { misconceptions: spec.misconceptions } : {}),
    ...(spec.usesTerms ? { usesTerms: spec.usesTerms } : {}),
  };
}
type ChoiceSpec = {
  id: string;
  prompt: string;
  choices: Array<{ id: string; label: string }>;
  correct: string;
  exampleAnswer: string;
  hints: string[];
  onCorrect: string;
  skill: string;
  misconceptions?: Question["misconceptions"];
};
function choice(spec: ChoiceSpec): Question {
  const right = spec.choices.find((item) => item.id === spec.correct);
  if (!right) throw new Error(`${spec.id}: unknown correct choice`);
  return {
    id: spec.id,
    conceptIds: concepts,
    prompt: spec.prompt,
    responseType: "short_text",
    difficulty: 1,
    hints: spec.hints,
    answerAuthority: {
      kind: "text",
      acceptedIdeas: [right.label],
      rejectedIdeas: [],
      exampleAnswer: spec.exampleAnswer,
    },
    sourceIds: [SOURCE],
    choices: spec.choices,
    onCorrect: spec.onCorrect,
    skill: spec.skill,
    calculator: "off",
    ...(spec.misconceptions ? { misconceptions: spec.misconceptions } : {}),
  };
}

// --- Questions -----------------------------------------------------------------------------

const questions: Question[] = [
  numeric({
    id: id("hook"),
    prompt: "What's my number?",
    value: 7,
    workedAnswer: "7, because 7 + 5 = 12.",
    hints: [
      "What number, plus 5, makes 12?",
      "Count on from 5. How many steps does it take to reach 12?",
      "Take the 5 back off the 12 and see what is left.",
    ],
    onCorrect:
      "7. You worked back from 12 without writing anything down. Algebra is that thinking, written so it still works when the numbers get hard.",
    skill: "find-by-trying",
    misconceptions: [
      {
        match: { numeric: [17] },
        feedback: "That's 12 + 5. The 5 was added to my number, so my number is smaller than 12.",
      },
    ],
  }),
  choice({
    id: id("notation"),
    prompt: "Which says “a number plus 5 is 12”?",
    choices: [
      { id: "a", label: "x + 5 = 12" },
      { id: "b", label: "5x = 12" },
      { id: "c", label: "x = 12 + 5" },
    ],
    correct: "a",
    exampleAnswer: "x + 5 = 12. x is the number, and + 5 = 12 says what happens to it.",
    hints: ["Read each one aloud, saying “my number” wherever you see x."],
    onCorrect: "Same sentence, shorter. x is the number; the rest says what happens to it.",
    skill: "read-notation",
    misconceptions: [
      {
        match: { choiceIds: ["b"] },
        feedback: "5x means 5 × x. That's five lots of the number, not the number plus 5.",
      },
      {
        match: { choiceIds: ["c"] },
        feedback: "That says x is 12 + 5. Add 5 to that and you overshoot 12.",
      },
    ],
  }),
  // The explore step reuses the item that used to ask for x + 5 = 12 by inverse operations:
  // the same key, now found by trying, which is what this lesson can ask of a beginner.
  numeric({
    id: id("3"),
    prompt: "Set x so the machine gives 12.",
    value: 7,
    workedAnswer: "With x = 7, the machine gives 7 + 5 = 12.",
    hints: [
      "Try a few values and watch what comes out.",
      "What comes out is always 5 more than what goes in.",
      "Which input is 5 less than the target?",
    ],
    onCorrect:
      "x = 7 makes x + 5 equal 12. That's exactly what it means for 7 to solve x + 5 = 12.",
    skill: "find-by-trying",
    misconceptions: [
      {
        match: { numeric: [17] },
        feedback: "With x = 17 the machine gives 22. The machine adds 5, so x has to be below 12.",
      },
      {
        match: { numeric: [12] },
        feedback: "12 is where the output should land. What goes in is 5 less than what comes out.",
      },
    ],
  }),
  numeric({
    id: id("order"),
    prompt: "If x = 6, what comes out?",
    value: 14,
    workedAnswer: "3 × 6 = 18, then 18 − 4 = 14.",
    hints: [
      "Start at the first box. What is 3 × 6?",
      "Now take 4 away from that.",
      "Multiply first, then subtract.",
    ],
    onCorrect: "14. Multiply first, then subtract: the order is written into the expression.",
    skill: "evaluate-expression",
    usesTerms: ["3x"],
    misconceptions: [
      {
        match: { numeric: [6, 2] },
        feedback:
          "You subtracted first. The machine multiplies first: multiplication comes before subtraction unless brackets say otherwise.",
      },
      {
        match: { numeric: [5] },
        feedback: "Check the first box: 3x means 3 × x, so it is 3 × 6, not 3 + 6.",
      },
      {
        match: { numeric: [18] },
        feedback: "That's what leaves the first box. The machine still has to subtract 4.",
      },
    ],
  }),
  choice({
    id: id("same-letter"),
    prompt: "Why do both x's become 5?",
    choices: [
      { id: "a", label: "Inside one expression, a letter means one number throughout." },
      { id: "b", label: "Because 5 was the first number given." },
      { id: "c", label: "They don't have to; one could be 3." },
    ],
    correct: "a",
    exampleAnswer: "Inside one expression, a letter means one number throughout.",
    hints: ["If the two x's could differ, what would x stand for?"],
    onCorrect: "One letter, one value, everywhere it appears.",
    skill: "evaluate-expression",
    misconceptions: [
      {
        match: { choiceIds: ["b"] },
        feedback: "Any value would do here. The point is that both x's get the same one.",
      },
      {
        match: { choiceIds: ["c"] },
        feedback: "Then x would mean two numbers at once. Within one expression it can't.",
      },
    ],
  }),
  numeric({
    id: id("left-side"),
    prompt: "Left side",
    value: 9,
    workedAnswer: "2 × 4 + 1 = 8 + 1 = 9.",
    hints: ["Start with 2 × 4.", "Then add the 1.", "Multiply, then add."],
    onCorrect: "9: two lots of 4, plus 1.",
    skill: "check-solution",
    misconceptions: [
      { match: { numeric: [8] }, feedback: "2 × 4 is 8. Don't forget the + 1." },
      { match: { numeric: [7] }, feedback: "2x means 2 × x, so it is 2 × 4, not 2 + 4." },
    ],
  }),
  choice({
    id: id("is-solution"),
    prompt: "Is x = 4 a solution?",
    choices: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    correct: "yes",
    exampleAnswer: "Yes. The left side comes to 9 and the right side is 9, so the sides agree.",
    hints: ["Compare the left side you worked out with the right side."],
    onCorrect: "Left 9, right 9. So 4 solves the equation: substituted in, the two sides agree.",
    skill: "check-solution",
  }),
  numeric({
    id: id("try"),
    prompt: "Is x = 3 a solution of 5x − 2 = 12? First, what is the left side when x = 3?",
    value: 13,
    workedAnswer: "5 × 3 − 2 = 15 − 2 = 13. 13 is not 12, so 3 is not a solution.",
    hints: [
      "Replace x with 3. What is 5 × 3?",
      "Now subtract the 2.",
      "Multiply first, then subtract, then compare with 12.",
    ],
    onCorrect:
      "13, not 12, so 3 fails. The real solution isn't a whole number; lesson 3 shows how to find it without guessing.",
    skill: "check-solution",
    misconceptions: [
      { match: { numeric: [15] }, feedback: "That's 5 × 3. The expression then subtracts 2." },
      {
        match: { numeric: [12] },
        feedback: "12 is the right side. Work out the left side with x = 3, then compare.",
      },
      { match: { numeric: [6] }, feedback: "5x means 5 × x, so it is 5 × 3, not 5 + 3." },
    ],
  }),
  numeric({
    id: id("taxi"),
    prompt: "What's the fare, in pounds, for a 7-mile trip?",
    value: 17,
    workedAnswer: "3 + 2 × 7 = 3 + 14 = 17, so the fare is £17.",
    hints: ["Replace m with 7.", "Work out 2 × 7 first.", "Then add the £3 starting charge."],
    onCorrect:
      "£17. The letter m let one short formula price every possible trip. That's why algebra uses letters.",
    skill: "evaluate-expression",
    misconceptions: [
      {
        match: { numeric: [35] },
        feedback: "That's (3 + 2) × 7. The £3 is paid once; only the £2 is per mile.",
      },
      {
        match: { numeric: [12] },
        feedback: "2m means 2 × m: two pounds for each of the 7 miles, not 2 + 7.",
      },
      { match: { numeric: [14] }, feedback: "That's the miles part. Add the £3 starting charge." },
    ],
  }),
  numeric({
    id: id("check-1"),
    prompt: "Find 3a + 2 when a = 4.",
    value: 14,
    workedAnswer: "3 × 4 + 2 = 12 + 2 = 14.",
    hints: ["Replace a with 4.", "Work out 3 × 4.", "Then add 2."],
    onCorrect: "14: substitute, multiply, then add.",
    skill: "evaluate-expression",
    misconceptions: [
      { match: { numeric: [9] }, feedback: "3a means 3 × a, so it is 3 × 4, not 3 + 4." },
      { match: { numeric: [18] }, feedback: "Multiply before you add: 3 × 4 first, then + 2." },
    ],
  }),
  choice({
    id: id("check-2"),
    prompt: "Is y = 5 a solution of 2y − 3 = 7?",
    choices: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    correct: "yes",
    exampleAnswer: "Yes. 2 × 5 − 3 = 7, and the right side is 7.",
    hints: [],
    onCorrect: "Yes: 2 × 5 − 3 is 7, the same as the right side.",
    skill: "check-solution",
  }),
  choice({
    id: id("check-3"),
    prompt: "In n + n = 10, could the two n's be different numbers?",
    choices: [
      { id: "a", label: "No. One letter has one value, so n = 5." },
      { id: "b", label: "Yes, for example 3 and 7." },
      { id: "c", label: "Yes, any two numbers that add to 10." },
    ],
    correct: "a",
    exampleAnswer: "No. One letter has one value, so both n's are 5.",
    hints: [],
    onCorrect: "No: one letter, one value, so n + n = 10 means n is 5.",
    skill: "evaluate-expression",
  }),
];

// --- The lesson ----------------------------------------------------------------------------

const old = bundle.lessons.find((lesson) => lesson.id === L1);
if (!old) throw new Error("Lesson 1 is missing.");

const lesson: LessonBeat = {
  id: L1,
  courseId: old.courseId,
  conceptIds: concepts,
  title: "What a letter stands for",
  orientation:
    "Read a letter as a number not yet given, and test whether a number solves an equation by substituting it.",
  intro: {
    hook: {
      blocks: [{ kind: "paragraph", text: "I'm thinking of a number. I add 5 to it and get 12." }],
      questionId: id("hook"),
    },
    promise:
      "By the end you'll read 3x − 4 as a calculation waiting for a number, and test whether a number solves an equation.",
    estimatedMinutes: 10,
  },
  calculator: "off",
  taughtSkills: ["find-by-trying", "read-notation", "evaluate-expression", "check-solution"],
  steps: [
    {
      id: "a-name-for-the-number",
      kind: "explain",
      eyebrow: "New idea",
      headline: "A letter stands for a number you haven't been told yet.",
      blocks: [],
      lead: [
        {
          kind: "paragraph",
          text: "Writing “my number” every time gets clumsy. So we use a box, and then a letter.",
        },
        { kind: "equation", latex: "\\text{my number} + 5 = 12" },
        { kind: "equation", latex: "\\square + 5 = 12" },
        { kind: "equation", latex: "x + 5 = 12" },
        {
          kind: "callout",
          tone: "key",
          text: "x is just the name. It doesn't mean multiply, and it isn't the 24th number. A letter used like this is called a variable.",
        },
      ],
      reveal: [],
      introducesTerms: ["variable"],
      visualStateId: "",
      checkQuestionId: id("notation"),
      activityId: "",
    },
    {
      id: "the-number-machine",
      kind: "explore",
      eyebrow: "Explore",
      blocks: [],
      lead: [
        {
          kind: "paragraph",
          text: "An expression like x + 5 is a machine. Put a number in for x and it tells you what comes out.",
        },
      ],
      reveal: [
        {
          kind: "paragraph",
          text: "Putting a number in place of a letter is called substituting. You just did it several times, and the number that made the sides agree solves the equation.",
        },
      ],
      introducesTerms: ["substitute", "solve"],
      answerVisibility: "live",
      diagram: {
        type: "number_machine",
        bindAnswer: true,
        input: { min: 0, max: 20, value: 0, step: 1 },
        operations: [{ operator: "add", operand: 5 }],
        target: 12,
      },
      visualStateId: "",
      checkQuestionId: id("3"),
      activityId: "",
    },
    {
      id: "order-matters",
      kind: "predict",
      eyebrow: "Predict",
      blocks: [],
      lead: [
        {
          kind: "paragraph",
          text: "This machine multiplies by 3, then subtracts 4. Algebra writes it as 3x − 4: the 3 sits next to the x to mean 3 × x.",
        },
      ],
      reveal: [
        {
          kind: "paragraph",
          text: "The machine's two boxes are the two steps: 3 × 6 is 18, then 18 − 4 is 14. Writing 3x − 4 keeps that order.",
        },
      ],
      introducesTerms: ["3x"],
      answerVisibility: "hidden-until-response",
      diagram: {
        type: "number_machine",
        input: { min: 0, max: 20, value: 6, step: 1 },
        operations: [
          { operator: "multiply", operand: 3 },
          { operator: "subtract", operand: 4 },
        ],
      },
      visualStateId: "",
      checkQuestionId: id("order"),
      activityId: "",
    },
    {
      id: "same-letter-same-number",
      kind: "worked_example",
      eyebrow: "Worked example",
      headline: "Find x + x + 4 when x = 5.",
      blocks: [],
      lead: [],
      reveal: [],
      workedSteps: [
        {
          text: "Replace every x with 5.",
          math: "5 + 5 + 4",
          selfExplain: { questionId: id("same-letter") },
        },
        { text: "Calculate.", math: "14" },
      ],
      visualStateId: "",
      checkQuestionId: "",
      activityId: "",
    },
    {
      id: "testing-a-candidate",
      kind: "faded_example",
      eyebrow: "Your turn, with help",
      headline: "Is x = 4 a solution of 2x + 1 = 9?",
      blocks: [],
      lead: [],
      reveal: [],
      workedSteps: [
        { text: "Replace x with 4.", math: "2 × 4 + 1" },
        { text: "Calculate the left side.", blank: { questionId: id("left-side") } },
        { text: "Compare with the right side, 9.", blank: { questionId: id("is-solution") } },
      ],
      answerVisibility: "hidden-until-response",
      diagram: {
        type: "equation_balance",
        coefficient: 2,
        constant: 1,
        right: 9,
        variable: { min: 0, max: 10, value: 4, step: 1 },
      },
      visualStateId: "",
      checkQuestionId: "",
      activityId: "",
    },
    {
      id: "on-your-own",
      kind: "try",
      eyebrow: "Try it",
      blocks: [],
      lead: [],
      reveal: [
        {
          kind: "paragraph",
          text: "Substitute, calculate the left side, compare it with the right side. A solution has to make the two sides equal exactly.",
        },
      ],
      visualStateId: "",
      checkQuestionId: id("try"),
      activityId: "",
    },
    {
      id: "a-letter-with-a-job",
      kind: "transfer",
      eyebrow: "Use it",
      blocks: [],
      lead: [
        {
          kind: "paragraph",
          text: "A taxi charges £3 to start, then £2 for every mile. For a trip of m miles the fare, in pounds, is 3 + 2m.",
        },
      ],
      reveal: [],
      visualStateId: "",
      checkQuestionId: id("taxi"),
      activityId: "",
    },
  ],
  recap: {
    keyIdea:
      "A letter stands for a number. Substitute the same number for every copy of it, calculate, and if both sides of an equation agree, that number is a solution.",
    blocks: [
      {
        kind: "paragraph",
        text: "You found that 7 makes x + 5 = 12 true. Then you showed that 3 does not solve 5x − 2 = 12, because the left side came to 13.",
      },
    ],
    nextHook: "Find the number without guessing, and know why each step is allowed.",
  },
  visualStates: [],
  visualKind: "none",
  activityId: "",
  questionIds: [id("check-1"), id("check-2"), id("check-3")],
  flashcardIds: old.flashcardIds,
  reviewLabel: old.reviewLabel,
  nextAction: "Substitute a candidate, then compare both sides.",
  stageTitles: { quiz: "Skill check", review: "Recall it later", completion: "Lesson complete" },
  sourceIds: [SOURCE],
  assuranceLevel: old.assuranceLevel,
};

// --- Assemble ------------------------------------------------------------------------------

// Items that asked lesson 1 to solve by inverse operations move to lesson 3, which teaches it.
const moved = [`maths-${L1}-4`, `maths-${L1}-practice-1`];
const retired = [`maths-${L1}-1`, `maths-${L1}-2`, `maths-${L1}-practice-2`];
const previous = new Map(bundle.questions.map((question) => [question.id, question]));
const movedQuestions = moved.flatMap((qid) => {
  const question = previous.get(qid);
  return question ? [question] : [];
});
// Moved items keep their ids, so earlier attempts at them still name the same question.
const lesson3Additions = movedQuestions;
const newIds = new Set(questions.map((question) => question.id));
const lesson3Ids = new Set(lesson3Additions.map((question) => question.id));

bundle.questions = [
  ...bundle.questions.filter(
    (question) =>
      !retired.includes(question.id) &&
      !moved.includes(question.id) &&
      !newIds.has(question.id) &&
      !lesson3Ids.has(question.id),
  ),
  ...questions,
  ...lesson3Additions,
];
bundle.lessons = bundle.lessons.map((item) => {
  if (item.id === L1) return lesson;
  if (item.id === L3) {
    const additions = lesson3Additions
      .map((question) => question.id)
      .filter((qid) => !item.questionIds.includes(qid));
    return { ...item, questionIds: [...item.questionIds, ...additions] };
  }
  return item;
});

const citation = (
  targetKind: "step" | "question" | "flashcard",
  targetId: string,
  claim: string,
) => ({
  claim,
  sourceId: SOURCE,
  section: SECTION,
  targetKind,
  targetId,
});
const firstText = (blocks: LessonBeat["steps"][number]["lead"]) =>
  (blocks ?? []).find((block) => block.kind === "paragraph" || block.kind === "callout");
bundle.authoringMetadata = (bundle.authoringMetadata ?? []).map((metadata) => {
  if (metadata.lessonId === L1) {
    return {
      ...metadata,
      citations: [
        ...lesson.steps.map((step) => {
          const text = firstText(step.lead);
          return citation(
            "step",
            step.id,
            step.headline ?? (text && "text" in text ? text.text : step.id),
          );
        }),
        ...questions.map((question) =>
          citation(
            "question",
            question.id,
            question.answerAuthority.kind === "numeric"
              ? question.answerAuthority.workedAnswer
              : question.answerAuthority.exampleAnswer,
          ),
        ),
        ...metadata.citations.filter((item) => item.targetKind === "flashcard"),
      ],
    };
  }
  if (metadata.lessonId === L3) {
    const carried = metadata.citations.filter((item) => !lesson3Ids.has(item.targetId));
    const l1 = bundle.authoringMetadata?.find((item) => item.lessonId === L1);
    const fromL1 = lesson3Additions.map((question) => {
      const existing = l1?.citations.find((item) => item.targetId === question.id);
      return existing
        ? existing
        : citation(
            "question",
            question.id,
            question.answerAuthority.kind === "numeric"
              ? question.answerAuthority.workedAnswer
              : question.answerAuthority.exampleAnswer,
          );
    });
    return { ...metadata, citations: [...carried, ...fromL1] };
  }
  return metadata;
});
bundle.course.version = "1.2.0";

const validation = validateCourseBundle(bundle);
for (const issue of validation.issues.filter(
  (item) => item.path.includes(L1) || item.severity === "error",
))
  console.log(issue.severity, issue.path, issue.code, issue.message);
if (!validation.passed || !validation.bundle)
  throw new Error("The Maths 1.2.0 candidate did not validate.");
await mkdir(resolve(directory, ".authoring"), { recursive: true });
await writeFile(
  resolve(directory, ".authoring/candidate.json"),
  `${JSON.stringify(validation.bundle, null, 2)}\n`,
);
console.log("Staged Maths Foundations 1.2.0:", bundleDigest(validation.bundle));
