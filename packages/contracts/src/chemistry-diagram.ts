import { z } from "zod";
export const ChemicalSpeciesSchema = z.enum([
  "H2",
  "O2",
  "N2",
  "H2O",
  "CO2",
  "CH4",
  "NH3",
  "HCl",
  "NaCl",
  "MgCl2",
  "CaCl2",
  "Al2O3",
  "MgO",
  "Na2O",
  "Mg",
]);
export const ChemicalReactionSchema = z.enum(["water", "ammonia", "methane", "magnesium"]);
export const ChemistryModelSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("atom"),
      protons: z.number().int().min(1).max(18),
      neutrons: z.number().int().min(0).max(24),
      electrons: z.number().int().min(0).max(18),
    })
    .strict(),
  z
    .object({
      kind: z.literal("formula"),
      species: ChemicalSpeciesSchema,
      copies: z.number().int().min(1).max(6),
    })
    .strict(),
  z
    .object({
      kind: z.literal("ionic"),
      cation: z.enum(["Na", "Mg", "Al", "Ca"]),
      anion: z.enum(["Cl", "O"]),
      positive: z.number().int().min(1).max(4),
      negative: z.number().int().min(1).max(4),
    })
    .strict(),
  z
    .object({ kind: z.literal("lewis"), species: z.enum(["H2", "O2", "N2", "H2O", "NH3", "CH4"]) })
    .strict(),
  z
    .object({
      kind: z.literal("amount"),
      species: ChemicalSpeciesSchema,
      moles: z
        .number()
        .min(0.25)
        .max(6)
        .refine((n) => Number.isInteger(n * 4), "The amount drawing uses quarter-mole blocks."),
    })
    .strict(),
  z
    .object({
      kind: z.literal("reaction"),
      reaction: ChemicalReactionSchema,
      coefficients: z.array(z.number().int().min(1).max(6)).min(3).max(4),
    })
    .strict()
    .refine(
      (m) => m.coefficients.length === (m.reaction === "methane" ? 4 : 3),
      "Coefficient count must match the reaction.",
    ),
  z
    .object({
      kind: z.literal("batch"),
      reaction: ChemicalReactionSchema,
      supplies: z.tuple([z.number().int().min(1).max(12), z.number().int().min(1).max(12)]),
    })
    .strict(),
]);
export const ChemistryDiagramSchema = z
  .object({
    type: z.literal("chemistry_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).max(60),
            model: ChemistryModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1),
  })
  .strict()
  .refine(
    (s) =>
      new Set(s.cases.map((c) => c.id)).size === s.cases.length &&
      s.cases.some((c) => c.id === s.initialCaseId),
    "Use distinct cases and an available initial case.",
  );
export type ChemicalSpecies = z.infer<typeof ChemicalSpeciesSchema>;
export type ChemicalReaction = z.infer<typeof ChemicalReactionSchema>;
export type ChemistryModel = z.infer<typeof ChemistryModelSchema>;
export type ChemistryDiagram = z.infer<typeof ChemistryDiagramSchema>;
