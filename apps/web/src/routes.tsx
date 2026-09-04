import type { RouteObject } from "react-router";
import { CourseListScreen, CourseScreen } from "./home/CourseScreen.js";
import { HomeScreen } from "./home/HomeScreen.js";
import { ProgressScreen } from "./home/ProgressScreen.js";
import { LessonJourneyScreen } from "./journey/LessonJourneyScreen.js";
import { NotebookScreen } from "./notebook/NotebookScreen.js";
import { RomanReferenceBeat, RomanReferenceCourseHome } from "./recovery/RomanReference.js";
import { RomanReferenceEssay } from "./recovery/RomanReferenceEssay.js";
import { RomanReferenceQuestion } from "./recovery/RomanReferenceQuestions.js";
import { ReviewScreen, ReviewSessionScreen } from "./review/ReviewScreen.js";
import { SettingsScreen } from "./settings/SettingsScreen.js";
import { AppShell } from "./shell/AppShell.js";
import { NotFoundScreen } from "./shell/NotFoundScreen.js";

/** Real routes, so refresh, browser history, and deep links all restore the same screen. */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: "courses", element: <CourseListScreen /> },
      { path: "courses/roman-empire", element: <RomanReferenceCourseHome /> },
      {
        path: "courses/roman-empire/lessons/rise-of-the-roman-empire/reference/essay",
        element: <RomanReferenceEssay />,
      },
      {
        path: "courses/roman-empire/lessons/rise-of-the-roman-empire/reference/questions/:referenceQuestion",
        element: <RomanReferenceQuestion />,
      },
      {
        path: "courses/roman-empire/lessons/rise-of-the-roman-empire/reference/:referenceBeat",
        element: <RomanReferenceBeat />,
      },
      { path: "courses/:courseId", element: <CourseScreen /> },
      { path: "courses/:courseId/lessons/:lessonId", element: <LessonJourneyScreen /> },
      {
        path: "courses/:courseId/lessons/:lessonId/stages/:stageId",
        element: <LessonJourneyScreen />,
      },
      { path: "courses/:courseId/lessons/:lessonId/notebook", element: <NotebookScreen /> },
      { path: "review", element: <ReviewScreen /> },
      { path: "review/session/:sessionId", element: <ReviewSessionScreen /> },
      { path: "progress", element: <ProgressScreen /> },
      { path: "settings", element: <SettingsScreen /> },
      { path: "legacy/courses/:courseId", element: <CourseScreen /> },
      { path: "*", element: <NotFoundScreen /> },
    ],
  },
];
