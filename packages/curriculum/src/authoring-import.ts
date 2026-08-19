import type {
  ImportedLesson,
  LessonStep,
  RichTextBlock,
  TopicMap,
  TopicMapLesson,
} from "@discere/contracts";
import { toAnswerAuthority } from "@discere/contracts";

/**
 * Turning a pasted lesson into a course bundle.
 *
 * Discere's lessons are written by a frontier model that a person drives by hand rather than by
 * an automated run, so this is the boundary between what a writer is asked for and what the
 * bundle actually stores. Provenance, concept links and the discriminated answer authority are
 * decided here, because asking a model for them would be asking it to invent them.
 */

/** Lists every lesson in a topic map with the module it belongs to, in reading order. */
export function topicMapLessons(map: TopicMap): Array<{ module: string; lesson: TopicMapLesson }> {
  return map.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ module: module.title, lesson })),
  );
}

/**
 * Splits the pasted prose into paragraph blocks.
 *
 * Only paragraphs: a definition or a callout is a judgement about what deserves emphasis, and
 * that is a human authoring edit made afterwards, not something to infer from the text.
 */
export function textToBlocks(text: string): RichTextBlock[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return (paragraphs.length > 0 ? paragraphs : [text.trim()]).map((paragraph) => ({
    kind: "paragraph" as const,
    text: paragraph,
  }));
}

const STEP_KINDS = new Set([
  "hook",
  "explain",
  "worked_example",
  "check",
  "interact",
  "transfer",
  "teach_back",
]);

/** Turns the flat imported shape into the steps the player reads. */
export function importedToSteps(lesson: ImportedLesson): LessonStep[] {
  return lesson.steps.map((step) => {
    if (!STEP_KINDS.has(step.kind)) {
      throw new Error(
        `Step '${step.id}' has kind '${step.kind}', which is not one of ${[...STEP_KINDS].join(", ")}.`,
      );
    }
    return {
      id: step.id,
      kind: step.kind as LessonStep["kind"],
      blocks: textToBlocks(step.text),
      visualStateId: step.visualStateId,
      checkQuestionId: step.checkQuestionId,
      activityId: step.activityId,
    };
  });
}

/**
 * The prompt for one lesson. It is long on purpose: everything the writing gate will later
 * reject is stated up front, because a rejection the owner has to read and fix by hand costs
 * far more than a few hundred extra tokens of instruction.
 */
export function lessonPrompt(map: TopicMap, module: string, lesson: TopicMapLesson): string {
  const concepts = map.modules
    .flatMap((entry) => entry.concepts)
    .filter((concept) => lesson.conceptIds.includes(concept.id));
  const schema = {
    slug: lesson.slug,
    title: "string",
    orientation: "string, 20-400 chars, one line naming what the lesson is about",
    reviewLabel: "string, short name for the recall set this lesson feeds",
    nextAction: "string, what the learner should do after finishing",
    stageTitles: { quiz: "string", review: "string", completion: "string" },
    steps: [
      {
        id: "kebab-case-slug",
        kind: "hook | explain | worked_example | check | interact | transfer | teach_back",
        text: "the prose for this step; blank line between paragraphs",
        visualStateId: "",
        checkQuestionId: "question id for a check or transfer step, otherwise \"\"",
        activityId: "",
      },
    ],
    questions: [
      {
        id: "kebab-case-id",
        prompt: "string",
        responseType: "numeric | short_text | long_text",
        difficulty: 1,
        hints: ["progressive, never stating the answer"],
        answerAuthority: {
          kind: "numeric | text",
          value: 0,
          unit: "",
          workedAnswer: "",
          acceptedIdeas: [],
          rejectedIdeas: [],
          exampleAnswer: "",
        },
        choices: [{ id: "a", label: "string" }],
      },
    ],
    flashcards: [
      { id: "kebab-case-id", front: "string", back: "string", conceptIds: ["…"] },
    ],
    uncertainty: ["anything the outline did not support"],
  };

  return `# Write one Discere lesson: ${lesson.title}

You are writing a single lesson for a personal learning platform in the style of Brilliant.org.
Reply with **one JSON object and nothing else** — no prose before or after, no code fence.

## The course

**${map.title}** — ${map.description}
Audience: ${map.audience}
Module: ${module}

## This lesson

**${lesson.title}**
Outcome: the learner should be able to ${lesson.outcome.charAt(0).toLowerCase()}${lesson.outcome.slice(1)}

Follow this outline, one step per line, in this order:

${lesson.outline.map((line, index) => `${index + 1}. ${line}`).join("\n")}

Concepts this lesson teaches (use these exact ids in \`conceptIds\`):

${concepts.map((concept) => `- \`${concept.id}\` — ${concept.title}: ${concept.summary}`).join("\n")}

