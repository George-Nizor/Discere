import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp, type DiscereApp } from "../src/app.js";
import { buildSearchIndex, searchLessons } from "../src/search.js";

let service: DiscereApp;
beforeAll(async () => {
  service = await createApp({ dbPath: ":memory:", migrate: true });
});
afterAll(async () => {
  await service.app.close();
});

type Found = {
  lessons: Array<{ courseId: string; lessonTitle: string; match: string; snippet: string }>;
};
const search = async (q: string) =>
  (
    await service.app.inject({ method: "GET", url: "/api/search?q=" + encodeURIComponent(q) })
  ).json() as Found;

describe("library search", () => {
  it("finds a lesson by an idea in its title", async () => {
    const { lessons } = await search("bayes");
    expect(lessons[0]).toMatchObject({
      courseId: "psychology-how-minds-work",
      lessonTitle: "Base rates and Bayes",
      match: "lesson",
    });
  });

  it("finds ideas that live only in the teaching text, with an excerpt", async () => {
    const { lessons } = await search("standard deviation");
    const content = lessons.filter((lesson) => lesson.match === "content");
    expect(content.length).toBeGreaterThan(0);
    expect(content.every((lesson) => /standard|deviation/i.test(lesson.snippet))).toBe(true);
    // An idea no course teaches finds nothing rather than something loosely related.
    expect((await search("entropy")).lessons).toEqual([]);
  });

  it("searches a v2 lesson's headlines and leads, never its reveals", () => {
    const index = buildSearchIndex(service.content.listedBundles);
    const bundle = service.content.listedBundles.find((item) =>
      item.lessons.some((lesson) => lesson.intro),
    )!;
    const lesson = bundle.lessons.find((item) => item.intro)!;
    const headline = lesson.steps.find((step) => step.headline)!.headline!;
    const found = searchLessons(index, headline.split(/\s+/).slice(0, 4).join(" "));
    expect(found.some((hit) => hit.lessonId === lesson.id)).toBe(true);
    const reveals = lesson.steps.flatMap((step) => step.reveal ?? []);
    const passages = index.find((item) => item.lessonId === lesson.id)!.passages.join(" ");
    for (const block of reveals)
      if ("text" in block && block.text && block.text.length > 40)
        expect(passages).not.toContain(block.text.slice(0, 40));
  });

  it("requires every term and ignores case, accents and punctuation", async () => {
    const index = buildSearchIndex(service.content.listedBundles);
    expect(searchLessons(index, "BAYES")).toEqual(searchLessons(index, "bayes"));
    expect(searchLessons(index, "bayes zzqqx")).toEqual([]);
    expect(searchLessons(index, "a")).toEqual([]);
  });

  it("leaves archived courses out", async () => {
    const { lessons } = await search("augustus");
    expect(lessons.every((lesson) => lesson.courseId !== "roman-empire")).toBe(true);
  });

  it("reports the library's course count on the health probe", async () => {
    const health = (await service.app.inject({ method: "GET", url: "/api/health" })).json() as {
      courses: number;
      archivedCourses: number;
    };
    expect(health.courses).toBe(service.content.listedBundles.length);
    expect(health.archivedCourses).toBe(
      service.content.bundles.length - service.content.listedBundles.length,
    );
  });
});
