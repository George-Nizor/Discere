import type { CourseDetailResponse } from "@discere/contracts";

/**
 * What a learner reads before lesson 1: what the subject is, what they will be able to do, and
 * what they need first. It sits under the course overview so it is the first thing in the column
 * and never behind a click.
 */
export function CourseIntroduction({ detail }: { detail: CourseDetailResponse }) {
  const intro = detail.introduction;
  if (!intro) return null;
  return (
    <section className="course-introduction" aria-labelledby="course-introduction-title">
      <h2 id="course-introduction-title">About this course</h2>
      {intro.paragraphs.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <h3>You'll be able to</h3>
      <ul>
        {intro.outcomes.map((outcome) => (
          <li key={outcome}>{outcome.replace(/^You(?:'|’)ll be able to\s+/u, "")}</li>
        ))}
      </ul>
      <p className="course-introduction-meta">{intro.prerequisites}</p>
      <p className="course-introduction-meta">{intro.length}</p>
    </section>
  );
}
