import {
  CourseChecksResponseSchema,
  CourseCheckSessionSchema,
  type CourseCheckResponseRequest,
} from "@discere/contracts";
import { requestJson } from "../api/client.js";
const e = encodeURIComponent;
export const checksKey = (courseId: string) => ["course-checks", courseId] as const;
export const sessionKey = (id: string) => ["course-check-session", id] as const;
export async function getCourseChecks(courseId: string) {
  return CourseChecksResponseSchema.parse(
    await requestJson("/api/courses/" + e(courseId) + "/checks"),
  );
}
export async function getDueChecks() {
  return CourseChecksResponseSchema.parse(await requestJson("/api/course-checks/due"));
}
export async function startCheck(courseId: string, checkId: string) {
  return CourseCheckSessionSchema.parse(
    await requestJson("/api/courses/" + e(courseId) + "/checks/" + e(checkId) + "/start", {
      method: "POST",
      body: "{}",
    }),
  );
}
export async function getCheckSession(id: string) {
  return CourseCheckSessionSchema.parse(await requestJson("/api/course-check-sessions/" + e(id)));
}
export async function submitCheckResponse(id: string, input: CourseCheckResponseRequest) {
  return CourseCheckSessionSchema.parse(
    await requestJson("/api/course-check-sessions/" + e(id) + "/responses", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}
export const checkPath = (courseId: string, checkId: string) =>
  "/courses/" + e(courseId) + "/checks/" + e(checkId);
export const checkSessionPath = (id: string) => "/course-checks/" + e(id);