## How a lesson is shaped

A lesson is a sequence of short steps, each one screen. The learner reads a little, then does
something. Specifically:

- Open with a \`hook\` step that asks the learner to predict or commit to an answer **before**
  any explanation. This is the single most important step; do not open by explaining.
- Alternate \`explain\` steps with steps that ask something.
- Each \`explain\` step is 40–90 words. Never more than 120. Split rather than run long.
- Include at least one \`check\` step. Its \`checkQuestionId\` must match the \`id\` of one of the
  questions you return, and that question must **not** be repeated as a separate quiz question —
  a check is asked inside the lesson instead of after it.
- End on a step that consolidates, not a summary added because the lesson is ending.
- ${lesson.activityKinds.length > 0 ? `This lesson should use: ${lesson.activityKinds.join(", ")}. Leave \`activityId\` as "" — the activity is wired in by hand afterwards — but write an \`interact\` step where it belongs.` : "Leave every `activityId` as \"\"."}
- Leave every \`visualStateId\` as "".

## How to write

These are enforced by an automatic gate. Prose that breaks them is rejected and has to be redone.

- Plain, direct sentences. Concrete nouns, active verbs, exact values.
- **No rhetorical negative parallelism**: never "not only X but also Y", "it isn't X, it's Y",
  "this is not X; it is Y", "more than X, it is Y".
- **No rule of three for rhythm.** Use the number of items the content actually has. Three real
  things is fine; three for cadence is not.
- No canned openings, no ceremonial conclusions, no generic praise, no "fascinating",
  "crucial", "powerful", "transformative". No decorative em dashes.
- Do not restate the question before answering it. Do not add a summary because the text is
  ending. End when the point is made.
- British spelling.
- Inline maths uses \`$…$\` and is rendered with KaTeX.

## Questions

- Return ${Math.max(2, Math.min(5, lesson.outline.length - 2))} or so questions. At least one must be the target of a \`check\` step.
- Hints must be a ladder: each one narrows the search without stating the answer.
- \`answerAuthority\` is how the server marks the answer, and is never shown to the learner.
  **Every one of its seven fields must be present on every question**, even the ones that do not
  apply — leave those empty (\`0\`, \`""\`, \`[]\`). There is no shorter form and no other field
  name; anything else is rejected on import.
  - \`kind: "numeric"\` → fill \`value\`, \`unit\`, \`workedAnswer\`. Leave \`acceptedIdeas\`,
    \`rejectedIdeas\` and \`exampleAnswer\` empty.
  - \`kind: "text"\` → fill \`acceptedIdeas\` (ideas the answer must contain), \`rejectedIdeas\`
    (ideas that make it wrong) and \`exampleAnswer\`. Leave \`value\` at \`0\`, and \`unit\` and
    \`workedAnswer\` as \`""\`.
- \`choices\` must be present on every question: an array of up to five \`{id, label}\` for a
  selectable question, or \`[]\` for one the learner types. The answer authority still decides
  correctness, never the choice list.
- \`difficulty\` is between 0.5 and 2. \`hints\` has between 1 and 4 entries.
- **Never let the answer leak** into a prompt, a hint, or any step's prose.

## Return exactly this shape

\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\`

Save your reply to:

    content/${map.courseId}/.authoring/inbox/${lesson.slug}.json

then run \`pnpm curate import ${map.courseId}\`.
`;
}

