import type { CourseSummary } from "@discere/contracts";

export const progressFilters = [
  { id: "all", label: "Any progress" },
  { id: "in-progress", label: "In progress" },
  { id: "not-started", label: "Not started" },
  { id: "completed", label: "Completed" },
] as const;
export type ProgressFilter = (typeof progressFilters)[number]["id"];
export function progressFilter(value: string | null): ProgressFilter {
  return progressFilters.find((filter) => filter.id === value)?.id ?? "all";
}
const normalise = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
export function courseProgress(course: CourseSummary): Exclude<ProgressFilter, "all"> {
  if (course.completedLessonCount >= course.lessonCount) return "completed";
  return course.lastActiveAt || course.completedLessonCount > 0 ? "in-progress" : "not-started";
}
export function filterCourses(
  courses: CourseSummary[],
  query: string,
  subject: string,
  progress: ProgressFilter,
) {
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  return courses.filter((course) => {
    if (course.status !== "available") return false;
    if (subject && !course.subjects?.includes(subject)) return false;
    if (progress !== "all" && courseProgress(course) !== progress) return false;
    const text = normalise(
      [course.title, course.description, ...(course.subjects ?? [])].join(" "),
    );
    return terms.every((term) => text.includes(term));
  });
}
