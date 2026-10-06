import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateCourseBundle, bundleDigest } from "@discere/curriculum";
import { TopicMapSchema } from "../packages/contracts/src/index.js";
import { sources } from "../content/probability-statistics/authoring/definition.js";
import { numericHints } from "../content/probability-statistics/authoring/hints.js";
import { probabilityLessons } from "../content/probability-statistics/authoring/probability-lessons.js";
import { statisticsLessons } from "../content/probability-statistics/authoring/statistics-lessons.js";

const definitions = [...probabilityLessons, ...statisticsLessons];
const root = path.resolve(import.meta.dirname, "..");
const courseId = "probability-statistics";
const concepts = definitions.map((lesson, index) => ({
  id: "stats-" + lesson.id, moduleId: lesson.moduleId, title: lesson.title,
  summary: lesson.summary, prerequisiteIds: index > 0 ? ["stats-" + definitions[index - 1]!.id] : [],
  misconceptionIds: [], assuranceLevel: "source_backed",
}));
const lessons = definitions.map((definition) => ({
  id: definition.id, courseId, conceptIds: ["stats-" + definition.id], title: definition.title,
  steps: definition.beats.map((beat, index) => ({
    id: ["predict", "work", "check", "transfer"][index]!,
    kind: ["hook", "worked_example", "check", "transfer"][index]!,
    blocks: [{ kind: "heading", text: beat.title }, { kind: "paragraph", text: beat.text }],
    visualStateId: "", checkQuestionId: "stats-" + definition.id + "-" + (index + 1),
    activityId: "", diagram: beat.diagram,
  })),
  orientation: definition.summary, visualStates: [], visualKind: "none", activityId: "",
  questionIds: [5, 6].map((index) => "stats-" + definition.id + "-" + index),
  flashcardIds: [1, 2].map((index) => "stats-" + definition.id + "-card-" + index),
  reviewLabel: definition.title, nextAction: "Try a new case and return for recall after a delay.",
  stageTitles: { quiz: "Use the idea", review: "Recall it later", completion: "Ready for the next idea" },
  sourceIds: definition.id === "samples-and-populations"
    ? ["statcan-selection", "statcan-nonprob", "statcan-sampling"] : [definition.sourceId],
  assuranceLevel: "source_backed",
}));
function sourceFor(lesson: (typeof definitions)[number], questionIndex: number) {
  return lesson.id === "samples-and-populations"
    ? questionIndex === 5 ? "statcan-sampling" : questionIndex === 4 ? "statcan-nonprob" : "statcan-selection"
    : lesson.sourceId;
}
const questions = definitions.flatMap((lesson) => lesson.questions.map((question, index) => ({
  ...question, id: "stats-" + lesson.id + "-" + (index + 1),
  hints: question.responseType === "numeric"
    ? [question.hints[0]!, ...numericHints[lesson.id + "-" + (index + 1)]!]
    : question.hints,
  conceptIds: ["stats-" + lesson.id], sourceIds: [sourceFor(lesson, index)],
})));
const flashcards = definitions.flatMap((lesson) => lesson.cards.map((card, index) => ({
  ...card, id: "stats-" + lesson.id + "-card-" + (index + 1),
  conceptIds: ["stats-" + lesson.id], sourceIds: [lesson.id === "samples-and-populations" ? "statcan-selection" : lesson.sourceId],
})));
const authoringMetadata = definitions.map((lesson, index) => {
  const cited = (targetKind: "step" | "question" | "flashcard", targetId: string, claim: string) => {
    const sampling = lesson.id === "samples-and-populations";
    const number = Number(targetId.split("-").at(-1));
    const sourceId = sampling
      ? targetKind === "question" && number === 6 ? "statcan-sampling"
        : (targetKind === "question" && number === 5) || targetId === "work"
          ? "statcan-nonprob" : "statcan-selection"
      : lesson.sourceId;
    const source = sources.find((item) => item.id === sourceId)!;
    return { claim, sourceId, section: source.section!, targetKind, targetId };
  };
  return {
    lessonId: lesson.id, prerequisiteLessonIds: index > 0 ? [definitions[index - 1]!.id] : [],
    citations: [
      ...lesson.beats.map((beat, index) => cited("step", ["predict", "work", "check", "transfer"][index]!, beat.text)),
      ...lesson.questions.map((question, index) => cited("question", "stats-" + lesson.id + "-" + (index + 1),
        question.answerAuthority.kind === "numeric" ? question.answerAuthority.workedAnswer : question.answerAuthority.exampleAnswer)),
      ...lesson.cards.map((card, index) => cited("flashcard", "stats-" + lesson.id + "-card-" + (index + 1), card.back)),
    ], uncertainty: [],
  };
});
const candidate = {
  course: { id: courseId, version: "1.0.0", title: "Probability and Statistics",
    description: "Count what can happen. Change a condition, move an outlier, and test what a sample can tell you.",
    audience: "An adult comfortable with arithmetic, fractions and the first Maths Foundations lessons.",
    assuranceLevel: "source_backed", moduleIds: ["stats-chance", "stats-data"],
    sourceIds: sources.map((source) => source.id), accent: "#2563a8", coverAsset: "cover.svg",
    status: "available", subjects: ["Mathematics", "Data literacy"] },
  modules: [
    { id: "stats-chance", title: "Reasoning about chance", description: "Outcomes, conditions and repeated independent trials.",
      conceptIds: concepts.filter((concept) => concept.moduleId === "stats-chance").map((concept) => concept.id) },
    { id: "stats-data", title: "Reading data", description: "Centre, spread and the people or items behind a sample.",
      conceptIds: concepts.filter((concept) => concept.moduleId === "stats-data").map((concept) => concept.id) },
  ],
  concepts, lessons, activities: [], questions, flashcards, essays: [], sources, authoringMetadata,
};
const validation = validateCourseBundle(candidate);
if (!validation.passed) {
  console.error(validation.issues.filter((issue) => issue.severity === "error"));
  process.exitCode = 1;
} else {
  const directory = path.join(root, "content", courseId, ".authoring");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "candidate.json"), JSON.stringify(candidate, null, 2) + "\n");
  const map = {
    courseId, title: candidate.course.title, description: candidate.course.description,
    audience: candidate.course.audience, accent: candidate.course.accent,
    coverAsset: candidate.course.coverAsset, sources,
    modules: candidate.modules.map((module) => ({
      id: module.id, title: module.title, summary: module.description,
      concepts: concepts.filter((concept) => concept.moduleId === module.id).map((concept) => ({
        id: concept.id, title: concept.title, summary: concept.summary, prerequisiteIds: concept.prerequisiteIds,
      })),
      lessons: definitions.filter((lesson) => lesson.moduleId === module.id).map((lesson) => ({
        slug: lesson.id, title: lesson.title, conceptIds: ["stats-" + lesson.id],
        outcome: lesson.summary, outline: lesson.beats.map((beat) => beat.title),
        prerequisiteLessonIds: definitions.indexOf(lesson) > 0 ? [definitions[definitions.indexOf(lesson) - 1]!.id] : [],
        activityKinds: ["explorer"],
      })),
    })),
  };
  await writeFile(path.join(root, "content", "_topic-maps", courseId + ".json"), JSON.stringify(TopicMapSchema.parse(map), null, 2) + "\n");
  console.log(JSON.stringify({ courseId, lessons: lessons.length, questions: questions.length,
    cards: flashcards.length, sha256: bundleDigest(candidate), warnings: validation.issues }, null, 2));
}
