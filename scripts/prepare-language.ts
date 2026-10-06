import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateCourseBundle, bundleDigest } from "@discere/curriculum";
import { TopicMapSchema } from "../packages/contracts/src/index.js";
import { languageLessons as definitions } from "../content/english-reading-writing-and-rhetoric/authoring/lessons.js";
import { sources } from "../content/english-reading-writing-and-rhetoric/authoring/definition.js";
import { languageChecks } from "../content/english-reading-writing-and-rhetoric/authoring/course-checks.js";
const root = path.resolve(import.meta.dirname, ".."),
  courseId = "english-reading-writing-and-rhetoric";
const stepIds = ["predict", "work", "check", "transfer"],
  stepKinds = ["hook", "worked_example", "check", "transfer"];
const concepts = definitions.map((d, i) => ({
  id: "lang-" + d.id,
  moduleId: d.moduleId,
  title: d.title,
  summary: d.summary,
  prerequisiteIds: i ? ["lang-" + definitions[i - 1]!.id] : [],
  misconceptionIds: [],
  assuranceLevel: "source_backed",
}));
const lessons = definitions.map((d) => ({
  id: d.id,
  courseId,
  conceptIds: ["lang-" + d.id],
  title: d.title,
  steps: d.beats.map((b, i) => ({
    id: stepIds[i]!,
    kind: stepKinds[i]!,
    blocks: [
      { kind: "heading", text: b.title },
      { kind: "paragraph", text: b.text },
    ],
    visualStateId: "",
    checkQuestionId: "lang-" + d.id + "-" + (i + 1),
    activityId: "",
    diagram: b.diagram,
  })),
  orientation: d.summary,
  visualStates: [],
  visualKind: "none",
  activityId: "",
  questionIds: [5, 6].map((i) => "lang-" + d.id + "-" + i),
  flashcardIds: [1, 2].map((i) => "lang-" + d.id + "-card-" + i),
  reviewLabel: d.title,
  nextAction: "Try the next idea, then return for a fresh text after a delay.",
  stageTitles: {
    quiz: "Use the idea",
    review: "Recall it later",
    completion: "Ready for the next idea",
  },
  sourceIds: d.sourceIds,
  assuranceLevel: "source_backed",
}));
const questions = definitions.flatMap((d) =>
  d.questions.map((q, i) => ({
    ...q,
    id: "lang-" + d.id + "-" + (i + 1),
    conceptIds: ["lang-" + d.id],
    sourceIds: d.sourceIds,
  })),
);
const flashcards = definitions.flatMap((d) =>
  d.cards.map((c, i) => ({
    ...c,
    id: "lang-" + d.id + "-card-" + (i + 1),
    conceptIds: ["lang-" + d.id],
    sourceIds: d.sourceIds,
  })),
);
const authoringMetadata = definitions.map((d, i) => ({
  lessonId: d.id,
  prerequisiteLessonIds: i ? [definitions[i - 1]!.id] : [],
  citations: [
    ...d.beats.flatMap((b, j) =>
      d.sourceIds.map((sourceId) => ({
        targetKind: "step",
        targetId: stepIds[j]!,
        claim: b.text,
        sourceId,
        section: sources.find((s) => s.id === sourceId)!.section!,
      })),
    ),
    ...d.questions.map((q, j) => ({
      targetKind: "question",
      targetId: "lang-" + d.id + "-" + (j + 1),
      claim:
        q.answerAuthority.kind === "numeric"
          ? q.answerAuthority.workedAnswer
          : q.answerAuthority.exampleAnswer,
      sourceId: d.sourceIds[0]!,
      section: sources.find((s) => s.id === d.sourceIds[0])!.section!,
    })),
    ...d.cards.map((c, j) => ({
      targetKind: "flashcard",
      targetId: "lang-" + d.id + "-card-" + (j + 1),
      claim: c.back,
      sourceId: d.sourceIds[0]!,
      section: sources.find((s) => s.id === d.sourceIds[0])!.section!,
    })),
  ],
  uncertainty: [],
}));
const moduleDescriptions = [
  [
    "lang-sentence",
    "The sentence",
    "Clauses and the marks that join them; actors as subjects and actions as verbs.",
  ],
  [
    "lang-argument",
    "Argument and rhetoric",
    "Toulmin's anatomy of an argument, the four appeals and the figures of repetition and balance.",
  ],
  [
    "lang-poetry",
    "Reading poetry",
    "Metre and scansion, sound and image; the sonnet and its turn.",
  ],
  [
    "lang-prose",
    "Reading prose and drama",
    "Point of view and irony; unreliable narration and the shape of a plot.",
  ],
];
const candidate = {
  course: {
    id: courseId,
    version: "1.0.0",
    title: "English: Reading, Writing and Rhetoric",
    description:
      "Take sentences apart and rebuild them, test arguments, scan Shakespeare and read Austen the way a critic does.",
    audience:
      "A fluent adult reader who wants to write with precision and read literature critically. No grammar course or literary training is assumed; school terms are defined when they appear.",
    assuranceLevel: "source_backed",
    moduleIds: moduleDescriptions.map((m) => m[0]),
    sourceIds: sources.map((s) => s.id),
    accent: "#ff7a8a",
    coverAsset: "cover.svg",
    status: "available",
    subjects: ["English", "Literature", "Humanities"],
  },
  modules: moduleDescriptions.map(([id, title, description]) => ({
    id,
    title,
    description,
    conceptIds: concepts.filter((c) => c.moduleId === id).map((c) => c.id),
  })),
  concepts,
  lessons,
  questions,
  flashcards,
  activities: [],
  essays: [],
  sources,
  authoringMetadata,
  courseChecks: languageChecks,
};
const validation = validateCourseBundle(candidate);
if (!validation.passed || !validation.bundle) {
  console.error(JSON.stringify(validation.issues, null, 2));
  process.exitCode = 1;
} else {
  const directory = path.join(root, "content", courseId, ".authoring");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "candidate.json"),
    JSON.stringify(validation.bundle, null, 2) + "\n",
  );
  const map = {
    courseId,
    title: candidate.course.title,
    description: candidate.course.description,
    audience: candidate.course.audience,
    accent: candidate.course.accent,
    coverAsset: "cover.svg",
    sources,
    modules: candidate.modules.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.description,
      concepts: concepts
        .filter((c) => c.moduleId === m.id)
        .map((c) => ({
          id: c.id,
          title: c.title,
          summary: c.summary,
          prerequisiteIds: c.prerequisiteIds,
        })),
      lessons: definitions
        .filter((d) => d.moduleId === m.id)
        .map((d) => ({
          slug: d.id,
          title: d.title,
          conceptIds: ["lang-" + d.id],
          outcome: d.summary,
          outline: d.beats.map((b) => b.title),
          prerequisiteLessonIds: authoringMetadata.find((a) => a.lessonId === d.id)!
            .prerequisiteLessonIds,
          activityKinds: ["explorer"],
        })),
    })),
  };
  await writeFile(
    path.join(root, "content", "_topic-maps", courseId + ".json"),
    JSON.stringify(TopicMapSchema.parse(map), null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        courseId,
        lessons: lessons.length,
        questions: questions.length,
        cards: flashcards.length,
        checkProblems: languageChecks.reduce((n, c) => n + c.items.length, 0),
        sha256: bundleDigest(validation.bundle),
        issues: validation.issues,
      },
      null,
      2,
    ),
  );
}
