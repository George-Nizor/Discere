import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routes } from "./routes.js";
import { explainerStage, journey, progressWith } from "./test/fixtures.js";
import { createTestQueryClient, stubFetch } from "./test/harness.js";

afterEach(() => vi.unstubAllGlobals());

const home = {
  learnerName: "Journey Tester",
  xp: 48,
  streakDays: 3,
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
    },
    {
      id: "series-circuit-resistance",
      title: "Resistance in series",
      orientation: "Two resistors, one path.",
      conceptIds: ["series-circuits"],
      available: false,
      stageCount: 0,
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

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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
      await screen.findByRole("heading", { level: 1, name: "Electronics Foundations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Discere" })).toBeInTheDocument();
    for (const label of ["Home", "Courses", "Review", "Progress"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(await screen.findByRole("link", { name: /Resume lesson/ })).toBeInTheDocument();
    expect(await screen.findByText("Resistance in series")).toBeInTheDocument();
    expect(screen.getByText("Written, not open yet")).toBeInTheDocument();
    expect(await screen.findByText("Signed in locally as Journey Tester")).toBeInTheDocument();
  });

  it("splits the review queue by course so no course is quietly starved", async () => {
    stubFetch({ "GET /api/home": { body: home }, "GET /api/review": { body: reviewHome } });
    renderApp("/review");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Return to what you learned" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    const rows = screen.getByRole("table");
    expect(rows).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Electronics Foundations" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "The Rise of the Roman Empire" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Due" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cards" })).toBeInTheDocument();
  });

  it("renders concept mastery with independent and assisted evidence apart", async () => {
    stubFetch({ "GET /api/home": { body: home } });
    renderApp("/progress");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Concept mastery" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Independent" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Assisted" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Ohm's law" })).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
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

    expect(await screen.findByText("Explainer")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Electronics Foundations" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Current in a single loop")).toBeInTheDocument();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Build the idea" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Lesson stages" })).toBeInTheDocument();
    expect(screen.getByText("1. Build the idea")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask the tutor/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leave the lesson" })).toBeInTheDocument();
  });

  it("answers an unknown address without pretending the page exists", async () => {
    stubFetch({ "GET /api/home": { body: home } });
    renderApp("/qa/roman");
    expect(
      await screen.findByRole("heading", { level: 1, name: /not part of Discere/ }),
    ).toBeInTheDocument();
  });
});
