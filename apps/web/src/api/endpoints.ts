import {
  type ActivityResponse,
  ActivityResponseSchema,
  type AttemptRequest,
  type AttemptResponse,
  type CourseDetailResponse,
  CourseDetailResponseSchema,
  type CourseListResponse,
  CourseListResponseSchema,
  type EssayAssessmentResponse,
  EssayAssessmentResponseSchema,
  type EssayDraftResponse,
  EssayDraftResponseSchema,
  type EssaySubmitResponse,
  EssaySubmitResponseSchema,
  type HintResponse,
  type HomeResponse,
  HomeResponseSchema,
  type JourneyProgress,
  JourneyProgressResponseSchema,
  type JourneyResponse,
  JourneyResponseSchema,
  type NotebookPage,
  NotebookPageSchema,
  type NotebookSaveRequest,
  type RevealConfirmResponse,
  type RevealStartResponse,
  type ReviewHomeResponse,
  ReviewHomeResponseSchema,
  type ReviewRateRequest,
  type ReviewRateResponse,
  ReviewRateResponseSchema,
  type ReviewRevealResponse,
  ReviewRevealResponseSchema,
  type ReviewSessionResponse,
  ReviewSessionResponseSchema,
  type StageProgressUpdate,
  type TransferStateResponse,
  TransferStateResponseSchema,
  type TransferSubmitRequest,
  type TransferSubmitResponse,
  TransferSubmitResponseSchema,
  type TutorAskRequest,
  type TutorAskResponse,
  TutorAskResponseSchema,
  type IllustrationRequest,
  type IllustrationResponse,
  IllustrationResponseSchema,
  type TutorProbeResponse,
  TutorProbeResponseSchema,
  type TutorStatus,
  TutorStatusSchema,
  type TutorIssue,
  type TutoringMode,
  type TutorReplyDraft,
  TutorReplyDraftSchema,
  type WorkingsReviewResponse,
  WorkingsReviewResponseSchema,
} from "@discere/contracts";
import { requestJson } from "./client.js";

const encode = encodeURIComponent;

function journeyBase(courseId: string, lessonId: string): string {
  return `/api/courses/${encode(courseId)}/lessons/${encode(lessonId)}`;
}

export async function getActivity(): Promise<ActivityResponse> {
  return ActivityResponseSchema.parse(await requestJson<unknown>("/api/progress/activity"));
}

export async function getHome(): Promise<HomeResponse> {
  return HomeResponseSchema.parse(await requestJson<unknown>("/api/home"));
}

export async function getCourses(): Promise<CourseListResponse> {
  return CourseListResponseSchema.parse(await requestJson<unknown>("/api/courses"));
}

export async function getCourseDetail(courseId: string): Promise<CourseDetailResponse> {
  return CourseDetailResponseSchema.parse(
    await requestJson<unknown>(`/api/courses/${encode(courseId)}`),
  );
}

export async function getJourney(courseId: string, lessonId: string): Promise<JourneyResponse> {
  return JourneyResponseSchema.parse(
    await requestJson<unknown>(`${journeyBase(courseId, lessonId)}/journey`),
  );
}

export async function getJourneyProgress(
  courseId: string,
  lessonId: string,
): Promise<JourneyProgress> {
  return JourneyProgressResponseSchema.parse(
    await requestJson<unknown>(`${journeyBase(courseId, lessonId)}/progress`),
  );
}

