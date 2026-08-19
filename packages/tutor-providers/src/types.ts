import type { TutorOperation } from "@discere/contracts";
import type { PromptName } from "@discere/prompts";
import type { WritingContext } from "@discere/writing-engine";

export interface TutorRequest<TPayload = unknown> {
  operation: TutorOperation;
  requestId: string;
  payload: TPayload;
}

export interface TutorResponse<TPayload = unknown> {
  protocolVersion: "0.2";
  operation: TutorOperation;
  requestId: string;
  generatedAt: string;
  payload: TPayload;
  modelNotes?: string[];
  /** Identifies the underlying conversation when the provider can be resumed. */
  sessionId?: string;
}

/**
 * Names one generated field the writing engine must approve before the provider returns.
 * The caller owns the rules because only it knows which answer a mode keeps hidden.
 */
export interface TutorLintTarget {
  /** Dot path into the generated payload, for example `answer` or `hints.0`. */
  path: string;
  context: WritingContext;
  /** Answer text the active tutoring mode forbids the response from revealing. */
  hiddenAnswer?: string;
}

/**
 * An image the model must look at, such as the PNG a learner exported from the notebook.
 * The bytes travel with the request because a provider may need to place them on disk for a
 * command-line tool, and nothing outside the workspace should have to serve them.
 */
export interface TutorImageAttachment {
  /** Name the file is given. Only the base name is used, and it is sanitised. */
  filename: string;
  data: Uint8Array;
}

export interface TutorGenerateOptions {
  /**
   * JSON Schema describing the payload the model must return. Providers that constrain
   * generation use it directly; the others ignore it.
   */
  outputSchema?: unknown;
  /**
   * Images attached to this generation. A provider that cannot attach images must not
   * pretend it did; the caller checks the result instead of assuming one was read.
   */
  images?: readonly TutorImageAttachment[];
  /** Prompt asset reproduced as the system prompt. Defaults to `tutor-system`. */
  systemPrompt?: PromptName;
  /** Extra instruction lines placed above the reproduced prompt asset. */
  extraInstructions?: readonly string[];
  /** Zod-style parser applied to the returned payload before any lint runs. */
  parsePayload?: (value: unknown) => unknown;
  /** Fields the writing engine must approve. A hard violation triggers one repair pass. */
  lintTargets?: readonly TutorLintTarget[];
  /** Wall-clock budget for one generation, in milliseconds. */
  timeoutMs?: number;
  /** Resumes an earlier conversation instead of starting a new one. */
  sessionId?: string;
  /** Cancels an in-flight generation. */
  signal?: AbortSignal;
  /** Total attempts for one generation, including the first. */
  maxAttempts?: number;
}

export interface TutorProvider {
  readonly id: string;
  readonly label: string;
  /** True when the provider produces a reply in process rather than by learner copy/paste. */
  readonly generatesInProcess: boolean;
  generate<TRequest, TResponse>(
    request: TutorRequest<TRequest>,
    options?: TutorGenerateOptions,
  ): Promise<TutorResponse<TResponse>>;
}
