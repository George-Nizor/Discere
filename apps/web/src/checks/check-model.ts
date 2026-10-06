import type { CourseCheckSession } from "@discere/contracts";
import { useQuery } from "@tanstack/react-query";
import { checksKey, getCheckSession, getCourseChecks, sessionKey } from "./api.js";

export type CheckKind = CourseCheckSession["kind"];

/**
 * One name per kind of check in every course. Course bundles have titled the same checkpoint
 * four different ways; the learner should meet one vocabulary.
 */
export const CHECK_NAMES: Record<CheckKind, string> = {
  placement: "Find your starting point",
  checkpoint: "Bring the ideas together",
  transfer: "Use it a week later",
};

/**
 * Lessons a placement shows the learner already knows: every question drawn from the lesson
 * correct, none answered as a guess. Mirrors `placedOutLessonIds` in the server.
 */
export function placedOutLessons(session: CourseCheckSession | undefined): Set<string> {
  const items = session?.result?.items ?? [];
  const byLesson = new Map<string, boolean>();
  for (const item of items) {
    const known = item.correct && item.confidence !== "unsure";
    byLesson.set(item.lessonId, (byLesson.get(item.lessonId) ?? true) && known);
  }
  return new Set([...byLesson].filter(([, known]) => known).map(([id]) => id));
}

/** How a placement went, in words that neither celebrate a low score nor hide it. */
export function placementVerdict(
  correct: number,
  total: number,
): {
  tone: "strong" | "partial" | "start";
  heading: string;
} {
  const share = total ? correct / total : 0;
  if (share >= 0.8) return { tone: "strong", heading: "You already know much of this course" };
  if (correct > 0) return { tone: "partial", heading: "Some of this is familiar" };
  return { tone: "start", heading: "Start from the beginning" };
}

/**
 * The finished placement for a course, if there is one: which lessons it placed the learner
 * out of, and where it suggests starting. Uses the same queries as the checks list.
 */
export function usePlacement(courseId: string): {
  placedOut: Set<string>;
  startLessonId: string | null;
} {
  const checks = useQuery({
    queryKey: checksKey(courseId),
    queryFn: () => getCourseChecks(courseId),
  });
  const placement = checks.data?.checks.find(
    (check) => check.kind === "placement" && check.status === "complete" && check.sessionId,
  );
  const session = useQuery({
    queryKey: sessionKey(placement?.sessionId ?? ""),
    queryFn: () => getCheckSession(placement?.sessionId ?? ""),
    enabled: Boolean(placement?.sessionId),
  });
  return {
    placedOut: placedOutLessons(session.data),
    startLessonId: session.data?.result?.recommendedLessons[0]?.id ?? null,
  };
}
