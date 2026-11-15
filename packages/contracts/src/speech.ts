import { z } from "zod";

/**
 * Read aloud's voice. Discere reads lessons with Kokoro, a small speech model that runs on the
 * computer itself. The model is downloaded once, the first time it is asked for, into the
 * learner's data folder; until then, or if it cannot be used, the browser's own voice reads.
 */
export const SpeechStatusSchema = z
  .object({
    /**
     * `ready` speaks. `missing` can be downloaded. `installing` is downloading. `failed`
     * stopped and can be tried again. `unavailable` cannot run here at all, with the reason.
     */
    state: z.enum(["ready", "missing", "installing", "failed", "unavailable"]),
    voice: z.string().min(1).max(40),
    /** Download size in bytes, shown before downloading. */
    downloadBytes: z.number().int().nonnegative(),
    /** 0 to 1 while installing. */
    progress: z.number().min(0).max(1).optional(),
    message: z.string().max(600).optional(),
  })
  .strict();
export type SpeechStatus = z.infer<typeof SpeechStatusSchema>;

/** One sentence at a time: the client splits a screen and plays each as it arrives. */
export const SpeechRequestSchema = z.object({ text: z.string().min(1).max(2000) }).strict();
export type SpeechRequest = z.infer<typeof SpeechRequestSchema>;

export const SpeechSentencesRequestSchema = z
  .object({ text: z.string().min(1).max(40_000) })
  .strict();
export const SpeechSentencesResponseSchema = z
  .object({ sentences: z.array(z.string().min(1).max(2000)) })
  .strict();
export type SpeechSentencesResponse = z.infer<typeof SpeechSentencesResponseSchema>;
