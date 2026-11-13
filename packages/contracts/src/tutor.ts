import { z } from "zod";
import { ActivitySchema, AnswerAuthoritySchema } from "./curriculum.js";
import { TutoringModeSchema } from "./modes.js";
import { VisualBriefSchema } from "./visuals.js";

export const TutorOperationSchema = z.enum([
  "author_lesson",
  "tutor_reply",
  "workings_review",
  "draft_lesson",
  "edit_style",
  "assess_response",
  "direct_visual",
  "review_visual",
]);
export type TutorOperation = z.infer<typeof TutorOperationSchema>;

export const TutorEnvelopeBaseSchema = z
  .object({
    protocolVersion: z.literal("0.2"),
    operation: TutorOperationSchema,
    requestId: z.string().uuid(),
    generatedAt: z.string().datetime(),
    payload: z.unknown(),
    modelNotes: z.array(z.string()).optional(),
  })
  .strict();
export type TutorEnvelopeBase = z.infer<typeof TutorEnvelopeBaseSchema>;

export const TutorReplyRequestSchema = z
  .object({
    question: z.string().trim().min(2).max(2_000),
    mode: TutoringModeSchema,
  })
  .strict();
export type TutorReplyRequest = z.infer<typeof TutorReplyRequestSchema>;

/**
 * One step of a worked example the tutor shows on the lesson's own figure. `figure` is a full
 * figure spec of the same type as the lesson's, with the example's values. The server checks it
 * against the figure schemas and drops any that fail, so the step still reads as text.
 */
