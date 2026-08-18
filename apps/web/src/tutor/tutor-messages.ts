/** Every provider fault gets a plain sentence. Nothing is smoothed over into a fake answer. */
const MESSAGES: Record<string, string> = {
  EXAM_GUARDRAIL: "The tutor stays closed in Exam mode. Change the learning mode to ask again.",
  TUTOR_PROVIDER_TIMEOUT:
    "The tutor did not finish in time and the partial reply was discarded. Try a shorter question.",
  TUTOR_PROVIDER_UNAVAILABLE:
    "The tutor provider is not running on this machine, so no reply was produced.",
  TUTOR_WRITING_GATE:
    "The reply failed the writing quality gate and was withheld rather than shown to you.",
  TUTOR_PROVIDER_ABORTED: "The request stopped before the tutor finished.",
  TUTOR_PROVIDER_FAILED: "The tutor provider failed and produced no reply.",
  NETWORK_UNAVAILABLE: "Discere could not reach the local server.",
};

export function tutorErrorMessage(code: string | null, fallback: string): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  return fallback;
}
