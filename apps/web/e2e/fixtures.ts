import { join } from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import { test as base } from "@playwright/test";

/**
 * Where a spec writes its screenshots. `docsPath` names the folder under `docs/` whose images
 * the spec can regenerate. An ordinary run leaves those tracked images alone and writes to
 * `test-results/captures` instead, which Git ignores. Set `DISCERE_E2E_UPDATE_DOCS=1` to write
 * to `docs/`, when a document's pictures are meant to change.
 */
export function captureDir(docsPath: string): string {
  return process.env["DISCERE_E2E_UPDATE_DOCS"] === "1"
    ? join(import.meta.dirname, "../../../docs", docsPath)
    : join(import.meta.dirname, "../test-results/captures", docsPath);
}

/**
 * Every browser test runs with reduced motion. Route transitions and entrance animations are
 * real behaviour, but a screenshot taken mid-flight differs between runs, and reduced motion is
 * the accessibility path the design promises — so asserting against it keeps that path honest
 * rather than leaving it untested. A test that needs the motion asks for it explicitly.
 *
 * `reducedMotion` is a browser-context option in Playwright 1.62 rather than a config-level
 * `use` option, so it is applied here instead of in `playwright.config.ts`.
 */
export const test = base.extend({
  page: async ({ page }, run) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Crossing a level outside a lesson opens a modal celebration (docs/gamification). It is real
    // behaviour, but it can arrive whenever earned XP lands, so a learner — and every test —
    // dismisses it the same way, with "Keep going", whenever it blocks the next action.
    await page.addLocatorHandler(
      page.getByRole("dialog").filter({ has: page.locator("#level-up-title") }),
      async (dialog) => {
        await dialog.getByRole("button", { name: "Keep going", exact: true }).click();
      },
    );
    await run(page);
  },
});

export { expect } from "@playwright/test";

export interface JourneyMap {
  courseId: string;
  lessonId: string;
  stageIdByType: Record<string, string>;
  /** Every stage id in order, so a test can reach a later stage of the same type. */
  stageIds: string[];
}

/**
 * Reads the journey from the API instead of hard-coding stage identifiers, so the browser
 * tests keep working when Phase 3 content changes the stage list.
 */
export async function readJourney(
  request: APIRequestContext,
  courseId: string = "electronics-foundations",
): Promise<JourneyMap> {
  const courses = await request.get("/api/courses");
  const courseBody = (await courses.json()) as {
    courses: Array<{ id: string; availableLessonIds: string[] }>;
  };
  let course = courseId
    ? courseBody.courses.find((item) => item.id === courseId)
    : courseBody.courses[0];
  // An explicit saved legacy course remains reachable after it leaves active discovery.
  if (!course && courseId) {
    const detail = await request.get(`/api/courses/${encodeURIComponent(courseId)}`);
    if (detail.ok()) course = (await detail.json()).course;
  }
  if (!course) throw new Error(`The course list did not contain ${courseId ?? "any course"}.`);
  const lessonId = course.availableLessonIds[0];
  if (!lessonId) throw new Error("No lesson is available.");

  const journey = await request.get(
    `/api/courses/${encodeURIComponent(course.id)}/lessons/${encodeURIComponent(lessonId)}/journey`,
  );
  const journeyBody = (await journey.json()) as { stages: Array<{ id: string; type: string }> };
  const stageIdByType: Record<string, string> = {};
  for (const stage of journeyBody.stages) {
    stageIdByType[stage.type] ??= stage.id;
  }
  return {
    courseId: course.id,
    lessonId,
    stageIdByType,
    stageIds: journeyBody.stages.map((stage) => stage.id),
  };
}

/** The working page for the lesson under test. */
export function notebookPath(journey: JourneyMap): string {
  return `/courses/${encodeURIComponent(journey.courseId)}/lessons/${encodeURIComponent(journey.lessonId)}/notebook`;
}

export function stagePath(journey: JourneyMap, type: string): string {
  const stageId = journey.stageIdByType[type];
  if (!stageId) throw new Error(`The journey has no ${type} stage.`);
  return `/courses/${encodeURIComponent(journey.courseId)}/lessons/${encodeURIComponent(journey.lessonId)}/stages/${encodeURIComponent(stageId)}`;
}

export async function gotoStage(page: Page, journey: JourneyMap, type: string): Promise<void> {
  await page.goto(stagePath(journey, type));
  await page.waitForLoadState("networkidle");
}
