import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateCourseBundle, bundleDigest } from "@discere/curriculum";
import { TopicMapSchema } from "../packages/contracts/src/index.js";
import { physicsLessons as definitions } from "../content/physics-motion-and-forces/authoring/lessons.js";
import { sources } from "../content/physics-motion-and-forces/authoring/definition.js";
import { physicsChecks } from "../content/physics-motion-and-forces/authoring/course-checks.js";
const root = path.resolve(import.meta.dirname, ".."),
  courseId = "physics-motion-and-forces";
const stepIds = ["predict", "work", "check", "transfer"],
  stepKinds = ["hook", "worked_example", "check", "transfer"];
const concepts = definitions.map((d, i) => ({
  id: "phys-" + d.id,
  moduleId: d.moduleId,
  title: d.title,
  summary: d.summary,
  prerequisiteIds: i ? ["phys-" + definitions[i - 1]!.id] : [],
  misconceptionIds: [],
  assuranceLevel: "source_backed",
}));
const lessons = definitions.map((d) => ({
  id: d.id,
  courseId,
  conceptIds: ["phys-" + d.id],
  title: d.title,
  steps: d.beats.map((b, i) => ({
    id: stepIds[i]!,
    kind: stepKinds[i]!,
    blocks: [
      { kind: "heading", text: b.title },
      { kind: "paragraph", text: b.text },
    ],
    visualStateId: "",
    checkQuestionId: "phys-" + d.id + "-" + (i + 1),
    activityId: "",
    diagram: b.diagram,
  })),
  orientation: d.summary,
  visualStates: [],
  visualKind: "none",
  activityId: "",
  questionIds: [5, 6].map((i) => "phys-" + d.id + "-" + i),
  flashcardIds: [1, 2].map((i) => "phys-" + d.id + "-card-" + i),
  reviewLabel: d.title,
  nextAction: "Try the next idea, then return for a fresh problem after a delay.",
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
    id: "phys-" + d.id + "-" + (i + 1),
    conceptIds: ["phys-" + d.id],
    sourceIds: d.sourceIds,
  })),
);
const flashcards = definitions.flatMap((d) =>
  d.cards.map((c, i) => ({
    ...c,
    id: "phys-" + d.id + "-card-" + (i + 1),
    conceptIds: ["phys-" + d.id],
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
      targetId: "phys-" + d.id + "-" + (j + 1),
      claim:
        q.answerAuthority.kind === "numeric"
          ? q.answerAuthority.workedAnswer
          : q.answerAuthority.exampleAnswer,
      sourceId: d.sourceIds[0]!,
      section: sources.find((s) => s.id === d.sourceIds[0])!.section!,
    })),
    ...d.cards.map((c, j) => ({
      targetKind: "flashcard",
      targetId: "phys-" + d.id + "-card-" + (j + 1),
      claim: c.back,
      sourceId: d.sourceIds[0]!,
      section: sources.find((s) => s.id === d.sourceIds[0])!.section!,
    })),
  ],
  uncertainty: [],
}));
const moduleDescriptions = [
  ["phys-observe", "Describing motion", "Position, distance, velocity and motion graphs."],
  ["phys-change", "Changing motion", "Acceleration, predictions and free fall."],
  ["phys-forces", "Forces on an object", "Balance, the second law, weight and support."],
  ["phys-interactions", "Objects that interact", "Force pairs, friction and work."],
  ["phys-energy", "Following energy", "Motion, height and heating."],
  ["phys-conservation", "Rates and conservation", "Power, impulse and sticking collisions."],
];
const candidate = {
  course: {
    id: courseId,
    version: "1.0.0",
    title: "Physics: Motion and Forces",
    description: "Move a cart, balance a force and follow the energy. Predict what happens next.",
    audience:
      "An adult comfortable with signed numbers, ratios, basic algebra and square roots. No previous physics course is assumed.",
    assuranceLevel: "source_backed",
    moduleIds: moduleDescriptions.map((m) => m[0]),
    sourceIds: sources.map((s) => s.id),
    accent: "#62bfff",
    coverAsset: "cover.svg",
    status: "available",
    subjects: ["Physics", "Science"],
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
  courseChecks: physicsChecks,
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
          conceptIds: ["phys-" + d.id],
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
        checkProblems: physicsChecks.reduce((n, c) => n + c.items.length, 0),
        sha256: bundleDigest(validation.bundle),
        issues: validation.issues,
      },
      null,
      2,
    ),
  );
}
