import { type RouteObject, redirect } from "react-router";
import { CourseListScreen, CourseScreen } from "./home/CourseScreen.js";
import { HomeScreen } from "./home/HomeScreen.js";
import { ProgressScreen } from "./home/ProgressScreen.js";
import { AppShell } from "./shell/AppShell.js";
import { NotFoundScreen } from "./shell/NotFoundScreen.js";
import { paths } from "./lib/paths.js";
import { OpeningScreen } from "./shell/WelcomeScreen.js";

/** Real routes, so refresh, browser history, and deep links all restore the same screen. */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    hydrateFallbackElement: <OpeningScreen />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: "courses", element: <CourseListScreen /> },
      { path: "courses/:courseId", element: <CourseScreen /> },
      {
        path: "courses/:courseId/checks/:checkId",
        lazy: () =>
          import("./checks/CheckScreen.js").then((m) => ({ Component: m.CheckStartScreen })),
      },
      {
        path: "course-checks/:sessionId",
        lazy: () =>
          import("./checks/CheckScreen.js").then((m) => ({ Component: m.CheckSessionScreen })),
      },
      {
        path: "courses/:courseId/sql-projects/:projectId",
        lazy: () =>
          import("./sql-projects/SqlProjectScreen.js").then((m) => ({
            Component: m.SqlProjectStartScreen,
          })),
      },
      {
        path: "sql-projects/:sessionId",
        lazy: () =>
          import("./sql-projects/SqlProjectScreen.js").then((m) => ({
            Component: m.SqlProjectSessionScreen,
          })),
      },
      {
        path: "courses/:courseId/python-projects/:projectId",
        lazy: () =>
          import("./python-projects/PythonProjectScreen.js").then((m) => ({
            Component: m.PythonProjectStartScreen,
          })),
      },
      {
        path: "python-projects/:sessionId",
        lazy: () =>
          import("./python-projects/PythonProjectScreen.js").then((m) => ({
            Component: m.PythonProjectSessionScreen,
          })),
      },
      {
        path: "courses/:courseId/rust-projects/:projectId",
        lazy: () =>
          import("./rust/RustProjectScreen.js").then((m) => ({
            Component: m.RustProjectStartScreen,
          })),
      },
      {
        path: "rust-projects/:sessionId",
        lazy: () =>
          import("./rust/RustProjectScreen.js").then((m) => ({
            Component: m.RustProjectSessionScreen,
          })),
      },
      {
        path: "rust/playground",
        lazy: () =>
          import("./rust/RustPlayground.js").then((m) => ({
            Component: m.RustPlaygroundScreen,
          })),
      },
      {
        path: "courses/:courseId/lessons/:lessonId",
        lazy: () =>
          import("./journey/LessonJourneyScreen.js").then((m) => ({
            Component: m.LessonJourneyScreen,
          })),
      },
      {
        path: "courses/:courseId/lessons/:lessonId/stages/:stageId",
        lazy: () =>
          import("./journey/LessonJourneyScreen.js").then((m) => ({
            Component: m.LessonJourneyScreen,
          })),
      },
      {
        path: "courses/:courseId/lessons/:lessonId/notebook",
        lazy: () =>
          import("./notebook/NotebookScreen.js").then((m) => ({ Component: m.NotebookScreen })),
      },
      {
        path: "review",
        lazy: () => import("./review/ReviewScreen.js").then((m) => ({ Component: m.ReviewScreen })),
      },
      {
        path: "review/session/:sessionId",
        lazy: () =>
          import("./review/ReviewScreen.js").then((m) => ({ Component: m.ReviewSessionScreen })),
      },
      { path: "you", element: <ProgressScreen /> },
      // Redirects run in the loader, before render, so no navigation fires from an effect.
      {
        path: "progress",
        Component: Redirecting,
        loader: ({ request }) => {
          const url = new URL(request.url);
          return redirect(paths.you + url.search + url.hash);
        },
      },
      {
        path: "settings",
        lazy: () =>
          import("./settings/SettingsScreen.js").then((m) => ({ Component: m.SettingsScreen })),
      },
      // An old address for the course screen. It now has one home.
      {
        path: "legacy/courses/:courseId",
        Component: Redirecting,
        loader: ({ params }) => redirect(paths.course(params["courseId"] ?? "")),
      },
      { path: "*", element: <NotFoundScreen /> },
    ],
  },
];

/** Never seen: the loader redirects first. Present so the router has something to render. */
function Redirecting() {
  return null;
}
