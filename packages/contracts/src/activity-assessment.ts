import { z } from "zod";
import { TutoringModeSchema } from "./modes.js";
export const ActivityAttemptRequestSchema = z
  .object({
    activityId: z.string().min(1),
    attemptId: z.string().min(1).optional(),
    mode: TutoringModeSchema,
    response: z.union([
      z.string().min(1).max(200),
      z.array(z.string().min(1).max(200)).min(3).max(8),
      z.object({ x: z.number(), y: z.number() }).strict(),
    ]),
  })
  .strict();
export type ActivityAttemptRequest = z.infer<typeof ActivityAttemptRequestSchema>;
export const ActivityAttemptResponseSchema = z
  .object({
    attemptId: z.string().min(1),
    correct: z.boolean(),
    xpGained: z.number().int().nonnegative().optional(),
    explanation: z.string(),
    firstMisplacedId: z.string().optional(),
  })
  .strict();
export type ActivityAttemptResponse = z.infer<typeof ActivityAttemptResponseSchema>;
