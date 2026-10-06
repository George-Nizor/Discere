import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { routes } from "./routes.js";
import { explainerStage, journey, progressWith } from "./test/fixtures.js";
import { createTestQueryClient, stubFetch } from "./test/harness.js";

afterEach(() => vi.unstubAllGlobals());

const home = {
  learnerName: "Journey Tester",
  xp: 48,
  streakDays: 3,
  dueReviews: 3,
  todayMinutes: 12,
  currentMission: {
    id: "mission-current",
    courseId: "electronics-foundations",
    title: "Follow the current",
    description: "Explore one circuit and calculate its current.",
    estimatedMinutes: 8,
    lessonBeatId: "current-in-one-loop",
  },
  progress: [
    {
      conceptId: "ohms-law",
      title: "Ohm's law",
      state: "practised",
      mastery: 0.62,
      independentAttempts: 2,
      assistedAttempts: 1,
    },
  ],
};

const course = {
  id: "electronics-foundations",
  title: "Electronics Foundations",
  description: "Build circuits you can reason about.",
  lessonCount: 2,
  availableLessonIds: ["current-in-one-loop"],
  lastActiveAt: null,
  accent: "#0b8f3c",
  coverUrl: "/api/content/electronics-foundations/assets/cover.svg",
  status: "available",
  completedLessonCount: 1,
};

const courseDetail = {
  course,
  concepts: [
    { id: "current", title: "Current", summary: "The rate at which charge passes a point." },
    { id: "series-circuits", title: "Series circuits", summary: "One path, so resistances add." },
  ],
  lessons: [
    {
      id: "current-in-one-loop",
      title: "Current in a single loop",
      orientation: "Trace the wire around the loop.",
      conceptIds: ["current"],
      available: true,
      stageCount: 6,
      completed: false,
    },
    {
      id: "series-circuit-resistance",
      title: "Resistance in series",
      orientation: "Two resistors, one path.",
      conceptIds: ["series-circuits"],
      available: false,
      stageCount: 0,
      completed: false,
    },
  ],
};

const reviewHome = {
  dueCount: 3,
  estimatedMinutes: 6,
  courses: [
    {
      courseId: "electronics-foundations",
      title: "Electronics Foundations",
      dueCount: 2,
      cardCount: 10,
      nextDueAt: "2026-08-19T08:00:00.000Z",
    },
    {
      courseId: "roman-empire",
      title: "The Rise of the Roman Empire",
      dueCount: 1,
      cardCount: 8,
      nextDueAt: "2026-08-19T08:00:00.000Z",
    },
  ],
};

