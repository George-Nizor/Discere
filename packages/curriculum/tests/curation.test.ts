import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TopicMapSchema } from "@discere/contracts";
import {
  assertEditorialApproval,
  bundleDigest,
  courseDirectories,
  loadCourseBundle,
  scaffoldTopicMap,
  validateCourseBundle,
} from "../src/index.js";

const root = path.resolve(import.meta.dirname, "../../../content");
async function fixture() {
  return {
    bundle: JSON.parse(await readFile(path.join(root, "maths-foundations/bundle.json"), "utf8")),
    review: JSON.parse(
      await readFile(path.join(root, "maths-foundations/review/publication.json"), "utf8"),
    ),
  };
}

describe("reviewed publication", () => {
  it("accepts the shipped course and invalidates its review after an answer changes", async () => {
    const { bundle, review } = await fixture();
    expect(() =>
      assertEditorialApproval(bundle, review, validateCourseBundle(bundle)),
    ).not.toThrow();
    bundle.questions[0].answerAuthority.value = 999;
    expect(() => assertEditorialApproval(bundle, review, validateCourseBundle(bundle))).toThrow(
      /changed after review/,
    );
  });
  it("requires decisions on uncertainty, validation warnings and incomplete lessons", async () => {
    for (const change of ["uncertainty", "warnings", "transfer", "citations", "visual"] as const) {
      const { bundle, review } = await fixture();
      if (change === "uncertainty")
        bundle.authoringMetadata[0].uncertainty.push("Confirm this mathematical claim.");
      if (change === "warnings") review.acceptedWarnings = [];
      if (change === "transfer")
        for (const step of bundle.lessons[0].steps) if (step.kind === "transfer") step.kind = "try";
      if (change === "citations") bundle.authoringMetadata[0].citations = [];
      if (change === "visual") for (const step of bundle.lessons[0].steps) delete step.diagram;
      review.bundleSha256 = bundleDigest(bundle);
      const validation = validateCourseBundle(bundle);
      // The shipped course has no warnings left, so the case brings one of its own.
      if (change === "warnings")
        validation.issues.push({
          severity: "warning",
          code: "REP001_REPEATED_TRANSITION",
          path: "lessons.0.steps.0.lead.0.text",
          message: "A repeated transition.",
        });
      expect(() => assertEditorialApproval(bundle, review, validation), change).toThrow();
    }
  });
  it("checks source terms before scaffolding, instead of inventing a licence", async () => {
    const map = TopicMapSchema.parse(
      JSON.parse(await readFile(path.join(root, "_topic-maps/maths-foundations.json"), "utf8")),
    );
    expect(scaffoldTopicMap(map)["lessons"]).toEqual([]);
    map.sources[0]!.licence = "See the publisher's terms";
    expect(() => scaffoldTopicMap(map)).toThrow(/actual licence/);
    map.sources[0]!.licence = "CC BY-NC-SA 4.0";
    map.sources[0]!.reuse = "adaptable";
    expect(() => scaffoldTopicMap(map)).toThrow(/reference_only/);
  });
  it("does not load an authoring folder as a playable course, and checks covers", async () => {
    const temporary = await mkdtemp(path.join(tmpdir(), "discere-content-"));
    try {
      await mkdir(path.join(temporary, "draft", ".authoring"), { recursive: true });
      await writeFile(path.join(temporary, "draft", ".authoring", "candidate.json"), "{}");
      expect(await courseDirectories(temporary)).toEqual([]);
      const { bundle } = await fixture();
      await writeFile(path.join(temporary, "draft", "bundle.json"), JSON.stringify(bundle));
      expect(await courseDirectories(temporary)).toEqual(["draft"]);
      await expect(loadCourseBundle(path.join(temporary, "draft", "bundle.json"))).rejects.toThrow(
        /cover.svg/,
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
});
