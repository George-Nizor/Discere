import {
  HomeResponseSchema,
  LessonResponseSchema,
  NotebookPageSchema,
  TransferStateResponseSchema,
  TransferSubmitResponseSchema,
  TutorReplyDraftSchema,
  WorkingsReviewDraftSchema,
  type AttemptRequest,
  type AttemptResponse,
  type HintResponse,
  type HomeResponse,
  type LessonResponse,
  type NotebookPage,
  type NotebookSaveRequest,
  type RevealConfirmResponse,
  type RevealStartResponse,
  type TransferStateResponse,
  type TransferSubmitRequest,
  type TransferSubmitResponse,
  type TutorReplyDraft,
  type TutorReplyRequest,
  type TutoringMode,
  type WorkingsReviewDraft,
  type WorkingsReviewRequest,
} from "@discere/contracts";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "content-type": "application/json", ...init?.headers },
    ...init,
  });
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String(body.message)
        : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return body as T;
}

export interface CompanionPacket {
  filename: string;
  text: string;
  requestId: string;
  operation: "tutor_reply";
}

export interface WorkingsReviewPacket {
  filename: string;
  text: string;
  requestId: string;
  operation: "workings_review";
  expectedFilename: string;
}

export interface CompanionIssue {
  field: string;
  code: string;
  severity: "hard" | "warning";
  message: string;
}

export interface TutorReplyImportResult {
  accepted: boolean;
  operation: "tutor_reply";
  requestId: string;
  issues: CompanionIssue[];
  reply: TutorReplyDraft;
}

export interface WorkingsReviewImportResult {
  accepted: boolean;
  operation: "workings_review";
  requestId: string;
  issues: CompanionIssue[];
  review: WorkingsReviewDraft;
}

export async function getHome(): Promise<HomeResponse> {
  return HomeResponseSchema.parse(await requestJson<unknown>("/api/home"));
}

export async function getCurrentLesson(): Promise<LessonResponse> {
  return LessonResponseSchema.parse(await requestJson<unknown>("/api/lessons/current"));
}

export async function getNotebookPage(lessonId: string): Promise<NotebookPage> {
  return NotebookPageSchema.parse(
    await requestJson<unknown>(`/api/notebook/${encodeURIComponent(lessonId)}`),
  );
}

export async function saveNotebookPage(
  lessonId: string,
  input: NotebookSaveRequest,
): Promise<NotebookPage> {
  return NotebookPageSchema.parse(
    await requestJson<unknown>(`/api/notebook/${encodeURIComponent(lessonId)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  );
}

export async function submitAttempt(
  input: AttemptRequest & { attemptId?: string },
): Promise<AttemptResponse> {
  return requestJson("/api/attempts", { method: "POST", body: JSON.stringify(input) });
}

export async function requestHint(attemptId: string): Promise<HintResponse> {
  return requestJson(`/api/attempts/${attemptId}/hints`, { method: "POST", body: "{}" });
}

export async function startReveal(
  attemptId: string,
  reason: string,
): Promise<RevealStartResponse> {
  return requestJson(`/api/attempts/${attemptId}/reveal/start`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function confirmReveal(
  attemptId: string,
  token: string,
  confirmation: string,
): Promise<RevealConfirmResponse> {
  return requestJson(`/api/attempts/${attemptId}/reveal/confirm`, {
    method: "POST",
    body: JSON.stringify({ token, confirmation }),
  });
}

export async function getTransferState(attemptId: string): Promise<TransferStateResponse> {
  return TransferStateResponseSchema.parse(
    await requestJson<unknown>(`/api/attempts/${attemptId}/transfer`),
  );
}

export async function submitTransferResponse(
  attemptId: string,
  input: TransferSubmitRequest,
): Promise<TransferSubmitResponse> {
  return TransferSubmitResponseSchema.parse(
    await requestJson<unknown>(`/api/attempts/${attemptId}/transfer`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function createTutorReplyPacket(
  input: TutorReplyRequest,
): Promise<CompanionPacket> {
  return requestJson("/api/tutor/companion/packets", {
    method: "POST",
    body: JSON.stringify({ operation: "tutor_reply", payload: input }),
  });
}

export async function importTutorReply(
  text: string,
  mode: TutoringMode,
  expectedRequestId: string,
): Promise<TutorReplyImportResult> {
  const result = await requestJson<TutorReplyImportResult>("/api/tutor/companion/import", {
    method: "POST",
    body: JSON.stringify({ text, mode }),
  });
  if (result.requestId !== expectedRequestId) {
    throw new Error(
      "This response belongs to a different tutor request. Copy the latest prompt and try again.",
    );
  }
  return { ...result, reply: TutorReplyDraftSchema.parse(result.reply) };
}

export async function createWorkingsReviewPacket(
  input: WorkingsReviewRequest,
): Promise<WorkingsReviewPacket> {
  return requestJson("/api/tutor/workings/packets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function importWorkingsReview(input: {
  text: string;
  mode: TutoringMode;
  lessonId: string;
  expectedRequestId: string;
}): Promise<WorkingsReviewImportResult> {
  const result = await requestJson<WorkingsReviewImportResult>(
    "/api/tutor/workings/import",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return { ...result, review: WorkingsReviewDraftSchema.parse(result.review) };
}

export async function createImagePrompt(visualBriefId: string): Promise<{ prompt: string }> {
  return requestJson("/api/visuals/image-prompt", {
    method: "POST",
    body: JSON.stringify({ visualBriefId }),
  });
}
