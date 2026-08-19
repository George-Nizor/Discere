import type { RouteObject } from "react-router";
import { CourseListScreen, CourseScreen } from "./home/CourseScreen.js";
import { HomeScreen } from "./home/HomeScreen.js";
import { ProgressScreen } from "./home/ProgressScreen.js";
import { LessonJourneyScreen } from "./journey/LessonJourneyScreen.js";
import { NotebookScreen } from "./notebook/NotebookScreen.js";
import { ReviewScreen, ReviewSessionScreen } from "./review/ReviewScreen.js";
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
      { path: "*", element: <NotFoundScreen /> },
    ],
  },
];
