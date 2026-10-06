import type { ActivityAttemptRequest, ActivityAttemptResponse } from "@discere/contracts";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../api/queries.js";
import { useExperience } from "../../study/experience.js";
import { assessActivity } from "../../api/endpoints.js";
import { useTutoringMode } from "../mode-context.js";

export function useActivityAssessment(activityId: string, onAnswered?: (correct: boolean) => void) {
  const { mode } = useTutoringMode();
  const queryClient = useQueryClient();
  const { play, prepare } = useExperience();
  const inFlight = useRef(false);
  const [outcome, setOutcome] = useState<ActivityAttemptResponse | null>(null);
  const [attemptId, setAttemptId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function check(response: ActivityAttemptRequest["response"]) {
    if (inFlight.current || outcome?.correct) return;
    inFlight.current = true;
    prepare();
    setBusy(true);
    setError(null);
    try {
      const result = await assessActivity({
        activityId,
        response,
        mode,
        ...(attemptId ? { attemptId } : {}),
      });
      setAttemptId(result.attemptId);
      setOutcome(result);
      if (result.correct && (result.xpGained ?? 0) > 0) play("answer");
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      void queryClient.invalidateQueries({ queryKey: queryKeys.study });
      onAnswered?.(result.correct);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "The answer could not be checked. Try again.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { outcome, busy, error, check, clear: () => setOutcome(null) };
}
