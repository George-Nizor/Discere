import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { CourseSummary, TopicMap } from "@discere/contracts";
import { TopicMapSchema } from "@discere/contracts";

export const TOPIC_MAP_DIRECTORY = "_topic-maps";

/**
 * Curated course outlines that have no lessons yet.
 *
 * A topic map is committed before any lesson is written, which lets the library show where it
 * is going without pretending the lessons exist. Once a course has a real bundle, its map stops
 * appearing here: the bundle is the course, and the map was the plan for it.
 */
export class TopicMapRepository {
  private constructor(
    private readonly maps: TopicMap[],
    /** Where the maps were loaded from, so cover art resolves against the same root. */
    private readonly directory: string,
  ) {}

  static async load(contentRoot: string): Promise<TopicMapRepository> {
    const directory = path.join(contentRoot, TOPIC_MAP_DIRECTORY);
    let names: string[];
    try {
      names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
    } catch {
      // A workspace with no roadmap is fine; the catalogue simply shows what exists.
      return new TopicMapRepository([], directory);
    }
    const maps: TopicMap[] = [];
    for (const name of names) {
      const raw = await readFile(path.join(directory, name), "utf8");
      const parsed = TopicMapSchema.safeParse(JSON.parse(raw) as unknown);
      if (!parsed.success) {
        throw new Error(
          `Topic map '${name}' is not valid:\n${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n")}`,
        );
      }
      maps.push(parsed.data);
    }
    return new TopicMapRepository(maps, directory);
  }

  get all(): TopicMap[] {
    return this.maps;
  }

  find(courseId: string): TopicMap | undefined {
    return this.maps.find((map) => map.courseId === courseId);
  }

  /**
   * Absolute path to a planned course's cover, or undefined when it has none. The name is
   * derived from the course id rather than taken from the map, so a crafted `coverAsset` can
   * never point outside the roadmap's own assets directory.
   */
  coverPath(courseId: string): string | undefined {
    const map = this.find(courseId);
    if (!map?.coverAsset) return undefined;
    return path.join(this.directory, "assets", `${courseId}.svg`);
  }

  /** Lesson count across every module, which is what a planned card reports. */
  static lessonCount(map: TopicMap): number {
    return map.modules.reduce((total, module) => total + module.lessons.length, 0);
  }

  /**
   * Planned courses as catalogue entries, excluding any that now have a real bundle. The cards
   * render unopenable, so a roadmap never leads to an empty lesson.
   */
  plannedSummaries(existingCourseIds: ReadonlySet<string>): CourseSummary[] {
    return this.maps
      .filter((map) => !existingCourseIds.has(map.courseId))
      .map((map) => ({
        id: map.courseId,
        title: map.title,
        description: map.description,
        lessonCount: TopicMapRepository.lessonCount(map),
        availableLessonIds: [],
        lastActiveAt: null,
        accent: map.accent,
        coverUrl: map.coverAsset
          ? `/api/roadmap/${encodeURIComponent(map.courseId)}/cover.svg`
          : "",
        status: "coming_soon" as const,
        completedLessonCount: 0,
      }));
  }
}
