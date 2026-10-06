import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { test as base, expect } from "@playwright/test";

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

/** The address of one stage by its identifier, for a stage a test reaches directly. */
export function stageIdPath(journey: JourneyMap, stageId: string): string {
  return `/courses/${encodeURIComponent(journey.courseId)}/lessons/${encodeURIComponent(journey.lessonId)}/stages/${encodeURIComponent(stageId)}`;
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

/**
 * Advances a stepped lesson until `target` appears.
 *
 * Counting Continue clicks looks simpler and is wrong: a lesson saves the learner's position, so
 * a second run of the same suite opens part-way through and every fixed count lands somewhere
 * else. Advancing until the thing we want is on screen is correct from any starting step.
 */
export async function advanceUntil(page: Page, target: Locator, limit = 12): Promise<void> {
  for (let attempt = 0; attempt < limit; attempt += 1) {
    if (await target.isVisible().catch(() => false)) return;
    const next = page.getByRole("button", { name: /^Continue/ });
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
  }
  await expect(target).toBeVisible();
}