/** The prompt that produces a topic map itself, for a course that does not have one yet. */
export function topicMapPrompt(courseId: string, subject: string): string {
  return `# Plan a Discere course: ${subject}

Reply with **one JSON object and nothing else** — no prose before or after, no code fence.

You are planning a course for a personal learning platform in the style of Brilliant.org. You are
writing the *plan*, not the lessons: what the course covers, in what order, and what each lesson
should leave the learner able to do.

## Rules

- Two or three modules. Five to ten lessons in total.
- Order lessons so each one only depends on what came before it.
- Every lesson needs an \`outcome\`: one sentence starting with a verb, saying what the learner
  can do afterwards. "Understand X" is not an outcome. "Calculate X from Y" is.
- Every lesson needs an \`outline\` of 4 to 8 beats, in order, one short line each. The first
  beat must be a hook that asks the learner to predict something before any explanation.
- \`activityKinds\` picks from \`diagram_choice\` (tap a part of a figure), \`order_sequence\`
  (put steps in order), \`graph_plot\` (read or place a point on axes), \`explorer\` (drag a
  slider and watch a value change). Choose what the subject actually needs; leave it empty if
  prose and questions are genuinely enough.
- Concept ids are kebab-case and shared across the course where the same idea recurs.
- \`sources\` must be real, open, checkable references: Khan Academy, OpenStax, Wikiversity,
  Stanford Encyclopedia of Philosophy, or similar. Do not invent URLs.
- \`accent\` is a hex colour that is not green (green means "correct" in this product) and is
  distinguishable from #0b8f3c, #a4553a, #3856c4, #7c3aa4 and #0b7f8f.

## Return exactly this shape

\`\`\`json
{
  "courseId": "${courseId}",
  "title": "string",
  "description": "string, one or two sentences, no marketing language",
  "audience": "string, who this is for and what they already know",
  "accent": "#rrggbb",
  "coverAsset": "cover.svg",
  "sources": [{ "title": "string", "url": "https://…" }],
  "modules": [
    {
      "id": "kebab-case",
      "title": "string",
      "summary": "string",
      "concepts": [{ "id": "kebab-case", "title": "string", "summary": "string" }],
      "lessons": [
        {
          "slug": "kebab-case",
          "title": "string",
          "outcome": "string",
          "outline": ["beat", "beat", "beat", "beat"],
          "conceptIds": ["kebab-case"],
          "activityKinds": []
        }
      ]
    }
  ]
}
\`\`\`

Save your reply to \`content/_topic-maps/${courseId}.json\`, then run
\`pnpm curate prompt ${courseId}\` to generate the lesson prompts.
`;
}


/**
 * Merges one imported lesson into a course bundle.
 *
 * The bundle is the product; the inbox is a draft. Nothing is written until the whole file
 * validates, so a half-merged bundle is not a state this can leave behind.
 */
export function mergeLesson(
  bundle: Record<string, unknown>,
  map: TopicMap,
  entry: { module: string; lesson: TopicMapLesson },
  imported: ImportedLesson,
): void {
  const lessons = bundle["lessons"] as Array<Record<string, unknown>>;
  const questions = bundle["questions"] as Array<Record<string, unknown>>;
  const flashcards = bundle["flashcards"] as Array<Record<string, unknown>>;
  const steps = importedToSteps(imported);

  // A question a step asks inline is not also a quiz stage, which validation enforces anyway.
  const inlineIds = new Set(steps.map((step) => step.checkQuestionId).filter(Boolean));
  const quizIds = imported.questions
    .map((question) => question.id)
    .filter((id) => !inlineIds.has(id));

  // Sources, concept links and the discriminated answer authority are the bundle's business,
  // not the writer's. Asking a model for them would be asking it to invent provenance.
  const sourceIds = (bundle["course"] as { sourceIds?: string[] }).sourceIds ?? [];
  for (const question of imported.questions) {
    const { answerAuthority, choices, ...rest } = question;
    const merged: Record<string, unknown> = {
      ...rest,
      conceptIds: entry.lesson.conceptIds,
      sourceIds,
      answerAuthority: toAnswerAuthority(answerAuthority),
      // The schema wants at least two options or none at all; one option is not a choice.
      ...(choices.length >= 2 ? { choices } : {}),
    };
    const index = questions.findIndex((item) => item["id"] === question.id);
    if (index === -1) questions.push(merged);
    else questions[index] = merged;
  }
  for (const card of imported.flashcards) {
    const merged: Record<string, unknown> = { ...card, sourceIds };
    const index = flashcards.findIndex((item) => item["id"] === card.id);
    if (index === -1) flashcards.push(merged);
    else flashcards[index] = merged;
  }

  const existing = lessons.findIndex((item) => item["id"] === imported.slug);
  const lesson: Record<string, unknown> = {
    // A re-import keeps whatever was wired in by hand: the visual brief, the diagram spec, the
    // explorer, the visual states. Only the written parts are replaced.
    visualKind: "none",
    activityId: "",
    assuranceLevel: "source_backed",
    visualStates: [],
    ...(existing === -1 ? {} : lessons[existing]),
    id: imported.slug,
    courseId: map.courseId,
    conceptIds: entry.lesson.conceptIds,
    sourceIds,
    title: imported.title,
    steps,
    orientation: imported.orientation,
    questionIds: quizIds,
    flashcardIds: imported.flashcards.map((card) => card.id),
    reviewLabel: imported.reviewLabel,
    nextAction: imported.nextAction,
    stageTitles: imported.stageTitles,
  };
  if (existing === -1) lessons.push(lesson);
  else lessons[existing] = lesson;
}
