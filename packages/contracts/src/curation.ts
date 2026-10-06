import { z } from "zod";

export const ClaimCitationSchema = z
  .object({
    claim: z.string().trim().min(10),
    sourceId: z.string().min(1),
    section: z.string().trim().min(1),
    targetKind: z.enum(["step", "question", "flashcard"]),
    targetId: z.string().min(1),
  })
  .strict();
export type ClaimCitation = z.infer<typeof ClaimCitationSchema>;

export const LessonAuthoringMetadataSchema = z
  .object({
    lessonId: z.string().min(1),
    prerequisiteLessonIds: z.array(z.string().min(1)),
    citations: z.array(ClaimCitationSchema),
    uncertainty: z.array(z.string().trim().min(1)),
  })
  .strict();

export const EditorialApprovalSchema = z
  .object({
    decision: z.enum(["pending", "accepted", "rejected"]),
    reviewer: z.string().trim().min(1),
    reviewedAt: z.string().datetime(),
    bundleSha256: z.string().regex(/^[a-f0-9]{64}$/),
    factChecks: z.array(z.string().trim().min(10)).min(1),
    acceptedWarnings: z.array(
      z
        .object({
          code: z.string().min(1),
          path: z.string().min(1),
          reason: z.string().trim().min(10),
        })
        .strict(),
    ),
    resolvedUncertainty: z.array(
      z
        .object({
          lessonId: z.string().min(1),
          concern: z.string().min(1),
          resolution: z.string().trim().min(10),
        })
        .strict(),
    ),
    unresolvedIssues: z.array(z.string().min(1)),
    changes: z.array(z.string().trim().min(1)).min(1),
  })
  .strict();
export type EditorialApproval = z.infer<typeof EditorialApprovalSchema>;
