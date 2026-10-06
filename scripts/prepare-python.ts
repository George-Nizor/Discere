import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { bundleDigest, validateCourseBundle } from "@discere/curriculum";
import { LearningDiagramSchema, TopicMapSchema } from "../packages/contracts/src/index.js";
import { sources } from "../content/python-for-data-analysis/authoring/definition.js";
import { numericHints } from "../content/python-for-data-analysis/authoring/hints.js";
import { coreLessons } from "../content/python-for-data-analysis/authoring/core-lessons.js";
import { flowLessons } from "../content/python-for-data-analysis/authoring/flow-lessons.js";
import { numpyLessons } from "../content/python-for-data-analysis/authoring/numpy-lessons.js";
import { frameLessons } from "../content/python-for-data-analysis/authoring/frame-lessons.js";
import { cleaningLessons } from "../content/python-for-data-analysis/authoring/cleaning-lessons.js";
import { reportingLessons } from "../content/python-for-data-analysis/authoring/reporting-lessons.js";
const root = path.resolve(import.meta.dirname, "..");
const courseId = "python-for-data-analysis";
const definitions = [
  ...coreLessons,
  ...flowLessons,
  ...numpyLessons,
  ...frameLessons,
  ...cleaningLessons,
  ...reportingLessons,
];
const directory = path.join(root, "content", courseId, ".authoring");
await mkdir(directory, { recursive: true });
const manifest = {
  examples: Object.fromEntries(
    definitions.flatMap((lesson) =>
      lesson.beats.map((beat, index) => [
        lesson.id + "-" + index,
        beat.examples.map((example, caseIndex) => ({ ...example, id: "case-" + caseIndex })),
      ]),
    ),
  ),
  probes: Object.fromEntries(
    definitions.flatMap((lesson) => [
      ...lesson.questions.flatMap((question, index) =>
        question.probe ? [[lesson.id + "-question-" + (index + 1), question.probe]] : [],
      ),
      ...lesson.cards.flatMap((card, index) =>
        card.probe ? [[lesson.id + "-card-" + (index + 1), card.probe]] : [],
      ),
    ]),
  ),
};
const manifestText = JSON.stringify(manifest, null, 2) + "\n";
const manifestFile = path.join(directory, "execution-manifest.json");
if (process.argv[2] === "manifest") {
  await writeFile(manifestFile, manifestText);
  console.log(
    "Prepared " +
      Object.keys(manifest.examples).length +
      " teaching comparisons and " +
      Object.keys(manifest.probes).length +
      " independent answer checks.",
  );
} else {
  const executed = JSON.parse(await readFile(path.join(directory, "executions.json"), "utf8"));
  const manifestSha256 = createHash("sha256").update(manifestText).digest("hex");
  if (executed.manifestSha256 !== manifestSha256)
    throw new Error("Re-evaluate the changed Python manifest before preparing the candidate.");
  const extraSources: Record<string, string[]> = {
    "run-and-bind": ["jupyter-cells"],
    "functions-and-imports": ["py-modules"],
    "conditions-and-loops": ["py-types"],
    "array-calculations": ["np-index"],
    "ranges-and-randomness": ["np-random", "np-linspace"],
    "read-and-inspect": ["pd-intro"],
    "filters-and-columns": ["pd-intro", "pd-cow"],
    "missing-values": ["pd-cow"],
    "text-and-transformations": ["pd-apply"],
    "summaries-and-groups": ["pd-missing", "pd-basic"],
    "combine-tables": ["pd-merge-api"],
    "audit-a-sales-report": ["pd-merge", "pd-missing"],
  };
  const lessonSources = (lesson: (typeof definitions)[number]) => [
    lesson.sourceId,
    ...(extraSources[lesson.id] ?? []),
  ];
  const concepts = definitions.map((lesson, index) => ({
    id: "python-" + lesson.id,
    moduleId: lesson.moduleId,
    title: lesson.title,
    summary: lesson.summary,
    prerequisiteIds: index ? ["python-" + definitions[index - 1]!.id] : [],
    misconceptionIds: [],
    assuranceLevel: "source_backed",
  }));
  const stepIds = ["predict", "work", "check", "transfer"];
  const lessons = definitions.map((lesson) => ({
    id: lesson.id,
    courseId,
    conceptIds: ["python-" + lesson.id],
    title: lesson.title,
    steps: lesson.beats.map((beat, index) => ({
      id: stepIds[index]!,
      kind: ["hook", "worked_example", "check", "transfer"][index]!,
      blocks: [
        { kind: "heading", text: beat.title },
        { kind: "paragraph", text: beat.text },
      ],
      visualStateId: "",
      checkQuestionId: "python-" + lesson.id + "-" + (index + 1),
      activityId: "",
      diagram: LearningDiagramSchema.parse(executed.diagrams[lesson.id + "-" + index]),
    })),
    orientation: lesson.summary,
    visualStates: [],
    visualKind: "none",
    activityId: "",
    questionIds: [5, 6].map((index) => "python-" + lesson.id + "-" + index),
    flashcardIds: [1, 2].map((index) => "python-" + lesson.id + "-card-" + index),
    reviewLabel: lesson.title,
    nextAction: "Try the next idea with a new input.",
    stageTitles: {
      quiz: "Use the idea",
      review: "Recall it later",
      completion: "Ready for the next idea",
    },
    sourceIds: lessonSources(lesson),
    assuranceLevel: "source_backed",
  }));
  const questions = definitions.flatMap((lesson) =>
    lesson.questions.map(({ probe: _probe, ...question }, index) => ({
      ...question,
      hints:
        question.responseType === "numeric"
          ? [question.hints[0]!, ...numericHints[lesson.id]![index + 1]!]
          : question.hints,
      ...(question.choices
        ? {
            choices: question.choices.map(
              (_, offset, choices) =>
                choices[(offset + definitions.indexOf(lesson) + index) % choices.length]!,
            ),
          }
        : {}),
      id: "python-" + lesson.id + "-" + (index + 1),
      conceptIds: ["python-" + lesson.id],
      sourceIds: lessonSources(lesson),
    })),
  );
  const flashcards = definitions.flatMap((lesson) =>
    lesson.cards.map(({ probe: _probe, ...card }, index) => ({
      ...card,
      id: "python-" + lesson.id + "-card-" + (index + 1),
      conceptIds: ["python-" + lesson.id],
      sourceIds: lessonSources(lesson),
    })),
  );
  const authoringMetadata = definitions.map((lesson, index) => {
    const cite = (targetKind: "step" | "question" | "flashcard", targetId: string, claim: string) =>
      lessonSources(lesson).map((sourceId) => ({
        targetKind,
        targetId,
        claim,
        sourceId,
        section:
          sourceId === lesson.sourceId
            ? lesson.section
            : sources.find((source) => source.id === sourceId)!.section!,
      }));
    return {
      lessonId: lesson.id,
      prerequisiteLessonIds: index ? [definitions[index - 1]!.id] : [],
      uncertainty: [],
      citations: [
        ...lesson.beats.flatMap((beat, index) => cite("step", stepIds[index]!, beat.text)),
        ...lesson.questions.flatMap((question, index) =>
          cite(
            "question",
            "python-" + lesson.id + "-" + (index + 1),
            question.answerAuthority.kind === "numeric"
              ? question.answerAuthority.workedAnswer
              : question.answerAuthority.exampleAnswer,
          ),
        ),
        ...lesson.cards.flatMap((card, index) =>
          cite("flashcard", "python-" + lesson.id + "-card-" + (index + 1), card.back),
        ),
      ],
    };
  });
  const modules = [
    {
      id: "python-core",
      title: "Think in Python",
      description: "Values, collections, control flow and reusable functions.",
    },
    {
      id: "python-arrays",
      title: "Calculate with arrays",
      description: "Shape, elementwise operations, axes and generated values.",
    },
    {
      id: "python-tables",
      title: "Prepare a trustworthy table",
      description: "Import, select, clean and transform observations.",
    },
    {
      id: "python-analysis",
      title: "Build and audit a report",
      description: "Summarise, combine and reshape data without losing its meaning.",
    },
  ].map((module) => ({
    ...module,
    conceptIds: concepts
      .filter((concept) => concept.moduleId === module.id)
      .map((concept) => concept.id),
  }));
  const candidate = {
    course: {
      id: courseId,
      version: "1.0.0",
      title: "Python for Data Analysis",
      description: "Follow real Python examples from first variables to a checked Pandas report.",
      audience:
        "An adult new to Python; basic arithmetic and familiarity with rows and columns are sufficient.",
      assuranceLevel: "source_backed",
      moduleIds: modules.map((module) => module.id),
      sourceIds: sources.map((source) => source.id),
      accent: "#6b79dc",
      coverAsset: "cover.svg",
      status: "available",
      subjects: ["Computer science", "Data literacy"],
    },
    modules,
    concepts,
    lessons,
    activities: [],
    questions,
    flashcards,
    essays: [],
    sources,
    authoringMetadata,
  };
  const validation = validateCourseBundle(candidate);
  if (!validation.passed) {
    console.error(JSON.stringify(validation.issues, null, 2));
    process.exitCode = 1;
  } else {
    await writeFile(
      path.join(directory, "candidate.json"),
      JSON.stringify(validation.bundle, null, 2) + "\n",
    );
    const map = TopicMapSchema.parse({
      courseId,
      title: candidate.course.title,
      description: candidate.course.description,
      audience: candidate.course.audience,
      accent: candidate.course.accent,
      coverAsset: candidate.course.coverAsset,
      sources,
      modules: modules.map((module) => ({
        id: module.id,
        title: module.title,
        summary: module.description,
        concepts: concepts
          .filter((concept) => concept.moduleId === module.id)
          .map(({ id, title, summary, prerequisiteIds }) => ({
            id,
            title,
            summary,
            prerequisiteIds,
          })),
        lessons: definitions
          .filter((lesson) => lesson.moduleId === module.id)
          .map((lesson) => ({
            slug: lesson.id,
            title: lesson.title,
            conceptIds: ["python-" + lesson.id],
            outcome: lesson.summary,
            outline: lesson.beats.map((beat) => beat.title),
            prerequisiteLessonIds: definitions.indexOf(lesson)
              ? [definitions[definitions.indexOf(lesson) - 1]!.id]
              : [],
            activityKinds: ["explorer"],
          })),
      })),
    });
    await writeFile(
      path.join(root, "content/_topic-maps", courseId + ".json"),
      JSON.stringify(map, null, 2) + "\n",
    );
    console.log(
      JSON.stringify(
        {
          courseId,
          lessons: lessons.length,
          questions: questions.length,
          cards: flashcards.length,
          diagrams: Object.keys(executed.diagrams).length,
          verifiedProbes: executed.verifiedProbes,
          runtime: executed.runtime,
          manifestSha256,
          sha256: bundleDigest(validation.bundle),
          issues: validation.issues,
        },
        null,
        2,
      ),
    );
  }
}
