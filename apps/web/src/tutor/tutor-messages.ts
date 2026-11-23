/** Every provider fault gets a plain sentence. Nothing is smoothed over into a fake answer. */
const MESSAGES: Record<string, string> = {
  EXAM_GUARDRAIL: "The tutor stays closed in Exam mode. Change the learning mode to ask again.",
  TUTOR_PROVIDER_TIMEOUT:
    "The tutor did not finish in time and the partial reply was discarded. Try a shorter question.",
  TUTOR_PROVIDER_UNAVAILABLE:
    "The tutor provider is not running on this machine, so no reply was produced.",
  TUTOR_WRITING_GATE:
    "The tutor's reply didn't meet Discere's writing rules, so it was held back. Try asking again.",
  TUTOR_ANSWER_WITHHELD:
    "The tutor's reply gave the answer away, so it was held back. Ask about one step, or about a word you're unsure of.",
  TUTOR_PROVIDER_ABORTED: "The request stopped before the tutor finished.",
  TUTOR_PROVIDER_FAILED: "The tutor provider failed and produced no reply.",
  TUTOR_PROVIDER_BUSY: "The tutor is finishing another task. Try again in a moment.",
  TUTOR_SESSION_INVALID: "The tutor conversation expired. Start a new question.",
  NETWORK_UNAVAILABLE:
    "Discere’s engine isn’t responding. Reopen Discere from Instrumenta, then try again.",
};

export function tutorErrorMessage(code: string | null, fallback: string): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  return fallback;
}
