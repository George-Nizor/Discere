import { z } from "zod";

export const TutoringModeSchema = z.enum(["coach", "assisted", "direct", "exam"]);
export type TutoringMode = z.infer<typeof TutoringModeSchema>;

export const AssuranceLevelSchema = z.enum([
  "curated_validated",
  "source_backed",
  "generated",
  "exploratory",
]);
export type AssuranceLevel = z.infer<typeof AssuranceLevelSchema>;

export const ConceptStateSchema = z.enum([
  "locked",
  "available",
  "discovered",
  "practised",
  "retained",
  "mastered",
]);
export type ConceptState = z.infer<typeof ConceptStateSchema>;
