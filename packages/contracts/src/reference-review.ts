import { z } from "zod";
import { ReviewRatingSchema } from "./api.js";
import { TutoringModeSchema } from "./modes.js";

export const ReferenceRecallResultSchema = z.enum([
  "correct",
  "partly_correct",
  "incorrect",
  "unassessed",
]);
export type ReferenceRecallResult = z.infer<typeof ReferenceRecallResultSchema>;

export const ReferenceReviewScheduleSchema = z
  .object({
    cardId: z.string().min(1),
    dueAt: z.string().datetime(),
    intervalDays: z.number().nonnegative(),
    repetition: z.number().int().nonnegative(),
    lastOutcome: z.enum(["correct", "incorrect"]).nullable(),
    lastEvidence: z.enum(["independent", "assisted"]).nullable(),
    independentReviews: z.number().int().nonnegative(),
    assistedReviews: z.number().int().nonnegative(),
    lastReviewedAt: z.string().datetime().nullable(),
    stability: z.number().nonnegative(),
    difficulty: z.number().nonnegative(),
    lapses: z.number().int().nonnegative(),
    phase: z.enum(["new", "learning", "review", "relearning"]),
    learningStep: z.number().int().nonnegative(),
    elapsedDays: z.number().nonnegative(),
    scheduledDays: z.number().nonnegative(),
  })
  .strict();

export const RomanReferenceReviewStateSchema = z
  .object({
    draft: z.string().max(2_000),
    response: z.string().max(2_000).nullable(),
    result: ReferenceRecallResultSchema.nullable(),
    feedback: z.string().min(1).nullable(),
    mode: TutoringModeSchema.nullable(),
    revealed: z.boolean(),
    rating: ReviewRatingSchema.nullable(),
    evidence: z.enum(["independent", "assisted"]).nullable(),
    schedule: ReferenceReviewScheduleSchema.nullable(),
    previousSchedule: ReferenceReviewScheduleSchema.nullable(),
  })
  .strict()
  .superRefine((state, context) => {
    const submitted = state.response !== null;
    if (submitted !== (state.result !== null && state.feedback !== null)) {
      context.addIssue({
        code: "custom",
        message: "Recall assessment must retain its response and feedback.",
      });
    }
    if (state.mode === null && (submitted || state.revealed)) {
      context.addIssue({
        code: "custom",
        message: "Recall mode must lock before submission or reveal.",
      });
    }
    if (state.mode === "exam" && state.revealed && !submitted) {
      context.addIssue({
        code: "custom",
        message: "Exam recall requires a response before reveal.",
      });
    }
    if ((state.rating !== null) !== (state.schedule !== null && state.evidence !== null)) {
      context.addIssue({
        code: "custom",
        message: "A rating must retain its schedule and evidence.",
      });
    }
    if (state.rating !== null && !state.revealed) {
      context.addIssue({ code: "custom", message: "Reveal the card before rating recall." });
    }
  });
export type RomanReferenceReviewState = z.infer<typeof RomanReferenceReviewStateSchema>;

export const RomanReferenceReviewViewSchema = z
  .object({
    front: z.string().min(1),
    back: z.string().min(1).nullable(),
    progress: RomanReferenceReviewStateSchema,
  })
  .strict();

export const RomanReferenceReviewActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update_recall_draft"), draft: z.string().max(2_000) }).strict(),
  z
    .object({
      action: z.literal("submit_recall"),
      response: z.string().trim().min(1).max(2_000),
      mode: TutoringModeSchema,
    })
    .strict(),
  z.object({ action: z.literal("reveal_recall"), mode: TutoringModeSchema }).strict(),
  z.object({ action: z.literal("rate_recall"), rating: ReviewRatingSchema }).strict(),
  z.object({ action: z.literal("restart_recall") }).strict(),
]);
export type RomanReferenceReviewAction = z.infer<typeof RomanReferenceReviewActionSchema>;
