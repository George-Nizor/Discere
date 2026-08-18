const encode = encodeURIComponent;

export const paths = {
  home: "/",
  courses: "/courses",
  course: (courseId: string) => `/courses/${encode(courseId)}`,
  lesson: (courseId: string, lessonId: string) =>
    `/courses/${encode(courseId)}/lessons/${encode(lessonId)}`,
  stage: (courseId: string, lessonId: string, stageId: string) =>
    `/courses/${encode(courseId)}/lessons/${encode(lessonId)}/stages/${encode(stageId)}`,
  review: "/review",
  reviewSession: (sessionId: string) => `/review/session/${encode(sessionId)}`,
  progress: "/progress",
};