export const TutorWalkthroughStepSchema = z
  .object({
    text: z.string().trim().min(1).max(800),
    figure: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type TutorWalkthroughStep = z.infer<typeof TutorWalkthroughStepSchema>;

export const TutorReplyDraftSchema = z
  .object({
    answer: z.string().trim().min(1).max(8_000),
    followUpQuestion: z.string().trim().min(1).max(1_000),
    sourceIds: z.array(z.string().min(1)).max(20),
    uncertainty: z.array(z.string().trim().min(1).max(1_000)).max(20),
    /** Present when the learner asked to be shown: a parallel example, one step per screen. */
    walkthrough: z.array(TutorWalkthroughStepSchema).max(8).optional(),
  })
  .strict();
export type TutorReplyDraft = z.infer<typeof TutorReplyDraftSchema>;

export const WorkingsReviewRequestSchema = z
  .object({
    lessonId: z.string().min(1).max(200),
    reviewQuestion: z.string().trim().min(2).max(2_000),
    mode: TutoringModeSchema,
  })
  .strict();
export type WorkingsReviewRequest = z.infer<typeof WorkingsReviewRequestSchema>;

export const WorkingsAssessmentSchema = z.enum([
  "correct",
  "partly_correct",
  "incorrect",
  "unclear",
]);
export type WorkingsAssessment = z.infer<typeof WorkingsAssessmentSchema>;

export const WorkingsReviewDraftSchema = z
  .object({
    imageReviewed: z.boolean(),
    transcription: z.string().trim().max(8_000),
    transcriptionConfidence: z.number().min(0).max(1),
    assessment: WorkingsAssessmentSchema,
    feedback: z.string().trim().min(1).max(8_000),
    firstMeaningfulError: z.string().trim().min(1).max(2_000).nullable(),
    nextStep: z.string().trim().min(1).max(2_000),
    sourceIds: z.array(z.string().min(1)).max(20),
    uncertainty: z.array(z.string().trim().min(1).max(1_000)).max(20),
  })
  .strict();
export type WorkingsReviewDraft = z.infer<typeof WorkingsReviewDraftSchema>;

/**
 * A workings review asked of a provider that can look at the image itself. The PNG travels
 * with the request because the exported page never leaves the learner's machine, and the
 * provider needs the bytes to attach them.
 */
export const WorkingsReviewGenerateRequestSchema = z
  .object({
    lessonId: z.string().min(1).max(200),
    reviewQuestion: z.string().trim().min(2).max(2_000),
    mode: TutoringModeSchema,
    image: z
      .object({
        filename: z.string().min(1).max(200),
        /** The exported page, base64 encoded. Roughly six megabytes of PNG at the limit. */
        base64: z.string().min(1).max(8_000_000),
      })
      .strict(),
  })
  .strict();
export type WorkingsReviewGenerateRequest = z.infer<typeof WorkingsReviewGenerateRequestSchema>;

export const LessonDraftSchema = z
  .object({
    conceptIds: z.array(z.string()).min(1),
    title: z.string().min(1),
    orientation: z.string().min(1),
    visualBrief: VisualBriefSchema,
    explanation: z.string().min(1),
    activityDraft: ActivitySchema,
    responsePrompt: z.string().min(1),
    answerAuthority: AnswerAuthoritySchema,
    hints: z.array(z.string().min(1)),
    sourceClaimMap: z.array(
      z
        .object({
          claim: z.string().min(1),
          sourceIds: z.array(z.string()).min(1),
        })
        .strict(),
    ),
    uncertainty: z.array(z.string()),
  })
  .strict();
export type LessonDraft = z.infer<typeof LessonDraftSchema>;

/**
 * A single accountability finding raised while a tutor response is validated. The pasted
 * companion reply and the directly generated reply produce the same shape because they run
 * through the same validation core on the server.
 */
export const TutorIssueSchema = z
  .object({
    field: z.string().min(1),
    code: z.string().min(1),
    severity: z.enum(["hard", "warning"]),
    message: z.string().min(1),
  })
  .strict();
export type TutorIssue = z.infer<typeof TutorIssueSchema>;

export const EssayCriterionVerdictSchema = z.enum(["met", "partly_met", "not_met"]);
export type EssayCriterionVerdict = z.infer<typeof EssayCriterionVerdictSchema>;

/** The result for one of a writing task's success criteria. */
export const EssayCriterionResultSchema = z
  .object({
    /** The criterion as the task lists it. */
    criterion: z.string().trim().min(1).max(1_000),
    result: EssayCriterionVerdictSchema,
    /** A short quote from the learner's writing, or one sentence giving the reason. */
    evidence: z.string().trim().min(1).max(1_000),
  })
  .strict();
export type EssayCriterionResult = z.infer<typeof EssayCriterionResultSchema>;

const EssayAssessmentCoreSchema = z
  .object({
    assessment: WorkingsAssessmentSchema,
    summary: z.string().trim().min(1).max(8_000),
    firstMeaningfulError: z.string().trim().min(1).max(2_000).nullable(),
    nextStep: z.string().trim().min(1).max(2_000),
    sourceIds: z.array(z.string().min(1)).max(20),
    uncertainty: z.array(z.string().trim().min(1).max(1_000)).max(20),
  })
  .strict();

/**
 * A stored assessment. `criteria` holds one result per success criterion, in the task's order.
 * It is absent on assessments stored before November 2026 and on a reply whose criteria did not
 * match the task's list, and the overall verdict stands alone then.
 */
export const EssayAssessmentDraftSchema = EssayAssessmentCoreSchema.extend({
  criteria: z.array(EssayCriterionResultSchema).max(20).optional(),
}).strict();

/**
 * The shape asked of a provider. `criteria` is required here because a strict structured-output
 * schema cannot carry an optional property. The server reads the reply leniently all the same.
 */
export const EssayAssessmentReplySchema = EssayAssessmentCoreSchema.extend({
  criteria: z.array(EssayCriterionResultSchema).max(20),
}).strict();

/**
 * Reads a provider's reply. The summary, first error and next step must be valid. Criteria that
 * are missing or malformed are dropped so the overall verdict can still be shown.
 */
export function parseEssayAssessmentReply(value: unknown): EssayAssessmentDraft {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return EssayAssessmentDraftSchema.parse(value);
  }
  const { criteria, ...core } = value as Record<string, unknown>;
  const parsed = EssayAssessmentCoreSchema.parse(core);
  const results = z.array(EssayCriterionResultSchema).max(20).safeParse(criteria);
  return results.success && results.data.length > 0
    ? { ...parsed, criteria: results.data }
    : parsed;
}
export type EssayAssessmentDraft = z.infer<typeof EssayAssessmentDraftSchema>;

/** The reply shape asked of `prompts/style-editor.md` during a targeted repair pass. */
export const StyleEditDraftSchema = z
  .object({
    revisedText: z.string().trim().min(1).max(20_000),
    edits: z.array(z.string().trim().min(1).max(1_000)).max(50),
    unrepaired: z.array(z.string().trim().min(1).max(1_000)).max(50),
    protectedItemsChecked: z.array(z.string().trim().min(1).max(200)).max(100),
  })
  .strict();
export type StyleEditDraft = z.infer<typeof StyleEditDraftSchema>;

export const TutorProviderIdSchema = z.enum([
  "claude",
  "openai-compatible",
  "codex",
  "companion",
  "mock",
]);
export type TutorProviderId = z.infer<typeof TutorProviderIdSchema>;

/**
 * What the owner needs to see to know whether the OpenAI link is live, without reading a log.
 * Deliberately flat: no unions and no optionals, so the same shape can be handed to constrained
 * decoding later without `oneOf` appearing in its JSON Schema. Unknown values are the empty
 * string, `0`, or `false`, and `quotaKnown` says whether the quota fields mean anything.
 */
export const TutorStatusSchema = z
  .object({
    provider: TutorProviderIdSchema,
    /** Empty when the provider follows the account default. */
    model: z.string(),
    /** Reasoning effort the tutor asks for; empty for providers that have no such setting. */
    reasoningEffort: z.string(),
    binaryFound: z.boolean(),
    binaryVersion: z.string(),
    authPresent: z.boolean(),
    queueDepth: z.number().int().min(0),
    lastOutcome: z.enum(["none", "ok", "error"]),
    lastError: z.string(),
    quotaKnown: z.boolean(),
    quotaPlanType: z.string(),
    quotaUsedPercent: z.number(),
    /** Unix seconds at which the current quota window resets; `0` when unknown. */
    quotaResetsAt: z.number().int().min(0),
    /** Model routing for drivers that choose between a fast and a capable model. */
    routing: z
      .object({ mode: z.enum(["auto", "fast", "smart"]), fastModel: z.string(), smartModel: z.string() })
      .strict()
      .optional(),
    /** What the tutor has used since Discere started: calls and, when reported, cost. */
    usage: z
      .object({
        calls: z.number().int().min(0),
        costUsd: z.number().min(0),
        byModel: z.array(
          z
            .object({
              model: z.string(),
              calls: z.number().int().min(0),
              costUsd: z.number().min(0),
              inputTokens: z.number().int().min(0),
              outputTokens: z.number().int().min(0),
            })
            .strict(),
        ),
      })
      .strict()
      .optional(),
  })
  .strict();
export type TutorStatus = z.infer<typeof TutorStatusSchema>;

export const TutorProbeResponseSchema = z
  .object({
    ok: z.boolean(),
    /** Round-trip milliseconds for the live call. */
    durationMs: z.number().int().min(0),
    message: z.string(),
  })
  .strict();
export type TutorProbeResponse = z.infer<typeof TutorProbeResponseSchema>;

export const TutorAskRequestSchema = z
  .object({
    lessonId: z.string().min(1).max(200),
    conceptIds: z.array(z.string().min(1).max(200)).max(20).optional(),
    mode: TutoringModeSchema,
    question: z.string().trim().min(2).max(2_000),
    /** Continues an earlier generated conversation when the provider supports resuming. */
    sessionId: z.string().min(1).max(200).optional(),
    /** Links the exchange to an open attempt so the assistance is recorded against it. */
    attemptId: z.string().uuid().optional(),
    /** An inline or quiz question owned by this lesson. Its answer remains private. */
    questionId: z.string().min(1).max(200).optional(),
    /**
     * `show` asks for a parallel example worked step by step on the lesson's figure, instead of
     * a hint. It is recorded as assistance like any tutor reply.
     */
    intent: z.enum(["ask", "show"]).optional(),
  })
  .strict();
export type TutorAskRequest = z.infer<typeof TutorAskRequestSchema>;

export const TutorAskAnsweredSchema = z
  .object({
    status: z.literal("answered"),
    provider: TutorProviderIdSchema,
    operation: z.literal("tutor_reply"),
    requestId: z.string().uuid(),
    accepted: z.boolean(),
    issues: z.array(TutorIssueSchema),
    reply: TutorReplyDraftSchema,
    sessionId: z.string().min(1).nullable(),
  })
  .strict();

/**
 * The copy/paste provider cannot answer in process. It returns the packet the learner pastes
 * into ChatGPT, so one client flow serves every provider.
 */
export const TutorAskPacketRequiredSchema = z
  .object({
    status: z.literal("packet_required"),
    provider: TutorProviderIdSchema,
    operation: z.literal("tutor_reply"),
    requestId: z.string().uuid(),
    packet: z.object({ filename: z.string().min(1), text: z.string().min(1) }).strict(),
    message: z.string().min(1),
  })
  .strict();

export const TutorAskResponseSchema = z.discriminatedUnion("status", [
  TutorAskAnsweredSchema,
  TutorAskPacketRequiredSchema,
]);
export type TutorAskResponse = z.infer<typeof TutorAskResponseSchema>;

export const WorkingsReviewAnsweredSchema = z
  .object({
    status: z.literal("answered"),
    provider: TutorProviderIdSchema,
    operation: z.literal("workings_review"),
    requestId: z.string().uuid(),
    accepted: z.boolean(),
    issues: z.array(TutorIssueSchema),
    review: WorkingsReviewDraftSchema,
  })
  .strict();

/** The copy/paste provider cannot see an image, so it hands back the packet and the filename
 * the learner must attach in ChatGPT themselves. */
export const WorkingsReviewPacketRequiredSchema = z
  .object({
    status: z.literal("packet_required"),
    provider: TutorProviderIdSchema,
    operation: z.literal("workings_review"),
    requestId: z.string().uuid(),
    packet: z.object({ filename: z.string().min(1), text: z.string().min(1) }).strict(),
    expectedFilename: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

export const WorkingsReviewResponseSchema = z.discriminatedUnion("status", [
  WorkingsReviewAnsweredSchema,
  WorkingsReviewPacketRequiredSchema,
]);
export type WorkingsReviewResponse = z.infer<typeof WorkingsReviewResponseSchema>;

export const EssayAssessmentStatusSchema = z.enum([
  "pending",
  "ready",
  "failed",
  "packet_required",
]);
export type EssayAssessmentStatus = z.infer<typeof EssayAssessmentStatusSchema>;

export const EssayAssessmentResponseSchema = z
  .object({
    essayId: z.string().min(1),
    status: EssayAssessmentStatusSchema,
    provider: TutorProviderIdSchema,
    requestId: z.string().uuid(),
    accepted: z.boolean(),
    assessment: EssayAssessmentDraftSchema.nullable(),
    issues: z.array(TutorIssueSchema),
    error: z.object({ code: z.string().min(1), message: z.string().min(1) }).nullable(),
    packet: z
      .object({ filename: z.string().min(1), text: z.string().min(1) })
      .strict()
      .nullable(),
    updatedAt: z.string().datetime(),
    /** Which submitted version this assesses. Version 1 is the first submission. */
    version: z.number().int().positive().default(1),
  })
  .strict();
export type EssayAssessmentResponse = z.infer<typeof EssayAssessmentResponseSchema>;

/** One earlier submitted version of a writing task, with the assessment it received. */
export const EssayVersionResponseSchema = z
  .object({
    essayId: z.string().min(1),
    version: z.number().int().positive(),
    content: z.string().max(100_000),
    wordCount: z.number().int().nonnegative(),
    submittedAt: z.string().datetime().nullable(),
    assessment: EssayAssessmentResponseSchema.nullable(),
  })
  .strict();
export type EssayVersionResponse = z.infer<typeof EssayVersionResponseSchema>;

export const EssayAssessRequestSchema = z.object({ mode: TutoringModeSchema.optional() }).strict();
export type EssayAssessRequest = z.infer<typeof EssayAssessRequestSchema>;

/**
 * An illustration the tutor drew to show something.
 *
 * Flat and union-free like the rest of the tutor contracts. `status` is the only thing the
 * interface branches on: a picture arrives late, so the first reply is nearly always
 * `generating` and the panel collects it afterwards.
 */
export const IllustrationRequestSchema = z
  .object({
    /** What to draw, in the tutor's own words. Never the learner's raw text. */
    subject: z.string().trim().min(8).max(600),
    /** The alt text, which is also the caption. */
    alt: z.string().trim().min(4).max(300),
    /** Course accent as a CSS hex, so an illustration matches the course it belongs to. */
    accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  })
  .strict();
export type IllustrationRequest = z.infer<typeof IllustrationRequestSchema>;

export const IllustrationResponseSchema = z
  .object({
    key: z.string().min(1),
    status: z.enum(["ready", "generating", "failed"]),
    alt: z.string(),
    /** Same-origin path for the picture. Empty until the status is `ready`. */
    url: z.string(),
    /** Why it failed, when it did. */
    detail: z.string(),
  })
  .strict();
export type IllustrationResponse = z.infer<typeof IllustrationResponseSchema>;
