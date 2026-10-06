import {
  SqlProjectSessionSchema,
  SqlProjectsResponseSchema,
  type SqlProjectAction,
  type TutoringMode,
} from "@discere/contracts";
import { requestJson } from "../api/client.js";
export const sqlProjectsKey = (courseId: string) => ["sql-projects", courseId] as const;
export const sqlSessionKey = (id: string) => ["sql-project-session", id] as const;
export const sqlSessionPath = (id: string) => "/sql-projects/" + encodeURIComponent(id);
export async function getSqlProjects(courseId: string) {
  return SqlProjectsResponseSchema.parse(
    await requestJson("/api/courses/" + encodeURIComponent(courseId) + "/sql-projects"),
  );
}
export async function startSqlProject(courseId: string, projectId: string, mode: TutoringMode) {
  return SqlProjectSessionSchema.parse(
    await requestJson(
      "/api/courses/" +
        encodeURIComponent(courseId) +
        "/sql-projects/" +
        encodeURIComponent(projectId),
      { method: "POST", body: JSON.stringify({ mode }) },
    ),
  );
}
export async function getSqlSession(id: string) {
  return SqlProjectSessionSchema.parse(
    await requestJson("/api/sql-projects/" + encodeURIComponent(id)),
  );
}
export async function sendSqlAction(id: string, action: SqlProjectAction) {
  return SqlProjectSessionSchema.parse(
    await requestJson("/api/sql-projects/" + encodeURIComponent(id) + "/actions", {
      method: "POST",
      body: JSON.stringify(action),
    }),
  );
}
