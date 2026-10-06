import {
  PythonProjectSessionSchema,
  PythonProjectsResponseSchema,
  type PythonProjectAction,
  type TutoringMode,
} from "@discere/contracts";
import { requestJson } from "../api/client.js";
export const pythonProjectsKey = (courseId: string) => ["python-projects", courseId] as const;
export const pythonSessionKey = (id: string) => ["python-project-session", id] as const;
export const pythonSessionPath = (id: string) => "/python-projects/" + encodeURIComponent(id);
export async function getPythonProjects(courseId: string) {
  return PythonProjectsResponseSchema.parse(
    await requestJson("/api/courses/" + encodeURIComponent(courseId) + "/python-projects"),
  );
}
export async function startPythonProject(courseId: string, projectId: string, mode: TutoringMode) {
  return PythonProjectSessionSchema.parse(
    await requestJson(
      "/api/courses/" +
        encodeURIComponent(courseId) +
        "/python-projects/" +
        encodeURIComponent(projectId),
      { method: "POST", body: JSON.stringify({ mode }) },
    ),
  );
}
export async function getPythonSession(id: string) {
  return PythonProjectSessionSchema.parse(
    await requestJson("/api/python-projects/" + encodeURIComponent(id)),
  );
}
export async function sendPythonAction(id: string, action: PythonProjectAction) {
  return PythonProjectSessionSchema.parse(
    await requestJson("/api/python-projects/" + encodeURIComponent(id) + "/actions", {
      method: "POST",
      body: JSON.stringify(action),
    }),
  );
}