export async function saveJourneyProgress(
  courseId: string,
  lessonId: string,
  input: StageProgressUpdate,
): Promise<JourneyProgress> {
  return JourneyProgressResponseSchema.parse(
    await requestJson<unknown>(`${journeyBase(courseId, lessonId)}/progress`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  );
}

export async function getEssayDraft(essayId: string): Promise<EssayDraftResponse> {
  return EssayDraftResponseSchema.parse(
    await requestJson<unknown>(`/api/essays/${encode(essayId)}`),
  );
}

export async function saveEssayDraft(
  essayId: string,
  content: string,
): Promise<EssayDraftResponse> {
  return EssayDraftResponseSchema.parse(
    await requestJson<unknown>(`/api/essays/${encode(essayId)}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),
  );
}

export async function submitEssay(essayId: string, content: string): Promise<EssaySubmitResponse> {
  return EssaySubmitResponseSchema.parse(
    await requestJson<unknown>(`/api/essays/${encode(essayId)}/submit`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  );
}

export async function requestEssayAssessment(
  essayId: string,
  mode: TutoringMode,
): Promise<EssayAssessmentResponse> {
  return EssayAssessmentResponseSchema.parse(
    await requestJson<unknown>(`/api/essays/${encode(essayId)}/assess`, {
      method: "POST",
      body: JSON.stringify({ mode }),
    }),
  );
}

export async function getEssayAssessment(essayId: string): Promise<EssayAssessmentResponse> {
  return EssayAssessmentResponseSchema.parse(
    await requestJson<unknown>(`/api/essays/${encode(essayId)}/assessment`),
  );
}

export async function getReviewHome(): Promise<ReviewHomeResponse> {
  return ReviewHomeResponseSchema.parse(await requestJson<unknown>("/api/review"));
}

export async function createReviewSession(): Promise<ReviewSessionResponse> {
  return ReviewSessionResponseSchema.parse(
    await requestJson<unknown>("/api/review/sessions", { method: "POST", body: "{}" }),
  );
}

export async function getReviewSession(sessionId: string): Promise<ReviewSessionResponse> {
  return ReviewSessionResponseSchema.parse(
    await requestJson<unknown>(`/api/review/sessions/${encode(sessionId)}`),
  );
}

export async function revealReviewSession(sessionId: string): Promise<ReviewRevealResponse> {
  return ReviewRevealResponseSchema.parse(
    await requestJson<unknown>(`/api/review/sessions/${encode(sessionId)}/reveal`, {
      method: "POST",
      body: "{}",
    }),
  );
}

export async function rateReviewSession(
  sessionId: string,
  input: ReviewRateRequest,
): Promise<ReviewRateResponse> {
  return ReviewRateResponseSchema.parse(
    await requestJson<unknown>(`/api/review/sessions/${encode(sessionId)}/rate`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function submitAttempt(
  input: AttemptRequest & { attemptId?: string },
): Promise<AttemptResponse> {
  return requestJson<AttemptResponse>("/api/attempts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function requestHint(attemptId: string): Promise<HintResponse> {
  return requestJson<HintResponse>(`/api/attempts/${encode(attemptId)}/hints`, {
    method: "POST",
    body: "{}",
  });
}

export async function startReveal(attemptId: string, reason: string): Promise<RevealStartResponse> {
  return requestJson<RevealStartResponse>(`/api/attempts/${encode(attemptId)}/reveal/start`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function confirmReveal(
  attemptId: string,
  token: string,
  confirmation: string,
): Promise<RevealConfirmResponse> {
  return requestJson<RevealConfirmResponse>(`/api/attempts/${encode(attemptId)}/reveal/confirm`, {
    method: "POST",
    body: JSON.stringify({ token, confirmation }),
  });
}

export async function getTransferState(attemptId: string): Promise<TransferStateResponse> {
  return TransferStateResponseSchema.parse(
    await requestJson<unknown>(`/api/attempts/${encode(attemptId)}/transfer`),
  );
}

export async function submitTransfer(
  attemptId: string,
  input: TransferSubmitRequest,
): Promise<TransferSubmitResponse> {
  return TransferSubmitResponseSchema.parse(
    await requestJson<unknown>(`/api/attempts/${encode(attemptId)}/transfer`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

/** Asks for a picture. Returns immediately; the drawing itself takes a couple of minutes. */
export async function startIllustration(
  input: IllustrationRequest,
): Promise<IllustrationResponse> {
  return IllustrationResponseSchema.parse(
    await requestJson<unknown>("/api/illustrations", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function getIllustration(key: string): Promise<IllustrationResponse> {
  return IllustrationResponseSchema.parse(
    await requestJson<unknown>(`/api/illustrations/${encodeURIComponent(key)}`),
  );
}

export async function getTutorStatus(): Promise<TutorStatus> {
  return TutorStatusSchema.parse(await requestJson<unknown>("/api/tutor/status"));
}

/** Spends one real generation on purpose: only a round trip proves the link is up. */
export async function probeTutor(): Promise<TutorProbeResponse> {
  return TutorProbeResponseSchema.parse(
    await requestJson<unknown>("/api/tutor/probe", { method: "POST" }),
  );
}

export async function askTutor(input: TutorAskRequest): Promise<TutorAskResponse> {
  return TutorAskResponseSchema.parse(
    await requestJson<unknown>("/api/tutor/ask", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export interface TutorImportResult {
  accepted: boolean;
  requestId: string;
  issues: TutorIssue[];
  reply: TutorReplyDraft;
}

export async function importTutorReply(input: {
  text: string;
  mode: TutoringMode;
  expectedRequestId: string;
}): Promise<TutorImportResult> {
  const result = await requestJson<TutorImportResult>("/api/tutor/companion/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (result.requestId !== input.expectedRequestId) {
    throw new Error("That reply belongs to a different question. Copy the latest packet again.");
  }
  return { ...result, reply: TutorReplyDraftSchema.parse(result.reply) };
}

export async function getNotebookPage(lessonId: string): Promise<NotebookPage> {
  return NotebookPageSchema.parse(await requestJson<unknown>(`/api/notebook/${encode(lessonId)}`));
}

export async function saveNotebookPage(
  lessonId: string,
  input: NotebookSaveRequest,
): Promise<NotebookPage> {
  return NotebookPageSchema.parse(
    await requestJson<unknown>(`/api/notebook/${encode(lessonId)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  );
}

/**
 * Sends the exported page for review. The image travels with the request because the local
 * server hands it straight to the provider; nothing is uploaded anywhere else.
 */
export async function reviewWorkings(input: {
  lessonId: string;
  reviewQuestion: string;
  mode: TutoringMode;
  image: { filename: string; base64: string };
}): Promise<WorkingsReviewResponse> {
  return WorkingsReviewResponseSchema.parse(
    await requestJson<unknown>("/api/tutor/workings/review", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}
