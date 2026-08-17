import { z } from "zod";

export const NotebookPageTypeSchema = z.enum(["blank", "lined", "graph"]);
export type NotebookPageType = z.infer<typeof NotebookPageTypeSchema>;

export const NotebookPointSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    pressure: z.number().min(0).max(1).optional(),
  })
  .strict();
export type NotebookPoint = z.infer<typeof NotebookPointSchema>;

export const NotebookStrokeSchema = z
  .object({
    id: z.string().min(1).max(120),
    width: z.number().min(1).max(20),
    points: z.array(NotebookPointSchema).min(1).max(750),
  })
  .strict();
export type NotebookStroke = z.infer<typeof NotebookStrokeSchema>;

export const NotebookSaveRequestSchema = z
  .object({
    pageType: NotebookPageTypeSchema,
    strokes: z.array(NotebookStrokeSchema).max(300),
    note: z.string().max(4_000),
  })
  .strict();
export type NotebookSaveRequest = z.infer<typeof NotebookSaveRequestSchema>;

export const NotebookPageSchema = NotebookSaveRequestSchema.extend({
  lessonId: z.string().min(1),
  updatedAt: z.string().datetime().nullable(),
}).strict();
export type NotebookPage = z.infer<typeof NotebookPageSchema>;