import { studyFixture } from "./test/study-fixture.js";

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe("routed application", () => {
  it("renders the shell and the home screen from real endpoints", async () => {
    stubFetch({
      "GET /api/home": { body: home },
      "GET /api/courses": { body: { courses: [course] } },
      "GET /api/courses/electronics-foundations": { body: courseDetail },
      "GET /api/courses/electronics-foundations/lessons/current-in-one-loop/progress": {
        body: {
          journeyId: "electronics-foundations:current-in-one-loop",
          activeStageId: "current-in-one-loop:visual",
          stages: [
            {
              stageId: "current-in-one-loop:explainer",
              state: "completed",
              interactionState: {},
              updatedAt: "2026-08-18T12:00:00.000Z",
            },
            {
              stageId: "current-in-one-loop:visual",
              state: "active",
              interactionState: {},
              updatedAt: "2026-08-18T12:00:00.000Z",
            },
          ],
        },
      },
      "GET /api/review": { body: reviewHome },
    });
    renderApp("/");

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Welcome back, Journey Tester.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Discere" })).toBeInTheDocument();
    for (const label of ["Home", "Courses", "Review", "You", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    // The hero continues the lesson the mission names, and the catalogue sits below it.
    expect(
      await screen.findByRole("link", { name: /Resume Current in a single loop/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Electronics Foundations")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /3 cards are ready to review/ })).toBeInTheDocument();
    expect(await screen.findByText("Signed in locally as Journey Tester")).toBeInTheDocument();
  });

  it("opens a completed course roadmap instead of resuming its old completion stage", async () => {
    const completedCourse = {
      ...course,
      completedLessonCount: 2,
      lastActiveAt: "2026-08-19T08:00:00.000Z",
    };
    stubFetch({
      "GET /api/home": { body: home },
      "GET /api/courses": { body: { courses: [completedCourse] } },
      "GET /api/study": { body: studyFixture },
      "GET /api/courses/electronics-foundations": {
        body: {
          ...courseDetail,
          course: completedCourse,
          resumeLessonId: "current-in-one-loop",
          lessons: courseDetail.lessons.map((lesson) => ({
            ...lesson,
            available: true,
            completed: true,
          })),
        },
      },
      "GET /api/courses/electronics-foundations/lessons/current-in-one-loop/progress": {
        body: {
          journeyId: "electronics-foundations:current-in-one-loop",
          activeStageId: "current-in-one-loop:completion",
          stages: [
            {
              stageId: "current-in-one-loop:completion",
              state: "completed",
              interactionState: {},
              updatedAt: "2026-08-19T08:00:00.000Z",
            },
          ],
        },
      },
    });
    renderApp("/");
    expect(
      await screen.findByRole("link", { name: "View Electronics Foundations" }),
    ).toHaveAttribute("href", "/courses/electronics-foundations");
    expect(screen.queryByText("View course roadmap")).not.toBeInTheDocument();
  });

  it("splits the review queue by course so no course is quietly starved", async () => {
    stubFetch({ "GET /api/home": { body: home }, "GET /api/review": { body: reviewHome } });
    renderApp("/review");

    expect(await screen.findByRole("heading", { level: 1, name: "Review" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Due now" })).getByText("3"),
    ).toBeInTheDocument();
    const rows = screen.getByRole("table");
    expect(rows).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Electronics Foundations" })).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "The Rise of the Roman Empire" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Due" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cards" })).toBeInTheDocument();
  });

  it("renders concept mastery with independent and assisted evidence apart", async () => {
    stubFetch({
      "GET /api/home": { body: home },
      "GET /api/courses": { body: { courses: [course] } },
      "GET /api/study": { body: studyFixture },
    });
    renderApp("/progress");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Your learning activity" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByText("Ideas you have practised"));
    expect(await screen.findByText("Ohm's law")).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByText("2 without hints · 1 with help")).toBeInTheDocument();
    // XP 48 is short of the first level boundary, and the calendar drew the recorded day.
    expect(screen.getByText("62%")).toBeInTheDocument();
    expect(screen.getByText("Level 1 · Newcomer")).toBeInTheDocument();
    expect(screen.getByText(/48 XP in total/)).toBeInTheDocument();
  });

  it("assembles the lesson shell around a stage from its address", async () => {
    stubFetch({
      "GET /api/home": { body: home },
      "GET /api/courses/electronics-foundations": { body: courseDetail },
      "GET /api/courses/electronics-foundations/lessons/lesson/journey": { body: journey },
      "GET /api/courses/electronics-foundations/lessons/lesson/progress": {
        body: progressWith({ [explainerStage.id]: "active" }),
      },
    });
    renderApp(
      `/courses/electronics-foundations/lessons/lesson/stages/${encodeURIComponent(explainerStage.id)}`,
    );

    // The lesson route is loaded on demand; give the first import time under a busy test run.
    expect(await screen.findByText("Explainer", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Electronics Foundations" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Current in a single loop")).toBeInTheDocument();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Build the idea" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Lesson stages" })).toBeInTheDocument();
    expect(screen.getByText("1. Build the idea")).toBeInTheDocument();
    const tools = screen.getByRole("toolbar", { name: "Lesson tools" });
    // Read aloud appears only where the browser can speak, which the test DOM cannot.
    for (const name of ["Sound", "Working", "Calculator", "Tutor"])
      expect(toolButton(tools, name)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Leave the lesson" })).toBeInTheDocument();
    // The working page, calculator and tutor open beside the lesson rather than on another screen.
    await userEvent.click(toolButton(tools, "Calculator")!);
    expect(screen.getByRole("complementary", { name: "Lesson workbench" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Calculator", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Build the idea" })).toBeInTheDocument();
  });

  it("answers an unknown address without pretending the page exists", async () => {
    stubFetch({ "GET /api/home": { body: home } });
    renderApp("/qa/roman");
    expect(
      await screen.findByRole("heading", { level: 1, name: "This page doesn’t exist" }),
    ).toBeInTheDocument();
    expect(screen.getByText("/qa/roman")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("sends the old course address to the one course screen", async () => {
    stubFetch({
      "GET /api/home": { body: home },
      "GET /api/courses": { body: { courses: [course] } },
      "GET /api/courses/electronics-foundations": { body: courseDetail },
    });
    const router = renderApp("/legacy/courses/electronics-foundations");
    await vi.waitFor(() =>
      expect(router.state.location.pathname).toBe("/courses/electronics-foundations"),
    );
  });
});

function toolButton(toolbar: HTMLElement, name: string) {
  return [...toolbar.querySelectorAll("button")].find((button) =>
    button.textContent?.includes(name),
  );
}
