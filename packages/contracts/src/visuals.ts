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

export const SingleResistorCircuitDiagramSpecSchema = z
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
export type SingleResistorCircuitDiagramSpec = z.infer<typeof SingleResistorCircuitDiagramSpecSchema>;

export const SeriesCircuitDiagramSpecSchema = z
  .object({
    id: z.string().min(1),
    kind: z.literal("series"),
    voltage: z.number().positive(),
    resistances: z.array(z.number().positive()).min(2).max(4),
    showCurrentArrow: z.boolean().default(true),
    showValues: z.boolean().default(true),
    batteryLabel: z.string().default("Battery"),
    resistorLabels: z.array(z.string().min(1)).min(2).max(4),
  })
  .strict()
  .refine((value) => value.resistorLabels.length === value.resistances.length, {
    message: "Every series resistor needs a label.",
  });
export type SeriesCircuitDiagramSpec = z.infer<typeof SeriesCircuitDiagramSpecSchema>;

export const CircuitDiagramSpecSchema = z.union([
  SingleResistorCircuitDiagramSpecSchema,
  SeriesCircuitDiagramSpecSchema,
]);
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

/**
 * One reviewable configuration of a lesson's visual. States are authored data, not animation:
 * ADR-0002 requires every technical diagram a learner sees to be a deterministic render of
 * checked values. Interpolating between two states is presentation, and every frame it passes
 * through lies on the straight line between two configurations that were reviewed.
 *
 * Parameters are numeric so they can be interpolated at all; a flag is 0 or 1 and snaps at the
 * midpoint rather than being drawn half-on.
 */
export const VisualStateSchema = z
  .object({
    id: z.string().min(1),
    params: z.record(z.string(), z.number()),
    /** What this state shows, read out when the visual changes. */
    caption: z.string().min(1),
  })
  .strict();
export type VisualState = z.infer<typeof VisualStateSchema>;

export const VisualSequenceSchema = z
  .object({
    visualId: z.string().min(1),
    states: z.array(VisualStateSchema).min(1),
  })
  .strict();
export type VisualSequence = z.infer<typeof VisualSequenceSchema>;

/** Flags are held as 0 or 1; anything at or above the midpoint counts as on. */
export function flagFromParam(value: number | undefined, fallback: boolean): boolean {
  return value === undefined ? fallback : value >= 0.5;
}

/**
 * The straight-line blend of two states at `fraction`. A key present in only one state holds
 * its own value rather than being interpolated from zero, which would make a diagram pass
 * through a configuration nobody authored.
 */
export function blendVisualParams(
  from: Record<string, number>,
  to: Record<string, number>,
  fraction: number,
): Record<string, number> {
  const clamped = Math.max(0, Math.min(1, fraction));
  const blended: Record<string, number> = { ...from };
  for (const [key, target] of Object.entries(to)) {
    const start = from[key];
    blended[key] = start === undefined ? target : start + (target - start) * clamped;
  }
  return blended;
}
