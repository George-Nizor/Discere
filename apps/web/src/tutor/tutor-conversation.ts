import {
  type TutorIssue,
  TutorIssueSchema,
  type TutorReplyDraft,
  TutorReplyDraftSchema,
} from "@discere/contracts";

const STORAGE_VERSION = 2;
const STORAGE_PREFIX = "discere:tutor-conversation:v1:";
const MAX_EXCHANGES = 100;
const MAX_ISSUES_PER_EXCHANGE = 100;

export interface TutorExchange {
  question: string;
  reply: TutorReplyDraft;
  issues: TutorIssue[];
  accepted: boolean;
}

export interface TutorConversation {
  exchanges: TutorExchange[];
  sessionId: string | null;
  sessionContext: string | null;
}

function emptyConversation(): TutorConversation {
  return { exchanges: [], sessionId: null, sessionContext: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseExchange(value: unknown): TutorExchange | null {
  if (!isRecord(value)) return null;
  const { question, accepted, issues: storedIssues, reply: storedReply } = value;
  if (
    typeof question !== "string" ||
    question.trim().length < 2 ||
    question.length > 2_000 ||
    typeof accepted !== "boolean" ||
    !Array.isArray(storedIssues) ||
    storedIssues.length > MAX_ISSUES_PER_EXCHANGE
  ) {
    return null;
  }

  const reply = TutorReplyDraftSchema.safeParse(storedReply);
  if (!reply.success) return null;

  const issues: TutorIssue[] = [];
  for (const issue of storedIssues) {
    const parsed = TutorIssueSchema.safeParse(issue);
    if (!parsed.success) return null;
    issues.push(parsed.data);
  }

  return { question, reply: reply.data, issues, accepted };
}

function parseConversation(value: unknown): TutorConversation | null {
  if (!isRecord(value)) return null;
  const { exchanges: storedExchanges, sessionContext, sessionId, version } = value;
  if (
    (version !== 1 && version !== STORAGE_VERSION) ||
    !Array.isArray(storedExchanges) ||
    storedExchanges.length > MAX_EXCHANGES ||
    (sessionId !== null &&
      (typeof sessionId !== "string" || sessionId.length < 1 || sessionId.length > 200)) ||
    (version === STORAGE_VERSION &&
      sessionContext !== null &&
      (typeof sessionContext !== "string" ||
        sessionContext.length < 1 ||
        sessionContext.length > 200))
  ) {
    return null;
  }

  const exchanges: TutorExchange[] = [];
  for (const exchange of storedExchanges) {
    const parsed = parseExchange(exchange);
    if (!parsed) return null;
    exchanges.push(parsed);
  }

  // Version 1 had no authority fingerprint. Keep its visible transcript, but never resume the
  // opaque provider session across an unknown question or tutoring mode.
  return {
    exchanges,
    sessionId: version === STORAGE_VERSION ? sessionId : null,
    sessionContext:
      version === STORAGE_VERSION && typeof sessionContext === "string" ? sessionContext : null,
  };
}

export function tutorConversationStorageKey(lessonId: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(lessonId)}`;
}

function localBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Tutor history belongs to this browser and lesson. Invalid or stale data is discarded rather
 * than allowed to cross the provider boundary as a session identifier.
 */
export function loadTutorConversation(lessonId: string): TutorConversation {
  const storage = localBrowserStorage();
  if (!storage) return emptyConversation();

  const key = tutorConversationStorageKey(lessonId);
  try {
    const serialized = storage.getItem(key);
    if (serialized === null) return emptyConversation();
    const conversation = parseConversation(JSON.parse(serialized) as unknown);
    if (conversation) return conversation;
    storage.removeItem(key);
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // A blocked storage implementation should not make the tutor unusable.
    }
  }
  return emptyConversation();
}

export function saveTutorConversation(lessonId: string, conversation: TutorConversation): void {
  const storage = localBrowserStorage();
  if (!storage) return;
  try {
    storage.setItem(
      tutorConversationStorageKey(lessonId),
      JSON.stringify({
        version: STORAGE_VERSION,
        exchanges: conversation.exchanges.slice(-MAX_EXCHANGES),
        sessionContext: conversation.sessionContext,
        sessionId: conversation.sessionId,
      }),
    );
  } catch {
    // Full or unavailable storage should leave the live conversation working in memory.
  }
}
