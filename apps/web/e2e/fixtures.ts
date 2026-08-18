import type { APIRequestContext, Page } from "@playwright/test";

export interface JourneyMap {
  courseId: string;
  lessonId: string;
  stageIdByType: Record<string, string>;
}

/**
 * Reads the journey from the API instead of hard-coding stage identifiers, so the browser
 * tests keep working when Phase 3 content changes the stage list.
 */
export async function readJourney(request: APIRequestContext): Promise<JourneyMap> {
  const courses = await request.get("/api/courses");
  const courseBody = (await courses.json()) as {
    courses: Array<{ id: string; availableLessonIds: string[] }>;
  };
  const course = courseBody.courses[0];
  if (!course) throw new Error("The course list was empty.");
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
  return { courseId: course.id, lessonId, stageIdByType };
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
