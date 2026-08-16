import { z } from "zod";
import { ActivitySchema, AnswerAuthoritySchema } from "./curriculum.js";
import { VisualBriefSchema } from "./visuals.js";

export const TutorOperationSchema = z.enum([
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
