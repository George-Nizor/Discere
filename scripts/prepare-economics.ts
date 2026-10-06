import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { bundleDigest, validateCourseBundle } from "@discere/curriculum";
import { economicsChecks } from "../content/economics-markets-and-strategy/authoring/course-checks.js";
import { sources } from "../content/economics-markets-and-strategy/authoring/definition.js";
import { economicsLessons as definitions } from "../content/economics-markets-and-strategy/authoring/lessons.js";
import { TopicMapSchema } from "../packages/contracts/src/index.js";

const root = path.resolve(import.meta.dirname, ".."),
  courseId = "economics-markets-and-strategy";
const stepIds = ["predict", "work", "check", "transfer"],
  stepKinds = ["hook", "worked_example", "check", "transfer"];
const concepts = definitions.map((d, i) => ({
  id: "econ-" + d.id,
  moduleId: d.moduleId,
  title: d.title,
  summary: d.summary,
  prerequisiteIds: i ? ["econ-" + definitions[i - 1]!.id] : [],
  misconceptionIds: [],
  assuranceLevel: "source_backed",
}));
const lessons = definitions.map((d) => ({
  id: d.id,
  courseId,
  conceptIds: ["econ-" + d.id],
  title: d.title,
  steps: d.beats.map((b, i) => ({
    id: stepIds[i]!,
    kind: stepKinds[i]!,
    blocks: [
      { kind: "heading", text: b.title },
      { kind: "paragraph", text: b.text },
    ],
    visualStateId: "",
    checkQuestionId: "econ-" + d.id + "-" + (i + 1),
    activityId: "",
    diagram: b.diagram,
  })),
  orientation: d.summary,
  visualStates: [],
  visualKind: "none",
  activityId: "",
  questionIds: [5, 6].map((i) => "econ-" + d.id + "-" + i),
  flashcardIds: [1, 2].map((i) => "econ-" + d.id + "-card-" + i),
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
    id: "econ-" + d.id + "-" + (i + 1),
    conceptIds: ["econ-" + d.id],
    sourceIds: d.sourceIds,
  })),
);
const flashcards = definitions.flatMap((d) =>
  d.cards.map((c, i) => ({
    ...c,
    id: "econ-" + d.id + "-card-" + (i + 1),
    conceptIds: ["econ-" + d.id],
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
      targetId: "econ-" + d.id + "-" + (j + 1),
      claim:
        q.answerAuthority.kind === "numeric"
          ? q.answerAuthority.workedAnswer
          : q.answerAuthority.exampleAnswer,
      sourceId: d.sourceIds[0]!,
      section: sources.find((s) => s.id === d.sourceIds[0])!.section!,
    })),
    ...d.cards.map((c, j) => ({
      targetKind: "flashcard",
      targetId: "econ-" + d.id + "-card-" + (j + 1),
      claim: c.back,
      sourceId: d.sourceIds[0]!,
      section: sources.find((s) => s.id === d.sourceIds[0])!.section!,
    })),
  ],
  uncertainty: [],
}));
const moduleDescriptions = [
  [
    "econ-choice",
    "Choice and cost",
    "Opportunity cost, comparative advantage and decisions at the margin.",
  ],
  ["econ-markets", "How markets set prices", "Demand, supply, equilibrium, shifts and elasticity."],
  ["econ-welfare", "Welfare and policy", "Surplus, taxes, price controls and external costs."],
  ["econ-strategy", "Firms and strategy", "Costs, profit, monopoly and game theory."],
];
const candidate = {
  course: {
    id: courseId,
    version: "1.0.0",
    title: "Economics: Markets and Strategy",
    description:
      "Price a trade-off, find where supply meets demand, weigh a tax and outguess a rival. Every idea is worked with real numbers.",
    audience:
      "An adult comfortable with basic algebra: solving two linear equations and finding the area of a triangle. No previous economics is assumed; the depth matches a strong first-year university microeconomics course.",
    assuranceLevel: "source_backed",
    moduleIds: moduleDescriptions.map((m) => m[0]),
    sourceIds: sources.map((s) => s.id),
    accent: "#f5c542",
    coverAsset: "cover.svg",
    status: "available",
    subjects: ["Economics", "Social science"],
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
  courseChecks: economicsChecks,
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
          conceptIds: ["econ-" + d.id],
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
        checkProblems: economicsChecks.reduce((n, c) => n + c.items.length, 0),
        sha256: bundleDigest(validation.bundle),
        issues: validation.issues,
      },
      null,
      2,
    ),
  );
}
