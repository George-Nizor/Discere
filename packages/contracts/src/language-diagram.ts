import { z } from "zod";

/**
 * Bounded models for the English course. A model holds the text being read and the reading the
 * course adopts (grammatical roles, scansion, rhyme sounds, scene charges). Counts, names and
 * verdicts are derived by `@discere/activity-engine`; the explorer hides every derived result and
 * every analytical layer until the learner has answered.
 */
const text = z.string().min(1).max(240);
const short = z.string().min(1).max(80);

export const LanguageRoleSchema = z.enum([
  "subject",
  "verb",
  "object",
  "complement",
  "modifier",
  "subordinator",
  "conjunction",
  "other",
]);
export const LanguageJoinMarkSchema = z.enum([
  "comma",
  "semicolon",
  "colon",
  "dash",
  "full_stop",
  "comma_conjunction",
]);
export const LanguageMarkSchema = z.enum([
  "ethos",
  "pathos",
  "logos",
  "kairos",
  "anaphora",
  "antithesis",
  "chiasmus",
  "tricolon",
  "alliteration",
  "assonance",
  "metaphor",
  "simile",
  "narration",
  "free_indirect",
  "direct_speech",
  "irony",
]);

const part = z.object({ text: z.string().min(1).max(80), role: LanguageRoleSchema }).strict();
const clause = z
  .object({ kind: z.enum(["independent", "dependent"]), parts: z.array(part).min(1).max(14) })
  .strict();
const span = z
  .object({
    text: z.string().min(1).max(160),
    mark: LanguageMarkSchema.optional(),
    /** Spans sharing a group are joined by an arc once the reading is revealed. */
    group: z
      .string()
      .regex(/^[a-z]$/)
      .optional(),
  })
  .strict();
const syllable = z
  .object({ text: z.string().min(1).max(16), stress: z.boolean(), wordEnd: z.boolean() })
  .strict();
const charge = z.enum(["+", "-"]);

export const LanguageModelSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("clauses"),
      clauses: z.array(clause).min(1).max(4),
      /** A join the learner may swap; only meaningful between the first two clauses. */
      join: z
        .object({
          mark: LanguageJoinMarkSchema,
          conjunction: z.string().min(1).max(12).optional(),
          relation: z.enum(["contrast", "explains", "adds", "cause"]),
        })
        .strict()
        .optional(),
      source: short.optional(),
    })
    .strict()
    .refine((m) => !m.join || m.clauses.length >= 2, "A join needs two clauses."),
  z
    .object({
      kind: z.literal("voice"),
      agent: z.string().min(1).max(60),
      active: z.string().min(1).max(30),
      passive: z.string().min(1).max(30),
      patient: z.string().min(1).max(60),
      tail: z.string().min(1).max(60).optional(),
      display: z.enum(["active", "passive", "agentless"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("compress"),
      segments: z
        .array(
          z
            .object({
              text: z.string().min(1).max(120),
              edit: z.enum(["keep", "cut", "replace"]),
              replacement: z.string().min(1).max(60).optional(),
            })
            .strict()
            .refine(
              (s) => (s.edit === "replace") === Boolean(s.replacement),
              "Replace needs text.",
            ),
        )
        .min(2)
        .max(16),
    })
    .strict(),
  z
    .object({
      kind: z.literal("toulmin"),
      statements: z
        .array(
          z
            .object({
              text,
              role: z.enum(["claim", "grounds", "warrant", "backing", "qualifier", "rebuttal"]),
            })
            .strict(),
        )
        .min(2)
        .max(6),
    })
    .strict()
    .refine(
      (m) => m.statements.filter((s) => s.role === "claim").length === 1,
      "An argument has exactly one claim.",
    ),
  z
    .object({
      kind: z.literal("passage"),
      source: short,
      lens: z.enum(["appeal", "figure", "sound", "image", "narration", "irony"]),
      lines: z
        .array(z.object({ spans: z.array(span).min(1).max(12) }).strict())
        .min(1)
        .max(8),
    })
    .strict(),
  z
    .object({
      kind: z.literal("scansion"),
      source: short,
      syllables: z.array(syllable).min(4).max(16),
    })
    .strict()
    .refine((m) => m.syllables.at(-1)!.wordEnd, "The last syllable ends a word."),
  z
    .object({
      kind: z.literal("sonnet"),
      source: short,
      lines: z
        .array(
          z
            .object({
              text: z.string().min(1).max(80),
              sound: z.string().regex(/^[a-z]{1,8}$/),
            })
            .strict(),
        )
        .length(14),
      /** The line on which the argument turns, shown only after the learner answers. */
      turn: z.number().int().min(2).max(14),
    })
    .strict(),
  z
    .object({
      kind: z.literal("irony"),
      source: short,
      speaker: z.string().min(1).max(40),
      line: text,
      said: text,
      known: text,
      knower: z.enum(["audience", "speaker", "reader"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("arc"),
      title: short,
      scenes: z
        .array(
          z
            .object({
              label: z.string().min(1).max(40),
              rise: z.number().min(0).max(10),
              opens: charge,
              closes: charge,
            })
            .strict(),
        )
        .min(3)
        .max(9),
    })
    .strict(),
]);

export const LanguageDiagramSchema = z
  .object({
    type: z.literal("language_explorer"),
    cases: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1).max(70),
            model: LanguageModelSchema,
          })
          .strict(),
      )
      .min(2)
      .max(3),
    initialCaseId: z.string().min(1),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.cases.map((c) => c.id)).size === v.cases.length &&
      v.cases.some((c) => c.id === v.initialCaseId),
    "Use unique cases and an available initial case.",
  );
export type LanguageModel = z.infer<typeof LanguageModelSchema>;
export type LanguageDiagram = z.infer<typeof LanguageDiagramSchema>;
export type LanguageRole = z.infer<typeof LanguageRoleSchema>;
export type LanguageJoinMark = z.infer<typeof LanguageJoinMarkSchema>;
export type LanguageMark = z.infer<typeof LanguageMarkSchema>;
