import type { CourseDetailResponse } from "@discere/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { resetCourseProgress } from "../api/endpoints.js";

/**
 * Starts a course over, so its lessons can be played again from the beginning. Shown only once
 * the learner has started the course. It asks once before doing anything, because the places
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
    <section className="course-reset" aria-labelledby="course-reset-title">
      <h2 id="course-reset-title">Start the course again</h2>
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
        <>
          <p>
            Clears your place in every lesson so you can work through the course from the start.
          </p>
          <div className="button-row">
            <button
              className="button button-quiet"
              onClick={() => setConfirming(true)}
              type="button"
            >
              <RotateCcw aria-hidden="true" size={16} strokeWidth={1.8} />
              Start again…
            </button>
          </div>
        </>
      )}
      {reset.error ? (
        <p className="course-reset-error" role="alert">
          {errorMessage(reset.error, "The course could not be reset.")}
        </p>
      ) : null}
    </section>
  );
}
