import { z } from "zod";

/**
 * The toolchains practice code runs on. A Linux checkout sets them up with `pnpm rust:setup`
 * and `pnpm python:setup`. An installed Windows release downloads them once, from inside the
 * app, into the learner's data folder, so they survive updates. SQL practice runs on Python.
 */
export const CodeRuntimeIdSchema = z.enum(["rust", "python"]);
export type CodeRuntimeId = z.infer<typeof CodeRuntimeIdSchema>;

export const CodeRuntimeStateSchema = z
  .object({
    id: CodeRuntimeIdSchema,
    name: z.string().min(1).max(80),
    /**
     * `ready` runs code. `missing` can be installed from the app. `installing` is downloading or
     * unpacking. `failed` stopped and can be tried again. `manual` needs a setup command that
     * only a developer runs, so the app offers no button.
     */
    state: z.enum(["ready", "missing", "installing", "failed", "manual"]),
    /** Download size in bytes, shown before installing. */
    downloadBytes: z.number().int().nonnegative().optional(),
    /** 0 to 1 while installing. */
    progress: z.number().min(0).max(1).optional(),
    message: z.string().max(600).optional(),
  })
  .strict();
export type CodeRuntimeState = z.infer<typeof CodeRuntimeStateSchema>;

export const CodeRuntimesResponseSchema = z
  .object({ runtimes: z.array(CodeRuntimeStateSchema) })
  .strict();
export type CodeRuntimesResponse = z.infer<typeof CodeRuntimesResponseSchema>;
