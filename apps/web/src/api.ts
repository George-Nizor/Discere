import { HomeResponseSchema, LessonResponseSchema, type AttemptRequest, type AttemptResponse, type HintResponse, type HomeResponse, type LessonResponse, type RevealConfirmResponse, type RevealStartResponse } from "@discere/contracts";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { "content-type": "application/json", ...init?.headers }, ...init });
  const body = await response.json() as unknown;
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "message" in body ? String(body.message) : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return body as T;
}

export async function getHome(): Promise<HomeResponse> { return HomeResponseSchema.parse(await requestJson<unknown>("/api/home")); }
export async function getCurrentLesson(): Promise<LessonResponse> { return LessonResponseSchema.parse(await requestJson<unknown>("/api/lessons/current")); }
export async function submitAttempt(input: AttemptRequest & { attemptId?: string }): Promise<AttemptResponse> { return requestJson("/api/attempts", { method: "POST", body: JSON.stringify(input) }); }
export async function requestHint(attemptId: string): Promise<HintResponse> { return requestJson(`/api/attempts/${attemptId}/hints`, { method: "POST", body: "{}" }); }
export async function startReveal(attemptId: string, reason: string): Promise<RevealStartResponse> { return requestJson(`/api/attempts/${attemptId}/reveal/start`, { method: "POST", body: JSON.stringify({ reason }) }); }
export async function confirmReveal(attemptId: string, token: string, confirmation: string): Promise<RevealConfirmResponse> { return requestJson(`/api/attempts/${attemptId}/reveal/confirm`, { method: "POST", body: JSON.stringify({ token, confirmation }) }); }
export async function createCompanionPacket(): Promise<{ filename: string; text: string }> { return requestJson("/api/tutor/companion/packets", { method: "POST", body: JSON.stringify({ operation: "draft_lesson" }) }); }
export async function createImagePrompt(visualBriefId: string): Promise<{ prompt: string }> { return requestJson("/api/visuals/image-prompt", { method: "POST", body: JSON.stringify({ visualBriefId }) }); }
