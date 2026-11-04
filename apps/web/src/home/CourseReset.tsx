import type { CourseDetailResponse } from "@discere/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { resetCourseProgress } from "../api/endpoints.js";

/**
 * Starts a course over, so its lessons can be played again from the beginning. It sits in the
 * course overview, under the progress line, and is shown only once the learner has started. It asks once before doing anything, because the places
 * saved in every lesson are lost; XP, review cards and past answers are kept.
 */
export function CourseReset({ detail }: { detail: CourseDetailResponse }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const reset = useMutation({
    mutationFn: () => resetCourseProgress(detail.course.id),
    onSuccess: async () => {
      setConfirming(false);
      // Progress shows on the home screen, the library, this page and every lesson.
      await queryClient.invalidateQueries();
    },
  });
  const started = detail.course.lastActiveAt !== null || detail.course.completedLessonCount > 0;
  if (!started) return null;

  return (
    <div className="course-reset">
      {confirming ? (
        <>
          <p>
            Every lesson in {detail.course.title} will start from the beginning, and lessons you
            finished or tested out of will show as not done. Your XP, review cards and past answers
            are kept.
          </p>
          <div className="button-row">
            <button
              aria-busy={reset.isPending}
              className="button button-danger"
              disabled={reset.isPending}
              onClick={() => reset.mutate()}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} strokeWidth={1.8} />
              Start again
            </button>
            <button
              className="button button-quiet"
              onClick={() => setConfirming(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button className="course-reset-open" onClick={() => setConfirming(true)} type="button">
          <RotateCcw aria-hidden="true" size={15} strokeWidth={1.8} />
          Start the course again…
        </button>
      )}
      {reset.error ? (
        <p className="course-reset-error" role="alert">
          {errorMessage(reset.error, "The course could not be reset.")}
        </p>
      ) : null}
    </div>
  );
}
