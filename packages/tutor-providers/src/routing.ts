import type { TutorOperation } from "@discere/contracts";

/**
 * Which class of model a generation needs. Routing is decided here, from the request alone,
 * without asking a model: spending tokens to decide whether to spend tokens defeats the point.
 *
 * - `fast`: a small, cheap model (Haiku-class) for short conversational turns and style repairs.
 * - `smart`: a capable model at low effort (Sonnet-class) for anything that reads an image,
 *   judges a learner's work, writes teaching material, or failed once on the fast model.
 */
export type ModelTier = "fast" | "smart";
export type RoutingMode = "auto" | ModelTier;

export interface RoutingInput {
  operation: TutorOperation;
  /** The serialised request the model will read, used only for its length and wording. */
  promptText: string;
  hasImages: boolean;
  /** The learner's question when the request carries one; otherwise read from the prompt. */
  question?: string;
  /** 1 for the first try. A retry after invalid output or a writing-gate failure escalates. */
  attempt: number;
  mode?: RoutingMode;
}

export interface RoutingDecision {
  tier: ModelTier;
  reason: string;
}

/** Operations that judge work or produce lasting material always deserve the stronger model. */
const SMART_OPERATIONS: ReadonlySet<TutorOperation> = new Set([
  "workings_review",
  "assess_response",
  "author_lesson",
  "draft_lesson",
  "direct_visual",
  "review_visual",
]);

/**
 * Wording that signals a question needing a chain of reasoning rather than a nudge: proofs,
 * derivations, comparisons of ideas, "why" about a mechanism. Matched case-insensitively in
 * the learner's question, never in the system prompt.
 */
const DEEP_QUESTION =
  /\b(prove|proof|derive|derivation|why does|why is|why do|explain why|compare|contrast|difference between|intuition|counter-?example|what if|generali[sz]e|step by step|walk me through)\b/i;

/** Beyond this the request carries a long passage or a long thread; Haiku is a false economy. */
const LONG_PROMPT_CHARS = 9_000;
const LONG_QUESTION_CHARS = 280;

/** The learner's own question inside a tutor request, when the payload carries one. */
export function learnerQuestion(promptText: string): string {
  const match = /"(?:question|learnerQuestion|message)"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(promptText);
  return match?.[1] ?? "";
}

export function chooseTier(input: RoutingInput): RoutingDecision {
  const mode = input.mode ?? "auto";
  if (mode !== "auto") return { tier: mode, reason: `routing fixed to ${mode}` };
  if (input.attempt > 1) return { tier: "smart", reason: "escalated after a failed attempt" };
  if (input.hasImages) return { tier: "smart", reason: "reads an image" };
  if (SMART_OPERATIONS.has(input.operation))
    return { tier: "smart", reason: `${input.operation} judges or writes material` };
  if (input.operation === "edit_style") return { tier: "fast", reason: "style repair" };
  if (input.promptText.length > LONG_PROMPT_CHARS)
    return { tier: "smart", reason: "long context" };
  const question = input.question ?? learnerQuestion(input.promptText);
  if (question.length > LONG_QUESTION_CHARS)
    return { tier: "smart", reason: "long question" };
  if (DEEP_QUESTION.test(question)) return { tier: "smart", reason: "asks for reasoning" };
  return { tier: "fast", reason: "short tutoring turn" };
}

export function resolveRoutingMode(value: string | undefined): RoutingMode {
  const raw = value?.trim().toLowerCase();
  return raw === "fast" || raw === "smart" ? raw : "auto";
}
