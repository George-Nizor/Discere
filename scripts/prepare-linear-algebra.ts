import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateCourseBundle, bundleDigest } from "@discere/curriculum";
import { TopicMapSchema } from "../packages/contracts/src/index.js";
import { linearLessons as definitions } from "../content/linear-algebra-vectors-and-maps/authoring/lessons.js";
import {
  sources,
  numericProbes,
  numericChecks,
} from "../content/linear-algebra-vectors-and-maps/authoring/definition.js";
import { linearChecks } from "../content/linear-algebra-vectors-and-maps/authoring/course-checks.js";
const root = path.resolve(import.meta.dirname, ".."),
  courseId = "linear-algebra-vectors-and-maps";
const stepIds = ["predict", "work", "check", "transfer"],
  stepKinds = ["hook", "worked_example", "check", "transfer"];
const concepts = definitions.map((d, i) => ({
  id: "lin-" + d.id,
  moduleId: d.moduleId,
  title: d.title,
  summary: d.summary,
  prerequisiteIds: i ? ["lin-" + definitions[i - 1]!.id] : [],
  misconceptionIds: [],
  assuranceLevel: "source_backed",
}));
const lessons = definitions.map((d) => ({
  id: d.id,
  courseId,
  conceptIds: ["lin-" + d.id],
  title: d.title,
  steps: d.beats.map((b, i) => ({
    id: stepIds[i]!,
    kind: stepKinds[i]!,
    blocks: [
      { kind: "heading", text: b.title },
      { kind: "paragraph", text: b.text },
    ],
    visualStateId: "",
    checkQuestionId: "lin-" + d.id + "-" + (i + 1),
    activityId: "",
    diagram: b.diagram,
  })),
  orientation: d.summary,
  visualStates: [],
  visualKind: "none",
  activityId: "",
  questionIds: [5, 6].map((i) => "lin-" + d.id + "-" + i),
  flashcardIds: [1, 2].map((i) => "lin-" + d.id + "-card-" + i),
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
    id: "lin-" + d.id + "-" + (i + 1),
    conceptIds: ["lin-" + d.id],
    sourceIds: d.sourceIds,
  })),
);
const flashcards = definitions.flatMap((d) =>
  d.cards.map((c, i) => ({
    ...c,
    id: "lin-" + d.id + "-card-" + (i + 1),
    conceptIds: ["lin-" + d.id],
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
      targetId: "lin-" + d.id + "-" + (j + 1),
      claim:
        q.answerAuthority.kind === "numeric"
          ? q.answerAuthority.workedAnswer
          : q.answerAuthority.exampleAnswer,
      sourceId: d.sourceIds[0]!,
      section: sources.find((s) => s.id === d.sourceIds[0])!.section!,
    })),
    ...d.cards.map((c, j) => ({
      targetKind: "flashcard",
      targetId: "lin-" + d.id + "-card-" + (j + 1),
      claim: c.back,
      sourceId: d.sourceIds[0]!,
      section: sources.find((s) => s.id === d.sourceIds[0])!.section!,
    })),
  ],
  uncertainty: [],
}));
const moduleDescriptions = [
  [
    "lin-vectors-module",
    "Work with vectors",
    "Coordinates, combinations, dot products and unit directions.",
  ],
  [
    "lin-maps-module",
    "Build linear maps",
    "Matrix shapes, transformations, composition and inverses.",
  ],
  ["lin-systems-module", "Solve and describe", "Row reduction, solution sets, spans and bases."],
  [
    "lin-structure-module",
    "Measure the structure",
    "Rank, determinants, projections and least-squares fits.",
  ],
  [
    "lin-decompositions-module",
    "Separate the directions",
    "Orthonormal bases, eigenvectors, diagonalisation and SVD.",
  ],
];
const candidate = {
  course: {
    id: courseId,
    version: "1.0.0",
    title: "Linear Algebra: Vectors and Maps",
    description:
      "Move vectors, reshape a plane and fit noisy measurements. Build up to eigenvectors and singular value decomposition.",
    audience:
      "An adult comfortable with signed arithmetic, simple equations and coordinate graphs. Work with real vectors and small matrices through rectangular SVD.",
    assuranceLevel: "source_backed",
    moduleIds: moduleDescriptions.map((m) => m[0]),
    sourceIds: sources.map((s) => s.id),
    accent: "#7aabff",
    coverAsset: "cover.svg",
    status: "available",
    subjects: ["Mathematics", "Linear Algebra"],
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
  courseChecks: linearChecks,
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
  const numericTargets = [
    ...candidate.questions.map((q) => ({
      id: q.id,
      kind: "question",
      prompt: q.prompt,
      authority: q.answerAuthority,
    })),
    ...candidate.flashcards.map((c) => ({
      id: c.id,
      kind: "recall",
      prompt: c.front,
      authority: c.answerAuthority,
    })),
    ...candidate.courseChecks.flatMap((check) =>
      check.items.map(({ question: q }) => ({
        id: q.id,
        kind: "course_check",
        prompt: q.prompt,
        authority: q.answerAuthority,
      })),
    ),
  ].filter((x) => x.authority.kind === "numeric");
  const checks = numericTargets.map((x) => {
    if (x.authority.kind !== "numeric") throw Error("Expected a numeric authority.");
    const probe = numericProbes.get(x.authority);
    if (!probe) throw Error("Missing independent probe: " + x.id);
    return { id: x.id, kind: x.kind, prompt: x.prompt, value: x.authority.value, probe };
  });
  if (checks.length !== numericChecks.length)
    throw Error("Unused or missing numeric registrations.");
  await writeFile(
    path.join(root, "content", courseId, "authoring", "numeric-verification.json"),
    JSON.stringify(
      { schemaVersion: 1, courseId, bundleSha256: bundleDigest(validation.bundle), checks },
      null,
      2,
    ) + "\n",
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
          conceptIds: ["lin-" + d.id],
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
        checkProblems: linearChecks.reduce((n, c) => n + c.items.length, 0),
        sha256: bundleDigest(validation.bundle),
        issues: validation.issues,
      },
      null,
      2,
    ),
  );
}
