import { existsSync, readFileSync } from "node:fs";
import { expect } from "vitest";
import type { CourseBundle, LearningDiagram } from "@discere/contracts";
import { bundleDigest } from "../../src/index.js";
import { restorePreLearnerBundle } from "./learner-history.js";

export function restorePreGuidanceBundle(id: string, current: CourseBundle): CourseBundle {
  const bundle = restorePreLearnerBundle(id, current);
  const file = new URL(
    "../../../../content/" + id + "/review/guidance-refinement.json",
    import.meta.url,
  );
  if (!existsSync(file)) return bundle;
  const evidence = JSON.parse(readFileSync(file, "utf8")) as {
    previousVersion: string;
    publishedVersion: string;
    previousBundleSha256: string;
    publishedBundleSha256: string;
    questions: {
      questionId: string;
      before: { prompt?: string; hints?: string[]; exampleAnswer?: string };
      after: { prompt?: string; hints?: string[]; exampleAnswer?: string };
    }[];
    diagrams: {
      lessonId: string;
      stepId: string;
      before: LearningDiagram;
      after: LearningDiagram;
    }[];
  };
  expect(bundleDigest(bundle)).toBe(evidence.publishedBundleSha256);
  expect(bundle.course.version).toBe(evidence.publishedVersion);
  const original = structuredClone(bundle);
  original.course.version = evidence.previousVersion;
  for (const delta of evidence.questions) {
    const q = original.questions.find((q) => q.id === delta.questionId)!;
    expect(q).toBeDefined();
    for (const key of ["prompt", "hints"] as const) {
      if (delta.before[key] !== undefined) {
        expect(q[key]).toEqual(delta.after[key]);
        if (key === "prompt") q.prompt = delta.before.prompt!;
        else q.hints = delta.before.hints!;
      }
    }
    if (delta.before.exampleAnswer !== undefined) {
      expect(q.answerAuthority.kind).toBe("text");
      if (q.answerAuthority.kind === "text") {
        expect(q.answerAuthority.exampleAnswer).toBe(delta.after.exampleAnswer);
        q.answerAuthority.exampleAnswer = delta.before.exampleAnswer;
      }
    }
  }
  for (const delta of evidence.diagrams) {
    const step = original.lessons
      .find((l) => l.id === delta.lessonId)!
      .steps.find((s) => s.id === delta.stepId)!;
    expect(step.diagram).toEqual(delta.after);
    step.diagram = delta.before;
  }
  // Every field outside this small allowlist is covered by the original publication digest.
  expect(bundleDigest(original)).toBe(evidence.previousBundleSha256);
  return original;
}
