import { z } from "zod";
import {
  type AnswerAuthority,
  AnswerAuthoritySchema,
  QuestionChoiceSchema,
  StageTitlesSchema,
} from "./curriculum.js";

/**
 * The authority as a generating model states it. Constrained decoding rejects unions and
 * optional properties, so every field is present and the unused half of the pair is left
 * empty. `toAnswerAuthority` turns it back into the discriminated form the bundle stores.
 */
export const AuthoredAnswerAuthoritySchema = z
  .object({
    kind: z.enum(["numeric", "text"]),
    /** Numeric only. Ignored when kind is text. */
    value: z.number(),
    unit: z.string(),
    workedAnswer: z.string(),
    /** Text only. Ignored when kind is numeric. */
    acceptedIdeas: z.array(z.string()),
    rejectedIdeas: z.array(z.string()),
    exampleAnswer: z.string(),
  })
  .strict();
export type AuthoredAnswerAuthority = z.infer<typeof AuthoredAnswerAuthoritySchema>;

export function toAnswerAuthority(authored: AuthoredAnswerAuthority): AnswerAuthority {
  if (authored.kind === "numeric") {
    return AnswerAuthoritySchema.parse({
      kind: "numeric",
      value: authored.value,
      unit: authored.unit,
      absoluteTolerance: 1e-6,
      relativeTolerance: 0.02,
      workedAnswer: authored.workedAnswer,
    });
  }
  return AnswerAuthoritySchema.parse({
    kind: "text",
    acceptedIdeas: authored.acceptedIdeas,
    rejectedIdeas: authored.rejectedIdeas,
    exampleAnswer: authored.exampleAnswer,
  });
}

export const AuthoredQuestionSchema = z
  .object({
    id: z.string().trim().min(3).max(120),
    prompt: z.string().trim().min(10).max(1_000),
    responseType: z.enum(["numeric", "short_text", "long_text"]),
    difficulty: z.number().min(0.5).max(2),
    hints: z.array(z.string().trim().min(5).max(400)).min(1).max(4),
    answerAuthority: AuthoredAnswerAuthoritySchema,
    /** Empty unless the question is genuinely answered by selection. */
    choices: z.array(QuestionChoiceSchema).max(5),
  })
  .strict();
export type AuthoredQuestion = z.infer<typeof AuthoredQuestionSchema>;

/**
 * The shape the authoring pipeline asks a model to return for one lesson. It is deliberately
 * narrower than the bundle: identifiers, visual briefs, sources, and activities are decided by
 * the person authoring the course, and only prose, questions, and recall cards are generated.
 */
export const AuthoredLessonDraftSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    orientation: z.string().trim().min(20).max(400),
    explanation: z.string().trim().min(120).max(3_000),
    takeaway: z.string().trim().min(20).max(400),
    reviewLabel: z.string().trim().min(3).max(120),
    nextAction: z.string().trim().min(10).max(300),
    stageTitles: StageTitlesSchema,
    questions: z.array(AuthoredQuestionSchema).min(1).max(6),
    flashcards: z
      .array(
        z
          .object({
            id: z.string().trim().min(3).max(120),
            front: z.string().trim().min(10).max(400),
            back: z.string().trim().min(2).max(600),
            conceptIds: z.array(z.string().min(1)).min(1),
          })
          .strict(),
      )
      .max(6),
    /** Claims the writer could not support from the supplied plan. Never silently dropped. */
    uncertainty: z.array(z.string().trim().max(500)).max(20),
  })
  .strict();
export type AuthoredLessonDraft = z.infer<typeof AuthoredLessonDraftSchema>;
