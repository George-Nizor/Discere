import { z } from "zod";

export const VisualClassSchema = z.enum([
  "interactive",
  "deterministic_diagram",
  "retrieved_image",
  "generated_illustration",
  "learner_submission",
]);
export type VisualClass = z.infer<typeof VisualClassSchema>;

export const VisualObjectSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    required: z.boolean().default(true),
  })
  .strict();

export const VisualRelationshipSchema = z
  .object({
    subjectId: z.string().min(1),
    relation: z.string().min(1),
    objectId: z.string().min(1),
  })
  .strict();

export const VisualLabelSchema = z
  .object({
    targetObjectId: z.string().min(1),
    text: z.string().min(1),
    exact: z.boolean().default(true),
    renderAsOverlay: z.boolean().default(true),
  })
  .strict();

export const VisualBriefSchema = z
  .object({
    id: z.string().min(1),
    learningPurpose: z.string().min(12),
    visualClass: VisualClassSchema,
    facts: z.array(z.string().min(1)).min(1),
    objects: z.array(VisualObjectSchema).min(1),
    relationships: z.array(VisualRelationshipSchema),
    labels: z.array(VisualLabelSchema),
    units: z.array(z.string()),
    forbiddenElements: z.array(z.string()),
    sourceIds: z.array(z.string()),
    altTextDraft: z.string(),
    verificationChecks: z.array(z.string()),
  })
  .strict();
export type VisualBrief = z.infer<typeof VisualBriefSchema>;

export const CircuitDiagramSpecSchema = z
  .object({
    id: z.string().min(1),
    voltage: z.number().positive(),
    resistance: z.number().positive(),
    showCurrentArrow: z.boolean().default(true),
    showValues: z.boolean().default(true),
    batteryLabel: z.string().default("Battery"),
    resistorLabel: z.string().default("Resistor"),
  })
  .strict();
export type CircuitDiagramSpec = z.infer<typeof CircuitDiagramSpecSchema>;

export const VisualReviewSchema = z
  .object({
    visualId: z.string().min(1),
    reviewer: z.enum(["deterministic", "human", "model_assisted"]),
    status: z.enum(["approved", "changes_required", "rejected"]),
    checks: z.array(
      z
        .object({
          description: z.string().min(1),
          passed: z.boolean(),
          note: z.string().optional(),
        })
        .strict(),
    ),
    reviewedAt: z.string().datetime(),
  })
  .strict();
export type VisualReview = z.infer<typeof VisualReviewSchema>;
