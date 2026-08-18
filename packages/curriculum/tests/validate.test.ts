import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateCourseBundle } from "../src/index.js";

async function seedBundle(): Promise<unknown> {
  const file = path.resolve(
    import.meta.dirname,
    "../../../content/electronics-foundations/bundle.json",
  );
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

async function romanBundle(): Promise<unknown> {
  const file = path.resolve(import.meta.dirname, "../../../content/roman-empire/bundle.json");
  return JSON.parse(await readFile(file, "utf8")) as unknown;
}

describe("course validation", () => {
  it("accepts the seed electronics course", async () => {
    const result = validateCourseBundle(await seedBundle());
    expect(result.issues.filter((item) => item.severity === "error")).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("rejects references to missing source material", async () => {
    const bundle = (await seedBundle()) as {
      course: { sourceIds: string[] };
    };
    bundle.course.sourceIds.push("missing-source");
    const result = validateCourseBundle(bundle);
    expect(result.passed).toBe(false);
    expect(
      result.issues.some(
        (item) => item.path === "course.sourceIds" && item.code === "MISSING_REFERENCE",
      ),
    ).toBe(true);
  });

  it("accepts the history course, which shares nothing with electronics but the schema", async () => {
    const result = validateCourseBundle(await romanBundle());
    expect(result.issues.filter((item) => item.severity === "error")).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it("rejects a selectable question that no option can answer", async () => {
    const bundle = (await seedBundle()) as {
      questions: Array<{ id: string; answerAuthority: { acceptedIdeas?: string[] } }>;
    };
    const question = bundle.questions.find(
      (item) => item.id === "choose-change-that-raises-current",
    );
    if (!question?.answerAuthority.acceptedIdeas) throw new Error("Seed question is missing.");
    question.answerAuthority.acceptedIdeas = ["an option that is not offered"];
    const result = validateCourseBundle(bundle);
    expect(result.passed).toBe(false);
    expect(result.issues.some((item) => item.code === "CHOICE_NOT_MARKABLE")).toBe(true);
  });

  it("rejects an accepted idea written as a sentence, which no answer could contain", async () => {
    const bundle = (await seedBundle()) as {
      questions: Array<{
        id: string;
        choices?: unknown;
        answerAuthority: { acceptedIdeas?: string[] };
      }>;
    };
    const question = bundle.questions.find((item) => item.id === "explain-power-versus-energy");
    if (!question?.answerAuthority.acceptedIdeas) throw new Error("Seed question is missing.");
    question.answerAuthority.acceptedIdeas = [
      "Power is the rate at which energy is transferred, and energy is that power multiplied by time.",
    ];
    const result = validateCourseBundle(bundle);
    expect(result.passed).toBe(false);
    expect(result.issues.some((item) => item.code === "ACCEPTED_IDEA_TOO_LONG")).toBe(true);
  });

  it("rejects an image whose licence does not permit bundling it", async () => {
    const bundle = (await romanBundle()) as {
      lessons: Array<{ image?: { licence: string } }>;
    };
    const lesson = bundle.lessons.find((item) => item.image !== undefined);
    if (!lesson?.image) throw new Error("The history course should bundle an image.");
    lesson.image.licence = "CC BY-NC-SA 4.0";
    const result = validateCourseBundle(bundle);
    expect(result.passed).toBe(false);
    expect(result.issues.some((item) => item.code === "LICENCE_NOT_REDISTRIBUTABLE")).toBe(true);
  });

  it("rejects a course where more than 35% of the questions are multiple choice", async () => {
    const bundle = (await romanBundle()) as {
      questions: Array<{ choices?: Array<{ id: string; label: string }> }>;
    };
    bundle.questions = bundle.questions.filter((item) => item.choices !== undefined);
    const result = validateCourseBundle(bundle);
    expect(result.issues.some((item) => item.code === "MULTIPLE_CHOICE_SHARE")).toBe(true);
  });

  it("rejects prerequisite cycles", async () => {
    const bundle = (await seedBundle()) as {
      concepts: Array<{ id: string; prerequisiteIds: string[] }>;
    };
    const electricCharge = bundle.concepts.find((item) => item.id === "electric-charge");
    if (!electricCharge) throw new Error("Seed concept is missing.");
    electricCharge.prerequisiteIds.push("ohms-law");
    const result = validateCourseBundle(bundle);
    expect(result.passed).toBe(false);
    expect(result.issues.some((item) => item.code === "PREREQUISITE_CYCLE")).toBe(true);
  });
});
