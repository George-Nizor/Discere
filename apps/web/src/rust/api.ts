import {
  RustProjectSessionSchema,
  RustProjectsResponseSchema,
  RustRunResultSchema,
  RustStatusSchema,
  RustTaskRunSchema,
  type RustProjectAction,
  type TutoringMode,
} from "@discere/contracts";
import { requestJson } from "../api/client.js";

export const rustPlaygroundPath = "/rust/playground";
export const rustProjectsKey = (courseId: string) => ["rust-projects", courseId] as const;
export const rustSessionKey = (id: string) => ["rust-project-session", id] as const;
export const rustSessionPath = (id: string) => "/rust-projects/" + encodeURIComponent(id);
export const rustProjectPath = (courseId: string, projectId: string) =>
  "/courses/" + encodeURIComponent(courseId) + "/rust-projects/" + encodeURIComponent(projectId);

export async function getRustStatus() {
  return RustStatusSchema.parse(await requestJson("/api/rust/status"));
}
export async function runRust(code: string, stdin = "") {
  return RustRunResultSchema.parse(
    await requestJson("/api/rust/run", {
      method: "POST",
      body: JSON.stringify(stdin ? { code, stdin } : { code }),
    }),
  );
}
export async function getRustProjects(courseId: string) {
  return RustProjectsResponseSchema.parse(
    await requestJson("/api/courses/" + encodeURIComponent(courseId) + "/rust-projects"),
  );
}
export async function startRustProject(courseId: string, projectId: string, mode: TutoringMode) {
  return RustProjectSessionSchema.parse(
    await requestJson("/api" + rustProjectPath(courseId, projectId), {
      method: "POST",
      body: JSON.stringify({ mode }),
    }),
  );
}
export async function getRustSession(id: string) {
  return RustProjectSessionSchema.parse(
    await requestJson("/api/rust-projects/" + encodeURIComponent(id)),
  );
}
export async function sendRustAction(id: string, action: RustProjectAction) {
  return RustProjectSessionSchema.parse(
    await requestJson("/api/rust-projects/" + encodeURIComponent(id) + "/actions", {
      method: "POST",
      body: JSON.stringify(action),
    }),
  );
}
/** Runs a lesson code answer on its visible example. Nothing is marked or recorded. */
export async function runQuestionCode(questionId: string, code: string) {
  return RustTaskRunSchema.parse(
    await requestJson("/api/questions/" + encodeURIComponent(questionId) + "/run", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  );
}
